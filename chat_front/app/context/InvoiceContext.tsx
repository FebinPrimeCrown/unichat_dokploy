'use client'
import React, { createContext, useContext, useEffect, useState } from 'react';
import { InvoiceList, order } from '@/app/types/apps/invoice';
import axios from 'axios';
import FingerprintJS from '@fingerprintjs/fingerprintjs';
import { useUser } from './user-context';

async function getClientFingerprint() {
    const fp = await FingerprintJS.load();
    const result = await fp.get()
    return result.visitorId;
  }

interface InvoiceContextType {
    balance: number;
    invoices: InvoiceList[];
    loading: boolean;
    error: Error | null;
    deleteEmail: () => {},
    addInvoice: (newInvoice: InvoiceList) => void;
    updateInvoice: (updatedInvoice: InvoiceList) => void;
}

export const InvoiceContext = createContext<InvoiceContextType | any>(undefined);

export const InvoiceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [invoices, setInvoices] = useState<InvoiceList[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const {user, setUser} = useUser()
    const [balance, setBalance] = useState("0")
    const environment = process.env.NEXT_PUBLIC_ENVIRONMENT;
    let apiUrl;
    if (environment === 'production') {
        apiUrl = process.env.NEXT_PUBLIC_API_URL_PRODUCTION; // Set your production URL
    } else if (environment === 'staging') {
        apiUrl = process.env.NEXT_PUBLIC_API_URL_STAGING; // Use the staging URL or development URL
    }
    else {
        apiUrl = process.env.NEXT_PUBLIC_API_URL_DEVELOPMENT;
    }

    useEffect(() => {
        console.log("invo useeffect")
        const fetchData = async () => {
            try {
                const device_fingerprint = await getClientFingerprint();
                const response = await axios.get(`${apiUrl}/users/invoices/`, { 
                    withCredentials: true,
                    headers: {
                      'X-device_fingerprint': device_fingerprint
                    }
                  });
                setInvoices(response.data);


                // Call second API sequentially
                const secondResponse = await axios.get(`${apiUrl}/users/organisation_account_balance/`, { withCredentials: true,
                    headers: {
                      'X-device_fingerprint': device_fingerprint
                    }
                  });
                console.log("Second API response:", secondResponse.data);
                setBalance(secondResponse.data["account_balance"])
                setLoading(false);
            } catch (error) {
                if (axios.isAxiosError(error)) {
                    if (error.response && error.response.status === 401) {
                      try {
                        const device_fingerprint = await getClientFingerprint();
                        await axios.post(`${apiUrl}/auth/refresh_access_token`, { device_fingerprint: device_fingerprint }, { withCredentials: true });
                        const response = await axios.get(`${apiUrl}/users/invoices/`, { 
                          withCredentials: true,
                          headers: {
                            'X-device_fingerprint': device_fingerprint
                          }
                        });
                        setInvoices(response.data);
                        // Call second API sequentially
                        const secondResponse = await axios.get(`${apiUrl}/users/organisation_account_balance/`, { withCredentials: true,
                            headers: {
                              'X-device_fingerprint': device_fingerprint
                            }
                          });
                        console.log("Second API response:", secondResponse.data);
                        setBalance(secondResponse.data["account_balance"])
                        setLoading(false);

                      } catch {
                        await axios.post(`${apiUrl}/auth/logout`, {}, { withCredentials: true });
                        setUser(null);
                      }
                    } else {
                      await axios.post(`${apiUrl}/auth/logout`, {}, { withCredentials: true });
                      setUser(null);
                    }
                  } else {
                    await axios.post(`${apiUrl}/auth/logout`, {}, { withCredentials: true });
                    setUser(null);
                  }
            }
        };

        fetchData();
    }, []);

    // Function to delete an invoice
    const deleteInvoice = async (id: number) => {
        try {

            await axios.delete('/api/data/invoicedata/deleteinvoice', { data: { invoiceId: id } });
            setInvoices((prevInvoices) => prevInvoices.filter((invoice) => invoice.id !== id));
        } catch (error) {
            console.error('Error deleting invoice:', error);

        }
    };

    const addInvoice = async (newInvoice: InvoiceList) => {
        try {
            const response = await axios.post('/api/data/invoicedata/addinvoice', newInvoice);
            const addedInvoice = response.data;
            setInvoices((prevInvoices) => [...prevInvoices, addedInvoice]);
        } catch (error) {
            console.error('Error adding invoice:', error);
        }
    };

    //  Function to update an invoice
    const updateInvoice = async (updatedInvoice: InvoiceList) => {
        try {
            const response = await axios.put('/api/data/invoicedata/updateinvoice', updatedInvoice);
            const updated = response.data;
            setInvoices((prevInvoices) =>
                prevInvoices.map((invoice) => (invoice.id === updated.id ? updated : invoice))
            );
        } catch (error) {
            console.error('Error updating invoice:', error);
        }
    };

    return (
        <InvoiceContext.Provider value={{ invoices, balance, loading, error, deleteInvoice, addInvoice, updateInvoice, setInvoices }}>
            {children}
        </InvoiceContext.Provider>
    );
};

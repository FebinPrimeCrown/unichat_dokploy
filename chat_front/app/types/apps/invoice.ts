export interface   order {
    itemName: string ;
    unitPrice: number ;
    units: number;
   unitTotalPrice: number;
  }

  interface BillingInvoice {
     id: number;
     invoice_ref: string;
     invoice_title: string;
     invoice_date: string;
     due_date: string;
     status: string;
     total_amount: number;
     currency: string;
     description: string;
  }
  
  export interface  InvoiceList {
   
       id: number;
       item_title: string;
       discount_percentage: number;
       amount: number;
       currency: string;
       billing_invoice: BillingInvoice

  }
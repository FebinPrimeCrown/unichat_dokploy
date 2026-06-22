import { UserProvider } from '@/app/context/user-context';
import { ReactNode } from 'react';
interface WithUserProviderProps {
    children: ReactNode;
  }

const WithUserProvider = ({ children }: WithUserProviderProps) => {
  return (
    <UserProvider>
      {children}
    </UserProvider>
  );
};

export default WithUserProvider;
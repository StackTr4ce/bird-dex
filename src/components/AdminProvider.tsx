import { useEffect, useState, useContext, createContext } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from './AuthProvider';

const AdminContext = createContext<{ isAdmin: boolean }>({ isAdmin: false });

export const useAdmin = () => useContext(AdminContext);

export const AdminProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      return;
    }
    supabase
      .from('user_profiles')
      .select('is_admin')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => setIsAdmin(!!data?.is_admin));
  }, [user]);

  return (
    <AdminContext.Provider value={{ isAdmin }}>
      {children}
    </AdminContext.Provider>
  );
};

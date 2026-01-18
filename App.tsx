import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import PolicymakerDashboard from './components/PolicymakerDashboard';
import FieldWorkerDashboard from './components/FieldWorkerDashboard';
import DataManagementDashboard from './components/DataManagementDashboard';
import LoginPage from './components/LoginPage';
import { UserRole } from './types';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { ActionProvider } from './contexts/ActionContext';
import { DataProvider } from './contexts/DataContext';

const AppContent: React.FC = () => {
  const { t } = useLanguage();

  // --- 1. STATE INITIALIZATION (Check LocalStorage First) ---
  // This prevents the app from "forgetting" you are logged in when you refresh.
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('gov_auth_status') === 'true';
  });

  const [userRole, setUserRole] = useState<UserRole>(() => {
    return (localStorage.getItem('gov_user_role') as UserRole) || 'policymaker';
  });

  const [userId, setUserId] = useState<string>(() => {
    return localStorage.getItem('gov_user_id') || '';
  });

  // --- 2. LOGIN HANDLER ---
  // Updated to accept the full 'user' object from your new backend LoginPage
  const handleLogin = (user: any) => {
    const role = user.role;
    const id = user.id;

    // Update State
    setUserRole(role);
    setUserId(id);
    setIsAuthenticated(true);

    // Save to LocalStorage (Persist Session)
    localStorage.setItem('gov_auth_status', 'true');
    localStorage.setItem('gov_user_role', role);
    localStorage.setItem('gov_user_id', id);
  };

  const handleLogout = () => {
    // Clear State
    setIsAuthenticated(false);
    setUserRole('policymaker');
    setUserId('');

    // Clear LocalStorage
    localStorage.removeItem('gov_auth_status');
    localStorage.removeItem('gov_user_role');
    localStorage.removeItem('gov_user_id');
  };

  // If not logged in, show Login Page
  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  // --- 3. MAIN DASHBOARD RENDER ---
  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 flex flex-col">
      <Header role={userRole} onLogout={handleLogout} />
      
      <main className="flex-grow">
        {userRole === 'policymaker' && (
          <PolicymakerDashboard userRole={userRole} userId={userId} />
        )}
        
        {userRole === 'field_worker' && (
          <FieldWorkerDashboard />
        )}

        {userRole === 'data_supervisor' && (
          <DataManagementDashboard userId={userId} />
        )}
      </main>

      {/* Footer / Standard Gov Disclosure */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center text-xs text-gray-500">
            <p>
              &copy; 2024 {t('footer_rights')}
            </p>
            <div className="flex gap-4 mt-2 md:mt-0">
               <span className="hover:underline cursor-pointer">{t('footer_privacy')}</span>
               <span className="hover:underline cursor-pointer">{t('footer_terms')}</span>
               <span className="hover:underline cursor-pointer">{t('footer_access')}</span>
            </div>
          </div>
          <div className="mt-2 text-[10px] text-gray-400 text-center md:text-left">
            {t('footer_disclaimer')}
          </div>
        </div>
      </footer>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <LanguageProvider>
      <ActionProvider>
        <DataProvider>
          <AppContent />
        </DataProvider>
      </ActionProvider>
    </LanguageProvider>
  );
};

export default App;
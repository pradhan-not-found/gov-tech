import React, { useState } from 'react';
import { UserRole, LanguageCode } from '../types';
import { LANGUAGES } from '../constants';
import { useLanguage } from '../contexts/LanguageContext';

interface LoginPageProps {
  onLogin: (user: any) => void; // Updated to accept full user object
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSupervisorMode, setIsSupervisorMode] = useState(false);
  const { language, setLanguage, t } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // 1. CALL PYTHON BACKEND
      const response = await fetch('http://localhost:8000/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: userId, password: password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Login failed');
      }

      // 2. CHECK ROLE & MODE
      // If in Supervisor Mode, ensure the user has the correct role
      if (isSupervisorMode && data.user.role !== 'data_supervisor') {
        setError('Access Denied: This portal is for Data Supervisors only.');
        setIsLoading(false);
        return;
      }
      
      // If in Standard Mode, ensure they are NOT a supervisor (optional logic)
      if (!isSupervisorMode && data.user.role === 'data_supervisor') {
        setError('Please use the Data Management Portal link below.');
        setIsLoading(false);
        return;
      }

      // 3. LOGIN SUCCESS
      onLogin(data.user);

    } catch (err: any) {
      console.error(err);
      setError('Invalid User ID or Password.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsSupervisorMode(!isSupervisorMode);
    setUserId('');
    setPassword('');
    setError('');
  };

  return (
    <div className={`min-h-screen flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 font-sans relative transition-colors duration-500 ${isSupervisorMode ? 'bg-slate-100' : 'bg-gray-50'}`}>
      
      {/* Banner for Supervisor Mode */}
      {isSupervisorMode && (
         <div className="absolute top-0 left-0 w-full h-2 bg-gov-blue"></div>
      )}

      {/* Language Dropdown */}
      <div className="absolute top-4 right-4">
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value as LanguageCode)}
          className="block w-full pl-3 pr-8 py-2 text-sm bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-gov-blue focus:border-gov-blue"
        >
          {LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.name}
            </option>
          ))}
        </select>
      </div>

      <div className={`max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-md border ${isSupervisorMode ? 'border-gov-blue ring-1 ring-blue-100' : 'border-gray-200'}`}>
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="flex flex-col items-center justify-center">
               <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center ${isSupervisorMode ? 'border-gray-800' : 'border-gov-blue'}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${isSupervisorMode ? 'bg-gray-800' : 'bg-gov-blue'}`}></div>
               </div>
               <span className={`text-[0.7rem] font-bold mt-2 uppercase tracking-widest ${isSupervisorMode ? 'text-gray-800' : 'text-gov-blue'}`}>
                  {t('satyameva')}
               </span>
            </div>
          </div>
          
          <h2 className="mt-2 text-2xl font-bold text-gray-900">
            {isSupervisorMode ? t('dm_portal_title') : `${t('app_title')} Portal`}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {isSupervisorMode ? t('dm_portal_subtitle') : t('app_subtitle')}
          </p>
          
          <div className="mt-4 border-t border-gray-100 pt-4">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isSupervisorMode ? 'bg-gray-100 text-gray-800' : 'bg-blue-50 text-gov-blue'}`}>
              {t('login_auth')}
            </span>
          </div>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div className="mb-4">
              <label htmlFor="user-id" className="block text-sm font-medium text-gray-700 mb-1">
                {t('login_userid')}
              </label>
              <input
                id="user-id"
                name="user-id"
                type="text"
                required
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-400 text-gray-900 bg-white rounded-md focus:outline-none focus:ring-gov-blue focus:border-gov-blue focus:z-10 sm:text-sm"
                placeholder={t('login_userid')}
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                {t('login_password')}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-400 text-gray-900 bg-white rounded-md focus:outline-none focus:ring-gov-blue focus:border-gov-blue focus:z-10 sm:text-sm"
                placeholder={t('login_password')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border-l-4 border-red-500 p-2" role="alert">
              <p>{error}</p>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${
                isLoading ? 'opacity-70 cursor-not-allowed' : ''
              } ${isSupervisorMode ? 'bg-gray-800 hover:bg-gray-900 focus:ring-gray-800' : 'bg-gov-blue hover:bg-blue-900 focus:ring-gov-blue'}`}
            >
              {isLoading ? 'Verifying...' : t('login_btn')}
            </button>
          </div>
        </form>

        <div className="mt-6 border-t border-gray-100 pt-6">
          <button 
             onClick={toggleMode}
             className="w-full text-center text-xs text-gray-500 hover:text-gov-blue hover:underline transition-colors"
          >
             {isSupervisorMode ? t('dm_main_link') : t('dm_login_link')}
          </button>
          
          <div className="mt-4 text-center text-[10px] text-gray-400 bg-gray-50 p-2 rounded">
             <p>Secure Backend Connected</p>
             <p>Credentials are now verified against the database.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
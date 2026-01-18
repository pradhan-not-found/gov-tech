import React from 'react';
import { UserRole, LanguageCode } from '../types';
import { LANGUAGES } from '../constants';
import { useLanguage } from '../contexts/LanguageContext';

interface HeaderProps {
  role: UserRole;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ role, onLogout }) => {
  const { language, setLanguage, t } = useLanguage();

  const getRoleName = () => {
    if (role === 'policymaker') return t('role_admin');
    if (role === 'field_worker') return t('role_field');
    if (role === 'data_supervisor') return t('role_supervisor');
    return '';
  };

  return (
    <header className="bg-white border-b-4 border-gov-orange shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <div className="flex items-center gap-4">
             {/* Emblem Mock */}
            <div className="flex flex-col items-center justify-center">
               <div className="w-8 h-8 rounded-full border-2 border-gov-blue flex items-center justify-center">
                  <div className="w-1 h-1 bg-gov-blue rounded-full"></div>
               </div>
               <span className="text-[0.6rem] font-bold mt-1 text-gov-blue uppercase tracking-widest">{t('satyameva')}</span>
            </div>
            
            <div className="border-l border-gray-300 h-10 mx-2"></div>

            <div>
              <h1 className="text-xl font-bold text-gray-900 leading-tight">
                {t('app_title')}
              </h1>
              <p className="text-xs text-gray-600 font-medium">
                {t('app_subtitle')}
              </p>
              <p className="text-[0.65rem] text-gray-500 uppercase tracking-wide">
                {t('gov_india')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col items-end mr-4">
              <span className="text-sm font-semibold text-gray-800">
                {getRoleName()}
              </span>
              <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-600 animate-pulse"></span>
                {t('sys_op')}
              </span>
            </div>
            
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as LanguageCode)}
              className="text-xs bg-gray-50 border border-gray-200 rounded p-1 text-gray-700 focus:outline-none focus:ring-1 focus:ring-gov-blue"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>

            <button 
              onClick={onLogout}
              className="px-4 py-2 text-xs font-medium text-red-700 border border-red-200 bg-red-50 rounded hover:bg-red-100 transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              {t('logout')}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
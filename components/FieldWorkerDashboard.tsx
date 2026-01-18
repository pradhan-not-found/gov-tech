import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

const FieldWorkerDashboard: React.FC = () => {
  const [tasks, setTasks] = useState([
    { id: 1, type: 'Home Visit', name: 'Ramesh Kumar (Elderly)', address: 'Plot 4, Sector 12', status: 'pending', urgent: true },
    { id: 2, type: 'Child Enrolment', name: 'Anjali (Age 5)', address: 'Anganwadi Center 4', status: 'pending', urgent: false },
    { id: 3, type: 'Biometric Update', name: 'Sita Devi', address: 'Near Post Office', status: 'completed', urgent: false },
  ]);
  const { t } = useLanguage();

  const toggleTask = (id: number) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, status: 'completed' } : t));
  };

  const pendingCount = tasks.filter(t => t.status === 'pending').length;

  return (
    <main className="max-w-md mx-auto bg-gray-50 min-h-screen pb-20">
      {/* Mobile Header Context */}
      <div className="bg-gov-blue text-white p-6 rounded-b-3xl shadow-md">
        <p className="text-sm opacity-80">{t('fw_welcome')},</p>
        <h2 className="text-2xl font-bold">{t('role_field')}</h2>
        <div className="mt-4 flex justify-between items-end">
          <div>
            <p className="text-3xl font-bold">{pendingCount}</p>
            <p className="text-xs opacity-80 uppercase tracking-wide">{t('fw_tasks')}</p>
          </div>
          <div className="text-right">
             <span className="bg-white/20 px-3 py-1 rounded-full text-xs backdrop-blur-sm">
                {t('fw_zone')}: Ward 12
             </span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="p-4 grid grid-cols-2 gap-4 -mt-6">
        <button className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform">
           <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-gov-orange">
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
           </div>
           <span className="text-xs font-bold text-gray-700">{t('fw_new')}</span>
        </button>
        <button className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform">
           <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-gov-green">
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
           </div>
           <span className="text-xs font-bold text-gray-700">{t('fw_verify')}</span>
        </button>
      </div>

      {/* Task List */}
      <div className="px-4 mt-2 space-y-4">
        <h3 className="font-bold text-gray-800 text-lg">{t('fw_assigned')}</h3>
        
        {tasks.map(task => (
          <div key={task.id} className={`bg-white p-4 rounded-xl border-l-4 shadow-sm flex items-center justify-between ${task.status === 'completed' ? 'border-green-500 opacity-60' : task.urgent ? 'border-red-500' : 'border-blue-500'}`}>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${task.type === 'Home Visit' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                  {task.type}
                </span>
                {task.urgent && task.status !== 'completed' && <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded font-bold animate-pulse">URGENT</span>}
              </div>
              <h4 className="font-bold text-gray-800">{task.name}</h4>
              <p className="text-xs text-gray-500">{task.address}</p>
            </div>

            {task.status === 'pending' ? (
              <button 
                onClick={() => toggleTask(task.id)}
                className="w-10 h-10 rounded-full border-2 border-gray-200 flex items-center justify-center text-gray-300 hover:border-green-500 hover:text-green-500 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              </button>
            ) : (
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Simplified Analytics for Field Worker */}
      <div className="px-4 mt-6">
        <div className="bg-gradient-to-r from-blue-900 to-blue-800 rounded-xl p-4 text-white shadow-lg">
          <h3 className="text-sm font-semibold opacity-90 mb-2">{t('fw_perf')}</h3>
          <div className="flex justify-between items-center">
             <div>
                <p className="text-2xl font-bold">88%</p>
                <p className="text-xs opacity-75">{t('fw_cov')}</p>
             </div>
             <div className="h-8 w-px bg-white/20"></div>
             <div>
                <p className="text-2xl font-bold text-yellow-400">12</p>
                <p className="text-xs opacity-75">{t('fw_pending_05')}</p>
             </div>
             <div className="h-8 w-px bg-white/20"></div>
             <div>
                <p className="text-2xl font-bold">45</p>
                <p className="text-xs opacity-75">{t('fw_assisted')}</p>
             </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default FieldWorkerDashboard;
import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useData } from '../contexts/DataContext';
import { DatasetType } from '../types';

interface DataManagementDashboardProps {
  userId: string;
}

// Interface matches Backend API response exactly
interface LogEntry {
  id: string;
  fileName: string;
  type: string;
  sizeBytes: number;
  recordCount: number;
  status: 'Success' | 'Processing' | 'Failed';
  timestamp: string;
  uploaderId: string;
}

const DataManagementDashboard: React.FC<DataManagementDashboardProps> = ({ userId }) => {
  const { t } = useLanguage();
  
  // 1. STATE FOR REAL DATA
  const [realStats, setRealStats] = useState({
    totalRecords: 0,
    totalDatasets: 0,
    lastUpdate: 'Loading...'
  });
  
  const [realLogs, setRealLogs] = useState<LogEntry[]>([]);
  
  // CRITICAL FIX: Default value matches backend map key exactly
  const [selectedType, setSelectedType] = useState<string>('Enrolment Density');
  
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // 2. FETCH FUNCTIONS (Connects to your running Python Backend)
  const fetchStats = async () => {
    try {
      const response = await fetch("http://localhost:8000/api/stats");
      if (response.ok) setRealStats(await response.json());
    } catch (e) { console.error("Stats error. Is backend running?", e); }
  };

  const fetchLogs = async () => {
    try {
      const response = await fetch("http://localhost:8000/api/logs");
      if (response.ok) {
        const data = await response.json();
        setRealLogs(data);
      }
    } catch (e) { console.error("Logs error", e); }
  };

  // 3. LOAD DATA ON MOUNT & POLL
  useEffect(() => {
    fetchStats();
    fetchLogs();
    
    // Poll every 5s to keep table fresh
    const interval = setInterval(() => {
        fetchStats();
        fetchLogs();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(10); // Start animation

    try {
      const formData = new FormData();
      formData.append("file", file);
      // This sends the EXACT string expected by main.py
      formData.append("dataset_type", selectedType); 
      formData.append("uploader_id", userId);

      // Animation for UI feedback (Client-side only)
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => (prev >= 90 ? 90 : prev + 10));
      }, 300);

      // ACTUAL NETWORK REQUEST
      const response = await fetch("http://localhost:8000/api/upload-csv", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Server Error");
      }

      setUploadProgress(100); // Finish animation

      // 4. IMMEDIATE REFRESH (So it doesn't feel fake)
      // We fetch new stats immediately after success
      await fetchStats();
      await fetchLogs();

    } catch (error) {
      console.error("Upload failed:", error);
      alert("Upload failed! Check console and ensure Backend (port 8000) is running.");
      setUploadProgress(0);
    } finally {
      setTimeout(() => setIsUploading(false), 1000);
      e.target.value = ''; // Allow re-uploading same file
    }
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Header Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
           <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">{t('dm_total_records')}</h3>
           <div className="mt-2 flex items-baseline">
             <span className="text-3xl font-extrabold text-gray-900">
               {realStats.totalRecords.toLocaleString()}
             </span>
           </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
           <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">{t('dm_datasets')}</h3>
           <div className="mt-2 flex items-baseline">
             <span className="text-3xl font-extrabold text-gray-900">
               {realStats.totalDatasets}
             </span>
           </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
           <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">{t('dm_last_update')}</h3>
           <div className="mt-2 flex items-baseline">
             <span className="text-lg font-medium text-gray-700">
               {realStats.lastUpdate}
             </span>
           </div>
        </div>
      </div>

      {/* Main Action Area */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-bold text-gray-900">{t('dm_upload_title')}</h2>
        </div>
        <div className="p-8">
          <div className="max-w-xl mx-auto space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('dm_select_type')}</label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-gov-blue focus:border-gov-blue sm:text-sm rounded-md border shadow-sm"
                disabled={isUploading}
              >
                {/* CRITICAL UPDATE: These values now map to your CSV files */}
                {/* api_data_aadhar_enrolment...csv -> Select this: */}
                <option value="Enrolment Density">Enrolment Data</option>
                
                {/* api_data_aadhar_biometric...csv -> Select this: */}
                <option value="Update Activity">Update Data (Biometric/Demographic)</option>
                
                {/* Migration/Lifecycle placeholders */}
                <option value="Migration Signals">Migration Data</option>
                <option value="Lifecycle Gaps">Lifecycle Data</option>
              </select>
            </div>

            <div className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md transition-colors ${isUploading ? 'border-gray-300 bg-gray-50' : 'border-gray-300 hover:border-gov-blue hover:bg-blue-50'}`}>
              <div className="space-y-1 text-center">
                {isUploading ? (
                  <div className="w-full flex flex-col items-center">
                      <div className="w-12 h-12 border-4 border-blue-200 border-t-gov-blue rounded-full animate-spin mb-4"></div>
                      <p className="text-sm text-gray-600 font-medium">{t('dm_uploading')}</p>
                      <div className="w-64 h-2 bg-gray-200 rounded-full mt-4 overflow-hidden">
                        <div className="h-full bg-gov-blue transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                      </div>
                  </div>
                ) : (
                  <>
                    <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                      <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <div className="flex text-sm text-gray-600 justify-center">
                      <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-gov-blue hover:text-blue-500 focus-within:outline-none">
                        <span>{t('dm_upload_btn')}</span>
                        <input id="file-upload" name="file-upload" type="file" className="sr-only" accept=".csv" onChange={handleFileUpload} />
                      </label>
                    </div>
                    <p className="text-xs text-gray-500">{t('dm_drop_file')}</p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
           <h3 className="text-sm font-bold text-gray-700 uppercase">{t('dm_audit_log')}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">File Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Records</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Uploaded By</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {realLogs.length > 0 ? (
                realLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        log.status === 'Success' ? 'bg-green-100 text-green-800' : 
                        log.status === 'Processing' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {log.status === 'Success' ? t('dm_status_success') : 
                        log.status === 'Processing' ? t('dm_status_processing') : t('dm_status_failed')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{log.fileName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.type}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{(log.sizeBytes / (1024*1024)).toFixed(2)} MB</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.recordCount.toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.uploaderId}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.timestamp}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
                    No uploads yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
};

export default DataManagementDashboard;
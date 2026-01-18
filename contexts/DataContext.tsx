import React, { createContext, useContext, useState, ReactNode } from 'react';
import { DatasetLog, DatasetType } from '../types';

interface DataContextType {
  logs: DatasetLog[];
  addLog: (log: DatasetLog) => void;
  updateLogStatus: (id: string, status: 'Success' | 'Processing' | 'Failed') => void;
  stats: {
    totalRecords: number;
    totalDatasets: number;
    lastUpdate: string;
  };
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Pre-filled mock logs for realism
  const [logs, setLogs] = useState<DatasetLog[]>([
    { id: 'd-101', fileName: 'MH_Enrolment_Q3_2023.csv', type: 'Enrolment', sizeBytes: 154000000, recordCount: 450000, status: 'Success', timestamp: '2023-10-25 10:30', uploaderId: 'sup_01' },
    { id: 'd-102', fileName: 'UP_Demo_Updates_Oct.csv', type: 'Demographic Update', sizeBytes: 85000000, recordCount: 210000, status: 'Success', timestamp: '2023-10-26 14:15', uploaderId: 'sup_02' },
  ]);

  const addLog = (log: DatasetLog) => {
    setLogs(prev => [log, ...prev]);
  };

  const updateLogStatus = (id: string, status: 'Success' | 'Processing' | 'Failed') => {
    setLogs(prev => prev.map(log => log.id === id ? { ...log, status } : log));
  };

  // Derive stats
  const totalRecords = logs.filter(l => l.status === 'Success').reduce((acc, curr) => acc + curr.recordCount, 0);
  const totalDatasets = logs.length;
  const lastUpdate = logs.length > 0 ? logs[0].timestamp : 'N/A';

  return (
    <DataContext.Provider value={{ logs, addLog, updateLogStatus, stats: { totalRecords, totalDatasets, lastUpdate } }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
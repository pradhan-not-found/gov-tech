import React, { createContext, useContext, useState, ReactNode } from 'react';
import { GovernanceAction } from '../types';

interface ActionContextType {
  actions: GovernanceAction[];
  initiateAction: (action: GovernanceAction) => void;
  getActionForRegion: (regionId: string) => GovernanceAction | undefined;
}

const ActionContext = createContext<ActionContextType | undefined>(undefined);

export const ActionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [actions, setActions] = useState<GovernanceAction[]>([]);

  const initiateAction = (action: GovernanceAction) => {
    console.log("Governance Action Initiated:", action);
    setActions(prev => [...prev, action]);
  };

  const getActionForRegion = (regionId: string) => {
    // Return the most recent action for this region if multiple exist
    return actions.filter(a => a.regionId === regionId).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
  };

  return (
    <ActionContext.Provider value={{ actions, initiateAction, getActionForRegion }}>
      {children}
    </ActionContext.Provider>
  );
};

export const useActions = () => {
  const context = useContext(ActionContext);
  if (!context) {
    throw new Error('useActions must be used within an ActionProvider');
  }
  return context;
};
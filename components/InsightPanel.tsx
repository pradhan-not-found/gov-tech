import React, { useState } from 'react';
import { RegionData, LayerType, UserRole } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { useActions } from '../contexts/ActionContext';

interface InsightPanelProps {
  data: RegionData;
  layer: LayerType;
  userRole: UserRole;
  userId: string;
}

const InsightPanel: React.FC<InsightPanelProps> = ({ data, layer, userRole, userId }) => {
  const { t } = useLanguage();
  const { initiateAction, getActionForRegion } = useActions();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const existingAction = getActionForRegion(data.id);

  // --- HELPER 1: Title Case Formatting for "region_tamil_nadu" ---
  const formatName = (rawName: string) => {
    if (!rawName) return "Unknown Region";
    // Remove prefix and underscores
    const clean = rawName.replace('region_', '').replace(/_/g, ' ');
    // Title Case
    return clean.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
  };

  // --- HELPER 2: Large Number Formatting (e.g. 1.2M) ---
  const formatCount = (num: number | undefined) => {
    if (num === undefined || num === null) return "0";
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toString();
  };

  // --- HELPER 3: Dynamic Narrative based on Layer ---
  const getNarrative = () => {
    if (layer === 'migration') {
      return data.migrationIndex > 0 ? t('insight_mig_influx') : t('insight_mig_outflow');
    } else if (layer === 'lifecycle') {
      return data.lifecyclePending > 50000 ? t('insight_life_lag') : t('insight_life_stable');
    } else {
      // Adjusted threshold for 'Updates' based on backend seed data scale
      return data.updateActivity > 5000 ? t('insight_activity_high') : t('insight_activity_mod');
    }
  };

  const handleActionInitiation = async () => {
    if (existingAction || isSubmitting) return;

    setIsSubmitting(true);

    try {
      // 1. Send Action to Backend (Matches main.py /api/create-action)
      const response = await fetch('http://localhost:8000/api/create-action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          region_id: data.id,
          region_name: formatName(data.name),
          recommendation: data.recommendation,
          trigger_reason: data.alerts ? data.alerts.join(', ') : 'Manual Intervention',
          user_id: userId,
          user_role: userRole
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create action');
      }

      const result = await response.json();

      // 2. Update Local Context (Immediate UI Feedback)
      initiateAction({
        id: result.id,
        regionId: data.id,
        regionName: formatName(data.name),
        recommendationKey: data.recommendation,
        triggerReason: data.alerts ? data.alerts.join(', ') : '',
        timestamp: new Date().toISOString(),
        status: 'Initiated',
        initiatedByUserId: userId,
        initiatedByUserRole: userRole
      });

    } catch (error) {
      console.error("Action initiation failed:", error);
      alert("System Error: Could not save action to database.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 bg-gray-50">
        <h2 className="text-lg font-bold text-gray-900 flex justify-between items-center">
          <span>{formatName(data.name)}</span>
          <span className="text-xs font-normal text-gray-500 bg-white px-2 py-1 rounded border">
            ID: {data.id}
          </span>
        </h2>
        <p className="text-xs text-gray-500 mt-1">{t('panel_data_as_of')}: {new Date().toLocaleDateString()}</p>
      </div>

      <div className="p-4 flex-1 overflow-y-auto custom-scroll space-y-6">
        {/* Core Metrics Grid */}
        <div className="grid grid-cols-2 gap-4">
          
          {/* Card 1: Registered Population (Mapped from Enrolment Data) */}
          <div className="p-3 bg-blue-50 rounded border border-blue-100">
            <p className="text-xs text-blue-800 font-semibold uppercase">{t('panel_pop') || "Registered Pop."}</p>
            {/* We use enrolmentRate as the proxy for total records in that state */}
            <p className="text-xl font-bold text-blue-900">
                {formatCount(data.enrolmentRate)}
            </p>
          </div>
          
          {/* Card 2: Contextual Metric (Based on selected layer) */}
          <div className="p-3 bg-green-50 rounded border border-green-100">
            <p className="text-xs text-green-800 font-semibold uppercase">
              {layer === 'updates' ? "Recent Updates" : 
               layer === 'migration' ? "Net Migration" : 
               layer === 'lifecycle' ? "Pending Actions" : "Saturation"}
            </p>
            <p className="text-xl font-bold text-green-900">
              {layer === 'updates' ? formatCount(data.updateActivity) :
               layer === 'migration' ? formatCount(Math.abs(data.migrationIndex)) :
               layer === 'lifecycle' ? formatCount(data.lifecyclePending) :
               "High"} {/* Default for enrolment saturation */}
            </p>
          </div>
        </div>

        {/* Narrative Insight */}
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide border-l-4 border-gov-orange pl-2">
            {t('panel_analysis')}
          </h3>
          <div className="text-sm text-gray-700 leading-relaxed bg-white p-3 border border-gray-100 rounded">
            <p>{getNarrative()}</p>
          </div>
        </div>

        {/* Alerts List */}
        <div className="space-y-2">
           <h3 className="text-xs font-bold text-gray-500 uppercase">{t('panel_alerts')}</h3>
           {data.alerts && data.alerts.length > 0 ? (
             <ul className="space-y-2">
               {data.alerts.map((alert, idx) => (
                 <li key={idx} className="flex items-start gap-2 text-sm text-gray-800 bg-red-50 p-2 rounded border-l-2 border-red-500">
                   {/* Alert Icon */}
                   <svg className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                   </svg>
                   <span className="flex-1 break-words">{t(alert) || alert}</span>
                 </li>
               ))}
             </ul>
           ) : (
             <p className="text-sm text-gray-400 italic pl-2">No active alerts for this region.</p>
           )}
        </div>

        {/* Action / Recommendation Engine */}
        <div className="bg-blue-900 text-white p-4 rounded shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-5 h-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <h3 className="font-bold uppercase text-xs tracking-wider">{t('panel_rec')}</h3>
          </div>
          <p className="text-sm font-medium leading-normal text-blue-50">
            {t(data.recommendation) || "Monitor region statistics for anomalies."}
          </p>
          
          {existingAction ? (
              <div className="mt-4">
                  <button 
                    disabled
                    className="w-full bg-green-600 text-white text-xs font-bold py-2 rounded shadow flex items-center justify-center gap-2 cursor-default opacity-90"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    ACTION INITIATED
                  </button>
                  <p className="mt-2 text-[10px] text-green-200 text-center font-mono">
                    ID: {existingAction.id.split('-')[1]?.substring(0,8) || 'REF'} • {existingAction.status}
                  </p>
              </div>
          ) : (
            <button 
              onClick={handleActionInitiation}
              disabled={isSubmitting}
              className={`mt-4 w-full bg-white text-blue-900 text-xs font-bold py-2 rounded hover:bg-gray-100 transition shadow ${isSubmitting ? 'opacity-75 cursor-wait' : ''}`}
            >
              {isSubmitting ? 'Processing...' : t('panel_action_btn')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default InsightPanel;
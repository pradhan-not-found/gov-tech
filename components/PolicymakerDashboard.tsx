import React, { useState } from 'react';
import MapChart from './MapChart';
import InsightPanel from './InsightPanel';
import AnalyticsCharts from './AnalyticsCharts';
import { LayerType, RegionData, UserRole } from '../types';
import { MOCK_REGIONAL_DATA } from '../constants';
import { useLanguage } from '../contexts/LanguageContext';

interface PolicymakerDashboardProps {
  userRole: UserRole;
  userId: string;
}

const PolicymakerDashboard: React.FC<PolicymakerDashboardProps> = ({ userRole, userId }) => {
  const [activeLayer, setActiveLayer] = useState<LayerType>('enrolment');
  // We keep MOCK_REGIONAL_DATA as the initial state so the page renders immediately.
  // The user will click the map to get real state data.
  const [selectedRegion, setSelectedRegion] = useState<RegionData>(MOCK_REGIONAL_DATA['National']);
  const { t } = useLanguage();

  const layers: { id: LayerType; labelKey: string }[] = [
    { id: 'enrolment', labelKey: 'layer_enrolment' },
    { id: 'updates', labelKey: 'layer_updates' },
    { id: 'migration', labelKey: 'layer_migration' },
    { id: 'lifecycle', labelKey: 'layer_lifecycle' },
  ];

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded shadow-sm border border-gray-200">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">{t('dash_title')}</h2>
          <p className="text-xs text-gray-500">{t('dash_subtitle')}</p>
        </div>
        <div className="flex gap-2 bg-gray-100 p-1 rounded-md overflow-x-auto">
          {layers.map((layer) => (
            <button
              key={layer.id}
              onClick={() => setActiveLayer(layer.id)}
              className={`px-4 py-2 text-sm font-medium rounded transition-all whitespace-nowrap ${
                activeLayer === layer.id
                  ? 'bg-white text-gov-blue shadow-sm ring-1 ring-gray-200'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
              }`}
            >
              {t(layer.labelKey)}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-auto lg:h-[600px]">
        {/* Map Section */}
        <div className="lg:col-span-8 h-[400px] lg:h-full bg-white rounded-lg shadow-sm border border-gray-200 p-1">
          <MapChart 
            layer={activeLayer} 
            selectedRegionId={selectedRegion.id}
            onRegionSelect={setSelectedRegion} 
          />
        </div>

        {/* Insight Section */}
        <div className="lg:col-span-4 h-full">
          <InsightPanel 
            data={selectedRegion} 
            layer={activeLayer} 
            userRole={userRole}
            userId={userId}
          />
        </div>
      </div>

      {/* Bottom Analytics Section */}
      <div className="h-[300px]">
        {/* CRITICAL UPDATE: Passed 'layer={activeLayer}' so the charts refresh when you switch tabs */}
        <AnalyticsCharts data={selectedRegion} layer={activeLayer} />
      </div>

    </main>
  );
};

export default PolicymakerDashboard;
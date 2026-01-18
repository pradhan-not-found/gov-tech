import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { RegionData, LayerType } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface AnalyticsChartsProps {
  data: RegionData;
  layer?: LayerType; // Optional to prevent runtime errors if undefined
}

const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({ data, layer }) => {
  const { t } = useLanguage();
  // Initialize with empty arrays to prevent Recharts crashes
  const [chartData, setChartData] = useState<{ trend: any[], ageDistribution: any[] }>({ trend: [], ageDistribution: [] });
  const [loading, setLoading] = useState(true);

  // Fallback to 'enrolment' if layer is undefined
  const activeLayer = layer || 'enrolment';

  // --- FETCH REAL DATA FROM BACKEND ---
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    
    // API Call matches the main.py structure
    fetch(`http://localhost:8000/api/analytics?category=${activeLayer}`)
      .then(res => {
        if (!res.ok) throw new Error("Network response was not ok");
        return res.json();
      })
      .then(realData => {
        if (isMounted) {
          // Safety: Ensure arrays exist even if backend returns partial data
          setChartData({
            trend: realData.trend || [],
            ageDistribution: realData.ageDistribution || []
          });
          setLoading(false);
        }
      })
      .catch(err => {
        console.error("Failed to fetch analytics:", err);
        if (isMounted) setLoading(false);
      });

    return () => { isMounted = false; };
  }, [activeLayer]);

  // --- HELPER: Format Large Numbers (e.g. 1.2M, 50k) ---
  const formatYAxis = (tick: number) => {
    if (tick === 0) return '0';
    if (tick >= 1000000) return `${(tick / 1000000).toFixed(1)}M`;
    if (tick >= 1000) return `${(tick / 1000).toFixed(0)}k`;
    return tick.toString();
  };

  // --- DYNAMIC COLORS & TITLES ---
  const getChartColor = () => {
    switch (activeLayer) {
      case 'updates': return '#0d47a1'; // Blue
      case 'migration': return '#f59e0b'; // Amber
      case 'lifecycle': return '#ef4444'; // Red
      default: return '#10b981'; // Green (Enrolment)
    }
  };

  const getDistributionTitle = () => {
    switch (activeLayer) {
      case 'updates': return "Update Types Breakdown";
      case 'migration': return "Inflow vs Outflow";
      case 'lifecycle': return "Pending Actions by Age";
      default: return "Demographic Age Distribution";
    }
  };

  // --- LOADING STATE ---
  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full animate-pulse">
        <div className="bg-gray-100 rounded-lg h-64 border border-gray-200"></div>
        <div className="bg-gray-100 rounded-lg h-64 border border-gray-200"></div>
      </div>
    );
  }

  // --- RENDER ---
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
      
      {/* 1. REAL-TIME TREND CHART */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
            <span className="w-1 h-4 rounded-sm" style={{ backgroundColor: getChartColor() }}></span>
            {t('chart_trend')} <span className="text-gray-400 font-normal text-xs ml-1 uppercase">({activeLayer})</span>
          </h3>
          {/* Live Indicator */}
          <span className="flex h-2 w-2 relative" title="Live Data Connection">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
        </div>

        <div className="flex-1 w-full min-h-[200px]">
          {chartData.trend.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData.trend} margin={{ top: 5, right: 0, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={getChartColor()} stopOpacity={0.1}/>
                    <stop offset="95%" stopColor={getChartColor()} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fontSize: 10, fill: '#9ca3af'}} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fontSize: 10, fill: '#9ca3af'}} 
                  tickFormatter={formatYAxis}
                  width={35}
                />
                <Tooltip 
                  contentStyle={{borderRadius: '4px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}}
                  labelStyle={{fontSize: '11px', color: '#6b7280', marginBottom: '4px'}}
                  formatter={(value: number) => [value.toLocaleString(), "Records"]}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke={getChartColor()} 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorValue)" 
                  animationDuration={1000}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-gray-400 italic">
              No trend data available for this category.
            </div>
          )}
        </div>
      </div>

      {/* 2. REAL-TIME DEMOGRAPHICS / BREAKDOWN CHART */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-col">
        <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
          <span className="w-1 h-4 rounded-sm" style={{ backgroundColor: getChartColor() }}></span>
          {getDistributionTitle()}
        </h3>
        
        <div className="flex-1 w-full min-h-[200px]">
          {chartData.ageDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.ageDistribution} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f3f4f6" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="range" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  width={80} // Wider for text labels like "Demographic"
                  tick={{fontSize: 11, fill: '#4b5563', fontWeight: 500}} 
                />
                <Tooltip 
                  cursor={{fill: '#f9fafb'}} 
                  contentStyle={{borderRadius: '4px', fontSize: '12px', border: '1px solid #e5e7eb'}} 
                  formatter={(value: number) => [value.toLocaleString(), "Count"]}
                />
                <Bar 
                  dataKey="count" 
                  fill={getChartColor()} 
                  radius={[0, 4, 4, 0]} 
                  barSize={24}
                  animationDuration={1500}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-gray-400 italic">
              No distribution data available.
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default AnalyticsCharts;
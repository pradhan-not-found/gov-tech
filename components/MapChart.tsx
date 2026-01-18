import React, { useState, useEffect } from 'react';
import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps';
import { INDIA_TOPO_JSON, GENERIC_DATA } from '../constants'; 
import { RegionData, LayerType } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface MapChartProps {
  layer: LayerType;
  onRegionSelect: (data: RegionData) => void;
  selectedRegionId: string | null;
}

// --- 1. NEW: Explicit Mapping for Tricky States ---
// Left side: Name appearing in your Map (TopoJSON)
// Right side: Name appearing in your CSV/Backend
const STATE_NAME_MAPPING: { [key: string]: string } = {
  "nct of delhi": "delhi",
  "delhi": "delhi",
  "jammu & kashmir": "jammu and kashmir",
  "jammu and kashmir": "jammu and kashmir",
  "orissa": "odisha",
  "odisha": "odisha",
  "uttaranchal": "uttarakhand",
  "andaman & nicobar island": "andaman and nicobar islands",
  "andaman and nicobar islands": "andaman and nicobar islands",
  "dadra and nagar haveli and daman and diu": "dadra and nagar haveli",
  // Add more here if you notice other states missing!
};

const MapChart: React.FC<MapChartProps> = ({ layer, onRegionSelect, selectedRegionId }) => {
  const [geoData, setGeoData] = useState<any>(null);
  const [realMapData, setRealMapData] = useState<any>({}); 
  const { t } = useLanguage();
  
  const [position, setPosition] = useState<{ coordinates: [number, number]; zoom: number }>({
    coordinates: [82.0, 22.5937],
    zoom: 1
  });

  useEffect(() => {
    fetch(INDIA_TOPO_JSON)
      .then(response => response.json())
      .then(data => setGeoData(data))
      .catch(err => console.error("Map load error:", err));
  }, []);

  useEffect(() => {
    const fetchMapData = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/map-data');
        if (response.ok) {
          const data = await response.json();
          // Debugging: Log available keys from backend
          // console.log("Backend State Keys:", Object.keys(data)); 
          setRealMapData(data);
        }
      } catch (error) {
        console.error("Failed to fetch map data", error);
      }
    };

    fetchMapData(); 
    const interval = setInterval(fetchMapData, 5000); 
    return () => clearInterval(interval);
  }, []);

  // --- 2. UPDATED: Robust Value Getter ---
  const getValue = (geoProperties: any): RegionData => {
    // 1. Get the raw name from the map topology
    const rawName = geoProperties.name || geoProperties.st_nm || geoProperties.ST_NM || "Unknown";
    
    // 2. Standardize formatting (lowercase, remove special chars)
    let cleanName = rawName.toLowerCase().trim().replace('&', 'and');

    // 3. Check Manual Mapping first (Fixes Delhi, J&K, etc.)
    if (STATE_NAME_MAPPING[cleanName]) {
        cleanName = STATE_NAME_MAPPING[cleanName];
    }

    // 4. Try to find data in backend response
    // Attempt A: Direct match (e.g., "uttar pradesh")
    let backendData = realMapData[cleanName];

    // Attempt B: Underscore match (e.g., "uttar_pradesh")
    if (!backendData) {
        const underscoreName = cleanName.replace(/\s+/g, '_');
        backendData = realMapData[underscoreName];
    }

    // Attempt C: Fuzzy match (State name exists inside a key or vice versa)
    if (!backendData) {
       const foundKey = Object.keys(realMapData).find(key => 
          key.includes(cleanName) || cleanName.includes(key)
       );
       if (foundKey) backendData = realMapData[foundKey];
    }

    // 5. Generate UI ID
    const nameKey = `region_${cleanName.replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')}`;

    if (backendData) {
        return {
            ...GENERIC_DATA,
            id: rawName.substring(0, 3).toUpperCase(),
            name: rawName, // Keep original map name for display
            enrolmentRate: backendData.enrolment || 0, 
            updateActivity: backendData.updates || 0,
            migrationIndex: backendData.migration || 0, 
            lifecyclePending: backendData.lifecycle || 0,
            alerts: (backendData.updates > 50000) ? ['alert_gen'] : [], 
            recommendation: 'rec_gen'
        };
    }

    return {
      ...GENERIC_DATA,
      id: rawName.substring(0, 3).toUpperCase(),
      name: rawName,
      enrolmentRate: 0,
      updateActivity: 0,
      migrationIndex: 0,
      lifecyclePending: 0,
      alerts: [],
      recommendation: 'rec_gen'
    };
  };

  const getMetric = (data: RegionData) => {
    switch (layer) {
      case 'enrolment': return data.enrolmentRate;
      case 'updates': return data.updateActivity;
      case 'migration': return data.migrationIndex; 
      case 'lifecycle': return data.lifecyclePending;
      default: return 0;
    }
  };

  const colorScale = (value: number) => {
    if (layer === 'enrolment') {
       if (value === 0) return '#e0e0e0';
       if (value > 200000) return '#138808';
       if (value > 100000) return '#2e7d32'; 
       if (value > 50000) return '#4caf50'; 
       if (value > 25000) return '#8bc34a'; 
       if (value > 10000) return '#ffeb3b';
       if (value > 1000) return '#ff9800';
       return '#ffcc80';
    }
    if (layer === 'updates' || layer === 'migration') {
      if (value > 5000) return '#0d47a1'; 
      if (value > 1000) return '#1976d2'; 
      if (value > 500) return '#64b5f6'; 
      return '#bbdefb'; 
    }
    return '#333'; 
  };

  const handleZoomIn = () => {
    if (position.zoom >= 4) return;
    setPosition(pos => ({ ...pos, zoom: pos.zoom * 1.2 }));
  };

  const handleZoomOut = () => {
    if (position.zoom <= 1) return;
    setPosition(pos => ({ ...pos, zoom: pos.zoom / 1.2 }));
  };

  const handleMoveEnd = (newPos: { coordinates: [number, number]; zoom: number }) => {
    setPosition(newPos);
  };

  if (!geoData) return <div className="flex items-center justify-center h-full text-gray-500">Loading Map Topology...</div>;

  return (
    <div className="w-full h-full bg-gray-200 border border-gray-300 rounded-lg overflow-hidden relative">
      <div className="absolute top-4 left-4 bg-white/90 p-2 rounded shadow backdrop-blur-sm z-10 text-xs text-gray-600 pointer-events-none select-none">
        <p className="font-bold mb-1 uppercase tracking-wide">{t('map_legend')}</p>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{background: '#138808'}}></span>
            <span>{t('map_high')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{background: '#ff9800'}}></span>
            <span>{t('map_med')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{background: '#e0e0e0'}}></span>
            <span>{t('map_low')}</span>
          </div>
        </div>
      </div>

      <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-10">
        <button onClick={handleZoomIn} className="bg-white p-2 rounded shadow text-gray-700 hover:bg-gray-50 font-bold w-8 h-8 flex items-center justify-center border border-gray-200 transition-colors">+</button>
        <button onClick={handleZoomOut} className="bg-white p-2 rounded shadow text-gray-700 hover:bg-gray-50 font-bold w-8 h-8 flex items-center justify-center border border-gray-200 transition-colors">-</button>
      </div>

      <ComposableMap 
        projection="geoMercator"
        projectionConfig={{ scale: 1100, center: [82.0, 22.5937] }}
        className="w-full h-full"
      >
        <ZoomableGroup 
          zoom={position.zoom}
          center={position.coordinates}
          onMoveEnd={handleMoveEnd}
          minZoom={1}
          maxZoom={4}
          translateExtent={[[0, 0], [800, 600]]}
        >
          <Geographies geography={geoData}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const data = getValue(geo.properties);
                const metric = getMetric(data);
                const isSelected = selectedRegionId === data.id;

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    onClick={() => onRegionSelect(data)}
                    style={{
                      default: {
                        fill: colorScale(metric),
                        stroke: isSelected ? '#FFFFFF' : '#666',
                        strokeWidth: isSelected ? 2.5 : 0.5,
                        outline: 'none',
                        transition: 'all 0.3s ease'
                      },
                      hover: {
                        fill: colorScale(metric),
                        stroke: '#FFF',
                        strokeWidth: 1.5,
                        outline: 'none',
                        cursor: 'pointer',
                        filter: 'brightness(1.2)'
                      },
                      pressed: {
                        fill: colorScale(metric),
                        stroke: '#FFF',
                        strokeWidth: 2,
                        outline: 'none',
                      }
                    }}
                  />
                );
              })
            }
          </Geographies>
        </ZoomableGroup>
      </ComposableMap>
    </div>
  );
};

export default MapChart;
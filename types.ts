export type LayerType = 'enrolment' | 'updates' | 'migration' | 'lifecycle';

export interface RegionData {
  id: string;
  name: string;
  enrolmentRate: number; // Percentage
  updateActivity: number; // Volume index 0-100
  migrationIndex: number; // Net flow index -100 to 100
  lifecyclePending: number; // Count of pending biometric updates
  population: number;
  lastUpdated: string;
  alerts: string[];
  recommendation: string;
  chartData: {
    history: { month: string; value: number }[];
    demographics: { group: string; value: number }[];
  };
}

export interface MapTopology {
  type: string;
  objects: {
    india: {
      type: string;
      geometries: Array<{
        type: string;
        id: string;
        properties: {
          name: string;
          [key: string]: any;
        };
      }>;
    };
  };
  arcs: any[];
}

export type UserRole = 'policymaker' | 'field_worker' | 'data_supervisor';

export type LanguageCode = 'en' | 'hi' | 'bn' | 'gu' | 'mr';

export interface GovernanceAction {
  id: string;
  regionId: string;
  regionName: string;
  recommendationKey: string;
  triggerReason: string;
  timestamp: string;
  status: 'Initiated' | 'Under Review' | 'Planned';
  initiatedByUserId: string;
  initiatedByUserRole: UserRole;
}

export type DatasetType = 'Enrolment' | 'Demographic Update' | 'Biometric Update';

export interface DatasetLog {
  id: string;
  fileName: string;
  type: DatasetType;
  sizeBytes: number;
  recordCount: number;
  status: 'Success' | 'Processing' | 'Failed';
  timestamp: string;
  uploaderId: string;
}
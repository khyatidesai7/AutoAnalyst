export enum AppStage {
  UPLOAD = 'UPLOAD',
  PROFILE = 'PROFILE',
  OBJECTIVE = 'OBJECTIVE',
  DASHBOARD = 'DASHBOARD'
}

export enum DataType {
  STRING = 'String',
  NUMBER = 'Number',
  DATE = 'Date',
  BOOLEAN = 'Boolean',
  UNKNOWN = 'Unknown'
}

export interface ColumnProfile {
  name: string;
  type: DataType;
  missingCount: number;
  missingPercentage: number;
  uniqueCount: number;
  sampleValues: any[];
  min?: number | string;
  max?: number | string;
}

export interface Dataset {
  name: string;
  rows: any[];
  columns: string[];
  profile: ColumnProfile[];
  rowCount: number;
}

export interface ChartConfig {
  id: string;
  type: 'bar' | 'line' | 'area' | 'pie' | 'scatter';
  title: string;
  description: string;
  xKey: string;
  dataKeys: string[];
  colors?: string[];
}

export interface Insight {
  type: 'success' | 'warning' | 'info';
  title: string;
  content: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}
export interface MaterialBatch {
  id: string;
  batchNo: string;
  materialName: string;
  materialType: string;
  specification: string;
  quantity: number;
  unit: string;
  supplier?: string;
  arrivalDate: string;
  constructionSite: string;
  createdBy: string;
  status: BatchStatus;
  isArchived: boolean;
  materialList?: any;
  createdAt: string;
  updatedAt: string;
  witnessRecords?: WitnessRecord[];
  sampleSeals?: SampleSeal[];
  inspectionOrders?: InspectionOrder[];
  rectifications?: Rectification[];
  operationLogs?: OperationLog[];
}

export type BatchStatus = 'DRAFT' | 'WITNESSED' | 'SUBMITTED' | 'TESTED' | 'RECTIFICATION' | 'ARCHIVED' | 'REJECTED';

export interface WitnessRecord {
  id: string;
  batchId: string;
  witnessDate: string;
  witnessBy: string;
  witnessName: string;
  sitePhotos: string[];
  remarks?: string;
  createdAt: string;
}

export interface SampleSeal {
  id: string;
  batchId: string;
  sampleNo: string;
  sealNo: string;
  sampleName: string;
  specification?: string;
  quantity: number;
  samplingPoint?: string;
  sampledBy: string;
  samplingDate: string;
  status: SampleSealStatus;
  sealedBy?: string;
  sealDate?: string;
  createdAt: string;
}

export type SampleSealStatus = 'CREATED' | 'SUBMITTED' | 'RECEIVED' | 'TESTED';

export interface InspectionOrder {
  id: string;
  orderNo: string;
  batchId: string;
  submitDate: string;
  submittedBy: string;
  testingOrg: string;
  testingItems: string[];
  status: string;
  receivedDate?: string;
  receivedBy?: string;
  createdAt: string;
  items?: InspectionOrderItem[];
  reports?: TestReport[];
  batch?: MaterialBatch;
}

export interface InspectionOrderItem {
  id: string;
  inspectionOrderId: string;
  sampleSealId: string;
  testingItems: string[];
  sampleSeal?: SampleSeal;
}

export interface TestReport {
  id: string;
  reportNo: string;
  inspectionOrderId: string;
  testDate: string;
  testedBy: string;
  result: ReportResult;
  conclusion: string;
  reportFile?: string;
  testItems?: any;
  createdAt: string;
  inspectionOrder?: InspectionOrder;
}

export type ReportResult = 'PASS' | 'FAIL' | 'PENDING';

export interface Rectification {
  id: string;
  batchId: string;
  reportId: string;
  title: string;
  description: string;
  rectificationMeasures?: string;
  deadline?: string;
  status: RectificationStatus;
  createdBy: string;
  closedBy?: string;
  closedAt?: string;
  reInspectionReportId?: string;
  createdAt: string;
  batch?: MaterialBatch;
  report?: TestReport;
}

export type RectificationStatus = 'OPEN' | 'IN_PROGRESS' | 'CLOSED' | 'REINSPECTED';

export interface OperationLog {
  id: string;
  batchId?: string;
  operation: string;
  operator: string;
  operatorName: string;
  operatorRole: string;
  details?: any;
  ipAddress?: string;
  createdAt: string;
  batch?: { batchNo: string; materialName: string };
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: any;
}

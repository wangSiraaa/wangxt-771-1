import prisma from './prisma';
import { UserRole } from '@prisma/client';

interface LogOperationParams {
  batchId?: string;
  operation: string;
  operator: string;
  operatorName: string;
  operatorRole: UserRole;
  details?: Record<string, any>;
  ipAddress?: string;
}

export async function logOperation(params: LogOperationParams) {
  return prisma.operationLog.create({
    data: {
      batchId: params.batchId,
      operation: params.operation,
      operator: params.operator,
      operatorName: params.operatorName,
      operatorRole: params.operatorRole,
      details: params.details,
      ipAddress: params.ipAddress,
    },
  });
}

export const OperationTypes = {
  BATCH_CREATE: 'BATCH_CREATE',
  BATCH_UPDATE: 'BATCH_UPDATE',
  BATCH_WITNESS: 'BATCH_WITNESS',
  BATCH_SUBMIT: 'BATCH_SUBMIT',
  BATCH_ARCHIVE: 'BATCH_ARCHIVE',
  WITNESS_LOCK: 'WITNESS_LOCK',
  WITNESS_UNLOCK: 'WITNESS_UNLOCK',
  SAMPLE_SEAL_CREATE: 'SAMPLE_SEAL_CREATE',
  SAMPLE_SEAL_SUBMIT: 'SAMPLE_SEAL_SUBMIT',
  INSPECTION_CREATE: 'INSPECTION_CREATE',
  INSPECTION_RECEIVE: 'INSPECTION_RECEIVE',
  REPORT_CREATE: 'REPORT_CREATE',
  REPORT_FAIL: 'REPORT_FAIL',
  RECTIFICATION_CREATE: 'RECTIFICATION_CREATE',
  RECTIFICATION_CLOSE: 'RECTIFICATION_CLOSE',
  RECTIFICATION_REINSPECT: 'RECTIFICATION_REINSPECT',
};

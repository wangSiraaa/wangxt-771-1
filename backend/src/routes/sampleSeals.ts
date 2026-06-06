import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../utils/prisma';
import { logOperation, OperationTypes } from '../utils/operationLogger';
import { UserRole, SampleSealStatus, BatchStatus } from '@prisma/client';

const router = Router();

const mockSupervisionUser = {
  id: 'test-supervision-001',
  name: '测试监理',
  role: UserRole.SUPERVISION,
};

const createSampleSealSchema = z.object({
  batchId: z.string().min(1),
  sampleNo: z.string().min(1),
  sampleName: z.string().min(1),
  specification: z.string().optional(),
  quantity: z.number().int().positive(),
  samplingPoint: z.string().optional(),
  samplingDate: z.coerce.date(),
});

function generateSealNo(): string {
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `SEAL-${timestamp}-${random}`;
}

router.get('/batch/:batchId', async (req: Request, res: Response) => {
  try {
    const sampleSeals = await prisma.sampleSeal.findMany({
      where: { batchId: req.params.batchId },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: sampleSeals });
  } catch (error) {
    res.status(500).json({ success: false, message: '查询失败', error: (error as Error).message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const sampleSeal = await prisma.sampleSeal.findUnique({
      where: { id: req.params.id },
      include: {
        batch: true,
        inspectionOrderItems: {
          include: { inspectionOrder: { include: { reports: true } } },
        },
      },
    });

    if (!sampleSeal) {
      return res.status(404).json({ success: false, message: '封签不存在' });
    }

    res.json({ success: true, data: sampleSeal });
  } catch (error) {
    res.status(500).json({ success: false, message: '查询失败', error: (error as Error).message });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const validated = createSampleSealSchema.parse(req.body);

    const batch = await prisma.materialBatch.findUnique({
      where: { id: validated.batchId },
      include: { witnessRecords: true },
    });

    if (!batch) {
      return res.status(404).json({ success: false, message: '批次不存在' });
    }

    if (batch.isWitnessLocked) {
      return res.status(400).json({
        success: false,
        message: '该批次已被见证锁定，无法创建新的样品封签',
      });
    }

    if (batch.witnessRecords.length === 0) {
      return res.status(400).json({
        success: false,
        message: '该批次尚无监理见证记录，请先完成见证',
      });
    }

    const existingSample = await prisma.sampleSeal.findFirst({
      where: {
        batchId: validated.batchId,
        sampleNo: validated.sampleNo,
      },
    });

    if (existingSample) {
      return res.status(400).json({
        success: false,
        message: `同一批次下样品号 ${validated.sampleNo} 已存在，不能重复`,
      });
    }

    const sealNo = generateSealNo();

    const sampleSeal = await prisma.sampleSeal.create({
      data: {
        ...validated,
        sealNo,
        sampledBy: mockSupervisionUser.id,
        sealedBy: mockSupervisionUser.id,
        sealDate: new Date(),
        status: SampleSealStatus.CREATED,
      },
    });

    await logOperation({
      batchId: validated.batchId,
      operation: OperationTypes.SAMPLE_SEAL_CREATE,
      operator: mockSupervisionUser.id,
      operatorName: mockSupervisionUser.name,
      operatorRole: mockSupervisionUser.role,
      details: { sampleNo: validated.sampleNo, sealNo, sampleName: validated.sampleName },
      ipAddress: req.ip,
    });

    res.status(201).json({ success: true, data: sampleSeal });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: '参数验证失败', errors: error.errors });
    }
    res.status(500).json({ success: false, message: '封签创建失败', error: (error as Error).message });
  }
});

export default router;

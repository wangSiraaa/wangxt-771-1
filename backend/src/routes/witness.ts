import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { logOperation, OperationTypes } from '../utils/operationLogger';
import { UserRole, BatchStatus } from '@prisma/client';

const router = Router();

const mockSupervisionUser = {
  id: 'test-supervision-001',
  name: '测试监理',
  role: UserRole.SUPERVISION,
};

const createWitnessSchema = z.object({
  batchId: z.string().min(1),
  witnessDate: z.coerce.date(),
  sitePhotos: z.array(z.string()).min(1, '至少需要上传一张见证照片'),
  remarks: z.string().optional(),
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const validated = createWitnessSchema.parse(req.body);

    const batch = await prisma.materialBatch.findUnique({
      where: { id: validated.batchId },
    });

    if (!batch) {
      return res.status(404).json({ success: false, message: '批次不存在' });
    }

    const witnessRecord = await prisma.witnessRecord.create({
      data: {
        batchId: validated.batchId,
        witnessDate: validated.witnessDate,
        witnessBy: mockSupervisionUser.id,
        witnessName: mockSupervisionUser.name,
        sitePhotos: validated.sitePhotos,
        remarks: validated.remarks,
      },
    });

    await prisma.materialBatch.update({
      where: { id: validated.batchId },
      data: { status: BatchStatus.WITNESSED },
    });

    await logOperation({
      batchId: validated.batchId,
      operation: OperationTypes.BATCH_WITNESS,
      operator: mockSupervisionUser.id,
      operatorName: mockSupervisionUser.name,
      operatorRole: mockSupervisionUser.role,
      details: { witnessDate: validated.witnessDate, photoCount: validated.sitePhotos.length },
      ipAddress: req.ip,
    });

    res.status(201).json({ success: true, data: witnessRecord });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: '参数验证失败', errors: error.errors });
    }
    res.status(500).json({ success: false, message: '见证记录创建失败', error: (error as Error).message });
  }
});

router.get('/batch/:batchId', async (req: Request, res: Response) => {
  try {
    const records = await prisma.witnessRecord.findMany({
      where: { batchId: req.params.batchId },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: records });
  } catch (error) {
    res.status(500).json({ success: false, message: '查询失败', error: (error as Error).message });
  }
});

export default router;

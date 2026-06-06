import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { logOperation, OperationTypes } from '../utils/operationLogger';
import { UserRole, RectificationStatus, BatchStatus } from '@prisma/client';

const router = Router();

const mockSupervisionUser = {
  id: 'test-supervision-001',
  name: '测试监理',
  role: UserRole.SUPERVISION,
};

const mockConstructionUser = {
  id: 'test-user-001',
  name: '测试施工员',
  role: UserRole.CONSTRUCTION_COMPANY,
};

const updateRectificationSchema = z.object({
  rectificationMeasures: z.string().optional(),
  deadline: z.coerce.date().optional(),
});

router.get('/', async (req: Request, res: Response) => {
  try {
    const { batchId, status } = req.query;
    const where: any = {};
    if (batchId) where.batchId = String(batchId);
    if (status) where.status = status as RectificationStatus;

    const rectifications = await prisma.rectification.findMany({
      where,
      include: {
        batch: true,
        report: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: rectifications });
  } catch (error) {
    res.status(500).json({ success: false, message: '查询失败', error: (error as Error).message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const rectification = await prisma.rectification.findUnique({
      where: { id: req.params.id },
      include: {
        batch: true,
        report: true,
      },
    });

    if (!rectification) {
      return res.status(404).json({ success: false, message: '整改任务不存在' });
    }

    res.json({ success: true, data: rectification });
  } catch (error) {
    res.status(500).json({ success: false, message: '查询失败', error: (error as Error).message });
  }
});

router.get('/batch/:batchId', async (req: Request, res: Response) => {
  try {
    const rectifications = await prisma.rectification.findMany({
      where: { batchId: req.params.batchId },
      include: {
        batch: true,
        report: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: rectifications });
  } catch (error) {
    res.status(500).json({ success: false, message: '查询失败', error: (error as Error).message });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const validated = updateRectificationSchema.parse(req.body);

    const rectification = await prisma.rectification.findUnique({
      where: { id: req.params.id },
    });

    if (!rectification) {
      return res.status(404).json({ success: false, message: '整改任务不存在' });
    }

    const updatedRectification = await prisma.rectification.update({
      where: { id: req.params.id },
      data: {
        rectificationMeasures: validated.rectificationMeasures,
        deadline: validated.deadline,
        status: RectificationStatus.IN_PROGRESS,
      },
    });

    res.json({ success: true, data: updatedRectification });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: '参数验证失败', errors: error.errors });
    }
    res.status(500).json({ success: false, message: '更新失败', error: (error as Error).message });
  }
});

router.post('/:id/close', async (req: Request, res: Response) => {
  try {
    const { rectificationMeasures } = req.body;

    const rectification = await prisma.rectification.findUnique({
      where: { id: req.params.id },
      include: { batch: true },
    });

    if (!rectification) {
      return res.status(404).json({ success: false, message: '整改任务不存在' });
    }

    const updatedRectification = await prisma.rectification.update({
      where: { id: req.params.id },
      data: {
        status: RectificationStatus.CLOSED,
        closedBy: mockSupervisionUser.id,
        closedAt: new Date(),
        rectificationMeasures: rectificationMeasures || rectification.rectificationMeasures,
      },
    });

    const openRectifications = await prisma.rectification.count({
      where: {
        batchId: rectification.batchId,
        status: { in: [RectificationStatus.OPEN, RectificationStatus.IN_PROGRESS] },
      },
    });

    if (openRectifications === 0) {
      await prisma.materialBatch.update({
        where: { id: rectification.batchId },
        data: { status: BatchStatus.TESTED },
      });
    }

    await logOperation({
      batchId: rectification.batchId,
      operation: OperationTypes.RECTIFICATION_CLOSE,
      operator: mockSupervisionUser.id,
      operatorName: mockSupervisionUser.name,
      operatorRole: mockSupervisionUser.role,
      details: { rectificationId: req.params.id },
      ipAddress: req.ip,
    });

    res.json({ success: true, data: updatedRectification });
  } catch (error) {
    res.status(500).json({ success: false, message: '关闭失败', error: (error as Error).message });
  }
});

export default router;

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { logOperation, OperationTypes } from '../utils/operationLogger';
import {
  UserRole,
  BatchStatus,
  SampleSealStatus,
} from '@prisma/client';

const router = Router();

const mockUser = {
  construction: {
    id: 'test-user-001',
    name: '测试施工员',
    role: UserRole.CONSTRUCTION_COMPANY,
  },
  testing: {
    id: 'test-testing-001',
    name: '测试检测员',
    role: UserRole.TESTING_ORG,
  },
};

const createInspectionOrderSchema = z.object({
  batchId: z.string().min(1),
  testingOrg: z.string().min(1),
  testingItems: z.array(z.string()).min(1),
  sampleSealIds: z.array(z.string()).min(1),
});

function generateOrderNo(): string {
  const timestamp = Date.now().toString().slice(-10);
  return `INS-${timestamp}`;
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const { batchId, status } = req.query;
    const where: any = {};
    if (batchId) where.batchId = String(batchId);
    if (status) where.status = String(status);

    const orders = await prisma.inspectionOrder.findMany({
      where,
      include: {
        batch: true,
        items: { include: { sampleSeal: true } },
        reports: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, message: '查询失败', error: (error as Error).message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const order = await prisma.inspectionOrder.findUnique({
      where: { id: req.params.id },
      include: {
        batch: { include: { witnessRecords: true } },
        items: { include: { sampleSeal: true } },
        reports: true,
      },
    });

    if (!order) {
      return res.status(404).json({ success: false, message: '送检单不存在' });
    }

    res.json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: '查询失败', error: (error as Error).message });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const validated = createInspectionOrderSchema.parse(req.body);

    const batch = await prisma.materialBatch.findUnique({
      where: { id: validated.batchId },
      include: { witnessRecords: true, sampleSeals: true },
    });

    if (!batch) {
      return res.status(404).json({ success: false, message: '批次不存在' });
    }

    const hasWitnessWithPhotos = batch.witnessRecords.some(
      (w) => w.sitePhotos && w.sitePhotos.length > 0
    );

    if (!hasWitnessWithPhotos) {
      return res.status(400).json({
        success: false,
        message: '没有监理见证照片，不得送检，请先上传见证照片',
      });
    }

    const sampleSeals = await prisma.sampleSeal.findMany({
      where: { id: { in: validated.sampleSealIds } },
    });

    if (sampleSeals.length !== validated.sampleSealIds.length) {
      return res.status(400).json({
        success: false,
        message: '部分样品封签不存在',
      });
    }

    const invalidSamples = sampleSeals.filter((s) => s.batchId !== validated.batchId);
    if (invalidSamples.length > 0) {
      return res.status(400).json({
        success: false,
        message: '存在不属于当前批次的样品封签',
      });
    }

    const orderNo = generateOrderNo();

    const inspectionOrder = await prisma.inspectionOrder.create({
      data: {
        orderNo,
        batchId: validated.batchId,
        submitDate: new Date(),
        submittedBy: mockUser.construction.id,
        testingOrg: validated.testingOrg,
        testingItems: validated.testingItems,
        status: 'SUBMITTED',
        items: {
          create: validated.sampleSealIds.map((sampleSealId) => ({
            sampleSealId,
            testingItems: validated.testingItems,
          })),
        },
      },
      include: { items: true },
    });

    await prisma.sampleSeal.updateMany({
      where: { id: { in: validated.sampleSealIds } },
      data: { status: SampleSealStatus.SUBMITTED },
    });

    await prisma.materialBatch.update({
      where: { id: validated.batchId },
      data: { status: BatchStatus.SUBMITTED },
    });

    await logOperation({
      batchId: validated.batchId,
      operation: OperationTypes.INSPECTION_CREATE,
      operator: mockUser.construction.id,
      operatorName: mockUser.construction.name,
      operatorRole: mockUser.construction.role,
      details: { orderNo, testingOrg: validated.testingOrg, sampleCount: validated.sampleSealIds.length },
      ipAddress: req.ip,
    });

    res.status(201).json({ success: true, data: inspectionOrder });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: '参数验证失败', errors: error.errors });
    }
    res.status(500).json({ success: false, message: '送检单创建失败', error: (error as Error).message });
  }
});

router.post('/:id/receive', async (req: Request, res: Response) => {
  try {
    const order = await prisma.inspectionOrder.findUnique({
      where: { id: req.params.id },
      include: { items: true },
    });

    if (!order) {
      return res.status(404).json({ success: false, message: '送检单不存在' });
    }

    if (order.status === 'RECEIVED') {
      return res.status(400).json({ success: false, message: '送检单已签收' });
    }

    const sampleSealIds = order.items.map((item) => item.sampleSealId);

    const updatedOrder = await prisma.inspectionOrder.update({
      where: { id: req.params.id },
      data: {
        status: 'RECEIVED',
        receivedDate: new Date(),
        receivedBy: mockUser.testing.id,
      },
    });

    await prisma.sampleSeal.updateMany({
      where: { id: { in: sampleSealIds } },
      data: { status: SampleSealStatus.RECEIVED },
    });

    await logOperation({
      batchId: order.batchId,
      operation: OperationTypes.INSPECTION_RECEIVE,
      operator: mockUser.testing.id,
      operatorName: mockUser.testing.name,
      operatorRole: mockUser.testing.role,
      details: { orderNo: order.orderNo },
      ipAddress: req.ip,
    });

    res.json({ success: true, data: updatedOrder });
  } catch (error) {
    res.status(500).json({ success: false, message: '签收失败', error: (error as Error).message });
  }
});

export default router;

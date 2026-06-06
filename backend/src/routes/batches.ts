import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { logOperation, OperationTypes } from '../utils/operationLogger';
import { UserRole, BatchStatus } from '@prisma/client';

const router = Router();

const createBatchSchema = z.object({
  batchNo: z.string().min(1),
  materialName: z.string().min(1),
  materialType: z.string().min(1),
  specification: z.string().min(1),
  quantity: z.number().int().positive(),
  unit: z.string().min(1),
  supplier: z.string().optional(),
  arrivalDate: z.coerce.date(),
  constructionSite: z.string().min(1),
  materialList: z.any().optional(),
});

const mockUser = {
  id: 'test-user-001',
  name: '测试施工员',
  role: UserRole.CONSTRUCTION_COMPANY,
};

router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, isArchived, keyword, site, isAbnormal } = req.query;
    
    const where: any = {};
    
    if (status && status !== 'all') {
      where.status = status as BatchStatus;
    }
    
    if (isArchived !== undefined) {
      where.isArchived = isArchived === 'true';
    }
    
    if (isAbnormal === 'true') {
      where.OR = [
        { status: BatchStatus.RECTIFICATION },
        { rectifications: { some: { status: { not: 'CLOSED' } } } },
      ];
    }
    
    if (keyword) {
      where.OR = [
        { batchNo: { contains: String(keyword) } },
        { materialName: { contains: String(keyword) } },
      ];
    }
    
    if (site) {
      where.constructionSite = String(site);
    }

    const batches = await prisma.materialBatch.findMany({
      where,
      include: {
        witnessRecords: true,
        sampleSeals: true,
        inspectionOrders: { include: { reports: true } },
        rectifications: true,
        _count: {
          select: { rectifications: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: batches });
  } catch (error) {
    res.status(500).json({ success: false, message: '查询失败', error: (error as Error).message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const batch = await prisma.materialBatch.findUnique({
      where: { id: req.params.id },
      include: {
        witnessRecords: true,
        sampleSeals: true,
        inspectionOrders: {
          include: {
            items: { include: { sampleSeal: true } },
            reports: true,
          },
        },
        rectifications: true,
        operationLogs: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!batch) {
      return res.status(404).json({ success: false, message: '批次不存在' });
    }

    res.json({ success: true, data: batch });
  } catch (error) {
    res.status(500).json({ success: false, message: '查询失败', error: (error as Error).message });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const validated = createBatchSchema.parse(req.body);

    const existingBatch = await prisma.materialBatch.findUnique({
      where: { batchNo: validated.batchNo },
    });

    if (existingBatch) {
      return res.status(400).json({ success: false, message: '批次号已存在' });
    }

    const batch = await prisma.materialBatch.create({
      data: {
        ...validated,
        createdBy: mockUser.id,
        status: BatchStatus.DRAFT,
      },
    });

    await logOperation({
      batchId: batch.id,
      operation: OperationTypes.BATCH_CREATE,
      operator: mockUser.id,
      operatorName: mockUser.name,
      operatorRole: mockUser.role,
      details: { batchNo: batch.batchNo, materialName: batch.materialName },
      ipAddress: req.ip,
    });

    res.status(201).json({ success: true, data: batch });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: '参数验证失败', errors: error.errors });
    }
    res.status(500).json({ success: false, message: '创建失败', error: (error as Error).message });
  }
});

router.post('/:id/archive', async (req: Request, res: Response) => {
  try {
    const batch = await prisma.materialBatch.findUnique({
      where: { id: req.params.id },
      include: { rectifications: true },
    });

    if (!batch) {
      return res.status(404).json({ success: false, message: '批次不存在' });
    }

    const openRectifications = batch.rectifications.filter(
      (r) => r.status !== 'CLOSED' && r.status !== 'REINSPECTED'
    );

    if (openRectifications.length > 0) {
      return res.status(400).json({
        success: false,
        message: '存在未关闭的整改任务，无法归档',
      });
    }

    const updatedBatch = await prisma.materialBatch.update({
      where: { id: req.params.id },
      data: {
        isArchived: true,
        status: BatchStatus.ARCHIVED,
      },
    });

    await logOperation({
      batchId: batch.id,
      operation: OperationTypes.BATCH_ARCHIVE,
      operator: mockUser.id,
      operatorName: mockUser.name,
      operatorRole: mockUser.role,
      ipAddress: req.ip,
    });

    res.json({ success: true, data: updatedBatch });
  } catch (error) {
    res.status(500).json({ success: false, message: '归档失败', error: (error as Error).message });
  }
});

export default router;

import { Router, Request, Response } from 'express';
import prisma from '../utils/prisma';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const { batchId, operator, operation } = req.query;
    const where: any = {};
    
    if (batchId) where.batchId = String(batchId);
    if (operator) where.operator = String(operator);
    if (operation) where.operation = String(operation);

    const logs = await prisma.operationLog.findMany({
      where,
      include: { batch: { select: { batchNo: true, materialName: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    res.json({ success: true, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, message: '查询失败', error: (error as Error).message });
  }
});

export default router;

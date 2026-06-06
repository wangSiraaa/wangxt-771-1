import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { logOperation, OperationTypes } from '../utils/operationLogger';
import {
  UserRole,
  ReportResult,
  BatchStatus,
  SampleSealStatus,
  RectificationStatus,
} from '@prisma/client';

const router = Router();

const mockTestingUser = {
  id: 'test-testing-001',
  name: '测试检测员',
  role: UserRole.TESTING_ORG,
};

const mockSupervisionUser = {
  id: 'test-supervision-001',
  name: '测试监理',
  role: UserRole.SUPERVISION,
};

const createReportSchema = z.object({
  inspectionOrderId: z.string().min(1),
  testDate: z.coerce.date(),
  result: z.enum(['PASS', 'FAIL', 'PENDING']),
  conclusion: z.string().min(1),
  testItems: z.any().optional(),
});

function generateReportNo(): string {
  const timestamp = Date.now().toString().slice(-10);
  return `RPT-${timestamp}`;
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const { batchId, result } = req.query;
    const where: any = {};
    if (batchId) {
      where.inspectionOrder = { batchId: String(batchId) };
    }
    if (result) where.result = result as ReportResult;

    const reports = await prisma.testReport.findMany({
      where,
      include: {
        inspectionOrder: {
          include: {
            batch: true,
            items: { include: { sampleSeal: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: reports });
  } catch (error) {
    res.status(500).json({ success: false, message: '查询失败', error: (error as Error).message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const report = await prisma.testReport.findUnique({
      where: { id: req.params.id },
      include: {
        inspectionOrder: {
          include: {
            batch: true,
            items: { include: { sampleSeal: true } },
          },
        },
      },
    });

    if (!report) {
      return res.status(404).json({ success: false, message: '报告不存在' });
    }

    res.json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({ success: false, message: '查询失败', error: (error as Error).message });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const validated = createReportSchema.parse(req.body);

    const inspectionOrder = await prisma.inspectionOrder.findUnique({
      where: { id: validated.inspectionOrderId },
      include: {
        batch: true,
        items: { include: { sampleSeal: true } },
      },
    });

    if (!inspectionOrder) {
      return res.status(404).json({ success: false, message: '送检单不存在' });
    }

    if (inspectionOrder.status !== 'RECEIVED') {
      return res.status(400).json({
        success: false,
        message: '检测机构只能回填已签收样品的报告，该送检单尚未签收',
      });
    }

    const reportNo = generateReportNo();

    const report = await prisma.testReport.create({
      data: {
        reportNo,
        inspectionOrderId: validated.inspectionOrderId,
        testDate: validated.testDate,
        testedBy: mockTestingUser.id,
        result: validated.result as ReportResult,
        conclusion: validated.conclusion,
        testItems: validated.testItems,
      },
    });

    const sampleSealIds = inspectionOrder.items.map((item) => item.sampleSealId);
    await prisma.sampleSeal.updateMany({
      where: { id: { in: sampleSealIds } },
      data: { status: SampleSealStatus.TESTED },
    });

    await prisma.materialBatch.update({
      where: { id: inspectionOrder.batchId },
      data: { status: BatchStatus.TESTED },
    });

    await logOperation({
      batchId: inspectionOrder.batchId,
      operation: OperationTypes.REPORT_CREATE,
      operator: mockTestingUser.id,
      operatorName: mockTestingUser.name,
      operatorRole: mockTestingUser.role,
      details: { reportNo, result: validated.result, conclusion: validated.conclusion },
      ipAddress: req.ip,
    });

    if (validated.result === 'FAIL') {
      await logOperation({
        batchId: inspectionOrder.batchId,
        operation: OperationTypes.REPORT_FAIL,
        operator: mockTestingUser.id,
        operatorName: mockTestingUser.name,
        operatorRole: mockTestingUser.role,
        details: { reportNo, conclusion: validated.conclusion },
        ipAddress: req.ip,
      });

      const rectification = await prisma.rectification.create({
        data: {
          batchId: inspectionOrder.batchId,
          reportId: report.id,
          title: `检测不合格整改 - ${inspectionOrder.batch.materialName}`,
          description: `检测报告编号: ${reportNo}\n检测结论: ${validated.conclusion}\n该批次材料检测不合格，需进行整改。`,
          status: RectificationStatus.OPEN,
          createdBy: mockSupervisionUser.id,
        },
      });

      await prisma.materialBatch.update({
        where: { id: inspectionOrder.batchId },
        data: { status: BatchStatus.RECTIFICATION },
      });

      await logOperation({
        batchId: inspectionOrder.batchId,
        operation: OperationTypes.RECTIFICATION_CREATE,
        operator: mockSupervisionUser.id,
        operatorName: mockSupervisionUser.name,
        operatorRole: mockSupervisionUser.role,
        details: { rectificationId: rectification.id, reportNo },
        ipAddress: req.ip,
      });

      return res.status(201).json({
        success: true,
        data: {
          report,
          rectificationCreated: true,
          rectification,
          message: '报告已提交，检测不合格，已自动生成整改任务',
        },
      });
    }

    res.status(201).json({ success: true, data: { report, rectificationCreated: false } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: '参数验证失败', errors: error.errors });
    }
    res.status(500).json({ success: false, message: '报告提交失败', error: (error as Error).message });
  }
});

export default router;

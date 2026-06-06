import { PrismaClient, UserRole, BatchStatus, SampleSealStatus, ReportResult, RectificationStatus } from '@prisma/client';
import prisma from './utils/prisma';

async function main() {
  console.log('开始播种数据...');

  const users = [
    {
      id: 'user-construction-001',
      username: 'construction01',
      name: '张施工',
      role: UserRole.CONSTRUCTION_COMPANY,
      password: 'hashed_password_1',
    },
    {
      id: 'user-supervision-001',
      username: 'supervision01',
      name: '李监理',
      role: UserRole.SUPERVISION,
      password: 'hashed_password_2',
    },
    {
      id: 'user-testing-001',
      username: 'testing01',
      name: '王检测',
      role: UserRole.TESTING_ORG,
      password: 'hashed_password_3',
    },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { id: user.id },
      update: {},
      create: user,
    });
    console.log(`创建用户: ${user.name} (${user.role})`);
  }

  const batch1 = await prisma.materialBatch.upsert({
    where: { batchNo: 'PC-2024-001' },
    update: {},
    create: {
      batchNo: 'PC-2024-001',
      materialName: '钢筋',
      materialType: '建筑钢材',
      specification: 'HRB400 Φ16',
      quantity: 100,
      unit: '吨',
      supplier: '鞍钢集团',
      arrivalDate: new Date('2024-01-15'),
      constructionSite: '一号工地A区',
      materialList: ['钢筋质保书', '出厂合格证'],
      createdBy: 'user-construction-001',
      status: BatchStatus.DRAFT,
    },
  });
  console.log(`创建批次: ${batch1.batchNo}`);

  const batch2 = await prisma.materialBatch.upsert({
    where: { batchNo: 'PC-2024-002' },
    update: {},
    create: {
      batchNo: 'PC-2024-002',
      materialName: '商品混凝土',
      materialType: '混凝土',
      specification: 'C30',
      quantity: 500,
      unit: '立方米',
      supplier: '中建商混',
      arrivalDate: new Date('2024-01-16'),
      constructionSite: '一号工地B区',
      materialList: ['配合比报告', '开盘鉴定'],
      createdBy: 'user-construction-001',
      status: BatchStatus.WITNESSED,
    },
  });
  console.log(`创建批次: ${batch2.batchNo}`);

  const witness1 = await prisma.witnessRecord.create({
    data: {
      batchId: batch2.id,
      witnessBy: 'user-supervision-001',
      witnessName: '李监理',
      witnessDate: new Date('2024-01-17'),
      sitePhotos: ['/photos/witness-20240117-1.jpg', '/photos/witness-20240117-2.jpg'],
      remarks: '现场见证取样，数量符合要求',
    },
  });
  console.log(`创建见证记录: ${witness1.id}`);

  const sampleSeal1 = await prisma.sampleSeal.create({
    data: {
      batchId: batch2.id,
      sampleNo: 'S001',
      sampleName: '混凝土试块-1',
      sealNo: 'SEAL-2024-0001',
      quantity: 3,
      samplingPoint: 'B区3层墙柱',
      sampledBy: 'user-supervision-001',
      samplingDate: new Date('2024-01-17'),
      sealedBy: 'user-supervision-001',
      sealDate: new Date('2024-01-17'),
      status: SampleSealStatus.SUBMITTED,
    },
  });
  console.log(`创建封签: ${sampleSeal1.sealNo}`);

  const inspectionOrder1 = await prisma.inspectionOrder.create({
    data: {
      orderNo: 'INS-2024-0001',
      batchId: batch2.id,
      testingOrg: '市建筑材料检测中心',
      testingItems: ['抗压强度', '坍落度'],
      submittedBy: 'user-construction-001',
      submitDate: new Date('2024-01-18'),
      status: 'RECEIVED',
      receivedDate: new Date('2024-01-19'),
      receivedBy: 'user-testing-001',
      items: {
        create: [
          { sampleSealId: sampleSeal1.id, testingItems: ['抗压强度', '坍落度'] },
        ],
      },
    },
  });
  console.log(`创建送检单: ${inspectionOrder1.orderNo}`);

  const testReport1 = await prisma.testReport.create({
    data: {
      reportNo: 'REP-2024-0001',
      inspectionOrderId: inspectionOrder1.id,
      testDate: new Date('2024-01-20'),
      result: ReportResult.PASS,
      conclusion: '经检测，该批次混凝土试块抗压强度符合设计要求，坍落度合格。',
      testedBy: 'user-testing-001',
    },
  });
  console.log(`创建检测报告: ${testReport1.reportNo}`);

  await prisma.materialBatch.update({
    where: { id: batch2.id },
    data: { status: BatchStatus.TESTED },
  });

  const batch3 = await prisma.materialBatch.upsert({
    where: { batchNo: 'PC-2024-003' },
    update: {},
    create: {
      batchNo: 'PC-2024-003',
      materialName: '水泥',
      materialType: '胶凝材料',
      specification: 'P.O 42.5',
      quantity: 200,
      unit: '吨',
      supplier: '海螺水泥',
      arrivalDate: new Date('2024-01-18'),
      constructionSite: '二号工地',
      materialList: ['水泥合格证', '三天强度报告'],
      createdBy: 'user-construction-001',
      status: BatchStatus.RECTIFICATION,
    },
  });
  console.log(`创建批次: ${batch3.batchNo}`);

  const witness3 = await prisma.witnessRecord.create({
    data: {
      batchId: batch3.id,
      witnessBy: 'user-supervision-001',
      witnessName: '李监理',
      witnessDate: new Date('2024-01-19'),
      sitePhotos: ['/photos/witness-20240119-1.jpg'],
      remarks: '现场见证',
    },
  });

  const sampleSeal3 = await prisma.sampleSeal.create({
    data: {
      batchId: batch3.id,
      sampleNo: 'S001',
      sampleName: '水泥试样-1',
      sealNo: 'SEAL-2024-0003',
      quantity: 10,
      samplingPoint: '二号工地仓库',
      sampledBy: 'user-supervision-001',
      samplingDate: new Date('2024-01-19'),
      sealedBy: 'user-supervision-001',
      sealDate: new Date('2024-01-19'),
      status: SampleSealStatus.SUBMITTED,
    },
  });

  const inspectionOrder3 = await prisma.inspectionOrder.create({
    data: {
      orderNo: 'INS-2024-0003',
      batchId: batch3.id,
      testingOrg: '市建筑材料检测中心',
      testingItems: ['安定性', '强度'],
      submittedBy: 'user-construction-001',
      submitDate: new Date('2024-01-20'),
      status: 'RECEIVED',
      receivedDate: new Date('2024-01-21'),
      receivedBy: 'user-testing-001',
      items: {
        create: [{ sampleSealId: sampleSeal3.id, testingItems: ['安定性', '强度'] }],
      },
    },
  });

  const testReport3 = await prisma.testReport.create({
    data: {
      reportNo: 'REP-2024-0003',
      inspectionOrderId: inspectionOrder3.id,
      testDate: new Date('2024-01-22'),
      result: ReportResult.FAIL,
      conclusion: '安定性检测不合格，体积安定性不符合GB 175-2007标准要求。',
      testedBy: 'user-testing-001',
    },
  });

  const rectification1 = await prisma.rectification.create({
    data: {
      batchId: batch3.id,
      reportId: testReport3.id,
      title: '检测不合格整改 - 水泥',
      description: '检测报告编号: REP-2024-0003\n检测结论: 安定性检测不合格',
      status: RectificationStatus.OPEN,
      createdBy: 'user-supervision-001',
    },
  });
  console.log(`创建整改任务: ${rectification1.title}`);

  await prisma.operationLog.createMany({
    data: [
      {
        batchId: batch1.id,
        operation: 'BATCH_CREATE',
        operator: 'user-construction-001',
        operatorName: '张施工',
        operatorRole: UserRole.CONSTRUCTION_COMPANY,
        details: { batchNo: batch1.batchNo },
        ipAddress: '127.0.0.1',
      },
      {
        batchId: batch2.id,
        operation: 'BATCH_CREATE',
        operator: 'user-construction-001',
        operatorName: '张施工',
        operatorRole: UserRole.CONSTRUCTION_COMPANY,
        details: { batchNo: batch2.batchNo },
        ipAddress: '127.0.0.1',
      },
      {
        batchId: batch2.id,
        operation: 'WITNESS_CREATE',
        operator: 'user-supervision-001',
        operatorName: '李监理',
        operatorRole: UserRole.SUPERVISION,
        details: { witnessId: witness1.id },
        ipAddress: '127.0.0.1',
      },
    ],
  });

  console.log('✓ 种子数据播种完成！');
  console.log(`  - 用户: ${users.length} 个`);
  console.log(`  - 批次: 3 个 (草稿1个, 检测完成1个, 整改中1个)`);
  console.log(`  - 见证记录: 2 个`);
  console.log(`  - 封签: 2 个`);
  console.log(`  - 送检单: 2 个`);
  console.log(`  - 检测报告: 2 个 (合格1个, 不合格1个)`);
  console.log(`  - 整改任务: 1 个 (待处理)`);
}

main()
  .catch((e) => {
    console.error('播种数据失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

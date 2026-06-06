const axios = require('axios');

const API_BASE = 'http://localhost:3002/api';

let testBatchId = null;
let testSampleSeal1Id = null;
let testSampleSeal2Id = null;
let testInspectionOrderId = null;
let testReportId = null;
let testRectificationId = null;

let passedCount = 0;
let failedCount = 0;

function logStep(step, description) {
  console.log(`\n[步骤 ${step}] ${description}`);
  console.log('─'.repeat(60));
}

function logResult(testName, passed, message) {
  if (passed) {
    passedCount++;
    console.log(`  ✓ PASS: ${testName}`);
    if (message) console.log(`    ${message}`);
  } else {
    failedCount++;
    console.log(`  ✗ FAIL: ${testName}`);
    if (message) console.log(`    ${message}`);
  }
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runAcceptanceTests() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║          建材进场见证取样系统 - 验收测试脚本                    ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');

  try {
    await axios.get(`${API_BASE}/batches`);
    console.log('\n✓ 后端服务连接成功');
  } catch (error) {
    console.error('\n✗ 无法连接到后端服务，请确保服务已启动 (http://localhost:3001)');
    process.exit(1);
  }

  logStep('1', '测试：创建一个新材料批次');
  try {
    const batchNo = `TEST-${Date.now()}`;
    const res = await axios.post(`${API_BASE}/batches`, {
      batchNo: batchNo,
      materialName: '验收测试钢筋',
      materialType: '建筑钢材',
      specification: 'HRB400 Φ20',
      quantity: 50,
      unit: '吨',
      supplier: '测试钢厂',
      arrivalDate: '2024-01-20',
      constructionSite: '验收测试工地',
      materialList: ['质保书', '合格证'],
    });

    testBatchId = res.data.data.id;
    logResult('创建批次成功', true, `批次ID: ${testBatchId}, 批次号: ${batchNo}`);
    logResult('批次状态为草稿', res.data.data.status === 'DRAFT', `状态: ${res.data.data.status}`);
  } catch (error) {
    logResult('创建批次', false, error.response?.data?.message || error.message);
  }

  logStep('2', '测试：为批次创建监理见证记录（含照片）');
  try {
    const res = await axios.post(`${API_BASE}/witness`, {
      batchId: testBatchId,
      witnessDate: '2024-01-21',
      sitePhotos: ['/photos/test-witness-1.jpg', '/photos/test-witness-2.jpg'],
      remarks: '验收测试见证',
    });

    logResult('创建见证记录成功', true, `见证ID: ${res.data.data.id}`);
  } catch (error) {
    logResult('创建见证记录', false, error.response?.data?.message || error.message);
  }

  logStep('3', '核心测试：同一批次下样品号唯一性验证（第一个封签成功）');
  try {
    const res = await axios.post(`${API_BASE}/sample-seals`, {
      batchId: testBatchId,
      sampleNo: 'S001',
      sampleName: '钢筋试样-1',
      quantity: 2,
      samplingPoint: '测试现场1',
      samplingDate: '2024-01-21',
    });

    testSampleSeal1Id = res.data.data.id;
    logResult('创建封签 S001 成功', true, `封签ID: ${testSampleSeal1Id}`);
    logResult('封签状态已封存', res.data.data.status === 'CREATED', `状态: ${res.data.data.status}`);
  } catch (error) {
    logResult('创建封签 S001', false, error.response?.data?.message || error.message);
  }

  logStep('4', '核心测试：同一批次下样品号唯一性验证（重复样品号应该失败）');
  try {
    const res = await axios.post(`${API_BASE}/sample-seals`, {
      batchId: testBatchId,
      sampleNo: 'S001',
      sampleName: '钢筋试样-重复',
      quantity: 2,
      samplingPoint: '测试现场2',
      samplingDate: '2024-01-21',
    });

    logResult('重复样品号 S001 应该被拒绝', false, '错误：服务器接受了重复的样品号！');
  } catch (error) {
    const status = error.response?.status;
    const message = error.response?.data?.message || '';
    
    const isRejected = status === 400 && message.includes('已存在');
    logResult('重复样品号 S001 被正确拒绝', isRejected, 
      isRejected ? `状态码: ${status}, 消息: ${message}` : `意外响应: 状态${status}`);
  }

  logStep('5', '测试：创建第二个不同样品号的封签（应该成功）');
  try {
    const res = await axios.post(`${API_BASE}/sample-seals`, {
      batchId: testBatchId,
      sampleNo: 'S002',
      sampleName: '钢筋试样-2',
      quantity: 2,
      samplingPoint: '测试现场3',
      samplingDate: '2024-01-21',
    });

    testSampleSeal2Id = res.data.data.id;
    logResult('创建封签 S002 成功', true, `封签ID: ${testSampleSeal2Id}, 样品号不重复`);
  } catch (error) {
    logResult('创建封签 S002', false, error.response?.data?.message || error.message);
  }

  logStep('6', '测试：没有监理见证照片的批次不能送检（验证见证照片校验）');
  try {
    const noWitnessBatch = await axios.post(`${API_BASE}/batches`, {
      batchNo: `TEST-NO-WITNESS-${Date.now()}`,
      materialName: '无见证测试材料',
      materialType: '测试类型',
      specification: '规格1',
      quantity: 10,
      unit: '吨',
      arrivalDate: '2024-01-22',
      constructionSite: '测试工地',
    });

    try {
      await axios.post(`${API_BASE}/inspection-orders`, {
        batchId: noWitnessBatch.data.id,
        testingOrg: '测试检测机构',
        testingItems: ['强度检测'],
        sampleSealIds: [],
      });
      logResult('无见证照片的送检被拒绝', false, '错误：接受了无见证照片的送检！');
    } catch (inspectError) {
      const isRejected = inspectError.response?.status === 400 && 
        inspectError.response?.data?.message?.includes('监理见证照片');
      logResult('无见证照片的送检被正确拒绝', isRejected,
        isRejected ? '业务规则生效：没有监理见证照片不得送检' : '意外错误');
    }
  } catch (error) {
    logResult('创建无见证批次', false, error.response?.data?.message || error.message);
  }

  logStep('7', '测试：正常创建送检单（已见证批次有照片，应该成功）');
  try {
    const res = await axios.post(`${API_BASE}/inspection-orders`, {
      batchId: testBatchId,
      testingOrg: '市建筑材料检测中心',
      testingItems: ['屈服强度', '抗拉强度', '伸长率'],
      sampleSealIds: [testSampleSeal1Id, testSampleSeal2Id],
    });

    testInspectionOrderId = res.data.data.id;
    logResult('创建送检单成功', true, `送检单ID: ${testInspectionOrderId}`);
    logResult('送检单状态为待签收', res.data.data.status === 'SUBMITTED', `状态: ${res.data.data.status}`);
  } catch (error) {
    logResult('创建送检单', false, error.response?.data?.message || error.message);
  }

  logStep('8', '测试：检测机构签收送检单');
  try {
    const res = await axios.post(`${API_BASE}/inspection-orders/${testInspectionOrderId}/receive`);
    logResult('送检单签收成功', true, `状态: ${res.data.data.status}`);
  } catch (error) {
    logResult('签收送检单', false, error.response?.data?.message || error.message);
  }

  logStep('9', '核心测试：不合格报告自动触发整改复检（完整闭环）');
  console.log('  ├─ 回填不合格检测报告');
  try {
    const res = await axios.post(`${API_BASE}/test-reports`, {
      inspectionOrderId: testInspectionOrderId,
      testDate: '2024-01-23',
      result: 'FAIL',
      conclusion: '屈服强度不符合标准要求，实测值 335MPa，标准要求 ≥ 400MPa。',
    });

    testReportId = res.data.data.report.id;
    logResult('回填不合格报告成功', true, `报告ID: ${testReportId}`);
    logResult('自动创建了整改任务', res.data.data.rectificationCreated === true, 
      `整改创建: ${res.data.data.rectificationCreated}`);
    
    if (res.data.data.rectification) {
      testRectificationId = res.data.data.rectification.id;
      logResult('整改任务关联正确批次', res.data.data.rectification.batchId === testBatchId,
        `整改ID: ${testRectificationId}`);
    }
  } catch (error) {
    logResult('回填不合格报告', false, error.response?.data?.message || error.message);
  }

  logStep('10', '验证：批次状态已自动更新为整改中');
  try {
    const res = await axios.get(`${API_BASE}/batches/${testBatchId}`);
    const batch = res.data.data;
    logResult('批次状态为整改中', batch.status === 'RECTIFICATION', 
      `当前状态: ${batch.status}`);
  } catch (error) {
    logResult('查询批次状态', false, error.message);
  }

  logStep('11', '验证：整改未关闭前，批次不能归档');
  try {
    await axios.post(`${API_BASE}/batches/${testBatchId}/archive`);
    logResult('存在未关闭整改的归档被拒绝', false, '错误：接受了有未关闭整改的归档！');
  } catch (error) {
    const isRejected = error.response?.status === 400 && 
      error.response?.data?.message?.includes('未关闭的整改');
    logResult('存在未关闭整改的归档被正确拒绝', isRejected,
      isRejected ? '业务规则生效：整改未关闭前批次不能归档' : '意外错误');
  }

  logStep('12', '测试：关闭整改任务');
  try {
    const res = await axios.post(`${API_BASE}/rectifications/${testRectificationId}/close`, {
      rectificationMeasures: '已更换合格批次钢筋，重新取样送检合格。',
      completedDate: '2024-01-25',
    });
    logResult('关闭整改成功', true, `整改状态: ${res.data.data.status}`);
  } catch (error) {
    logResult('关闭整改', false, error.response?.data?.message || error.message);
  }

  logStep('13', '验证：整改关闭后批次状态恢复正常');
  try {
    const res = await axios.get(`${API_BASE}/batches/${testBatchId}`);
    const batch = res.data.data;
    logResult('批次状态已更新为检测完成', batch.status === 'TESTED',
      `当前状态: ${batch.status}`);
  } catch (error) {
    logResult('查询批次状态', false, error.message);
  }

  logStep('14', '验证：整改关闭后可以正常归档');
  try {
    const res = await axios.post(`${API_BASE}/batches/${testBatchId}/archive`);
    logResult('整改关闭后归档成功', true, `归档状态: ${res.data.data.isArchived}`);
    logResult('归档后批次状态', res.data.data.status === 'ARCHIVED',
      `状态: ${res.data.data.status}`);
  } catch (error) {
    logResult('整改关闭后归档', false, error.response?.data?.message || error.message);
  }

  logStep('15', '验证：操作日志完整记录所有操作');
  try {
    const res = await axios.get(`${API_BASE}/operation-logs?batchId=${testBatchId}`);
    const logs = res.data.data;
    logResult('操作日志已记录', logs.length > 0, `共 ${logs.length} 条操作记录`);
    
    const operations = logs.map(l => l.operation);
    logResult('包含创建批次操作', operations.includes('BATCH_CREATE'), '');
    logResult('包含封签创建操作', operations.includes('SAMPLE_SEAL_CREATE'), '');
    logResult('包含报告创建操作', operations.includes('REPORT_CREATE'), '');
    logResult('包含整改关闭操作', operations.includes('RECTIFICATION_CLOSE'), '');
    logResult('包含归档操作', operations.includes('BATCH_ARCHIVE'), '');
  } catch (error) {
    logResult('查询操作日志', false, error.message);
  }

  console.log('\n');
  console.log('═'.repeat(60));
  console.log('                          测试结果汇总');
  console.log('═'.repeat(60));
  console.log(`  通过: ${passedCount} 项`);
  console.log(`  失败: ${failedCount} 项`);
  console.log(`  总计: ${passedCount + failedCount} 项`);
  console.log('═'.repeat(60));

  if (failedCount === 0) {
    console.log('\n🎉 所有验收测试通过！系统业务规则验证完整。');
    console.log('\n核心业务规则验证：');
    console.log('  ✓ 同一批次下样品号不能重复');
    console.log('  ✓ 没有监理见证照片不得送检');
    console.log('  ✓ 报告不合格时自动生成整改复检单');
    console.log('  ✓ 整改未关闭前批次不能归档');
    console.log('  ✓ 所有操作留痕可追溯');
    process.exit(0);
  } else {
    console.log(`\n⚠️  有 ${failedCount} 项测试未通过，请检查上述失败项。`);
    process.exit(1);
  }
}

runAcceptanceTests().catch(error => {
  console.error('\n测试执行异常:', error.message);
  process.exit(1);
});

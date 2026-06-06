import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import prisma from './utils/prisma';

import batchesRouter from './routes/batches';
import witnessRouter from './routes/witness';
import sampleSealsRouter from './routes/sampleSeals';
import inspectionOrdersRouter from './routes/inspectionOrders';
import testReportsRouter from './routes/testReports';
import rectificationsRouter from './routes/rectifications';
import operationLogsRouter from './routes/operationLogs';

const app = express();
const PORT = process.env.PORT || 3001;
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

app.use('/uploads', express.static(path.resolve(UPLOAD_DIR)));

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: '建材进场见证取样服务运行正常',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/batches', batchesRouter);
app.use('/api/witness', witnessRouter);
app.use('/api/sample-seals', sampleSealsRouter);
app.use('/api/inspection-orders', inspectionOrdersRouter);
app.use('/api/test-reports', testReportsRouter);
app.use('/api/rectifications', rectificationsRouter);
app.use('/api/operation-logs', operationLogsRouter);

app.use((req, res) => {
  res.status(404).json({ success: false, message: '接口不存在' });
});

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('服务器错误:', err);
  res.status(500).json({
    success: false,
    message: '服务器内部错误',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

async function startServer() {
  try {
    await prisma.$connect();
    console.log('数据库连接成功');
    
    app.listen(PORT, () => {
      console.log(`服务器已启动: http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('服务器启动失败:', error);
    process.exit(1);
  }
}

startServer();

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

export default app;

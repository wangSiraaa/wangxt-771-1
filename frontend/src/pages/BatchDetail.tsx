import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { batchesApi, witnessApi, sampleSealsApi, rectificationsApi } from '../api';
import type { MaterialBatch } from '../types';

const statusMap: Record<string, string> = {
  DRAFT: '草稿',
  WITNESSED: '已见证',
  SUBMITTED: '已送检',
  TESTED: '已检测',
  RECTIFICATION: '整改中',
  ARCHIVED: '已归档',
  REJECTED: '已驳回',
};

export default function BatchDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [batch, setBatch] = useState<MaterialBatch | null>(null);
  const [activeTab, setActiveTab] = useState('info');
  const [showWitnessModal, setShowWitnessModal] = useState(false);
  const [showSealModal, setShowSealModal] = useState(false);
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null);

  const [witnessForm, setWitnessForm] = useState({
    witnessDate: '',
    sitePhotos: '',
    remarks: '',
  });

  const [sealForm, setSealForm] = useState({
    sampleNo: '',
    sampleName: '',
    specification: '',
    quantity: 1,
    samplingPoint: '',
    samplingDate: '',
  });

  const loadBatch = async () => {
    if (!id) return;
    try {
      const res = await batchesApi.getById(id);
      if (res.data.success) {
        setBatch(res.data.data || null);
      }
    } catch (error) {
      console.error('加载批次详情失败:', error);
    }
  };

  useEffect(() => {
    loadBatch();
  }, [id]);

  const handleWitness = async () => {
    try {
      const photos = witnessForm.sitePhotos
        .split(',')
        .map((p) => p.trim())
        .filter((p) => p);
      
      const res = await witnessApi.create({
        batchId: id,
        witnessDate: witnessForm.witnessDate,
        sitePhotos: photos.length > 0 ? photos : ['placeholder-photo-1.jpg'],
        remarks: witnessForm.remarks,
      });

      if (res.data.success) {
        setMessage({ type: 'success', text: '见证记录已创建' });
        setShowWitnessModal(false);
        loadBatch();
      } else {
        setMessage({ type: 'error', text: res.data.message || '创建失败' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.message || '创建失败' });
    }
  };

  const handleCreateSeal = async () => {
    try {
      const res = await sampleSealsApi.create({
        ...sealForm,
        batchId: id,
      });

      if (res.data.success) {
        setMessage({ type: 'success', text: '封签已创建' });
        setShowSealModal(false);
        loadBatch();
      } else {
        setMessage({ type: 'error', text: res.data.message || '创建失败' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.message || '创建失败' });
    }
  };

  const handleArchive = async () => {
    if (!id) return;
    try {
      const res = await batchesApi.archive(id);
      if (res.data.success) {
        setMessage({ type: 'success', text: '批次已归档' });
        loadBatch();
      } else {
        setMessage({ type: 'error', text: res.data.message || '归档失败' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.message || '归档失败' });
    }
  };

  const handleCloseRectification = async (rectId: string) => {
    try {
      const res = await rectificationsApi.close(rectId, {
        rectificationMeasures: '已完成整改，复检合格',
      });
      if (res.data.success) {
        setMessage({ type: 'success', text: '整改已关闭' });
        loadBatch();
      } else {
        setMessage({ type: 'error', text: res.data.message || '操作失败' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.message || '操作失败' });
    }
  };

  if (!batch) {
    return <div className="empty-state">加载中...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <button className="btn btn-default" onClick={() => navigate(-1)} style={{ marginRight: 12 }}>
            ← 返回
          </button>
          <span className="page-title">批次详情 - {batch.batchNo}</span>
          <span className={`status-tag status-${batch.status}` style={{ marginLeft: 12 }}>
            {statusMap[batch.status]}
          </span>
        </div>
        <div>
          {batch.status === 'WITNESSED' && (
            <button className="btn btn-primary" onClick={() => setShowSealModal(true)} style={{ marginRight: 8 }}>
              创建封签
            </button>
          )}
          {!batch.isArchived && batch.status === 'TESTED' && batch.rectifications?.every(r => r.status === 'CLOSED') && (
            <button className="btn btn-success" onClick={handleArchive} style={{ marginRight: 8 }}>
              归档批次
            </button>
          )}
          {batch.witnessRecords?.length === 0 && (
            <button className="btn btn-primary" onClick={() => setShowWitnessModal(true)}>
              监理见证
            </button>
          )}
        </div>
      </div>

      {message && (
        <div className={`alert alert-${message.type}`}>
          {message.text}
          <button onClick={() => setMessage(null)} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
        </div>
      )}

      <div style={{ marginBottom: 16, borderBottom: '1px solid #f0f0f0' }}>
        <button
          className={`btn ${activeTab === 'info' ? 'btn-primary' : 'btn-default'}`}
          onClick={() => setActiveTab('info')}
          style={{ marginRight: 8, marginBottom: -1 }}
        >
          基本信息
        </button>
        <button
          className={`btn ${activeTab === 'witness' ? 'btn-primary' : 'btn-default'}`}
          onClick={() => setActiveTab('witness')}
          style={{ marginRight: 8, marginBottom: -1 }}
        >
          见证记录
        </button>
        <button
          className={`btn ${activeTab === 'seals' ? 'btn-primary' : 'btn-default'}`}
          onClick={() => setActiveTab('seals')}
          style={{ marginRight: 8, marginBottom: -1 }}
        >
          样品封签
        </button>
        <button
          className={`btn ${activeTab === 'inspection' ? 'btn-primary' : 'btn-default'}`}
          onClick={() => setActiveTab('inspection')}
          style={{ marginRight: 8, marginBottom: -1 }}
        >
          送检记录
        </button>
        <button
          className={`btn ${activeTab === 'rectification' ? 'btn-primary' : 'btn-default'}`}
          onClick={() => setActiveTab('rectification')}
          style={{ marginRight: 8, marginBottom: -1 }}
        >
          整改任务
        </button>
        <button
          className={`btn ${activeTab === 'logs' ? 'btn-primary' : 'btn-default'}`}
          onClick={() => setActiveTab('logs')}
          style={{ marginBottom: -1 }}
        >
          操作日志
        </button>
      </div>

      {activeTab === 'info' && (
        <div className="card">
          <h3 style={{ marginBottom: 16 }}>基本信息</h3>
          <div className="detail-grid">
            <div className="detail-item">
              <span className="label">批次号</span>
              <span className="value">{batch.batchNo}</span>
            </div>
            <div className="detail-item">
              <span className="label">材料名称</span>
              <span className="value">{batch.materialName}</span>
            </div>
            <div className="detail-item">
              <span className="label">材料类型</span>
              <span className="value">{batch.materialType}</span>
            </div>
            <div className="detail-item">
              <span className="label">规格型号</span>
              <span className="value">{batch.specification}</span>
            </div>
            <div className="detail-item">
              <span className="label">数量</span>
              <span className="value">{batch.quantity} {batch.unit}</span>
            </div>
            <div className="detail-item">
              <span className="label">供应商</span>
              <span className="value">{batch.supplier || '-'}</span>
            </div>
            <div className="detail-item">
              <span className="label">进场日期</span>
              <span className="value">{new Date(batch.arrivalDate).toLocaleDateString()}</span>
            </div>
            <div className="detail-item">
              <span className="label">施工部位</span>
              <span className="value">{batch.constructionSite}</span>
            </div>
            <div className="detail-item">
              <span className="label">归档状态</span>
              <span className="value">{batch.isArchived ? '已归档' : '未归档'}</span>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'witness' && (
        <div className="card">
          <h3 style={{ marginBottom: 16 }}>见证记录</h3>
          {batch.witnessRecords?.length === 0 ? (
            <div className="empty-state">暂无见证记录</div>
          ) : (
            batch.witnessRecords?.map((record) => (
              <div key={record.id} className="detail-section">
                <div className="detail-grid">
                <div className="detail-item">
                  <span className="label">见证日期</span>
                  <span className="value">{new Date(record.witnessDate).toLocaleDateString()}</span>
                </div>
                <div className="detail-item">
                  <span className="label">见证人</span>
                  <span className="value">{record.witnessName}</span>
                </div>
                <div className="detail-item">
                  <span className="label">照片数量</span>
                  <span className="value">{record.sitePhotos.length} 张</span>
                </div>
              </div>
              {record.remarks && (
                <div style={{ marginTop: 12 }}>
                  <strong>备注：</strong>{record.remarks}
                </div>
              )}
              <div className="photo-grid" style={{ marginTop: 12 }}>
                {record.sitePhotos.map((photo, idx) => (
                  <div key={idx} className="photo-item">
                    {photo}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
        </div>
      )}

      {activeTab === 'seals' && (
        <div className="card">
          <h3 style={{ marginBottom: 16 }}>样品封签</h3>
          {batch.sampleSeals?.length === 0 ? (
            <div className="empty-state">暂无封签记录</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>样品号</th>
                  <th>封签编号</th>
                  <th>样品名称</th>
                  <th>规格</th>
                  <th>数量</th>
                  <th>取样点</th>
                  <th>状态</th>
                </tr>
              </thead>
              <tbody>
                {batch.sampleSeals?.map((seal) => (
                  <tr key={seal.id}>
                    <td>{seal.sampleNo}</td>
                    <td><strong>{seal.sealNo}</strong></td>
                    <td>{seal.sampleName}</td>
                    <td>{seal.specification || '-'}</td>
                    <td>{seal.quantity}</td>
                    <td>{seal.samplingPoint || '-'}</td>
                    <td>
                      <span className={`status-tag status-${seal.status}`}>
                        {seal.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'inspection' && (
        <div className="card">
          <h3 style={{ marginBottom: 16 }}>送检记录</h3>
          {batch.inspectionOrders?.length === 0 ? (
            <div className="empty-state">暂无送检记录</div>
          ) : (
            batch.inspectionOrders?.map((order) => (
              <div key={order.id} className="detail-section">
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="label">送检单号</span>
                    <span className="value">{order.orderNo}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">检测机构</span>
                    <span className="value">{order.testingOrg}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">状态</span>
                    <span className="value">{order.status}</span>
                  </div>
                </div>
                <div style={{ marginTop: 12 }}>
                  <strong>检测项目：</strong>
                  {order.testingItems.map((item) => (
                    <span key={item} className="tag">{item}</span>
                  ))}
                </div>
                {order.reports && order.reports.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                  <strong>检测报告：</strong>
                  {order.reports.map((report) => (
                    <div key={report.id} style={{ marginTop: 8, padding: 12, background: '#f9f9f9', borderRadius: 4 }}>
                      <div>报告编号：{report.reportNo}</div>
                      <div>检测结果：
                        <span className={`status-tag status-${report.result}`} style={{ marginLeft: 8 }}>
                          {report.result === 'PASS' ? '合格' : report.result === 'FAIL' ? '不合格' : '待检'}
                        </span>
                      </div>
                      <div>结论：{report.conclusion}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
        </div>
      )}

      {activeTab === 'rectification' && (
        <div className="card">
          <h3 style={{ marginBottom: 16 }}>整改任务</h3>
          {batch.rectifications?.length === 0 ? (
            <div className="empty-state">暂无整改任务</div>
          ) : (
            batch.rectifications?.map((rect) => (
              <div key={rect.id} className="detail-section">
                <div className="detail-grid">
                <div className="detail-item">
                  <span className="label">标题</span>
                  <span className="value">{rect.title}</span>
                </div>
                <div className="detail-item">
                  <span className="label">状态</span>
                  <span className="value">
                    <span className={`status-tag status-${rect.status}`}>
                      {rect.status === 'OPEN' ? '待处理' : rect.status === 'IN_PROGRESS' ? '处理中' : rect.status === 'CLOSED' ? '已关闭' : '已复检'}
                    </span>
                  </span>
                </div>
                <div className="detail-item">
                  <span className="label">创建时间</span>
                  <span className="value">{new Date(rect.createdAt).toLocaleString()}</span>
                </div>
              </div>
              <div style={{ marginTop: 12 }}>
                <strong>描述：</strong>
                <pre style={{ whiteSpace: 'pre-wrap', background: '#f9f9f9', padding: 12, borderRadius: 4, marginTop: 8 }}>{rect.description}</pre>
              </div>
              {rect.status !== 'CLOSED' && (
                <div style={{ marginTop: 12 }}>
                  <button className="btn btn-success" onClick={() => handleCloseRectification(rect.id)}>
                    完成整改
                  </button>
                </div>
              )}
            </div>
          ))
        )}
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="card">
          <h3 style={{ marginBottom: 16 }}>操作日志</h3>
          <div className="timeline">
            {batch.operationLogs?.map((log) => (
              <div key={log.id} className="timeline-item">
                <div className="timeline-time">
                  {new Date(log.createdAt).toLocaleString()}
                </div>
                <div className="timeline-content">
                  <strong>{log.operation}</strong> - {log.operatorName} ({log.operatorRole})
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showWitnessModal && (
        <div className="modal-overlay" onClick={() => setShowWitnessModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">监理见证</h3>
              <button className="modal-close" onClick={() => setShowWitnessModal(false)}>×</button>
            </div>
            <div className="form-group">
              <label>见证日期 *</label>
              <input
                type="date"
                value={witnessForm.witnessDate}
                onChange={(e) => setWitnessForm({ ...witnessForm, witnessDate: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>现场照片URL（多个用逗号分隔）*</label>
              <textarea
                value={witnessForm.sitePhotos}
                onChange={(e) => setWitnessForm({ ...witnessForm, sitePhotos: e.target.value })}
                placeholder="photo1.jpg, photo2.jpg"
              />
            </div>
            <div className="form-group">
              <label>备注</label>
              <textarea
                value={witnessForm.remarks}
                onChange={(e) => setWitnessForm({ ...witnessForm, remarks: e.target.value })}
              />
            </div>
            <div className="modal-footer">
              <button className="btn btn-default" onClick={() => setShowWitnessModal(false)}>取消</button>
              <button className="btn btn-primary" onClick={handleWitness}>提交见证</button>
            </div>
          </div>
        </div>
      )}

      {showSealModal && (
        <div className="modal-overlay" onClick={() => setShowSealModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">创建样品封签</h3>
              <button className="modal-close" onClick={() => setShowSealModal(false)}>×</button>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>样品号 * (同一批次下不能重复)</label>
                <input
                  type="text"
                  value={sealForm.sampleNo}
                  onChange={(e) => setSealForm({ ...sealForm, sampleNo: e.target.value })}
                  placeholder="如：001、A-01"
                />
              </div>
              <div className="form-group">
                <label>样品名称 *</label>
                <input
                  type="text"
                  value={sealForm.sampleName}
                  onChange={(e) => setSealForm({ ...sealForm, sampleName: e.target.value })}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>规格型号</label>
                <input
                  type="text"
                  value={sealForm.specification}
                  onChange={(e) => setSealForm({ ...sealForm, specification: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>数量 *</label>
                <input
                  type="number"
                  value={sealForm.quantity}
                  onChange={(e) => setSealForm({ ...sealForm, quantity: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>取样点</label>
                <input
                  type="text"
                  value={sealForm.samplingPoint}
                  onChange={(e) => setSealForm({ ...sealForm, samplingPoint: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>取样日期 *</label>
                <input
                  type="date"
                  value={sealForm.samplingDate}
                  onChange={(e) => setSealForm({ ...sealForm, samplingDate: e.target.value })}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-default" onClick={() => setShowSealModal(false)}>取消</button>
              <button className="btn btn-primary" onClick={handleCreateSeal}>创建封签</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { batchesApi, rectificationsApi } from '../api';
import type { MaterialBatch, Rectification } from '../types';
import { useNavigate } from 'react-router-dom';

export default function AbnormalBatches() {
  const [batches, setBatches] = useState<MaterialBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedBatch, setSelectedBatch] = useState<MaterialBatch | null>(null);
  const [showRectificationModal, setShowRectificationModal] = useState(false);
  const [rectifications, setRectifications] = useState<Rectification[]>([]);
  const [formData, setFormData] = useState({
    rectificationMethod: '',
    completedDate: '',
  });
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null);
  const navigate = useNavigate();

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await batchesApi.getAll({ isAbnormal: 'true' });
      
      if (res.data.success) {
        let data = res.data.data || [];
        if (statusFilter !== 'all') {
          data = data.filter((b: MaterialBatch) => b.status === statusFilter);
        }
        setBatches(data);
      }
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const handleViewDetail = (batchId: string) => {
    navigate(`/batch/${batchId}`);
  };

  const handleViewRectification = async (batch: MaterialBatch) => {
    try {
      setSelectedBatch(batch);
      const res = await rectificationsApi.getByBatchId(batch.id);
      if (res.data.success) {
        setRectifications(res.data.data || []);
      }
      setShowRectificationModal(true);
    } catch (error) {
      console.error('加载整改记录失败:', error);
    }
  };

  const handleCloseRectification = async (rectificationId: string) => {
    try {
      const res = await rectificationsApi.close(rectificationId, {
        rectificationMethod: formData.rectificationMethod,
        completedDate: formData.completedDate,
      });

      if (res.data.success) {
        setMessage({ type: 'success', text: '整改已关闭，批次已恢复正常状态' });
        setShowRectificationModal(false);
        loadData();
        setFormData({ rectificationMethod: '', completedDate: '' });
      } else {
        setMessage({ type: 'error', text: res.data.message || '操作失败' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.message || '操作失败' });
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">异常批次筛选</h1>
      </div>

      {message && (
        <div className={`alert alert-${message.type}`}>
          {message.text}
          <button onClick={() => setMessage(null)} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
        </div>
      )}

      <div className="card">
        <div className="filter-bar">
          <div className="filter-item">
            <label>状态筛选：</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">全部异常</option>
              <option value="RECTIFICATION">整改中</option>
              <option value="TESTED">检测完成</option>
            </select>
          </div>
          <div className="filter-stats">
            共 <strong>{batches.length}</strong> 个异常批次
          </div>
        </div>

        {loading ? (
          <div className="empty-state">加载中...</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>批次号</th>
                <th>材料名称</th>
                <th>规格型号</th>
                <th>进场日期</th>
                <th>状态</th>
                <th>整改数</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {batches.length === 0 ? (
                <tr>
                  <td colSpan={7} className="empty-state">暂无异常批次</td>
                </tr>
              ) : (
                batches.map((batch) => (
                  <tr key={batch.id}>
                    <td><strong>{batch.batchNo}</strong></td>
                    <td>{batch.materialName}</td>
                    <td>{batch.specification}</td>
                    <td>{new Date(batch.arrivalDate).toLocaleDateString()}</td>
                    <td>
                      <span className={`status-tag status-${batch.status}`}>
                        {batch.status === 'RECTIFICATION' ? '整改中' :
                         batch.status === 'TESTED' ? '检测完成' : batch.status}
                      </span>
                    </td>
                    <td>
                      <span className="tag" style={{ background: '#fff2e8', color: '#fa8c16' }}>
                        {(batch.rectifications?.length || 0)} 项整改
                      </span>
                    </td>
                    <td>
                      <button className="link-btn" onClick={() => handleViewDetail(batch.id)}>
                        查看详情
                      </button>
                      {(batch.status === 'RECTIFICATION' || ((batch.rectifications?.length || 0)) > 0) && (
                        <button className="link-btn" onClick={() => handleViewRectification(batch)}>
                          处理整改
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {showRectificationModal && selectedBatch && (
        <div className="modal-overlay" onClick={() => setShowRectificationModal(false)}>
          <div className="modal-content" style={{ maxWidth: 700 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                整改记录 - {selectedBatch.batchNo} {selectedBatch.materialName}
              </h3>
              <button className="modal-close" onClick={() => setShowRectificationModal(false)}>×</button>
            </div>

            <div style={{ marginBottom: 16 }}>
              <h4 style={{ margin: '0 0 8px' }}>待处理的整改任务</h4>
              {rectifications.length === 0 ? (
                <p style={{ color: '#999' }}>暂无整改任务</p>
              ) : (
                rectifications
                  .filter((r) => r.status === 'OPEN')
                  .map((rect) => (
                    <div key={rect.id} className="card" style={{ marginBottom: 12, background: '#fffbe6' }}>
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>{rect.title}</div>
                      <div style={{ fontSize: 13, color: '#666', marginBottom: 8 }}>
                        {rect.description}
                      </div>
                      <div style={{ fontSize: 12, color: '#999', marginBottom: 12 }}>
                        创建时间：{new Date(rect.createdAt).toLocaleString()}
                      </div>

                      <div className="form-group">
                        <label>整改措施 *</label>
                        <textarea
                          value={formData.rectificationMethod}
                          onChange={(e) => setFormData({ ...formData, rectificationMethod: e.target.value })}
                          placeholder="请填写整改措施"
                          rows={2}
                        />
                      </div>

                      <div className="form-group">
                        <label>整改完成日期 *</label>
                        <input
                          type="date"
                          value={formData.completedDate}
                          onChange={(e) => setFormData({ ...formData, completedDate: e.target.value })}
                        />
                      </div>

                      <button
                        className="btn btn-primary"
                        style={{ width: '100%' }}
                        onClick={() => handleCloseRectification(rect.id)}
                        disabled={!formData.rectificationMethod || !formData.completedDate}
                      >
                        确认关闭整改
                      </button>
                    </div>
                  ))
              )}
            </div>

            {rectifications.some((r) => r.status === 'CLOSED') && (
              <div>
                <h4 style={{ margin: '16px 0 8px' }}>已关闭的整改记录</h4>
                {rectifications
                  .filter((r) => r.status === 'CLOSED')
                  .map((rect) => (
                    <div key={rect.id} className="card" style={{ marginBottom: 8, background: '#f6ffed' }}>
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>{rect.title}</div>
                      <div style={{ fontSize: 13, color: '#666', marginBottom: 4 }}>
                        整改措施：{rect.rectificationMeasures}
                      </div>
                      <div style={{ fontSize: 12, color: '#999' }}>
                        完成时间：{rect.closedAt ? new Date(rect.closedAt).toLocaleDateString() : '-'}
                      </div>
                    </div>
                  ))}
              </div>
            )}

            <div className="modal-footer">
              <button className="btn btn-default" onClick={() => setShowRectificationModal(false)}>关闭</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

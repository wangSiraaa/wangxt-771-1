import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { batchesApi } from '../api';
import type { MaterialBatch, BatchStatus } from '../types';

const statusMap: Record<BatchStatus, string> = {
  DRAFT: '草稿',
  WITNESSED: '已见证',
  SUBMITTED: '已送检',
  TESTED: '已检测',
  RECTIFICATION: '整改中',
  ARCHIVED: '已归档',
  REJECTED: '已驳回',
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [batches, setBatches] = useState<MaterialBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: 'all',
    keyword: '',
    isArchived: '',
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    batchNo: '',
    materialName: '',
    materialType: '',
    specification: '',
    quantity: 0,
    unit: '',
    supplier: '',
    arrivalDate: '',
    constructionSite: '',
  });

  const loadBatches = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (filters.status !== 'all') params.status = filters.status;
      if (filters.keyword) params.keyword = filters.keyword;
      if (filters.isArchived) params.isArchived = filters.isArchived;
      
      const res = await batchesApi.getAll(params);
      if (res.data.success) {
        setBatches(res.data.data || []);
      }
    } catch (error) {
      console.error('加载批次失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBatches();
  }, [filters]);

  const handleCreateBatch = async () => {
    try {
      const res = await batchesApi.create(formData);
      if (res.data.success) {
        setShowCreateModal(false);
        loadBatches();
        setFormData({
          batchNo: '',
          materialName: '',
          materialType: '',
          specification: '',
          quantity: 0,
          unit: '',
          supplier: '',
          arrivalDate: '',
          constructionSite: '',
        });
      } else {
        alert(res.data.message || '创建失败');
      }
    } catch (error: any) {
      alert(error.response?.data?.message || '创建失败');
    }
  };

  const stats = {
    total: batches.length,
    witnessed: batches.filter((b) => b.status === 'WITNESSED').length,
    submitted: batches.filter((b) => b.status === 'SUBMITTED').length,
    abnormal: batches.filter((b) => b.status === 'RECTIFICATION').length,
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">批次看板</h1>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          登记进场批次
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">总批次</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: '#1890ff' }}>{stats.witnessed}</div>
          <div className="stat-label">已见证</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: '#fa8c16' }}>{stats.submitted}</div>
          <div className="stat-label">检测中</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: '#ff4d4f' }}>{stats.abnormal}</div>
          <div className="stat-label">需整改</div>
        </div>
      </div>

      <div className="card">
        <div className="filter-bar">
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            <option value="all">全部状态</option>
            <option value="DRAFT">草稿</option>
            <option value="WITNESSED">已见证</option>
            <option value="SUBMITTED">已送检</option>
            <option value="TESTED">已检测</option>
            <option value="RECTIFICATION">整改中</option>
            <option value="ARCHIVED">已归档</option>
          </select>
          <select
            value={filters.isArchived}
            onChange={(e) => setFilters({ ...filters, isArchived: e.target.value })}
          >
            <option value="">归档状态</option>
            <option value="false">未归档</option>
            <option value="true">已归档</option>
          </select>
          <input
            type="text"
            placeholder="搜索批次号/材料名称"
            value={filters.keyword}
            onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
          />
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
                <th>数量</th>
                <th>进场日期</th>
                <th>施工部位</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {batches.length === 0 ? (
                <tr>
                  <td colSpan={8} className="empty-state">暂无数据</td>
                </tr>
              ) : (
                batches.map((batch) => (
                <tr key={batch.id}>
                  <td>{batch.batchNo}</td>
                  <td>{batch.materialName}</td>
                  <td>{batch.specification}</td>
                  <td>{batch.quantity} {batch.unit}</td>
                  <td>{new Date(batch.arrivalDate).toLocaleDateString()}</td>
                  <td>{batch.constructionSite}</td>
                  <td>
                    <span className={`status-tag status-${batch.status}`}>
                      {statusMap[batch.status]}
                    </span>
                  </td>
                  <td>
                    <button
                      className="link-btn"
                      onClick={() => navigate(`/batch/${batch.id}`)}
                    >
                      详情
                    </button>
                  </td>
                </tr>
              ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">登记进场批次</h3>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>×</button>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>批次号 *</label>
                <input
                  type="text"
                  value={formData.batchNo}
                  onChange={(e) => setFormData({ ...formData, batchNo: e.target.value })}
                  placeholder="请输入批次号"
                />
              </div>
              <div className="form-group">
                <label>材料名称 *</label>
                <input
                  type="text"
                  value={formData.materialName}
                  onChange={(e) => setFormData({ ...formData, materialName: e.target.value })}
                  placeholder="如：钢筋、水泥"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>材料类型 *</label>
                <input
                  type="text"
                  value={formData.materialType}
                  onChange={(e) => setFormData({ ...formData, materialType: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>规格型号 *</label>
                <input
                  type="text"
                  value={formData.specification}
                  onChange={(e) => setFormData({ ...formData, specification: e.target.value })}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>数量 *</label>
                <input
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                />
              </div>
              <div className="form-group">
                <label>单位 *</label>
                <input
                  type="text"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  placeholder="如：吨、立方米"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>供应商</label>
                <input
                  type="text"
                  value={formData.supplier}
                  onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>进场日期 *</label>
                <input
                  type="date"
                  value={formData.arrivalDate}
                  onChange={(e) => setFormData({ ...formData, arrivalDate: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label>施工部位 *</label>
              <input
                type="text"
                value={formData.constructionSite}
                onChange={(e) => setFormData({ ...formData, constructionSite: e.target.value })}
                placeholder="如：1号楼主体"
              />
            </div>

            <div className="modal-footer">
              <button className="btn btn-default" onClick={() => setShowCreateModal(false)}>
                取消
              </button>
              <button className="btn btn-primary" onClick={handleCreateBatch}>
                提交
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

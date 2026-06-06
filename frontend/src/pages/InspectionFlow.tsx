import { useState, useEffect } from 'react';
import { inspectionOrdersApi, batchesApi, sampleSealsApi } from '../api';
import type { InspectionOrder, MaterialBatch, SampleSeal } from '../types';

export default function InspectionFlow() {
  const [orders, setOrders] = useState<InspectionOrder[]>([]);
  const [batches, setBatches] = useState<MaterialBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState('');
  const [sampleSeals, setSampleSeals] = useState<SampleSeal[]>([]);
  const [selectedSeals, setSelectedSeals] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    testingOrg: '',
    testingItems: '',
  });
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [ordersRes, batchesRes] = await Promise.all([
        inspectionOrdersApi.getAll(),
        batchesApi.getAll({ status: 'WITNESSED' }),
      ]);
      
      if (ordersRes.data.success) {
        setOrders(ordersRes.data.data || []);
      }
      if (batchesRes.data.success) {
        setBatches(batchesRes.data.data || []);
      }
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedBatch) {
      sampleSealsApi.getByBatchId(selectedBatch).then((res) => {
        if (res.data.success) {
          setSampleSeals(res.data.data || []);
        }
      });
    } else {
      setSampleSeals([]);
    }
  }, [selectedBatch]);

  const handleCreateInspection = async () => {
    try {
      const testingItems = formData.testingItems
        .split(',')
        .map((item) => item.trim())
        .filter((item) => item);

      const res = await inspectionOrdersApi.create({
        batchId: selectedBatch,
        testingOrg: formData.testingOrg,
        testingItems,
        sampleSealIds: selectedSeals,
      });

      if (res.data.success) {
        setMessage({ type: 'success', text: '送检单已创建' });
        setShowCreateModal(false);
        loadData();
        setSelectedBatch('');
        setSelectedSeals([]);
        setFormData({ testingOrg: '', testingItems: '' });
      } else {
        setMessage({ type: 'error', text: res.data.message || '创建失败' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.message || '创建失败' });
    }
  };

  const handleReceive = async (id: string) => {
    try {
      const res = await inspectionOrdersApi.receive(id);
      if (res.data.success) {
        setMessage({ type: 'success', text: '送检单已签收' });
        loadData();
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
        <h1 className="page-title">送检流转</h1>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          创建送检单
        </button>
      </div>

      {message && (
        <div className={`alert alert-${message.type}`}>
          {message.text}
          <button onClick={() => setMessage(null)} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
        </div>
      )}

      <div className="card">
        {loading ? (
          <div className="empty-state">加载中...</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>送检单号</th>
                <th>批次号</th>
                <th>材料名称</th>
                <th>检测机构</th>
                <th>检测项目</th>
                <th>状态</th>
                <th>提交时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="empty-state">暂无送检单</td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id}>
                    <td>{order.orderNo}</td>
                    <td>{order.batch?.batchNo}</td>
                    <td>{order.batch?.materialName}</td>
                    <td>{order.testingOrg}</td>
                    <td>
                      {order.testingItems.slice(0, 2).map((item) => (
                        <span key={item} className="tag">{item}</span>
                      ))}
                      {order.testingItems.length > 2 && (
                        <span className="tag">+{order.testingItems.length - 2}</span>
                      )}
                    </td>
                    <td>
                      <span className={`status-tag ${order.status === 'RECEIVED' ? 'status-TESTED' : 'status-SUBMITTED'}`}>
                        {order.status === 'RECEIVED' ? '已签收' : '待签收'}
                      </span>
                    </td>
                    <td>{new Date(order.submitDate).toLocaleDateString()}</td>
                    <td>
                      {order.status !== 'RECEIVED' && (
                        <button className="link-btn" onClick={() => handleReceive(order.id)}>
                          签收
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

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">创建送检单</h3>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>×</button>
            </div>

            <div className="form-group">
              <label>选择批次 * (仅显示已见证的批次)</label>
              <select value={selectedBatch} onChange={(e) => setSelectedBatch(e.target.value)}>
                <option value="">请选择批次</option>
                {batches.map((batch) => (
                  <option key={batch.id} value={batch.id}>
                    {batch.batchNo} - {batch.materialName}
                  </option>
                ))}
              </select>
            </div>

            {sampleSeals.length > 0 && (
              <div className="form-group">
                <label>选择样品封签 *</label>
                <div style={{ maxHeight: 150, overflowY: 'auto', border: '1px solid #d9d9d9', borderRadius: 4, padding: 8 }}>
                  {sampleSeals.map((seal) => (
                    <div key={seal.id} style={{ padding: '4px 0' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input
                          type="checkbox"
                          checked={selectedSeals.includes(seal.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedSeals([...selectedSeals, seal.id]);
                            } else {
                              setSelectedSeals(selectedSeals.filter((id) => id !== seal.id));
                            }
                          }}
                        />
                        {seal.sampleNo} - {seal.sampleName} ({seal.sealNo})
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="form-group">
              <label>检测机构 *</label>
              <input
                type="text"
                value={formData.testingOrg}
                onChange={(e) => setFormData({ ...formData, testingOrg: e.target.value })}
                placeholder="如：XX市建筑材料检测中心"
              />
            </div>

            <div className="form-group">
              <label>检测项目（多个用逗号分隔）*</label>
              <input
                type="text"
                value={formData.testingItems}
                onChange={(e) => setFormData({ ...formData, testingItems: e.target.value })}
                placeholder="如：强度检测, 成分分析"
              />
            </div>

            <div className="modal-footer">
              <button className="btn btn-default" onClick={() => setShowCreateModal(false)}>取消</button>
              <button
                className="btn btn-primary"
                onClick={handleCreateInspection}
                disabled={!selectedBatch || selectedSeals.length === 0 || !formData.testingOrg || !formData.testingItems}
              >
                创建送检单
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

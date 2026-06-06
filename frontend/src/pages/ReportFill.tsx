import { useState, useEffect } from 'react';
import { testReportsApi, inspectionOrdersApi } from '../api';
import type { TestReport, InspectionOrder } from '../types';

export default function ReportFill() {
  const [reports, setReports] = useState<TestReport[]>([]);
  const [receivedOrders, setReceivedOrders] = useState<InspectionOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    inspectionOrderId: '',
    testDate: '',
    result: 'PASS' as 'PASS' | 'FAIL' | 'PENDING',
    conclusion: '',
  });
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [reportsRes, ordersRes] = await Promise.all([
        testReportsApi.getAll(),
        inspectionOrdersApi.getAll({ status: 'RECEIVED' }),
      ]);
      
      if (reportsRes.data.success) {
        setReports(reportsRes.data.data || []);
      }
      if (ordersRes.data.success) {
        setReceivedOrders(ordersRes.data.data || []);
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

  const handleSubmitReport = async () => {
    try {
      const res = await testReportsApi.create(formData);
      
      if (res.data.success) {
        const data = res.data.data;
        if (data.rectificationCreated) {
          setMessage({ type: 'warning', text: '报告已提交，检测不合格，已自动生成整改任务' });
        } else {
          setMessage({ type: 'success', text: '报告已提交' });
        }
        setShowCreateModal(false);
        loadData();
        setFormData({
          inspectionOrderId: '',
          testDate: '',
          result: 'PASS',
          conclusion: '',
        });
      } else {
        setMessage({ type: 'error', text: res.data.message || '提交失败' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.message || '提交失败' });
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">报告回填</h1>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          回填检测报告
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
                <th>报告编号</th>
                <th>送检单号</th>
                <th>材料名称</th>
                <th>检测日期</th>
                <th>检测结果</th>
                <th>结论</th>
                <th>创建时间</th>
              </tr>
            </thead>
            <tbody>
              {reports.length === 0 ? (
                <tr>
                  <td colSpan={7} className="empty-state">暂无检测报告</td>
                </tr>
              ) : (
                reports.map((report) => (
                  <tr key={report.id}>
                    <td><strong>{report.reportNo}</strong></td>
                    <td>{report.inspectionOrder?.orderNo}</td>
                    <td>{report.inspectionOrder?.batch?.materialName}</td>
                    <td>{new Date(report.testDate).toLocaleDateString()}</td>
                    <td>
                      <span className={`status-tag status-${report.result}`}>
                        {report.result === 'PASS' ? '合格' : report.result === 'FAIL' ? '不合格' : '待检'}
                      </span>
                    </td>
                    <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {report.conclusion}
                    </td>
                    <td>{new Date(report.createdAt).toLocaleDateString()}</td>
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
              <h3 className="modal-title">回填检测报告</h3>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>×</button>
            </div>

            <div className="form-group">
              <label>选择送检单 * (仅显示已签收的送检单)</label>
              <select
                value={formData.inspectionOrderId}
                onChange={(e) => setFormData({ ...formData, inspectionOrderId: e.target.value })}
              >
                <option value="">请选择送检单</option>
                {receivedOrders.map((order) => (
                  <option key={order.id} value={order.id}>
                    {order.orderNo} - {order.batch?.materialName}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>检测日期 *</label>
              <input
                type="date"
                value={formData.testDate}
                onChange={(e) => setFormData({ ...formData, testDate: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>检测结果 *</label>
              <select
                value={formData.result}
                onChange={(e) => setFormData({ ...formData, result: e.target.value as any })}
              >
                <option value="PASS">合格</option>
                <option value="FAIL">不合格</option>
                <option value="PENDING">待检</option>
              </select>
            </div>

            <div className="form-group">
              <label>检测结论 *</label>
              <textarea
                value={formData.conclusion}
                onChange={(e) => setFormData({ ...formData, conclusion: e.target.value })}
                placeholder="请填写详细检测结论"
                rows={4}
              />
            </div>

            {formData.result === 'FAIL' && (
              <div className="alert alert-warning">
                注意：选择"不合格"将自动生成整改任务
              </div>
            )}

            <div className="modal-footer">
              <button className="btn btn-default" onClick={() => setShowCreateModal(false)}>取消</button>
              <button
                className="btn btn-primary"
                onClick={handleSubmitReport}
                disabled={!formData.inspectionOrderId || !formData.testDate || !formData.conclusion}
              >
                提交报告
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

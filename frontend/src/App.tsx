import { Routes, Route, NavLink } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import BatchDetail from './pages/BatchDetail';
import InspectionFlow from './pages/InspectionFlow';
import ReportFill from './pages/ReportFill';
import AbnormalBatches from './pages/AbnormalBatches';

function App() {
  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="sidebar-title">建材见证取样系统</div>
        <ul className="sidebar-nav">
          <li>
            <NavLink to="/" end>
              批次看板
            </NavLink>
          </li>
          <li>
            <NavLink to="/inspection-flow">
              送检流转
            </NavLink>
          </li>
          <li>
            <NavLink to="/report-fill">
              报告回填
            </NavLink>
          </li>
          <li>
            <NavLink to="/abnormal">
              异常批次
            </NavLink>
          </li>
        </ul>
      </aside>
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/batch/:id" element={<BatchDetail />} />
          <Route path="/inspection-flow" element={<InspectionFlow />} />
          <Route path="/report-fill" element={<ReportFill />} />
          <Route path="/abnormal" element={<AbnormalBatches />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;

import { useState, useEffect } from 'react';
import { BRANCHES } from './data/gtm-data';
import Dashboard from './components/Dashboard';
import BranchView from './components/BranchView';
import UploadView from './components/UploadView';
import './index.css';

function App() {
  const [branches, setBranches] = useState([]);
  const [view, setView] = useState('dashboard'); // dashboard, branch, upload
  const [activeBranch, setActiveBranch] = useState(null);

  useEffect(() => {
    // Simulate loading
    setBranches(JSON.parse(JSON.stringify(BRANCHES)));
  }, []);

  const goDashboard = () => {
    setView('dashboard');
    setActiveBranch(null);
  };

  const goBranch = (name) => {
    setView('branch');
    setActiveBranch(name);
  };

  const goUpload = () => {
    setView('upload');
  };

  // State update handlers
  const updateActivityField = (branchName, projectName, odpIndex, actType, fieldKey, value) => {
    setBranches(prev => {
      const newBranches = JSON.parse(JSON.stringify(prev));
      const b = newBranches.find(x => x.name === branchName);
      const p = b.projects.find(x => x.name === projectName);
      const o = p.odps[odpIndex];
      const a = o.activities.find(x => x.type === actType);
      
      a.fields = { ...a.fields, [fieldKey]: value };
      if (a.status === 'belum' && value) a.status = 'upload';
      return newBranches;
    });
  };

  const verifyActivity = (branchName, projectName, odpIndex, actType) => {
    setBranches(prev => {
      const newBranches = JSON.parse(JSON.stringify(prev));
      const b = newBranches.find(x => x.name === branchName);
      const p = b.projects.find(x => x.name === projectName);
      const o = p.odps[odpIndex];
      const a = o.activities.find(x => x.type === actType);
      
      a.status = 'verified';
      return newBranches;
    });
  };

  const uploadActivity = (branchName, projectName, odp, actType, fields) => {
     setBranches(prev => {
      const newBranches = JSON.parse(JSON.stringify(prev));
      const b = newBranches.find(x => x.name === branchName);
      const p = b.projects.find(x => x.name === projectName);
      const o = p.odps.find(x => x.odp === odp);
      const a = o.activities.find(x => x.type === actType);
      
      a.status = 'upload';
      a.fields = { ...a.fields, ...fields };
      return newBranches;
    });
  }

  if (branches.length === 0) {
    return <div style={{ padding: '80px 0', textAlign: 'center', color: '#94a3b8' }}>Memuat data...</div>;
  }

  return (
    <div>
      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#C8102E', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '15px', letterSpacing: '-0.5px' }}>GTM</div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>GTM Activity Monitor</div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>Region Control Panel — Occupancy ODP per Proyek</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={goDashboard} 
            style={{ padding: '9px 16px', borderRadius: '50px', border: '1px solid #e2e8f0', background: view === 'dashboard' ? '#f8fafc' : '#fff', fontSize: '13.5px', fontWeight: 600, cursor: 'pointer', color: '#334155' }}
          >
            Dashboard
          </button>
          <button 
            onClick={goUpload} 
            style={{ padding: '9px 16px', borderRadius: '50px', border: '1px solid #C8102E', background: '#C8102E', fontSize: '13.5px', fontWeight: 600, cursor: 'pointer', color: '#fff' }}
          >
            + Upload Activity (Branch)
          </button>
        </div>
      </div>

      {/* Breadcrumb */}
      {view === 'branch' && (
        <div style={{ padding: '14px 32px 0', fontSize: '13px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span onClick={goDashboard} style={{ cursor: 'pointer', color: '#C8102E', fontWeight: 600 }}>Dashboard</span>
          <span>/</span>
          <span style={{ fontWeight: 600, color: '#334155' }}>{activeBranch}</span>
        </div>
      )}

      {/* Main Content */}
      <div style={{ maxWidth: '1360px', margin: '0 auto', padding: '24px 32px 64px' }}>
        {view === 'dashboard' && <Dashboard branches={branches} goBranch={goBranch} />}
        {view === 'branch' && <BranchView branches={branches} activeBranch={activeBranch} updateActivityField={updateActivityField} verifyActivity={verifyActivity} />}
        {view === 'upload' && <UploadView branches={branches} updateActivityField={updateActivityField} uploadActivity={uploadActivity} />}
      </div>
    </div>
  );
}

export default App;

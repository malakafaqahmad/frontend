import { useLocation } from 'react-router-dom';
import { usePatient } from '../../context/PatientContext';
import { Activity, Bell, Wifi } from 'lucide-react';

const PAGE_META = {
  '/':              { title: 'Patient Onboarding',  sub: 'Select or create a patient session' },
  '/diagnosis':     { title: 'AI Differential Diagnosis', sub: 'Powered by MedGemma' },
  '/records':       { title: 'Medical Records',     sub: 'Upload CT scans, MRIs, labs & reports' },
  '/wellness':      { title: 'Wellness Plans',      sub: 'AI-generated diet & exercise prescriptions' },
  '/digital-twin':  { title: 'Digital Twin',        sub: 'Health monitoring & predictive analytics' },
  '/medicine-check':{ title: 'Medicine Safety Check', sub: 'AI-powered prescription verification' },
  '/first-aid':     { title: 'First Aid Emergency Guide', sub: 'AI-powered emergency response instructions' },
  '/progress':      { title: 'Patient Progress',    sub: 'Second encounter & longitudinal tracking' },
};

export default function Topbar() {
  const { pathname } = useLocation();
  const { patientId, currentPhase } = usePatient();
  const meta = PAGE_META[pathname] || { title: 'Umaim AI', sub: '' };

  const phaseLabel = {
    initial_interview: 'Phase 1 — Initial Interview',
    second_interview:  'Phase 2 — Follow-up Interview',
    final_report:      'Phase 3 — Final Report',
  }[currentPhase] || '';

  return (
    <header className="topbar">
      <div className="topbar-left">
        <h1 className="topbar-title">{meta.title}</h1>
        <p className="topbar-sub">{meta.sub}</p>
      </div>
      <div className="topbar-right">
        {phaseLabel && (
          <div className="topbar-phase">
            <Activity size={13} />
            {phaseLabel}
          </div>
        )}
        {patientId && (
          <div className="topbar-badge">
            <div className="status-dot green" />
            <span>{patientId}</span>
          </div>
        )}
        <div className="topbar-icon-btn"><Bell size={16} /></div>
        <div className="topbar-icon-btn" style={{ color: 'var(--green)' }}><Wifi size={16} /></div>
      </div>

      <style>{`
        .topbar {
          position: fixed; top: 0; left: var(--sidebar-w); right: 0;
          height: var(--topbar-h);
          background: rgba(10,16,32,0.9);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid var(--border);
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 28px;
          z-index: 99;
        }
        .topbar-left { display: flex; flex-direction: column; gap: 1px; }
        .topbar-title { font-family: var(--font-heading); font-size: 17px; font-weight: 600; }
        .topbar-sub { font-size: 12px; color: var(--text-muted); }
        .topbar-right { display: flex; align-items: center; gap: 12px; }
        .topbar-phase {
          display: flex; align-items: center; gap: 6px;
          padding: 5px 12px;
          background: var(--blue-glow);
          border: 1px solid rgba(14,165,233,0.3);
          border-radius: 99px;
          font-size: 12px;
          color: var(--blue);
          font-weight: 500;
        }
        .topbar-badge {
          display: flex; align-items: center; gap: 7px;
          padding: 5px 12px;
          background: var(--green-dim);
          border: 1px solid rgba(16,185,129,0.25);
          border-radius: 99px;
          font-size: 12px;
          font-weight: 500;
          color: var(--green);
        }
        .topbar-icon-btn {
          width: 34px; height: 34px;
          background: var(--bg-glass);
          border: 1px solid var(--border);
          border-radius: 9px;
          display: flex; align-items: center; justify-content: center;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.18s;
        }
        .topbar-icon-btn:hover { background: var(--bg-hover); color: var(--text-primary); }
      `}</style>
    </header>
  );
}

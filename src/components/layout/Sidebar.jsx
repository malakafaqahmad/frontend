import { NavLink, useNavigate } from 'react-router-dom';
import { usePatient } from '../../context/PatientContext';
import {
  Activity, MessageSquare, FileText, Leaf, Cpu,
  Pill, TrendingUp, ChevronRight, User, LogOut, Stethoscope, ShieldAlert,
} from 'lucide-react';

const NAV = [
  { to: '/', icon: User, label: 'Patient Select', phase: 0 },
  { to: '/diagnosis', icon: MessageSquare, label: 'AI Diagnosis', phase: 1 },
  { to: '/records', icon: FileText, label: 'Medical Records', phase: 2 },
  { to: '/wellness', icon: Leaf, label: 'Wellness Plans', phase: 3 },
  { to: '/digital-twin', icon: Cpu, label: 'Digital Twin', phase: 4 },
  { to: '/medicine-check', icon: Pill, label: 'Medicine Check', phase: 5 },
  { to: '/first-aid', icon: ShieldAlert, label: 'First Aid', phase: 5 },
  { to: '/progress', icon: TrendingUp, label: 'Progress', phase: 6 },
];

export default function Sidebar() {
  const { patientId, currentPhase, reset } = usePatient();
  const navigate = useNavigate();

  const phaseIndex = (() => {
    const p = currentPhase;
    if (p === 'initial_interview') return 1;
    if (p === 'second_interview') return 4;
    if (p === 'final_report') return 5;
    return 0;
  })();

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <Stethoscope size={20} />
        </div>
        <div>
          <div className="sidebar-logo-title">UmaimAI Care</div>
          <div className="sidebar-logo-sub">Hospital System</div>
        </div>
      </div>

      {/* Patient Badge */}
      {patientId && (
        <div className="sidebar-patient">
          <div className="status-dot green" />
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{patientId}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Active Session</div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="sidebar-nav">
        <div className="sidebar-nav-label">Workflow</div>
        {NAV.map(({ to, icon: Icon, label, phase }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'active' : ''} ${!patientId && phase > 0 ? 'disabled' : ''}`
            }
            onClick={(e) => { if (!patientId && phase > 0) e.preventDefault(); }}
          >
            <div className="sidebar-link-icon"><Icon size={16} /></div>
            <span>{label}</span>
            {phase > 0 && phase <= phaseIndex && (
              <span className="sidebar-done-dot" />
            )}
            <ChevronRight size={14} className="sidebar-chevron" />
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div className="sidebar-bottom">
        <div className="sidebar-divider" />
        <button
          className="sidebar-link"
          style={{ width: '100%', cursor: 'pointer', background: 'none', border: 'none', color: 'var(--text-secondary)' }}
          onClick={() => { reset(); navigate('/'); }}
        >
          <div className="sidebar-link-icon"><LogOut size={16} /></div>
          <span>Reset Session</span>
        </button>
      </div>

      <style>{`
        .sidebar {
          width: var(--sidebar-w);
          height: 100vh;
          position: fixed;
          left: 0; top: 0;
          background: var(--bg-surface);
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          padding: 0;
          z-index: 100;
          overflow: hidden;
        }
        .sidebar-logo {
          display: flex; align-items: center; gap: 12px;
          padding: 20px 20px 16px;
          border-bottom: 1px solid var(--border);
        }
        .sidebar-logo-icon {
          width: 36px; height: 36px;
          background: linear-gradient(135deg, var(--blue), var(--purple));
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          color: white;
          flex-shrink: 0;
        }
        .sidebar-logo-title { font-family: var(--font-heading); font-size: 16px; font-weight: 700; }
        .sidebar-logo-sub   { font-size: 11px; color: var(--text-muted); }
        .sidebar-patient {
          display: flex; align-items: center; gap: 10px;
          margin: 12px 16px 4px;
          padding: 10px 14px;
          background: var(--green-dim);
          border: 1px solid rgba(16,185,129,0.25);
          border-radius: var(--radius);
        }
        .sidebar-nav { flex: 1; overflow-y: auto; padding: 12px 12px 0; }
        .sidebar-nav-label { font-size: 10px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing:.08em; padding: 0 8px 8px; }
        .sidebar-link {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 12px;
          border-radius: var(--radius);
          color: var(--text-secondary);
          font-size: 13.5px;
          font-weight: 500;
          transition: all 0.18s ease;
          position: relative;
          text-decoration: none;
          margin-bottom: 2px;
        }
        .sidebar-link:hover { background: var(--bg-hover); color: var(--text-primary); }
        .sidebar-link.active { background: var(--blue-glow); color: var(--blue); }
        .sidebar-link.active .sidebar-link-icon { color: var(--blue); }
        .sidebar-link.disabled { opacity: 0.4; }
        .sidebar-link-icon { width: 28px; display: flex; align-items: center; justify-content: center; }
        .sidebar-link span { flex: 1; }
        .sidebar-chevron { opacity: 0; transition: opacity 0.15s; }
        .sidebar-link:hover .sidebar-chevron { opacity: 1; }
        .sidebar-done-dot { width:7px; height:7px; border-radius:50%; background:var(--green); box-shadow:0 0 6px var(--green); flex-shrink:0; }
        .sidebar-bottom { padding: 12px; }
        .sidebar-divider { height:1px; background: var(--border); margin-bottom:12px; }
      `}</style>
    </aside>
  );
}

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePatient } from '../context/PatientContext';
import { listPatients } from '../services/api';
import { User, Stethoscope, Activity, Shield, Cpu, Zap, ArrowRight, Plus, Search } from 'lucide-react';

const FEATURES = [
  { icon: Stethoscope, color: 'var(--blue)',   title: 'AI Diagnosis',      desc: 'MedGemma-powered differential diagnosis interview' },
  { icon: Activity,    color: 'var(--green)',  title: 'Digital Twin',      desc: 'Real-time health monitoring & predictive analytics' },
  { icon: Shield,      color: 'var(--purple)', title: 'Medicine Safety',   desc: 'AI prescription verification & contraindication check' },
  { icon: Cpu,         color: 'var(--amber)',  title: 'Smart Wellness',    desc: 'Personalized diet & exercise plans from your diagnosis' },
];

export default function LandingPage() {
  const { update, patientId } = usePatient();
  const navigate = useNavigate();
  const [inputId, setInputId] = useState(patientId || '');
  const [loading, setLoading] = useState(false);
  const [patients, setPatients] = useState([]);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');

  const handleLoadPatients = async () => {
    setLoading(true); setError('');
    try {
      const res = await listPatients();
      setPatients(res.patients || []);
      setSearched(true);
    } catch (e) {
      setError(e.message);
      setSearched(true);
    } finally { setLoading(false); }
  };

  const handleSelect = (id) => {
    update({ patientId: id, conversationId: null, conversationHistory: [], currentReport: '' });
    navigate('/diagnosis');
  };

  const handleManual = () => {
    if (!inputId.trim()) { setError('Please enter a Patient ID'); return; }
    handleSelect(inputId.trim());
  };

  return (
    <div className="landing-page">
      {/* Hero */}
      <div className="hero-section">
        <div className="hero-badge">
          <Zap size={13} />
          <span>AI-Powered Hospital System</span>
        </div>
        <h1 className="hero-title">
          Complete Patient Journey,<br />
          <span className="gradient-text">from Diagnosis to Cure</span>
        </h1>
        <p className="hero-sub">
          MedGemma conducts intelligent differential diagnosis interviews, tracks patient health
          via a digital twin, verifies medication safety, and generates personalised wellness plans — all in one unified platform.
        </p>
      </div>

      {/* Patient Selection Card */}
      <div className="card patient-card fade-in-up">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{ width:42, height:42, background:'var(--blue-glow)', border:'1px solid rgba(14,165,233,0.3)', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--blue)' }}>
            <User size={20} />
          </div>
          <div>
            <div className="section-title" style={{ marginBottom: 0, fontSize: 18 }}>Select Patient</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Enter a patient ID or load from EHR</div>
          </div>
        </div>

        <div style={{ display:'flex', gap:12, marginBottom:16 }}>
          <input
            className="input"
            placeholder="Enter Patient ID (e.g. p1)"
            value={inputId}
            onChange={(e) => setInputId(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleManual()}
          />
          <button className="btn btn-primary" onClick={handleManual}>
            <ArrowRight size={16} />
            Start
          </button>
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
          <div className="divider" style={{ flex:1, margin: 0 }} />
          <span style={{ fontSize:12, color:'var(--text-muted)' }}>or</span>
          <div className="divider" style={{ flex:1, margin: 0 }} />
        </div>

        <button className="btn btn-secondary" style={{ width:'100%', justifyContent:'center' }} onClick={handleLoadPatients} disabled={loading}>
          {loading ? <><div className="spinner" style={{ width:16, height:16 }} />Loading...</> : <><Search size={16} />Load Patients from EHR</>}
        </button>

        {error && <div style={{ marginTop:12, padding:'10px 14px', background:'var(--red-dim)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:'var(--radius)', fontSize:13, color:'var(--red)' }}>{error}</div>}

        {searched && patients.length > 0 && (
          <div style={{ marginTop:16 }}>
            <div style={{ fontSize:12, color:'var(--text-muted)', marginBottom:10 }}>Select a patient from EHR:</div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {patients.map((p) => {
                const id = typeof p === 'string' ? p : p.patient_id || p.id;
                const name = typeof p === 'object' ? (p.name || id) : id;
                return (
                  <button
                    key={id}
                    className="patient-row"
                    onClick={() => handleSelect(id)}
                  >
                    <div className="status-dot blue" />
                    <div style={{ flex:1, textAlign:'left' }}>
                      <div style={{ fontSize:14, fontWeight:500 }}>{name}</div>
                      {typeof p === 'object' && p.age && <div style={{ fontSize:12, color:'var(--text-muted)' }}>Age {p.age} · {p.gender || ''}</div>}
                    </div>
                    <ArrowRight size={15} style={{ color:'var(--text-muted)' }} />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {searched && patients.length === 0 && !error && (
          <div style={{ marginTop:14, textAlign:'center', color:'var(--text-muted)', fontSize:13 }}>
            No patients found. Enter an ID above to create a new session.
          </div>
        )}
      </div>

      {/* Feature Grid */}
      <div style={{ marginTop: 40 }}>
        <div className="section-title" style={{ marginBottom: 6 }}>What's Included</div>
        <div className="section-subtitle">A complete end-to-end AI-assisted patient management workflow</div>
        <div className="grid-2" style={{ gap: 16 }}>
          {FEATURES.map(({ icon: Icon, color, title, desc }) => (
            <div key={title} className="card card-sm feature-card">
              <div style={{ width:40, height:40, background: `${color}18`, border:`1px solid ${color}40`, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', color, marginBottom:14 }}>
                <Icon size={18} />
              </div>
              <div style={{ fontSize:15, fontWeight:600, marginBottom:6 }}>{title}</div>
              <div style={{ fontSize:13, color:'var(--text-secondary)', lineHeight:1.5 }}>{desc}</div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .landing-page { max-width: 720px; }
        .hero-section { margin-bottom: 32px; }
        .hero-badge {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 5px 14px;
          background: var(--blue-glow);
          border: 1px solid rgba(14,165,233,0.3);
          border-radius: 99px;
          font-size: 12px; color: var(--blue); font-weight: 500;
          margin-bottom: 20px;
        }
        .hero-title { font-size: 38px; line-height: 1.15; margin-bottom: 16px; }
        .hero-sub { font-size: 15px; color: var(--text-secondary); line-height: 1.65; max-width: 580px; }
        .patient-card { max-width: 560px; }
        .patient-row {
          display: flex; align-items: center; gap: 12px;
          width: 100%; padding: 12px 14px;
          background: var(--bg-surface);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          cursor: pointer;
          transition: all 0.18s;
          color: var(--text-primary);
          font-family: var(--font-body);
        }
        .patient-row:hover { border-color: var(--blue); background: var(--bg-hover); }
        .feature-card { cursor: default; transition: border-color 0.2s, transform 0.2s; }
        .feature-card:hover { border-color: var(--border-hover); transform: translateY(-2px); }
      `}</style>
    </div>
  );
}

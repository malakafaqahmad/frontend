import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePatient } from '../context/PatientContext';
import { generateFirstAid } from '../services/api';
import MarkdownRenderer from '../components/ui/MarkdownRenderer';
import { AlertTriangle, Zap, Phone, HeartPulse, ShieldAlert, ChevronRight, RefreshCw } from 'lucide-react';

const QUICK_SYMPTOMS = [
  'Severe chest pain and difficulty breathing',
  'Sudden loss of consciousness',
  'Severe allergic reaction (anaphylaxis)',
  'Heavy bleeding that won\'t stop',
  'Suspected stroke (facial drooping, arm weakness, slurred speech)',
  'Choking',
  'Severe burns',
  'Seizure',
];

const EMERGENCY_NUMBERS = [
  { label: 'Emergency',   number: '911',  color: 'var(--red)' },
  { label: 'Poison Control', number: '1-800-222-1222', color: 'var(--amber)' },
  { label: 'Crisis Line',    number: '988', color: 'var(--purple)' },
];

export default function FirstAidPage() {
  const { patientId } = usePatient();
  const navigate = useNavigate();
  const [symptoms, setSymptoms] = useState('');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState('');
  const [error, setError] = useState('');

  const generate = async (symptomsText) => {
    const text = symptomsText || symptoms;
    if (!text.trim()) { setError('Please describe the emergency symptoms.'); return; }
    if (!patientId)   { navigate('/'); return; }
    setLoading(true); setError(''); setReport('');
    try {
      const res = await generateFirstAid({ patient_id: patientId, current_symptoms: text });
      setReport(res.emergency_report || '');
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const quickFill = (s) => { setSymptoms(s); generate(s); };

  return (
    <div>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:20 }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
            <div style={{ width:38, height:38, borderRadius:12, background:'var(--red-dim)', color:'var(--red)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <ShieldAlert size={20} />
            </div>
            <h1 className="section-title" style={{ marginBottom:0 }}>First Aid Emergency Guide</h1>
          </div>
          <p className="section-subtitle" style={{ marginBottom:0 }}>
            AI-powered emergency response — describe symptoms and get immediate first aid instructions
          </p>
        </div>
        {/* Emergency Numbers */}
        <div style={{ display:'flex', gap:8, flexShrink: 0 }}>
          {EMERGENCY_NUMBERS.map(({ label, number, color }) => (
            <div key={label} style={{ padding:'8px 12px', background:`${color}12`, border:`1px solid ${color}40`, borderRadius:'var(--radius)', textAlign:'center' }}>
              <div style={{ fontSize:10, color, fontWeight:600, textTransform:'uppercase', letterSpacing:'.06em' }}>{label}</div>
              <div style={{ fontSize:14, fontWeight:700, color }}>{number}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Warning Banner */}
      <div style={{ marginBottom:20, padding:'14px 18px', background:'var(--red-dim)', border:'1px solid rgba(239,68,68,0.4)', borderRadius:'var(--radius-lg)', display:'flex', alignItems:'center', gap:12 }}>
        <AlertTriangle size={18} style={{ color:'var(--red)', flexShrink:0 }} />
        <span style={{ fontSize:13, color:'var(--red)', fontWeight:500 }}>
          This tool is for guidance only. For life-threatening emergencies, call <strong>911</strong> immediately before using this tool.
        </span>
      </div>

      {error && (
        <div style={{ marginBottom:16, padding:'10px 14px', background:'var(--red-dim)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:'var(--radius)', fontSize:13, color:'var(--red)' }}>{error}</div>
      )}

      <div className="firstaid-layout">
        {/* Left: Input */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {/* Symptom Input */}
          <div className="card">
            <div style={{ fontSize:15, fontWeight:600, marginBottom:14, display:'flex', alignItems:'center', gap:8 }}>
              <HeartPulse size={16} style={{ color:'var(--red)' }} />
              Describe the Emergency
            </div>
            <textarea
              className="input"
              rows={5}
              placeholder="Describe the patient's current symptoms in detail…&#10;e.g. Patient suddenly collapsed, unresponsive, breathing is laboured..."
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              style={{ resize:'vertical' }}
            />
            <div style={{ display:'flex', gap:10, marginTop:12 }}>
              {report && (
                <button className="btn btn-secondary" onClick={() => { setReport(''); setSymptoms(''); }}>
                  <RefreshCw size={15} />Clear
                </button>
              )}
              <button
                className="btn btn-danger"
                style={{ flex:1, justifyContent:'center', background:'var(--red)', color:'#fff', fontSize:15, fontWeight:600 }}
                onClick={() => generate()}
                disabled={loading || !symptoms.trim()}
              >
                {loading
                  ? <><div className="spinner" style={{ width:18, height:18, borderTopColor:'#fff' }} />Generating Response…</>
                  : <><Zap size={18} />Get First Aid Instructions</>}
              </button>
            </div>
          </div>

          {/* Quick Scenarios */}
          <div className="card">
            <div style={{ fontSize:14, fontWeight:600, marginBottom:12, color:'var(--text-secondary)' }}>Common Emergency Scenarios</div>
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {QUICK_SYMPTOMS.map((s) => (
                <button
                  key={s}
                  className="btn btn-ghost"
                  style={{ justifyContent:'flex-start', textAlign:'left', fontSize:13, padding:'8px 12px' }}
                  onClick={() => quickFill(s)}
                  disabled={loading}
                >
                  <AlertTriangle size={13} style={{ color:'var(--amber)', flexShrink:0 }} />
                  {s}
                  <ChevronRight size={13} style={{ marginLeft:'auto', color:'var(--text-muted)' }} />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Emergency Report */}
        <div className="card" style={{ minHeight:400 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16, paddingBottom:14, borderBottom:'1px solid var(--border)' }}>
            <div style={{ width:38, height:38, borderRadius:12, background:'var(--red-dim)', color:'var(--red)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <ShieldAlert size={18} />
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:15, fontWeight:600 }}>Emergency Response</div>
              <div style={{ fontSize:12, color:'var(--text-muted)' }}>AI-generated first aid instructions</div>
            </div>
            {report && <span className="badge badge-red">Active</span>}
          </div>

          {loading && (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:16, padding:'60px 0' }}>
              <div style={{ width:48, height:48, borderRadius:'50%', background:'var(--red-dim)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <div className="spinner" style={{ width:24, height:24, borderTopColor:'var(--red)', borderColor:'rgba(239,68,68,0.2)' }} />
              </div>
              <div style={{ fontSize:14, color:'var(--text-secondary)' }}>Generating emergency response…</div>
            </div>
          )}

          {!loading && report && (
            <div style={{ overflowY:'auto', maxHeight:700 }}>
              <MarkdownRenderer content={report} />
            </div>
          )}

          {!loading && !report && (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:320, color:'var(--text-muted)', textAlign:'center' }}>
              <ShieldAlert size={44} style={{ opacity:0.2, marginBottom:16, color:'var(--red)' }} />
              <div style={{ fontSize:15, fontWeight:600, marginBottom:6 }}>Ready for Emergency Input</div>
              <div style={{ fontSize:13 }}>Describe symptoms or pick a quick scenario to get immediate first aid guidance</div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .firstaid-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; align-items: start; }
        @media(max-width:900px) { .firstaid-layout { grid-template-columns: 1fr; } }
        .btn-danger { background: var(--red-dim); color: var(--red); border: 1px solid rgba(239,68,68,0.3); }
        .btn-danger:hover { background: rgba(239,68,68,0.25); }
      `}</style>
    </div>
  );
}

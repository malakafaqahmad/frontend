import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePatient } from '../context/PatientContext';
import { checkMedicineSafety } from '../services/api';
import MarkdownRenderer from '../components/ui/MarkdownRenderer';
import { Pill, Plus, Trash2, Shield, AlertTriangle, CheckCircle, ChevronRight, Zap } from 'lucide-react';

const EMPTY_MED = { name: '', dose: '', frequency: 'QD', route: 'PO', indication: '' };
const FREQ_OPTS  = ['QD','BID','TID','QID','PRN','Q8H','Q12H','QHS','Weekly'];
const ROUTE_OPTS = ['PO','IV','IM','SC','SL','Topical','Inhalation','Rectal'];

function RiskBadge({ level }) {
  const map = { low:['var(--green)','LOW RISK'], moderate:['var(--amber)','MODERATE RISK'], high:['var(--red)','HIGH RISK'], unknown:['var(--text-muted)','UNKNOWN'] };
  const [color, label] = map[level] || map.unknown;
  return (
    <div style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'6px 16px', background:`${color}18`, border:`1px solid ${color}40`, borderRadius:99, color, fontWeight:700, fontSize:13 }}>
      {level === 'low' ? <CheckCircle size={15} /> : <AlertTriangle size={15} />}
      {label}
    </div>
  );
}

function Section({ title, content, color = 'var(--blue)' }) {
  if (!content) return null;
  return (
    <div style={{ marginBottom:16 }}>
      <div style={{ fontSize:13, fontWeight:600, color, marginBottom:8, display:'flex', alignItems:'center', gap:6 }}>
        <div style={{ width:3, height:14, background:color, borderRadius:2 }} />
        {title}
      </div>
      {typeof content === 'string' ? (
        <div style={{ fontSize:13, color:'var(--text-secondary)', lineHeight:1.6 }}>{content}</div>
      ) : (
        <MarkdownRenderer content={JSON.stringify(content, null, 2)} />
      )}
    </div>
  );
}

export default function MedicineCheckPage() {
  const { patientId, currentReport } = usePatient();
  const navigate = useNavigate();

  const [prescriber, setPrescriber] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [meds, setMeds] = useState([{ ...EMPTY_MED }]);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');

  const addMed    = ()    => setMeds((p) => [...p, { ...EMPTY_MED }]);
  const removeMed = (i)   => setMeds((p) => p.filter((_, idx) => idx !== i));
  const updateMed = (i, k, v) =>
    setMeds((p) => p.map((m, idx) => idx === i ? { ...m, [k]: v } : m));

  const submit = async () => {
    if (!patientId)    { navigate('/'); return; }
    if (!currentReport){ setError('Please complete the diagnosis interview first to check medications.'); return; }
    if (meds.some((m) => !m.name.trim())) { setError('Please fill in all medication names.'); return; }
    setLoading(true); setError('');
    try {
      const res = await checkMedicineSafety({
        patient_id: patientId,
        current_report: currentReport,
        prescription_data: { prescriber, date, medications: meds },
      });
      setReport(res.safety_report);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <div className="section-title">Medicine Safety Check</div>
      <div className="section-subtitle">AI-powered prescription verification — contraindications, interactions & dosage check</div>

      {!currentReport && (
        <div style={{ marginBottom:20, padding:'14px 18px', background:'var(--amber-dim)', border:'1px solid rgba(245,158,11,0.3)', borderRadius:'var(--radius)', fontSize:14, color:'var(--amber)', display:'flex', alignItems:'center', gap:10 }}>
          <Zap size={16} />Complete the AI Diagnosis interview first.
          <button className="btn btn-sm" style={{ marginLeft:'auto', background:'var(--amber)', color:'#000' }} onClick={() => navigate('/diagnosis')}>Go to Diagnosis</button>
        </div>
      )}

      {error && <div style={{ marginBottom:16, padding:'10px 14px', background:'var(--red-dim)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:'var(--radius)', fontSize:13, color:'var(--red)' }}>{error}</div>}

      <div className="med-layout">
        {/* Prescription Form */}
        <div className="card">
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20, paddingBottom:16, borderBottom:'1px solid var(--border)' }}>
            <div style={{ width:40, height:40, background:'var(--purple-dim)', color:'var(--purple)', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Pill size={18} />
            </div>
            <div style={{ fontSize:16, fontWeight:600 }}>Prescription Details</div>
          </div>

          <div className="grid-2" style={{ gap:14, marginBottom:18 }}>
            <div className="form-group" style={{ marginBottom:0 }}>
              <label>Prescriber Name</label>
              <input className="input" placeholder="Dr. Smith" value={prescriber} onChange={(e) => setPrescriber(e.target.value)} />
            </div>
            <div className="form-group" style={{ marginBottom:0 }}>
              <label>Prescription Date</label>
              <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>

          <div style={{ fontSize:13, fontWeight:600, color:'var(--text-secondary)', marginBottom:12 }}>Medications</div>
          {meds.map((m, i) => (
            <div key={i} className="med-row">
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                <div className="badge badge-purple">Medication {i + 1}</div>
                {meds.length > 1 && (
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={() => removeMed(i)}>
                    <Trash2 size={14} style={{ color:'var(--red)' }} />
                  </button>
                )}
              </div>
              <div className="grid-2" style={{ gap:10, marginBottom:10 }}>
                <div className="form-group" style={{ marginBottom:0 }}>
                  <label>Medication Name *</label>
                  <input className="input" placeholder="e.g. Metformin 500mg" value={m.name} onChange={(e) => updateMed(i,'name',e.target.value)} />
                </div>
                <div className="form-group" style={{ marginBottom:0 }}>
                  <label>Dose</label>
                  <input className="input" placeholder="e.g. 500mg" value={m.dose} onChange={(e) => updateMed(i,'dose',e.target.value)} />
                </div>
                <div className="form-group" style={{ marginBottom:0 }}>
                  <label>Frequency</label>
                  <select className="input" value={m.frequency} onChange={(e) => updateMed(i,'frequency',e.target.value)}>
                    {FREQ_OPTS.map((f) => <option key={f}>{f}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom:0 }}>
                  <label>Route</label>
                  <select className="input" value={m.route} onChange={(e) => updateMed(i,'route',e.target.value)}>
                    {ROUTE_OPTS.map((r) => <option key={r}>{r}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group" style={{ marginBottom:0 }}>
                <label>Indication</label>
                <input className="input" placeholder="e.g. Type 2 Diabetes" value={m.indication} onChange={(e) => updateMed(i,'indication',e.target.value)} />
              </div>
            </div>
          ))}

          <div style={{ display:'flex', gap:12, marginTop:16 }}>
            <button className="btn btn-secondary btn-sm" onClick={addMed}>
              <Plus size={15} />Add Medication
            </button>
            <button className="btn btn-primary" onClick={submit} disabled={loading}>
              {loading ? <><div className="spinner" style={{width:16,height:16}} />Checking Safety…</> : <><Shield size={16} />Check Safety</>}
            </button>
          </div>
        </div>

        {/* Safety Report */}
        <div className="card">
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20, paddingBottom:16, borderBottom:'1px solid var(--border)' }}>
            <div style={{ width:40, height:40, background:'var(--green-dim)', color:'var(--green)', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Shield size={18} />
            </div>
            <div style={{ fontSize:16, fontWeight:600 }}>Safety Report</div>
            {report && <div style={{ marginLeft:'auto' }}><RiskBadge level={report.risk_aggregation?.includes('low') ? 'low' : report.risk_aggregation?.includes('high') ? 'high' : 'moderate'} /></div>}
          </div>

          {report ? (
            <div style={{ overflowY:'auto', maxHeight:600 }}>
              <Section title="Patient Summary"        content={report.patient_summary} />
              <Section title="Parsed Prescription"   content={report.parsed_prescription} />
              <Section title="Contraindications"     content={report.contraindication}    color="var(--red)" />
              <Section title="Drug Interactions"     content={report.interactions}         color="var(--amber)" />
              <Section title="Dose Check"            content={report.dose_check}           color="var(--blue)" />
              <Section title="Appropriateness"       content={report.appropriateness}      color="var(--purple)" />
              <Section title="Risk Summary"          content={report.risk_aggregation}     color="var(--red)" />
              <div style={{ marginTop:16, padding:16, background:'var(--bg-surface)', borderRadius:'var(--radius)', border:'1px solid var(--border)' }}>
                <div style={{ fontSize:13, fontWeight:600, color:'var(--blue)', marginBottom:10 }}>Final Report</div>
                <MarkdownRenderer content={report.final_report} />
              </div>
              <button className="btn btn-primary btn-sm" style={{ marginTop:16 }} onClick={() => navigate('/progress')}>
                View Progress <ChevronRight size={14} />
              </button>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:300, color:'var(--text-muted)' }}>
              <Shield size={40} style={{ marginBottom:14, opacity:0.3 }} />
              <div style={{ fontSize:14 }}>Fill in the prescription and click <strong style={{ color:'var(--text-primary)' }}>Check Safety</strong></div>
              <div style={{ fontSize:12, marginTop:6 }}>MedGemma will verify contraindications, interactions & dosing</div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .med-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; align-items: start; }
        @media(max-width:900px) { .med-layout { grid-template-columns: 1fr; } }
        .med-row { background: var(--bg-surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px; margin-bottom: 12px; }
      `}</style>
    </div>
  );
}

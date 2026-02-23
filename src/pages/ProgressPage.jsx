import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { usePatient } from '../context/PatientContext';
import { uploadDocument, sendChatMessage, getPatient } from '../services/api';
import MarkdownRenderer from '../components/ui/MarkdownRenderer';
import {
  TrendingUp, Calendar, MessageSquare, Upload, ChevronRight,
  CheckCircle, FileText, User, Clock,
} from 'lucide-react';

const TIMELINE = [
  { icon: User,         color: 'var(--blue)',   label: 'First Encounter',   sub: 'Diagnosis interview & initial report',  step: 1 },
  { icon: FileText,     color: 'var(--purple)', label: 'Medical Records',   sub: 'CT/MRI/lab uploads & report update',    step: 2 },
  { icon: CheckCircle,  color: 'var(--green)',  label: 'Wellness Plans',    sub: 'Personalised diet & exercise plans',    step: 3 },
  { icon: TrendingUp,   color: 'var(--cyan)',   label: 'Second Encounter',  sub: 'New labs & follow-up comparison',       step: 4 },
];

export default function ProgressPage() {
  const { patientId, conversationId, currentReport, finalReport, update } = usePatient();
  const navigate = useNavigate();

  const [activeStep, setActiveStep] = useState(4);
  const [newReport, setNewReport]   = useState('');
  const [uploading, setUploading]   = useState(false);
  const [chatInput, setChatInput]   = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [chatLoading, setChatLoading]   = useState(false);
  const [patientData, setPatientData]   = useState(null);
  const [loadingData, setLoadingData]   = useState(false);
  const [error, setError] = useState('');

  const loadProgress = async () => {
    if (!patientId) { navigate('/'); return; }
    setLoadingData(true); setError('');
    try {
      const res = await getPatient(patientId);
      setPatientData(res.data);
    } catch (e) { setError(e.message); }
    finally { setLoadingData(false); }
  };

  // Dropzone for new labs
  const onDrop = async (files) => {
    setUploading(true); setError('');
    for (const file of files) {
      try {
        const res = await uploadDocument(patientId, file);
        if (!res.success) throw new Error(res.error || 'Processing failed');
        if (res.updated_report) {
          const reportStr = typeof res.updated_report === 'string'
            ? res.updated_report
            : JSON.stringify(res.updated_report, null, 2);
          setNewReport(reportStr);
          update({ currentReport: reportStr });
        }
      } catch (e) { setError(e.message); }
    }
    setUploading(false);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'application/pdf': ['.pdf'], 'image/*': [] }, multiple: true });

  const sendChat = async () => {
    const text = chatInput.trim();
    if (!text || chatLoading) return;
    setChatInput('');
    const userMsg = { role:'user', content:text };
    setChatMessages((p) => [...p, userMsg]);
    setChatLoading(true);
    try {
      const res = await sendChatMessage({ patient_id: patientId, conversation_id: conversationId, message: text });
      if (res.message) setChatMessages((p) => [...p, { role:'assistant', content: res.message }]);
      if (res.updated_report) { setNewReport(res.updated_report); update({ currentReport: res.updated_report }); }
    } catch (e) { setError(e.message); }
    finally { setChatLoading(false); }
  };

  return (
    <div>
      <div className="section-title">Patient Progress</div>
      <div className="section-subtitle">Second encounter — upload new labs & see your full journey</div>

      {error && <div style={{ marginBottom:16, padding:'10px 14px', background:'var(--red-dim)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:'var(--radius)', fontSize:13, color:'var(--red)' }}>{error}</div>}

      {/* Timeline */}
      <div className="card" style={{ marginBottom:24 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
          <div style={{ fontSize:16, fontWeight:600 }}>Patient Journey</div>
          <button className="btn btn-secondary btn-sm" onClick={loadProgress} disabled={loadingData}>
            {loadingData ? <><div className="spinner" style={{width:14,height:14}} />Loading…</> : <><Clock size={14} />Load Full History</>}
          </button>
        </div>
        <div className="timeline">
          {TIMELINE.map(({ icon: Icon, color, label, sub, step }, idx) => (
            <div key={step} className={`timeline-item ${activeStep >= step ? 'done' : ''}`} onClick={() => setActiveStep(step)}>
              <div className="timeline-node" style={{ background: activeStep >= step ? `${color}18` : 'var(--bg-surface)', borderColor: activeStep >= step ? color : 'var(--border)', color: activeStep >= step ? color : 'var(--text-muted)' }}>
                <Icon size={16} />
              </div>
              {idx < TIMELINE.length - 1 && <div className="timeline-line" style={{ background: activeStep > step ? color : 'var(--border)' }} />}
              <div className="timeline-label">
                <div style={{ fontSize:13, fontWeight:600, color: activeStep >= step ? 'var(--text-primary)' : 'var(--text-muted)' }}>{label}</div>
                <div style={{ fontSize:12, color:'var(--text-muted)' }}>{sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="progress-layout">
        {/* Current Report (Encounter 1) */}
        <div className="card" style={{ minHeight: 400 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16, paddingBottom:12, borderBottom:'1px solid var(--border)' }}>
            <Calendar size={16} style={{ color:'var(--blue)' }} />
            <span style={{ fontSize:15, fontWeight:600 }}>First Encounter Report</span>
            {finalReport && <span className="badge badge-green" style={{ marginLeft:'auto' }}>Final</span>}
          </div>
          {/* Show finalReport if available, else currentReport */}
          {(finalReport || currentReport) ? (
            <div style={{ overflowY:'auto', maxHeight:480 }}>
              <MarkdownRenderer content={finalReport || currentReport} />
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:300, color:'var(--text-muted)' }}>
              <FileText size={36} style={{ opacity:0.3, marginBottom:12 }} />
              <div style={{ fontSize:14 }}>No report yet</div>
              <button className="btn btn-secondary btn-sm" style={{ marginTop:12 }} onClick={() => navigate('/diagnosis')}>
                Start Diagnosis Interview
              </button>
            </div>
          )}
        </div>

        {/* Second Encounter */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {/* Upload new labs */}
          <div className="card">
            <div style={{ fontSize:15, fontWeight:600, marginBottom:14, display:'flex', alignItems:'center', gap:8 }}>
              <Upload size={16} style={{ color:'var(--green)' }} />
              Upload New Labs / Reports
            </div>
            <div {...getRootProps()} className={`drop-zone ${isDragActive ? 'active' : ''}`} style={{ padding:'28px 20px' }}>
              <input {...getInputProps()} />
              {uploading ? (
                <div style={{ display:'flex', alignItems:'center', gap:10, justifyContent:'center' }}>
                  <div className="spinner" />
                  <span style={{ fontSize:14 }}>Processing…</span>
                </div>
              ) : (
                <div style={{ textAlign:'center' }}>
                  <Upload size={24} style={{ color:'var(--blue)', marginBottom:8 }} />
                  <div style={{ fontSize:13 }}>{isDragActive ? 'Drop files here' : 'Drag files or click to upload'}</div>
                </div>
              )}
            </div>
            {newReport && (
              <div style={{ marginTop:14 }}>
                <div style={{ fontSize:13, fontWeight:600, color:'var(--green)', marginBottom:8 }}>Updated Report (Encounter 2)</div>
                <div style={{ maxHeight:280, overflowY:'auto' }}>
                  <MarkdownRenderer content={newReport} />
                </div>
              </div>
            )}
          </div>

          {/* Follow-up Chat */}
          <div className="card">
            <div style={{ fontSize:15, fontWeight:600, marginBottom:14, display:'flex', alignItems:'center', gap:8 }}>
              <MessageSquare size={16} style={{ color:'var(--purple)' }} />
              Follow-up Chat
            </div>
            <div style={{ background:'var(--bg-surface)', borderRadius:'var(--radius)', padding:14, maxHeight:260, overflowY:'auto', marginBottom:12, display:'flex', flexDirection:'column', gap:10 }}>
              {chatMessages.length === 0 && (
                <div style={{ textAlign:'center', color:'var(--text-muted)', fontSize:13, padding:'20px 0' }}>Ask MedGemma about your progress or new symptoms</div>
              )}
              {chatMessages.map((m, i) => (
                <div key={i} style={{ display:'flex', gap:8, flexDirection: m.role==='user' ? 'row-reverse' : 'row' }}>
                  <div style={{ maxWidth:'80%', padding:'10px 14px', borderRadius:14, background: m.role==='user' ? 'linear-gradient(135deg,var(--blue),var(--blue-dim))' : 'var(--bg-card)', border: m.role==='assistant' ? '1px solid var(--border)' : 'none', fontSize:13, color: m.role==='user' ? '#fff' : 'var(--text-secondary)' }}>
                    {m.content}
                  </div>
                </div>
              ))}
              {chatLoading && <div className="typing-dots" style={{ padding:'8px 14px' }}><span /><span /><span /></div>}
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <input className="input" style={{ borderRadius:99 }} placeholder="Ask about your progress…" value={chatInput}
                onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key==='Enter' && sendChat()} disabled={chatLoading} />
              <button className="btn btn-primary btn-icon" onClick={sendChat} disabled={chatLoading || !chatInput.trim()}>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {patientData && (
        <div className="card" style={{ marginTop:20 }}>
          <div style={{ fontSize:15, fontWeight:600, marginBottom:14 }}>Full EHR Record</div>
          <pre style={{ fontSize:12, color:'var(--text-secondary)', overflowX:'auto', background:'var(--bg-surface)', padding:14, borderRadius:'var(--radius)', maxHeight:300 }}>
            {JSON.stringify(patientData, null, 2)}
          </pre>
        </div>
      )}

      <style>{`
        .progress-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; align-items: start; }
        @media(max-width:900px) { .progress-layout { grid-template-columns: 1fr; } }
        .timeline { display: flex; align-items: flex-start; gap: 0; flex-wrap: nowrap; overflow-x: auto; padding-bottom: 8px; }
        .timeline-item { display: flex; flex-direction: column; align-items: center; cursor: pointer; flex-shrink: 0; position: relative; }
        .timeline-node { width: 44px; height: 44px; border-radius: 50%; border: 2px solid; display: flex; align-items: center; justify-content: center; transition: all 0.2s; z-index: 1; }
        .timeline-line { height: 2px; width: 80px; margin: 21px -4px; align-self: flex-start; transition: background 0.3s; }
        .timeline-label { text-align: center; max-width: 100px; margin-top: 10px; }
        .drop-zone { border: 2px dashed var(--border); border-radius: var(--radius); cursor: pointer; transition: all 0.2s; background: var(--bg-surface); }
        .drop-zone:hover { border-color: var(--blue); background: var(--bg-hover); }
        .drop-zone.active { border-color: var(--blue); background: var(--blue-glow); }
      `}</style>
    </div>
  );
}

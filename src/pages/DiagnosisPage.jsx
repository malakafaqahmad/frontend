import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePatient } from '../context/PatientContext';
import { sendChatMessage } from '../services/api';
import MarkdownRenderer from '../components/ui/MarkdownRenderer';
import DataViewer from '../components/ui/DataViewer';
import {
  Send, Bot, User, FileText, ChevronRight, RefreshCw,
  Stethoscope, ClipboardList, X, AlertCircle,
} from 'lucide-react';

// ── Phase Progress Bar ─────────────────────────────────────────────
function PhaseBar({ phase, progress }) {
  const phases = ['Initial Interview', 'Diagnosis Report', 'Second Interview', 'Final Report'];
  const idx = { initial_interview: 0, second_interview: 2, final_report: 3 }[phase] ?? 0;

  return (
    <div className="phase-bar">
      {phases.map((p, i) => (
        <div key={p} className={`phase-step ${i < idx ? 'done' : i === idx ? 'active' : ''}`}>
          <div className="phase-dot">{i < idx ? '✓' : i + 1}</div>
          <span>{p}</span>
          {i < phases.length - 1 && <ChevronRight size={13} style={{ color: 'var(--text-muted)', margin: '0 4px' }} />}
        </div>
      ))}
      <div style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>
        {progress ? `${progress.current_phase_message_count}/${progress.phase_message_limit}` : ''}
      </div>
    </div>
  );
}

// ── Chat Bubble ────────────────────────────────────────────────────
function ChatBubble({ msg }) {
  const isAI = msg.role === 'assistant';
  return (
    <div className={`bubble-row ${isAI ? 'ai' : 'user'}`}>
      {isAI && <div className="bubble-avatar ai"><Bot size={15} /></div>}
      <div className={`bubble ${isAI ? 'bubble-ai' : 'bubble-user'}`}>
        {isAI ? <MarkdownRenderer content={msg.content} /> : <p style={{ fontSize: 14, margin: 0 }}>{msg.content}</p>}
      </div>
      {!isAI && <div className="bubble-avatar user"><User size={15} /></div>}
    </div>
  );
}

// ── Differential Diagnoses Card ────────────────────────────────────
function DifferentialCard({ data }) {
  // data can be array or object or string
  const items = Array.isArray(data)
    ? data
    : typeof data === 'object' && data !== null
      ? Object.entries(data).map(([k, v]) => ({ condition: k, ...(typeof v === 'object' ? v : { details: v }) }))
      : null;

  return (
    <div className="diag-diff-card">
      <div className="diag-diff-header">
        <Stethoscope size={15} />
        <span>Differential Diagnoses</span>
      </div>
      {items ? (
        <div className="diag-diff-list">
          {items.slice(0, 8).map((item, i) => {
            const name = item.condition || item.name || item.diagnosis || `Diagnosis ${i + 1}`;
            const prob = item.probability ?? item.likelihood ?? item.confidence ?? null;
            const detail = item.details || item.description || item.reasoning || '';
            return (
              <div key={i} className="diag-diff-item">
                <div className="diag-diff-rank">{i + 1}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{name}</span>
                    {prob != null && (
                      <span className="badge" style={{
                        background: i === 0 ? 'rgba(14,165,233,0.15)' : 'var(--bg-surface)',
                        color: i === 0 ? 'var(--blue)' : 'var(--text-muted)',
                        fontSize: 11,
                      }}>
                        {typeof prob === 'number' && prob <= 1 ? `${Math.round(prob * 100)}%` : prob}
                      </span>
                    )}
                  </div>
                  {detail && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2, lineHeight: 1.5 }}>{String(detail).slice(0, 180)}</div>}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <DataViewer data={data} />
      )}
    </div>
  );
}

// ── Full Report Modal ──────────────────────────────────────────────
function FullReportModal({ report, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ClipboardList size={18} style={{ color: 'var(--blue)' }} />
            <span style={{ fontSize: 16, fontWeight: 700 }}>Final Diagnosis Report</span>
          </div>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <MarkdownRenderer content={report} />
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────
export default function DiagnosisPage() {
  const {
    patientId, conversationId, conversationHistory,
    currentReport, diffDiagnoses: ctxDiff, finalReport: ctxFinal, update,
  } = usePatient();
  const navigate = useNavigate();
  const [messages, setMessages] = useState(conversationHistory || []);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState('initial_interview');
  const [progress, setProgress] = useState(null);
  const [report, setReport] = useState(currentReport || '');
  const [diffDiagnoses, setDiffDiagnoses] = useState(ctxDiff ?? null);
  const [finalReport, setFinalReport] = useState(ctxFinal ?? null);
  const [showModal, setShowModal] = useState(false);
  // Restore to most complete tab available on mount
  const [reportTab, setReportTab] = useState(
    ctxFinal != null ? 'final' : ctxDiff != null ? 'diff' : 'report'
  );
  const [error, setError] = useState('');
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const hasStarted = useRef(false);

  useEffect(() => {
    if (!patientId) { navigate('/'); return; }
    if (!hasStarted.current && messages.length === 0) {
      hasStarted.current = true;
      startSession();
    }
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const startSession = async () => {
    setLoading(true); setError('');
    try {
      const res = await sendChatMessage({ patient_id: patientId });
      handleResponse(res);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const handleResponse = (res) => {
    if (!res.success) { setError(res.error || 'Something went wrong'); return; }

    if (res.message) {
      setMessages((prev) => {
        const next = [...prev, { role: 'assistant', content: res.message }];
        update({ conversationHistory: next });
        return next;
      });
    }

    if (res.conversation_id) update({ conversationId: res.conversation_id });
    if (res.phase) { setPhase(res.phase); update({ currentPhase: res.phase }); }
    if (res.progress) setProgress(res.progress);

    if (res.updated_report) {
      setReport(res.updated_report);
      update({ currentReport: res.updated_report });
    }

    if (res.differential_diagnoses != null) {
      setDiffDiagnoses(res.differential_diagnoses);
      update({ diffDiagnoses: res.differential_diagnoses });
      setReportTab('diff'); // auto-switch tab
    }

    if (res.final_report != null) {
      setFinalReport(res.final_report);
      update({ finalReport: res.final_report });
      setReportTab('final'); // auto-switch tab
    }
  };

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput(''); setError('');
    setMessages((prev) => {
      const next = [...prev, { role: 'user', content: text }];
      update({ conversationHistory: next });
      return next;
    });
    setLoading(true);
    try {
      const res = await sendChatMessage({
        patient_id: patientId,
        message: text,
        conversation_id: conversationId,
      });
      handleResponse(res);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); inputRef.current?.focus(); }
  };

  // Report panel tab list (only show tabs that have content)
  const reportTabs = [
    { id: 'report', label: 'Live Report', show: true },
    { id: 'diff', label: 'Differential Dx', show: diffDiagnoses != null },
    { id: 'final', label: 'Final Report', show: finalReport != null },
  ].filter((t) => t.show);

  return (
    <div className="diag-layout">
      <PhaseBar phase={phase} progress={progress} />

      <div className="diag-body">
        {/* ── Chat Panel ─────────────────────────────────── */}
        <div className="chat-panel">
          <div className="chat-messages">
            {messages.length === 0 && !loading && (
              <div className="chat-empty">
                <Bot size={40} style={{ color: 'var(--blue)', marginBottom: 12 }} />
                <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>MedGemma AI is ready</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Starting your differential diagnosis interview…</div>
              </div>
            )}
            {messages.map((m, i) => <ChatBubble key={i} msg={m} />)}

            {/* Loading bubble */}
            {loading && (
              <div className="bubble-row ai">
                <div className="bubble-avatar ai"><Bot size={15} /></div>
                <div className="bubble bubble-ai typing-dots"><span /><span /><span /></div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Final report banner */}
          {finalReport && (
            <div style={{ margin: '0 16px 8px', padding: '10px 14px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <ClipboardList size={15} style={{ color: 'var(--green)', flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: 'var(--green)', fontWeight: 500 }}>Final diagnosis report is ready</span>
              <button
                className="btn btn-sm"
                style={{ marginLeft: 'auto', background: 'var(--green)', color: '#000', fontWeight: 600 }}
                onClick={() => setShowModal(true)}
              >
                View Full Report
              </button>
            </div>
          )}

          {error && (
            <div style={{ margin: '0 20px 10px', padding: '10px 14px', background: 'var(--red-dim)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius)', fontSize: 13, color: 'var(--red)' }}>
              <AlertCircle size={13} style={{ display: 'inline', marginRight: 6 }} />{error}
            </div>
          )}

          <div className="chat-input-bar">
            <input
              ref={inputRef}
              className="input chat-input"
              placeholder="Describe your symptoms…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
              disabled={loading}
            />
            <button className="btn btn-primary btn-icon" onClick={send} disabled={loading || !input.trim()}>
              <Send size={16} />
            </button>
          </div>
        </div>

        {/* ── Report Panel ───────────────────────────────── */}
        <div className="report-panel">
          {/* Tabs */}
          <div className="report-header" style={{ flexDirection: 'column', gap: 10, alignItems: 'stretch' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <FileText size={16} style={{ color: 'var(--blue)' }} />
              <span style={{ fontSize: 14, fontWeight: 600 }}>AI Analysis</span>
              {finalReport && (
                <button
                  className="btn btn-sm"
                  style={{ marginLeft: 'auto', background: 'var(--green)', color: '#000', fontWeight: 600, fontSize: 12 }}
                  onClick={() => setShowModal(true)}
                >
                  <ClipboardList size={12} /> Full Report
                </button>
              )}
            </div>
            {reportTabs.length > 1 && (
              <div className="rp-tabs">
                {reportTabs.map((t) => (
                  <button
                    key={t.id}
                    className={`rp-tab ${reportTab === t.id ? 'active' : ''}`}
                    onClick={() => setReportTab(t.id)}
                  >
                    {t.label}
                    {t.id === 'diff' && diffDiagnoses && <span className="rp-tab-dot blue" />}
                    {t.id === 'final' && finalReport && <span className="rp-tab-dot green" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Content */}
          <div className="report-content" style={{ overflowY: 'auto', flex: 1, padding: 18 }}>
            {/* Live Report tab */}
            {reportTab === 'report' && (
              report
                ? <>
                  <MarkdownRenderer content={report} />
                  <button
                    className="btn btn-primary btn-sm"
                    style={{ marginTop: 20 }}
                    onClick={() => navigate('/records')}
                  >
                    Upload Medical Records <ChevronRight size={14} />
                  </button>
                </>
                : <div className="report-placeholder">
                  <RefreshCw size={32} style={{ color: 'var(--text-muted)', marginBottom: 10 }} />
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>
                    Report will appear here as the interview progresses
                  </div>
                </div>
            )}

            {/* Differential Diagnoses tab */}
            {reportTab === 'diff' && diffDiagnoses && (
              <DifferentialCard data={diffDiagnoses} />
            )}

            {/* Final Report tab */}
            {reportTab === 'final' && finalReport && (
              <>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                  <button
                    className="btn btn-sm"
                    style={{ background: 'var(--green)', color: '#000', fontWeight: 600 }}
                    onClick={() => setShowModal(true)}
                  >
                    <ClipboardList size={13} /> Open Full Screen
                  </button>
                </div>
                <MarkdownRenderer content={finalReport} />
                <button
                  className="btn btn-primary btn-sm"
                  style={{ marginTop: 20 }}
                  onClick={() => navigate('/records')}
                >
                  Upload Medical Records <ChevronRight size={14} />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Full Report Modal */}
      {showModal && finalReport && (
        <FullReportModal report={finalReport} onClose={() => setShowModal(false)} />
      )}

      <style>{`
        .diag-layout { display: flex; flex-direction: column; height: calc(100vh - var(--topbar-h) - 40px); }

        /* Phase bar */
        .phase-bar {
          display: flex; align-items: center; flex-wrap: wrap; gap: 4px;
          padding: 12px 20px;
          background: var(--bg-surface); border: 1px solid var(--border);
          border-radius: var(--radius-lg); margin-bottom: 16px;
        }
        .phase-step { display: flex; align-items: center; gap: 6px; }
        .phase-dot {
          width: 22px; height: 22px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 11px; font-weight: 700;
          background: var(--bg-surface); border: 1px solid var(--border);
          color: var(--text-muted); flex-shrink: 0;
        }
        .phase-step.done .phase-dot  { background: var(--green-dim); border-color: var(--green); color: var(--green); }
        .phase-step.active .phase-dot { background: var(--blue-glow); border-color: var(--blue); color: var(--blue); animation: pulse-glow 2s infinite; }
        .phase-step span { font-size: 13px; color: var(--text-muted); }
        .phase-step.active span { color: var(--text-primary); font-weight: 500; }
        .phase-step.done span { color: var(--green); }

        /* Body */
        .diag-body { display: flex; gap: 16px; flex: 1; overflow: hidden; }

        /* Chat */
        .chat-panel {
          flex: 1; display: flex; flex-direction: column;
          background: var(--bg-card); border: 1px solid var(--border);
          border-radius: var(--radius-lg); overflow: hidden;
        }
        .chat-messages { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 14px; }
        .chat-empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; color: var(--text-secondary); }
        .bubble-row { display: flex; gap: 10px; align-items: flex-end; }
        .bubble-row.user { flex-direction: row-reverse; }
        .bubble-avatar {
          width: 30px; height: 30px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .bubble-avatar.ai   { background: var(--blue-glow);   border: 1px solid rgba(14,165,233,0.3);  color: var(--blue); }
        .bubble-avatar.user { background: var(--purple-dim);  border: 1px solid rgba(139,92,246,0.3); color: var(--purple); }
        .bubble { max-width: 75%; padding: 12px 16px; border-radius: 16px; }
        .bubble-ai   { background: var(--bg-surface); border: 1px solid var(--border); border-bottom-left-radius: 4px; }
        .bubble-user { background: linear-gradient(135deg,var(--blue),var(--blue-dim)); color: #fff; border-bottom-right-radius: 4px; }
        .chat-input-bar { display: flex; gap: 10px; padding: 14px 16px; border-top: 1px solid var(--border); }
        .chat-input { border-radius: 99px; padding-left: 20px; }

        /* Report panel */
        .report-panel {
          width: 360px; flex-shrink: 0;
          background: var(--bg-card); border: 1px solid var(--border);
          border-radius: var(--radius-lg); display: flex; flex-direction: column; overflow: hidden;
        }
        .report-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 14px 16px; border-bottom: 1px solid var(--border); flex-shrink: 0;
        }
        .report-placeholder { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px; }

        /* Report tabs */
        .rp-tabs { display: flex; gap: 2px; }
        .rp-tab {
          padding: 5px 12px; border-radius: var(--radius); border: 1px solid transparent;
          background: transparent; color: var(--text-muted); font-size: 12px; font-weight: 500;
          cursor: pointer; transition: all 0.18s; font-family: var(--font-body);
          display: flex; align-items: center; gap: 5px;
        }
        .rp-tab:hover:not(.active) { background: var(--bg-hover); color: var(--text-primary); }
        .rp-tab.active { background: var(--blue-glow); color: var(--blue); border-color: rgba(14,165,233,0.3); }
        .rp-tab-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
        .rp-tab-dot.blue  { background: var(--blue); }
        .rp-tab-dot.green { background: var(--green); }

        /* Differential diagnoses */
        .diag-diff-card { display: flex; flex-direction: column; gap: 0; }
        .diag-diff-header {
          display: flex; align-items: center; gap: 7px;
          font-size: 13px; font-weight: 600; color: var(--blue);
          margin-bottom: 12px;
        }
        .diag-diff-list { display: flex; flex-direction: column; gap: 8px; }
        .diag-diff-item {
          display: flex; align-items: flex-start; gap: 10px;
          padding: 10px 12px;
          background: var(--bg-surface); border: 1px solid var(--border);
          border-radius: var(--radius);
        }
        .diag-diff-rank {
          width: 22px; height: 22px; border-radius: 50%; flex-shrink: 0;
          background: var(--blue-glow); border: 1px solid rgba(14,165,233,0.3);
          color: var(--blue); font-size: 11px; font-weight: 700;
          display: flex; align-items: center; justify-content: center;
        }
        .diag-diff-item:first-child .diag-diff-rank {
          background: var(--blue); color: #fff; border-color: var(--blue);
        }

        /* Modal */
        .modal-overlay {
          position: fixed; inset: 0; z-index: 1000;
          background: rgba(0,0,0,0.7); backdrop-filter: blur(4px);
          display: flex; align-items: center; justify-content: center; padding: 24px;
        }
        .modal-box {
          background: var(--bg-card); border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          width: 100%; max-width: 780px; max-height: 85vh;
          display: flex; flex-direction: column;
          box-shadow: 0 25px 60px rgba(0,0,0,0.6);
        }
        .modal-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 18px 22px; border-bottom: 1px solid var(--border); flex-shrink: 0;
        }
        .modal-body { overflow-y: auto; padding: 24px; flex: 1; }
      `}</style>
    </div>
  );
}

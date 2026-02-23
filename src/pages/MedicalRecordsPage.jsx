import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useNavigate } from 'react-router-dom';
import { usePatient } from '../context/PatientContext';
import { uploadDocument } from '../services/api';
import MarkdownRenderer from '../components/ui/MarkdownRenderer';
import {
  Upload, X, CheckCircle, AlertCircle, ChevronRight,
  FileImage, FileText, Microscope, Clock, Cpu,
} from 'lucide-react';

// ── File type helpers ──────────────────────────────────────────────
const ACCEPTED = {
  'application/pdf':  ['.pdf'],
  'image/jpeg':       ['.jpg', '.jpeg'],
  'image/png':        ['.png'],
  'image/bmp':        ['.bmp'],
  'image/gif':        ['.gif'],
  'image/tiff':       ['.tiff', '.tif'],
};

const SCAN_LABELS = {
  lab:    { label: 'Lab Report',  color: 'var(--green)',  bg: 'var(--green-dim)' },
  ct:     { label: 'CT Scan',     color: 'var(--blue)',   bg: 'var(--blue-glow)' },
  mri:    { label: 'MRI',         color: 'var(--purple)', bg: 'var(--purple-dim)' },
  xray:   { label: 'X-Ray',       color: 'var(--amber)',  bg: 'var(--amber-dim)' },
  report: { label: 'Report',      color: 'var(--cyan)',   bg: 'rgba(6,182,212,0.12)' },
};

function guessType(filename) {
  const n = filename.toLowerCase();
  if (n.includes('ct') || n.includes('scan')) return 'ct';
  if (n.includes('mri'))                        return 'mri';
  if (n.includes('xray') || n.includes('x-ray')) return 'xray';
  if (n.includes('lab') || n.includes('blood') || n.includes('test')) return 'lab';
  return 'report';
}

function isImage(filename) {
  return /\.(jpg|jpeg|png|bmp|gif|tiff|tif)$/i.test(filename);
}

// ── File row ───────────────────────────────────────────────────────
function FileRow({ f, active, onRemove }) {
  const Icon = isImage(f.name) ? FileImage : FileText;
  const meta = SCAN_LABELS[f.type] || SCAN_LABELS.report;
  const handlerLabel = f.handler === 'image_handler' ? 'Image AI' : f.handler === 'pdf_handler' ? 'PDF' : null;

  return (
    <div className="file-row" style={{ borderColor: f.status === 'done' ? 'rgba(16,185,129,0.25)' : f.status === 'error' ? 'rgba(239,68,68,0.25)' : 'var(--border)' }}>
      <div className="file-icon" style={{ background: meta.bg, color: meta.color }}>
        <Icon size={16} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.name}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, display: 'flex', gap: 8 }}>
          <span>{meta.label}</span>
          {f.size  && <span>· {(f.size / 1024).toFixed(1)} KB</span>}
          {handlerLabel && <span style={{ color: 'var(--blue)' }}>· {handlerLabel}</span>}
          {f.processingTime && <span>· {f.processingTime}s</span>}
        </div>
      </div>
      <div style={{ flexShrink: 0 }}>
        {active && f.status === 'uploading' && <div className="spinner" style={{ width: 16, height: 16 }} />}
        {f.status === 'done'  && <CheckCircle size={17} style={{ color: 'var(--green)' }} />}
        {f.status === 'error' && <AlertCircle size={17} style={{ color: 'var(--red)' }} />}
      </div>
      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => onRemove(f.name)}><X size={14} /></button>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────
export default function MedicalRecordsPage() {
  const { patientId, currentReport, finalReport, uploadedFiles, update } = usePatient();
  const navigate = useNavigate();
  const [files, setFiles]             = useState(uploadedFiles || []);
  const [processing, setProcessing]   = useState(null);   // filename currently being processed
  // Show finalReport if available, else fall back to currentReport
  const [updatedReport, setUpdatedReport] = useState(finalReport || currentReport || '');
  const [lastAnalysis, setLastAnalysis]   = useState(null); // raw analysis_results from last upload
  const [error, setError]             = useState('');

  const onDrop = useCallback(async (accepted) => {
    if (!patientId) { setError('No patient selected. Go back to the landing page.'); return; }

    for (const file of accepted) {
      const type = guessType(file.name);
      setFiles((prev) => [...prev, { name: file.name, type, status: 'uploading', size: file.size }]);
      setProcessing(file.name);
      setError('');

      try {
        const res = await uploadDocument(patientId, file);

        if (!res.success) throw new Error(res.error || 'Processing failed');

        // Extract analysis results (key differs by handler)
        const analysisKey = res.handler_used === 'image_handler'
          ? 'image_analysis_results'
          : 'pdf_analysis_results';
        const analysisResults = res[analysisKey] || res.analysis_results || null;

        // Update report from response directly
        if (res.updated_report) {
          const reportStr = typeof res.updated_report === 'string'
            ? res.updated_report
            : JSON.stringify(res.updated_report, null, 2);
          setUpdatedReport(reportStr);
          update({ currentReport: reportStr });
        }

        if (analysisResults) setLastAnalysis(analysisResults);

        setFiles((prev) =>
          prev.map((f) =>
            f.name === file.name
              ? { ...f, status: 'done', handler: res.handler_used, processingTime: res.processing_time_seconds }
              : f
          )
        );
      } catch (e) {
        setError(`Failed to process "${file.name}": ${e.message}`);
        setFiles((prev) =>
          prev.map((f) => f.name === file.name ? { ...f, status: 'error' } : f)
        );
      } finally {
        setProcessing(null);
      }
    }
    update({ uploadedFiles: files });
  }, [patientId, files]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED,
    multiple: true,
  });

  const removeFile = (name) => setFiles((prev) => prev.filter((f) => f.name !== name));

  return (
    <div>
      <div className="section-title">Medical Records Upload</div>
      <div className="section-subtitle">
        Upload CT scans, MRIs, X-rays, lab reports, or PDFs — MedGemma AI will analyse them and update the diagnosis
      </div>

      <div className="records-layout">
        {/* ── Left: Upload zone + file list ─────────────── */}
        <div>
          <div {...getRootProps()} className={`drop-zone ${isDragActive ? 'active' : ''}`}>
            <input {...getInputProps()} />
            <div className="drop-icon"><Upload size={28} /></div>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>
              {isDragActive ? 'Release to upload…' : 'Drag & drop files here'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
              Supports <strong>Images</strong> (JPG, PNG, BMP, TIFF) and <strong>PDFs</strong> — up to 10 MB
            </div>
            <button className="btn btn-secondary btn-sm" type="button">Browse Files</button>
          </div>

          {/* File type chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '16px 0' }}>
            {Object.entries(SCAN_LABELS).map(([k, v]) => (
              <div key={k} className="chip" style={{ background: v.bg, borderColor: `${v.color}40`, color: v.color }}>
                <Microscope size={11} />{v.label}
              </div>
            ))}
          </div>

          {/* Supported types note */}
          <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
            <Cpu size={12} />
            Images are analysed by Vision AI · PDFs are extracted and analysed
          </div>

          {/* File list */}
          {files.length > 0 && (
            <div className="file-list">
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12 }}>
                Uploaded Files ({files.length})
              </div>
              {files.map((f) => (
                <FileRow
                  key={f.name}
                  f={f}
                  active={processing === f.name}
                  onRemove={removeFile}
                />
              ))}
            </div>
          )}

          {error && (
            <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--red-dim)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius)', fontSize: 13, color: 'var(--red)', display: 'flex', gap: 8 }}>
              <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
              {error}
            </div>
          )}
        </div>

        {/* ── Right: Updated report panel ────────────────── */}
        <div>
          <div className="card" style={{ height: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, paddingBottom: 14, borderBottom: '1px solid var(--border)' }}>
              <FileText size={16} style={{ color: 'var(--blue)' }} />
              <span style={{ fontSize: 15, fontWeight: 600 }}>Final Diagnosis Report</span>
              {updatedReport && <span className="badge badge-green" style={{ marginLeft: 'auto' }}>{finalReport ? 'Final' : 'Updated'}</span>}
            </div>

            {processing && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--blue-glow)', border: '1px solid rgba(14,165,233,0.25)', borderRadius: 'var(--radius)', marginBottom: 16, fontSize: 13 }}>
                <div className="spinner" style={{ width: 16, height: 16 }} />
                <span style={{ color: 'var(--blue)' }}>AI is analysing <strong>{processing}</strong>…</span>
                <Clock size={13} style={{ marginLeft: 'auto', color: 'var(--text-muted)' }} />
              </div>
            )}

            {updatedReport ? (
              <>
                <div style={{ maxHeight: 650, overflowY: 'auto', paddingRight: 8 }} className="custom-scrollbar">
                  <div style={{ padding: '4px 2px' }}>
                    <MarkdownRenderer content={updatedReport} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                  <button
                    className="btn btn-primary btn-sm"
                    style={{ flex: 1 }}
                    onClick={() => navigate('/wellness')}
                  >
                    Generate Wellness Plans <ChevronRight size={14} />
                  </button>
                  <button 
                    className="btn btn-secondary btn-sm" 
                    title="Print Report"
                    onClick={() => window.print()}
                  >
                    <FileText size={14} />
                  </button>
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 300, color: 'var(--text-muted)' }}>
                <FileText size={36} style={{ marginBottom: 12, opacity: 0.4 }} />
                <div style={{ fontSize: 14 }}>Upload a file to see the updated report</div>
                <div style={{ fontSize: 12, marginTop: 6 }}>MedGemma will confirm or revise the diagnosis</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .records-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; align-items: start; }
        @media(max-width:900px) { .records-layout { grid-template-columns: 1fr; } }

        .drop-zone {
          border: 2px dashed var(--border);
          border-radius: var(--radius-lg);
          padding: 40px 24px;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s;
          background: var(--bg-surface);
        }
        .drop-zone:hover { border-color: var(--blue); background: var(--bg-hover); }
        .drop-zone.active { border-color: var(--blue); background: var(--blue-glow); }
        .drop-icon {
          width: 60px; height: 60px; border-radius: 50%;
          background: var(--blue-glow); border: 1px solid rgba(14,165,233,0.3);
          display: flex; align-items: center; justify-content: center;
          color: var(--blue); margin: 0 auto 18px;
        }

        .file-list { display: flex; flex-direction: column; gap: 8px; }
        .file-row {
          display: flex; align-items: center; gap: 12px;
          padding: 10px 12px;
          background: var(--bg-surface);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          transition: border-color 0.2s;
        }
        .file-icon {
          width: 36px; height: 36px; border-radius: 9px;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
      `}</style>
    </div>
  );
}

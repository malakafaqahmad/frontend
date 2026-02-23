import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePatient } from '../context/PatientContext';
import { digitalTwinAnalyze, digitalTwinQuickCheck, getPatientLogs } from '../services/api';
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, RadialBarChart, RadialBar,
} from 'recharts';
import {
  Cpu, TrendingUp, TrendingDown, Minus, AlertTriangle,
  CheckCircle, Activity, Heart, Droplets, Wind, ChevronRight,
  Pill, Leaf, Zap, BarChart2, Target, GitBranch,
} from 'lucide-react';

// ── Helpers ────────────────────────────────────────────────────────
function fmt(val) {
  if (val == null) return '—';
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  if (typeof val === 'number') return val.toLocaleString();
  return String(val);
}

function capitalize(s) {
  if (!s) return '—';
  return String(s).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function statusColor(s) {
  if (!s) return 'var(--text-muted)';
  const v = String(s).toLowerCase();
  if (['good', 'improving', 'on_track', 'high', 'excellent', 'normal', 'stable'].some((k) => v.includes(k))) return 'var(--green)';
  if (['warning', 'moderate', 'declining', 'off_track', 'concern'].some((k) => v.includes(k))) return 'var(--amber)';
  if (['critical', 'poor', 'severe', 'low', 'danger', 'bad'].some((k) => v.includes(k))) return 'var(--red)';
  return 'var(--blue)';
}

// ── Health Score Gauge ─────────────────────────────────────────────
function HealthGauge({ score = 0 }) {
  const color = score >= 75 ? 'var(--green)' : score >= 50 ? 'var(--amber)' : 'var(--red)';
  return (
    <div style={{ position: 'relative', width: 160, height: 160, margin: '0 auto' }}>
      <RadialBarChart width={160} height={160} innerRadius={50} outerRadius={75}
        data={[{ name: 'score', value: score, fill: color }]} startAngle={210} endAngle={-30}>
        <RadialBar dataKey="value" cornerRadius={8} background={{ fill: 'var(--bg-surface)' }} />
      </RadialBarChart>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 30, fontWeight: 800, color, lineHeight: 1 }}>{Math.round(score)}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>/ 100</div>
      </div>
    </div>
  );
}

// ── Vital Card ─────────────────────────────────────────────────────
function VitalCard({ icon: Icon, label, value, unit, color }) {
  return (
    <div className="card card-sm vital-card">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{ width: 34, height: 34, borderRadius: 9, background: `${color}18`, color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={16} />
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</div>
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>
        {value ?? '—'}<span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 4 }}>{unit}</span>
      </div>
    </div>
  );
}

// ── Alert Item ─────────────────────────────────────────────────────
function AlertItem({ alert }) {
  const map = { critical: 'var(--red)', high: 'var(--amber)', medium: 'var(--blue)', low: 'var(--green)' };
  const color = map[alert.priority] || 'var(--text-muted)';
  return (
    <div className="alert-item" style={{ borderLeftColor: color }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 3 }}>{alert.alert_type || alert.title}</div>
      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{alert.description || alert.message}</div>
      {alert.recommendation && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, fontStyle: 'italic' }}>→ {alert.recommendation}</div>}
      <div className="badge" style={{ marginTop: 6, background: `${color}15`, color, border: `1px solid ${color}40`, fontSize: 11 }}>{alert.priority}</div>
    </div>
  );
}

// ── Info Row ───────────────────────────────────────────────────────
function InfoRow({ label, value, color }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 600, color: color || 'var(--text-primary)', textTransform: 'capitalize' }}>{fmt(value)}</span>
    </div>
  );
}

// ── Section Card ───────────────────────────────────────────────────
function SectionCard({ icon: Icon, color, title, children }) {
  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, paddingBottom: 11, borderBottom: '1px solid var(--border)' }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: `${color}18`, color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={14} />
        </div>
        <span style={{ fontSize: 14, fontWeight: 600 }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

// ── Memory Profiles Section ────────────────────────────────────────
function ProfileContent({ data }) {
  if (data == null) return <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '20px 0', textAlign: 'center' }}>No data for this period</div>;
  if (typeof data !== 'object') return <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{String(data)}</div>;

  return (
    <div>
      {Object.entries(data).map(([k, v]) => {
        if (v == null || typeof v !== 'object') {
          return <InfoRow key={k} label={capitalize(k)} value={v} color={statusColor(String(v ?? ''))} />;
        }
        if (Array.isArray(v)) {
          return (
            <div key={k} style={{ marginTop: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>{capitalize(k)}</div>
              {v.length === 0
                ? <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>None</div>
                : v.map((item, i) => (
                  <div key={i} style={{ fontSize: 12, color: 'var(--text-muted)', padding: '4px 10px', background: 'var(--bg-surface)', borderRadius: 'var(--radius)', marginBottom: 4 }}>
                    {typeof item === 'object' ? (
                      Object.entries(item).map(([ik, iv]) => (
                        typeof iv !== 'object'
                          ? <div key={ik} style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>{capitalize(ik)}</span><span style={{ fontWeight: 500, color: statusColor(String(iv)) }}>{fmt(iv)}</span></div>
                          : null
                      ))
                    ) : String(item)}
                  </div>
                ))
              }
            </div>
          );
        }
        // nested object
        return (
          <div key={k} style={{ marginTop: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>{capitalize(k)}</div>
            <div style={{ padding: '6px 10px', background: 'var(--bg-surface)', borderRadius: 'var(--radius)' }}>
              {Object.entries(v).map(([kk, vv]) =>
                typeof vv !== 'object'
                  ? <InfoRow key={kk} label={capitalize(kk)} value={vv} color={statusColor(String(vv ?? ''))} />
                  : null
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const PROFILE_KEYS = [
  { id: 'daily',   label: 'Daily',   icon: '📅' },
  { id: 'weekly',  label: 'Weekly',  icon: '📆' },
  { id: 'monthly', label: 'Monthly', icon: '🗓️' },
];

function MemoryProfilesSection({ profiles }) {
  const [activeProfile, setActiveProfile] = useState('daily');

  // Try to find the right key — backend may use 'daily_profile', 'daily', etc.
  function pickProfile(periodId) {
    if (!profiles) return null;
    // exact match first
    if (profiles[periodId] !== undefined) return profiles[periodId];
    // try with _profile suffix
    const withSuffix = `${periodId}_profile`;
    if (profiles[withSuffix] !== undefined) return profiles[withSuffix];
    // try keys that start with the period
    const found = Object.keys(profiles).find((k) => k.toLowerCase().startsWith(periodId));
    return found ? profiles[found] : null;
  }

  return (
    <div className="card">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, paddingBottom: 11, borderBottom: '1px solid var(--border)' }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(139,92,246,0.15)', color: 'var(--purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 14 }}>
          🧠
        </div>
        <span style={{ fontSize: 14, fontWeight: 600 }}>Memory Profiles</span>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 4 }}>AI health memory across time scales</span>
      </div>

      {/* Inner sub-tabs */}
      <div style={{ display: 'flex', gap: 3, marginBottom: 16, background: 'var(--bg-surface)', borderRadius: 'var(--radius)', padding: 3, width: 'fit-content' }}>
        {PROFILE_KEYS.map(({ id, label, icon }) => (
          <button
            key={id}
            onClick={() => setActiveProfile(id)}
            style={{
              padding: '6px 16px', borderRadius: 'calc(var(--radius) - 2px)',
              border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
              fontFamily: 'var(--font-body)',
              background: activeProfile === id ? 'var(--blue-glow)'  : 'transparent',
              color:      activeProfile === id ? 'var(--blue)'       : 'var(--text-muted)',
              borderColor: activeProfile === id ? 'rgba(14,165,233,0.3)' : 'transparent',
              transition: 'all 0.15s',
            }}
          >
            {icon} {label}
          </button>
        ))}
      </div>

      {/* Profile content */}
      <ProfileContent data={pickProfile(activeProfile)} />
    </div>
  );
}

// ── Default log ────────────────────────────────────────────────────
const DEFAULT_LOG = {
  date: new Date().toISOString().split('T')[0],
  medications_taken: [],
  vitals: { blood_pressure_systolic: 120, blood_pressure_diastolic: 80, heart_rate: 72, temperature_f: 98.6, blood_glucose_mg_dl: 100, weight_lbs: 170, oxygen_saturation_percent: 98 },
  symptoms: [],
  exercise: { exercise_minutes: 0, type: 'none', intensity: 'none' },
  nutrition: { meals: [] },
  labs: [],
  notes: '',
};

// ── Main ───────────────────────────────────────────────────────────
export default function DigitalTwinPage() {
  const { patientId, digitalTwinResult, update } = usePatient();
  const navigate = useNavigate();
  const [result, setResult]       = useState(digitalTwinResult);
  const [log, setLog]             = useState(DEFAULT_LOG);
  const [loading, setLoading]     = useState(false);
  const [quickLoading, setQuickLoading] = useState(false);
  const [error, setError]         = useState('');
  const [tab, setTab]             = useState('dashboard');
  const [historicalLogs, setHistoricalLogs] = useState([]);

  // Fetch historical logs on mount
  useEffect(() => {
    if (!patientId) return;
    getPatientLogs(patientId)
      .then((data) => setHistoricalLogs(data?.logs || []))
      .catch(() => {});
  }, [patientId]);

  // ── Aliases ──────────────────────────────────────────────────────
  const summary        = result?.executive_summary;
  const analysisRes    = result?.analysis_results  || {};
  const memProfiles    = result?.memory_profiles   || null;
  const forecast       = result?.health_forecast   || null;
  const clinAlerts     = result?.clinical_alerts   || {};
  const devAnalysis    = result?.deviation_analysis || null;
  const dtState        = result?.digital_twin_state || null;
  const processedLogs  = result?.processed_logs    || null;
  const alerts         = clinAlerts.alerts || [];

  const trendData = processedLogs?.weekly_summary?.daily_trends || null;

  const trajectory = summary?.trajectory;
  const TrajIcon = trajectory === 'improving' ? TrendingUp : trajectory === 'declining' ? TrendingDown : Minus;
  const trajColor = trajectory === 'improving' ? 'var(--green)' : trajectory === 'declining' ? 'var(--red)' : 'var(--amber)';

  // ── API calls ────────────────────────────────────────────────────
  const handleQuickCheck = async () => {
    if (!patientId) { navigate('/'); return; }
    setQuickLoading(true); setError('');
    try {
      const res = await digitalTwinQuickCheck({ patient_id: patientId, daily_logs: log });
      setResult((prev) => ({
        ...(prev || {}),
        executive_summary: {
          ...(prev?.executive_summary || {}),
          overall_health_status: res.overall_day_status,
          critical_alerts: res.critical_alerts,
          high_priority_alerts: res.high_priority_alerts,
          requires_immediate_attention: res.requires_immediate_attention,
        },
        clinical_alerts: {
          ...(prev?.clinical_alerts || {}),
          alerts: res.top_alerts || [],
          alert_summary: {
            critical_count: res.critical_alerts,
            high_priority_count: res.high_priority_alerts,
            requires_immediate_attention: res.requires_immediate_attention,
          },
        },
        _quick_check: {
          overall_day_status: res.overall_day_status,
          medication_adherence: res.medication_adherence,
          vitals_summary: res.vitals_summary,
        },
      }));
    } catch (e) { setError(e.message); }
    finally { setQuickLoading(false); }
  };

  const handleFullAnalysis = async () => {
    if (!patientId) { navigate('/'); return; }
    setLoading(true); setError('');
    try {
      const payload = {
        patient_id: patientId,
        daily_logs: log,
        weekly_logs: [log],
        previous_weekly_logs: [log],
        monthly_logs: [log],
        previous_monthly_logs: [log],
      };
      const res = await digitalTwinAnalyze(payload);
      setResult(res);
      update({ digitalTwinResult: res });
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const updateVital = (key, val) =>
    setLog((prev) => ({ ...prev, vitals: { ...prev.vitals, [key]: parseFloat(val) || 0 } }));

  // ── Tabs list ────────────────────────────────────────────────────
  const TABS = [
    { id: 'dashboard',  label: 'Dashboard' },
    { id: 'medication', label: 'Medications',  show: !!analysisRes.medication_adherence },
    { id: 'lifestyle',  label: 'Lifestyle',    show: !!analysisRes.lifestyle_evaluation },
    { id: 'symptoms',   label: 'Symptoms',     show: !!analysisRes.symptoms_correlation },
    { id: 'deviation',  label: 'Deviation',    show: !!devAnalysis },
    { id: 'twinstate',  label: 'Twin State',   show: !!dtState },
    { id: 'memory',     label: 'Memory',       show: !!memProfiles },
    { id: 'forecast',   label: 'Forecast',     show: !!forecast },
    { id: 'log',        label: 'Daily Log' },
    { id: 'alerts',     label: `Alerts${alerts.length > 0 ? ` (${alerts.length})` : ''}` },
  ].filter((t) => t.show !== false);

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <div>
          <div className="section-title">Digital Twin</div>
          <div className="section-subtitle">Health monitoring, predictive analytics &amp; daily log tracking</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary btn-sm" onClick={handleQuickCheck} disabled={quickLoading}>
            {quickLoading ? <><div className="spinner" style={{ width: 14, height: 14 }} />Checking…</> : <><Activity size={14} />Quick Check</>}
          </button>
          <button className="btn btn-primary btn-sm" onClick={handleFullAnalysis} disabled={loading}>
            {loading ? <><div className="spinner" style={{ width: 14, height: 14 }} />Analysing…</> : <><Cpu size={14} />Full Analysis</>}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ marginBottom: 16, padding: '10px 14px', background: 'var(--red-dim)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius)', fontSize: 13, color: 'var(--red)' }}>
          {error}
        </div>
      )}

      {/* Immediate attention banner */}
      {summary?.requires_immediate_attention && (
        <div style={{ marginBottom: 16, padding: '12px 16px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <AlertTriangle size={16} style={{ color: 'var(--red)', flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--red)' }}>Immediate Attention Required</span>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)', marginLeft: 4 }}>— {summary.critical_alerts} critical alert(s) detected. Review the Alerts tab.</span>
          <button className="btn btn-sm" style={{ marginLeft: 'auto', background: 'var(--red)', color: '#fff' }} onClick={() => setTab('alerts')}>
            View Alerts
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="dt-tabs">
        {TABS.map((t) => (
          <button key={t.id} className={`dt-tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── DASHBOARD ──────────────────────────────────────────────── */}
      {tab === 'dashboard' && (
        <div>
          {/* Top vitals row */}
          <div className="grid-4" style={{ marginBottom: 20 }}>
            <div className="card card-sm" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>HEALTH SCORE</div>
              <HealthGauge score={summary?.health_score || 0} />
              <div style={{ fontSize: 13, color: statusColor(summary?.overall_health_status), marginTop: 4, fontWeight: 600, textTransform: 'capitalize' }}>
                {summary?.overall_health_status || '—'}
              </div>
            </div>
            <VitalCard icon={Heart}    label="Blood Pressure"  value={`${log.vitals.blood_pressure_systolic}/${log.vitals.blood_pressure_diastolic}`} unit="mmHg"  color="var(--red)" />
            <VitalCard icon={Activity} label="Heart Rate"      value={log.vitals.heart_rate}          unit="bpm"   color="var(--blue)" />
            <VitalCard icon={Droplets} label="Blood Glucose"   value={log.vitals.blood_glucose_mg_dl} unit="mg/dL" color="var(--amber)" />
          </div>

          {/* Status summary row */}
          {summary && (
            <div className="grid-4" style={{ marginBottom: 20 }}>
              {[
                { label: 'Trajectory',        value: summary.trajectory,       icon: TrajIcon,      color: trajColor },
                { label: 'Deviation Status',  value: summary.deviation_status, icon: Target,        color: statusColor(summary.deviation_status) },
                { label: 'Critical Alerts',   value: summary.critical_alerts ?? '—', icon: AlertTriangle, color: (summary.critical_alerts > 0) ? 'var(--red)' : 'var(--green)' },
                { label: 'High Priority',     value: summary.high_priority_alerts ?? clinAlerts.alert_summary?.high_priority_count ?? '—', icon: Zap, color: 'var(--amber)' },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="card card-sm" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}18`, color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{label}</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color, textTransform: 'capitalize' }}>{fmt(value)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Historical Logs: Trends + Table ─────────────────────── */}
          {(() => {
            // Normalise handles two API formats in the same array:
            // Format 1 (generated): { day, vitals:{SBP,DBP,HR,O2_saturation,temperature}, exercise_minutes, diet:{morning,...} }
            // Format 2 (user-submitted): { date, vitals:{blood_pressure_systolic,...}, exercise:{exercise_minutes}, nutrition:{meals} }
            const normalise = (d, i) => ({
              label:    d.day != null ? `D${d.day}` : (d.date ? d.date.slice(5) : `D${i + 1}`),
              SBP:      d.vitals?.SBP  ?? d.vitals?.blood_pressure_systolic,
              DBP:      d.vitals?.DBP  ?? d.vitals?.blood_pressure_diastolic,
              HR:       d.vitals?.HR   ?? d.vitals?.heart_rate,
              O2:       d.vitals?.O2_saturation ?? d.vitals?.oxygen_saturation_percent,
              Temp:     d.vitals?.temperature != null
                          ? d.vitals.temperature
                          : d.vitals?.temperature_f != null
                            ? +((d.vitals.temperature_f - 32) * 5 / 9).toFixed(1)
                            : undefined,
              Exercise: d.exercise_minutes ?? d.exercise?.exercise_minutes,
            });

            const histChart = historicalLogs.map(normalise).reverse(); // oldest → newest left-to-right
            const hasData   = histChart.length > 0;

            const VITAL_CHARTS = [
              { label: 'Blood Pressure (mmHg)', lines: [{ key: 'SBP', color: 'var(--red)'    }, { key: 'DBP', color: 'var(--amber)'  }] },
              { label: 'Heart Rate (bpm)',       lines: [{ key: 'HR',  color: 'var(--blue)'   }] },
              { label: 'O₂ Saturation (%)',      lines: [{ key: 'O2',  color: 'var(--cyan)'   }] },
              { label: 'Temperature (°C)',       lines: [{ key: 'Temp',color: 'var(--purple)' }] },
            ];

            return (
              <>
                {/* --- Trend charts --- */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Activity size={16} style={{ color: 'var(--blue)' }} />
                    10-Day Health Trends
                    {!hasData && <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 4 }}>(loading…)</span>}
                  </div>

                  {hasData ? (
                    <>
                      <div className="grid-2" style={{ marginBottom: 16 }}>
                        {VITAL_CHARTS.map(({ label, lines }) => (
                          <div className="card" key={label}>
                            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              {label}
                              <div style={{ display: 'flex', gap: 10 }}>
                                {lines.map(({ key, color }) => (
                                  <span key={key} style={{ fontSize: 11, color, display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <span style={{ display: 'inline-block', width: 10, height: 2, background: color, borderRadius: 2 }} />
                                    {key}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <ResponsiveContainer width="100%" height={160}>
                              <AreaChart data={histChart} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                                <defs>
                                  {lines.map(({ key, color }) => (
                                    <linearGradient key={key} id={`hg-${key}`} x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%"  stopColor={color} stopOpacity={0.2} />
                                      <stop offset="95%" stopColor={color} stopOpacity={0} />
                                    </linearGradient>
                                  ))}
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="label" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                                {lines.map(({ key, color }) => (
                                  <Area key={key} type="monotone" dataKey={key} stroke={color} strokeWidth={2}
                                    fill={`url(#hg-${key})`} dot={{ fill: color, r: 2.5 }} activeDot={{ r: 4 }} />
                                ))}
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>
                        ))}
                      </div>

                      {/* Exercise chart — full width */}
                      <div className="card" style={{ marginBottom: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ display: 'inline-block', width: 10, height: 2, background: 'var(--green)', borderRadius: 2 }} />
                          Exercise Minutes / Day
                        </div>
                        <ResponsiveContainer width="100%" height={120}>
                          <AreaChart data={histChart} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                            <defs>
                              <linearGradient id="hg-ex" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%"  stopColor="var(--green)" stopOpacity={0.2} />
                                <stop offset="95%" stopColor="var(--green)" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="label" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                            <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                            <Area type="monotone" dataKey="Exercise" stroke="var(--green)" strokeWidth={2}
                              fill="url(#hg-ex)" dot={{ fill: 'var(--green)', r: 2.5 }} activeDot={{ r: 4 }} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </>
                  ) : (
                    <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, color: 'var(--text-muted)', gap: 8 }}>
                      <Activity size={28} style={{ opacity: 0.3 }} />
                      <div style={{ fontSize: 12 }}>No historical data yet</div>
                    </div>
                  )}
                </div>

                {/* --- Log history table --- */}
                {histChart.length > 0 && (
                  <div className="card" style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Target size={16} style={{ color: 'var(--purple)' }} />
                      Recent Log History
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--border)' }}>
                            {['Day','SBP','DBP','HR','O₂','Temp','Exercise','Meds Taken','Diet'].map((h) => (
                              <th key={h} style={{ padding: '6px 10px', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {histChart.map((n, ri) => {
                            const d = historicalLogs[historicalLogs.length - 1 - ri]; // matches reversed order
                            const allMeds   = d?.medications_taken?.length ?? 0;
                            const takenMeds = d?.medications_taken?.filter((m) =>
                              m.taken_times != null ? m.taken_times > 0 : m.taken === true
                            ).length ?? 0;
                            let meals = '';
                            if (d?.diet && typeof d.diet === 'object' && !Array.isArray(d.diet)) {
                              meals = Object.entries(d.diet).map(([slot, items]) =>
                                `${slot.charAt(0).toUpperCase() + slot.slice(1)}: ${Array.isArray(items) ? items.join(', ') : items}`
                              ).join(' | ');
                            } else if (d?.nutrition?.meals?.length) {
                              meals = d.nutrition.meals.map((m) =>
                                `${m.meal_time}: ${(m.items || []).map((it) => it.food_name).join(', ')}`
                              ).join(' | ');
                            }
                            const adhereFrac  = allMeds > 0 ? takenMeds / allMeds : 1;
                            const adhereColor = adhereFrac === 1 ? 'var(--green)' : adhereFrac >= 0.5 ? 'var(--amber)' : 'var(--red)';
                            return (
                              <tr key={ri} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <td style={{ padding: '8px 10px', color: 'var(--text-secondary)', fontWeight: 600 }}>{n.label}</td>
                                <td style={{ padding: '8px 10px', color: 'var(--red)'    }}>{n.SBP      ?? '—'}</td>
                                <td style={{ padding: '8px 10px', color: 'var(--amber)'  }}>{n.DBP      ?? '—'}</td>
                                <td style={{ padding: '8px 10px', color: 'var(--blue)'   }}>{n.HR       ?? '—'}</td>
                                <td style={{ padding: '8px 10px', color: 'var(--cyan)'   }}>{n.O2       ?? '—'}</td>
                                <td style={{ padding: '8px 10px', color: 'var(--purple)' }}>{n.Temp     ?? '—'}</td>
                                <td style={{ padding: '8px 10px', color: 'var(--green)'  }}>{n.Exercise ?? '—'} min</td>
                                <td style={{ padding: '8px 10px', color: adhereColor }}>
                                  {allMeds > 0 ? `${takenMeds}/${allMeds}` : '—'}
                                </td>
                                <td style={{ padding: '8px 10px', color: 'var(--text-muted)', maxWidth: 260, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {meals || '—'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            );
          })()}

          {/* Key recommendations */}
          {summary?.key_recommendations?.length > 0 && (
            <div className="card" style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Key Recommendations</div>
              <ul style={{ paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 7, margin: 0 }}>
                {summary.key_recommendations.map((r, i) => (
                  <li key={i} style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{r}</li>
                ))}
              </ul>
            </div>
          )}

          <button className="btn btn-primary btn-sm" onClick={() => navigate('/medicine-check')}>
            Medicine Safety Check <ChevronRight size={14} />
          </button>
        </div>
      )}

      {/* ── MEDICATION ADHERENCE TAB ───────────────────────────────── */}
      {tab === 'medication' && (
        <SectionCard icon={Pill} color="var(--blue)" title="Medication Adherence">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {Object.entries(analysisRes.medication_adherence || {}).map(([k, v]) =>
              typeof v !== 'object' || v == null
                ? <InfoRow key={k} label={capitalize(k)} value={v} color={statusColor(String(v))} />
                : null
            )}
            {Object.entries(analysisRes.medication_adherence || {}).map(([k, v]) => {
              if (typeof v !== 'object' || v == null) return null;
              return (
                <div key={k} style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>{capitalize(k)}</div>
                  {Array.isArray(v)
                    ? v.map((item, i) => (
                      <div key={i} style={{ fontSize: 12, color: 'var(--text-muted)', padding: '4px 8px', background: 'var(--bg-surface)', borderRadius: 'var(--radius)', marginBottom: 4 }}>
                        {typeof item === 'object' ? JSON.stringify(item) : String(item)}
                      </div>
                    ))
                    : Object.entries(v).map(([kk, vv]) => (
                      <InfoRow key={kk} label={capitalize(kk)} value={vv} color={statusColor(String(vv))} />
                    ))
                  }
                </div>
              );
            })}
          </div>
        </SectionCard>
      )}

      {/* ── LIFESTYLE TAB ─────────────────────────────────────────── */}
      {tab === 'lifestyle' && (
        <SectionCard icon={Leaf} color="var(--green)" title="Lifestyle Evaluation">
          <div>
            {Object.entries(analysisRes.lifestyle_evaluation || {}).map(([k, v]) =>
              typeof v !== 'object' || v == null
                ? <InfoRow key={k} label={capitalize(k)} value={v} color={statusColor(String(v))} />
                : (
                  <div key={k} style={{ marginTop: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>{capitalize(k)}</div>
                    {Object.entries(v).map(([kk, vv]) => (
                      <InfoRow key={kk} label={capitalize(kk)} value={vv} color={statusColor(String(vv))} />
                    ))}
                  </div>
                )
            )}
          </div>
        </SectionCard>
      )}

      {/* ── SYMPTOMS TAB ──────────────────────────────────────────── */}
      {tab === 'symptoms' && (
        <SectionCard icon={GitBranch} color="var(--purple)" title="Symptoms Correlation">
          <div>
            {Object.entries(analysisRes.symptoms_correlation || {}).map(([k, v]) =>
              typeof v !== 'object' || v == null
                ? <InfoRow key={k} label={capitalize(k)} value={v} color={statusColor(String(v))} />
                : (
                  <div key={k} style={{ marginTop: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>{capitalize(k)}</div>
                    {Array.isArray(v)
                      ? v.map((item, i) => (
                        <div key={i} style={{ fontSize: 12, color: 'var(--text-muted)', padding: '4px 8px', background: 'var(--bg-surface)', borderRadius: 'var(--radius)', marginBottom: 4 }}>
                          {typeof item === 'object' ? JSON.stringify(item) : String(item)}
                        </div>
                      ))
                      : Object.entries(v).map(([kk, vv]) => (
                        <InfoRow key={kk} label={capitalize(kk)} value={vv} color={statusColor(String(vv))} />
                      ))
                    }
                  </div>
                )
            )}
          </div>
        </SectionCard>
      )}

      {/* ── DEVIATION TAB ─────────────────────────────────────────── */}
      {tab === 'deviation' && devAnalysis && (
        <SectionCard icon={Target} color="var(--cyan)" title="Deviation Analysis">
          <div>
            {Object.entries(devAnalysis).map(([k, v]) =>
              typeof v !== 'object' || v == null
                ? <InfoRow key={k} label={capitalize(k)} value={v} color={statusColor(String(v))} />
                : (
                  <div key={k} style={{ marginTop: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>{capitalize(k)}</div>
                    {Object.entries(v).map(([kk, vv]) => (
                      typeof vv !== 'object'
                        ? <InfoRow key={kk} label={capitalize(kk)} value={vv} color={statusColor(String(vv))} />
                        : null
                    ))}
                  </div>
                )
            )}
          </div>
        </SectionCard>
      )}

      {/* ── TWIN STATE TAB ────────────────────────────────────────── */}
      {tab === 'twinstate' && dtState && (
        <SectionCard icon={Cpu} color="var(--blue)" title="Digital Twin State">
          <div>
            {Object.entries(dtState).map(([k, v]) =>
              typeof v !== 'object' || v == null
                ? <InfoRow key={k} label={capitalize(k)} value={v} color={statusColor(String(v))} />
                : (
                  <div key={k} style={{ marginTop: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>{capitalize(k)}</div>
                    {Object.entries(v).map(([kk, vv]) => (
                      typeof vv !== 'object'
                        ? <InfoRow key={kk} label={capitalize(kk)} value={vv} color={statusColor(String(vv))} />
                        : null
                    ))}
                  </div>
                )
            )}
          </div>
        </SectionCard>
      )}

      {/* ── MEMORY PROFILES TAB ───────────────────────────────────── */}
      {tab === 'memory' && memProfiles && <MemoryProfilesSection profiles={memProfiles} />}

      {/* ── FORECAST TAB ───────────────────────────────────────────── */}
      {tab === 'forecast' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {forecast ? (
            Object.entries(forecast).map(([section, val]) => (
              <SectionCard key={section} icon={TrendingUp} color="var(--blue)" title={capitalize(section)}>
                {typeof val !== 'object' || val == null
                  ? <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{fmt(val)}</div>
                  : Array.isArray(val)
                    ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {val.map((item, i) => (
                          <div key={i} style={{ fontSize: 12, color: 'var(--text-muted)', padding: '6px 10px', background: 'var(--bg-surface)', borderRadius: 'var(--radius)' }}>
                            {typeof item === 'object' ? (
                              Object.entries(item).map(([k, v]) => (
                                <InfoRow key={k} label={capitalize(k)} value={v} color={statusColor(String(v))} />
                              ))
                            ) : String(item)}
                          </div>
                        ))}
                      </div>
                    )
                    : Object.entries(val).map(([k, v]) =>
                      typeof v !== 'object'
                        ? <InfoRow key={k} label={capitalize(k)} value={v} color={statusColor(String(v))} />
                        : (
                          <div key={k} style={{ marginTop: 10 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>{capitalize(k)}</div>
                            {Array.isArray(v)
                              ? v.map((item, i) => <div key={i} style={{ fontSize: 12, color: 'var(--text-muted)', padding: '3px 0' }}>{typeof item === 'object' ? JSON.stringify(item) : String(item)}</div>)
                              : Object.entries(v).map(([kk, vv]) => <InfoRow key={kk} label={capitalize(kk)} value={vv} />)
                            }
                          </div>
                        )
                    )
                }
              </SectionCard>
            ))
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
              <TrendingUp size={40} style={{ margin: '0 auto 14px', opacity: 0.3 }} />
              <div style={{ fontSize: 14 }}>Run a <strong>Full Analysis</strong> to see health forecast</div>
            </div>
          )}
        </div>
      )}

      {/* ── DAILY LOG TAB ──────────────────────────────────────────── */}
      {tab === 'log' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* ── Vitals ── */}
          <div className="card">
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>🩺 Vitals — {log.date}</div>
            <div className="grid-2" style={{ gap: 14 }}>
              {[
                { key: 'blood_pressure_systolic',   label: 'Systolic BP',    unit: 'mmHg' },
                { key: 'blood_pressure_diastolic',  label: 'Diastolic BP',   unit: 'mmHg' },
                { key: 'heart_rate',                label: 'Heart Rate',     unit: 'bpm' },
                { key: 'temperature_f',             label: 'Temperature',    unit: '°F' },
                { key: 'blood_glucose_mg_dl',       label: 'Blood Glucose',  unit: 'mg/dL' },
                { key: 'weight_lbs',                label: 'Weight',         unit: 'lbs' },
                { key: 'oxygen_saturation_percent', label: 'O₂ Saturation',  unit: '%' },
              ].map(({ key, label, unit }) => (
                <div key={key} className="form-group" style={{ marginBottom: 0 }}>
                  <label>{label} <span style={{ color: 'var(--text-muted)' }}>({unit})</span></label>
                  <input className="input" type="number" value={log.vitals[key]}
                    onChange={(e) => updateVital(key, e.target.value)} />
                </div>
              ))}
            </div>
          </div>

          {/* ── Medications ── */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>💊 Medications Taken</div>
              <button className="btn btn-secondary btn-sm" onClick={() =>
                setLog((p) => ({ ...p, medications_taken: [...p.medications_taken, { medication_name: '', prescribed_time: '08:00', actual_time: '08:00', taken: true }] }))
              }>+ Add Medication</button>
            </div>
            {log.medications_taken.length === 0
              ? <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '10px 0' }}>No medications added. Click "+ Add Medication" to log one.</div>
              : log.medications_taken.map((med, i) => (
                <div key={i} style={{ padding: '12px 14px', background: 'var(--bg-surface)', borderRadius: 'var(--radius)', marginBottom: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div className="grid-2" style={{ gap: 8 }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Medication Name</label>
                      <input className="input" value={med.medication_name} placeholder="e.g. Lisinopril 10mg"
                        onChange={(e) => setLog((p) => { const m = [...p.medications_taken]; m[i] = { ...m[i], medication_name: e.target.value }; return { ...p, medications_taken: m }; })} />
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                        <label>Prescribed Time</label>
                        <input className="input" type="time" value={med.prescribed_time}
                          onChange={(e) => setLog((p) => { const m = [...p.medications_taken]; m[i] = { ...m[i], prescribed_time: e.target.value }; return { ...p, medications_taken: m }; })} />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                        <label>Actual Time</label>
                        <input className="input" type="time" value={med.actual_time}
                          onChange={(e) => setLog((p) => { const m = [...p.medications_taken]; m[i] = { ...m[i], actual_time: e.target.value }; return { ...p, medications_taken: m }; })} />
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                      <input type="checkbox" checked={med.taken}
                        onChange={(e) => setLog((p) => { const m = [...p.medications_taken]; m[i] = { ...m[i], taken: e.target.checked }; return { ...p, medications_taken: m }; })} />
                      Taken
                    </label>
                    <button className="btn btn-danger btn-sm" style={{ marginLeft: 'auto' }}
                      onClick={() => setLog((p) => ({ ...p, medications_taken: p.medications_taken.filter((_, j) => j !== i) }))}>
                      Remove
                    </button>
                  </div>
                </div>
              ))
            }
          </div>

          {/* ── Symptoms ── */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>🤒 Symptoms</div>
              <button className="btn btn-secondary btn-sm" onClick={() =>
                setLog((p) => ({ ...p, symptoms: [...p.symptoms, { symptom: '', severity: 'mild', time_reported: '08:00' }] }))
              }>+ Add Symptom</button>
            </div>
            {log.symptoms.length === 0
              ? <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '10px 0' }}>No symptoms reported. Click "+ Add Symptom" if you have any.</div>
              : log.symptoms.map((s, i) => (
                <div key={i} style={{ padding: '12px 14px', background: 'var(--bg-surface)', borderRadius: 'var(--radius)', marginBottom: 8 }}>
                  <div className="grid-2" style={{ gap: 8, marginBottom: 8 }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Symptom</label>
                      <input className="input" value={s.symptom} placeholder="e.g. headache"
                        onChange={(e) => setLog((p) => { const arr = [...p.symptoms]; arr[i] = { ...arr[i], symptom: e.target.value }; return { ...p, symptoms: arr }; })} />
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                        <label>Severity</label>
                        <select className="input" value={s.severity}
                          onChange={(e) => setLog((p) => { const arr = [...p.symptoms]; arr[i] = { ...arr[i], severity: e.target.value }; return { ...p, symptoms: arr }; })}>
                          {['mild','moderate','severe'].map((v) => <option key={v} value={v}>{capitalize(v)}</option>)}
                        </select>
                      </div>
                      <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                        <label>Time Reported</label>
                        <input className="input" type="time" value={s.time_reported}
                          onChange={(e) => setLog((p) => { const arr = [...p.symptoms]; arr[i] = { ...arr[i], time_reported: e.target.value }; return { ...p, symptoms: arr }; })} />
                      </div>
                    </div>
                  </div>
                  <button className="btn btn-danger btn-sm"
                    onClick={() => setLog((p) => ({ ...p, symptoms: p.symptoms.filter((_, j) => j !== i) }))}>
                    Remove
                  </button>
                </div>
              ))
            }
          </div>

          {/* ── Labs ── */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>🧪 Lab Results</div>
              <button className="btn btn-secondary btn-sm" onClick={() =>
                setLog((p) => ({ ...p, labs: [...p.labs, { test_name: '', value: '', unit: '' }] }))
              }>+ Add Lab</button>
            </div>
            {log.labs.length === 0
              ? <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '10px 0' }}>No lab results. Click "+ Add Lab" to include one.</div>
              : log.labs.map((lab, i) => (
                <div key={i} style={{ padding: '12px 14px', background: 'var(--bg-surface)', borderRadius: 'var(--radius)', marginBottom: 8 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Test Name</label>
                      <input className="input" value={lab.test_name} placeholder="e.g. HbA1c"
                        onChange={(e) => setLog((p) => { const arr = [...p.labs]; arr[i] = { ...arr[i], test_name: e.target.value }; return { ...p, labs: arr }; })} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Value</label>
                      <input className="input" value={lab.value} placeholder="6.5"
                        onChange={(e) => setLog((p) => { const arr = [...p.labs]; arr[i] = { ...arr[i], value: e.target.value }; return { ...p, labs: arr }; })} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Unit</label>
                      <input className="input" value={lab.unit} placeholder="%"
                        onChange={(e) => setLog((p) => { const arr = [...p.labs]; arr[i] = { ...arr[i], unit: e.target.value }; return { ...p, labs: arr }; })} />
                    </div>
                  </div>
                  <button className="btn btn-danger btn-sm"
                    onClick={() => setLog((p) => ({ ...p, labs: p.labs.filter((_, j) => j !== i) }))}>
                    Remove
                  </button>
                </div>
              ))
            }
          </div>

          {/* ── Nutrition ── */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>🥗 Nutrition — Meals</div>
              <button className="btn btn-secondary btn-sm" onClick={() =>
                setLog((p) => ({ ...p, nutrition: { meals: [...p.nutrition.meals, { meal_time: 'morning', items: [] }] } }))
              }>+ Add Meal</button>
            </div>
            {log.nutrition.meals.length === 0
              ? <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '10px 0' }}>No meals added. Click "+ Add Meal" to log one.</div>
              : log.nutrition.meals.map((meal, mi) => (
                <div key={mi} style={{ padding: '12px 14px', background: 'var(--bg-surface)', borderRadius: 'var(--radius)', marginBottom: 10 }}>
                  {/* Meal header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                      <label>Meal Time</label>
                      <select className="input" value={meal.meal_time} onChange={(e) =>
                        setLog((p) => { const m = [...p.nutrition.meals]; m[mi] = { ...m[mi], meal_time: e.target.value }; return { ...p, nutrition: { meals: m } }; })
                      }>
                        {['morning','afternoon','evening','night'].map((v) => (
                          <option key={v} value={v}>{capitalize(v)}</option>
                        ))}
                      </select>
                    </div>
                    <button className="btn btn-danger btn-sm" style={{ marginTop: 20 }} onClick={() =>
                      setLog((p) => ({ ...p, nutrition: { meals: p.nutrition.meals.filter((_, j) => j !== mi) } }))
                    }>Remove Meal</button>
                  </div>
                  {/* Food items */}
                  <div style={{ paddingLeft: 10, borderLeft: '2px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>Food Items</span>
                      <button className="btn btn-secondary btn-sm" onClick={() =>
                        setLog((p) => { const m = [...p.nutrition.meals]; m[mi] = { ...m[mi], items: [...m[mi].items, { food_name: '', portion_size_g: 100 }] }; return { ...p, nutrition: { meals: m } }; })
                      }>+ Item</button>
                    </div>
                    {meal.items.length === 0
                      ? <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No items. Click "+ Item".</div>
                      : meal.items.map((item, ii) => (
                        <div key={ii} style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginBottom: 6 }}>
                          <div className="form-group" style={{ marginBottom: 0, flex: 2 }}>
                            <label style={{ fontSize: 11 }}>Food Name</label>
                            <input className="input" value={item.food_name} placeholder="e.g. oatmeal_cooked"
                              onChange={(e) => setLog((p) => {
                                const meals = [...p.nutrition.meals];
                                const items = [...meals[mi].items];
                                items[ii] = { ...items[ii], food_name: e.target.value };
                                meals[mi] = { ...meals[mi], items };
                                return { ...p, nutrition: { meals } };
                              })} />
                          </div>
                          <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                            <label style={{ fontSize: 11 }}>Portion (g)</label>
                            <input className="input" type="number" value={item.portion_size_g}
                              onChange={(e) => setLog((p) => {
                                const meals = [...p.nutrition.meals];
                                const items = [...meals[mi].items];
                                items[ii] = { ...items[ii], portion_size_g: parseFloat(e.target.value) || 0 };
                                meals[mi] = { ...meals[mi], items };
                                return { ...p, nutrition: { meals } };
                              })} />
                          </div>
                          <button className="btn btn-danger btn-sm" style={{ marginBottom: 0 }} onClick={() =>
                            setLog((p) => {
                              const meals = [...p.nutrition.meals];
                              meals[mi] = { ...meals[mi], items: meals[mi].items.filter((_, j) => j !== ii) };
                              return { ...p, nutrition: { meals } };
                            })
                          }>✕</button>
                        </div>
                      ))
                    }
                  </div>
                </div>
              ))
            }
          </div>

          {/* ── Exercise & Notes ── */}

          <div className="card">
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>🏃 Exercise & Notes</div>
            <div className="grid-2" style={{ gap: 14 }}>
              <div>
                <div className="form-group">
                  <label>Exercise Duration (minutes)</label>
                  <input className="input" type="number" value={log.exercise.exercise_minutes}
                    onChange={(e) => setLog((p) => ({ ...p, exercise: { ...p.exercise, exercise_minutes: parseInt(e.target.value) || 0 } }))} />
                </div>
                <div className="form-group">
                  <label>Exercise Type</label>
                  <select className="input" value={log.exercise.type}
                    onChange={(e) => setLog((p) => ({ ...p, exercise: { ...p.exercise, type: e.target.value } }))}>
                    {['none','walking','running','cycling','swimming','strength','yoga','other'].map((v) => (
                      <option key={v} value={v}>{capitalize(v)}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Intensity</label>
                  <select className="input" value={log.exercise.intensity}
                    onChange={(e) => setLog((p) => ({ ...p, exercise: { ...p.exercise, intensity: e.target.value } }))}>
                    {['none','light','moderate','vigorous'].map((v) => (
                      <option key={v} value={v}>{capitalize(v)}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Notes</label>
                <textarea className="input" rows={8} value={log.notes}
                  onChange={(e) => setLog((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="How are you feeling today?" />
              </div>
            </div>
          </div>

          {/* ── Actions ── */}
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-secondary" onClick={handleQuickCheck} disabled={quickLoading}>
              {quickLoading ? <><div className="spinner" style={{ width: 16, height: 16 }} />Checking…</> : 'Quick Check'}
            </button>
            <button className="btn btn-primary" onClick={handleFullAnalysis} disabled={loading}>
              {loading ? <><div className="spinner" style={{ width: 16, height: 16 }} />Running Full Analysis…</> : 'Save & Run Full Analysis'}
            </button>
          </div>
        </div>
      )}

      {/* ── ALERTS TAB ─────────────────────────────────────────────── */}
      {tab === 'alerts' && (
        <div>
          {/* Alert summary */}
          {clinAlerts.alert_summary && (
            <div className="grid-4" style={{ marginBottom: 16 }}>
              {[
                { label: 'Critical',  val: clinAlerts.alert_summary.critical_count,      color: 'var(--red)' },
                { label: 'High',      val: clinAlerts.alert_summary.high_priority_count,  color: 'var(--amber)' },
                { label: 'Medium',    val: clinAlerts.alert_summary.medium_count,          color: 'var(--blue)' },
                { label: 'Low',       val: clinAlerts.alert_summary.low_count,             color: 'var(--green)' },
              ].map(({ label, val, color }) => val != null ? (
                <div key={label} className="card card-sm" style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color }}>{val ?? 0}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</div>
                </div>
              ) : null)}
            </div>
          )}

          {alerts.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: 60 }}>
              <CheckCircle size={40} style={{ color: 'var(--green)', marginBottom: 14 }} />
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>No Alerts</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Run a quick check or full analysis to generate alerts</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {alerts.map((a, i) => <AlertItem key={i} alert={a} />)}
            </div>
          )}
        </div>
      )}

      <style>{`
        .vital-card { min-height: 100px; }
        .dt-tabs { display:flex; gap:4; margin-bottom:20px; background:var(--bg-surface); border-radius:var(--radius-lg); padding:4px; border:1px solid var(--border); flex-wrap:wrap; }
        .dt-tab { padding:8px 18px; border-radius:var(--radius); border:none; background:transparent; color:var(--text-secondary); font-size:13px; font-weight:500; cursor:pointer; transition:all 0.18s; font-family:var(--font-body); }
        .dt-tab.active { background:var(--blue-glow); color:var(--blue); border:1px solid rgba(14,165,233,0.3); }
        .dt-tab:hover:not(.active) { color:var(--text-primary); background:var(--bg-hover); }
        .alert-item { padding:14px 16px; background:var(--bg-surface); border:1px solid var(--border); border-left:3px solid; border-radius:var(--radius); }
      `}</style>
    </div>
  );
}

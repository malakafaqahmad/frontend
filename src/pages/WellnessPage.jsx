import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePatient } from '../context/PatientContext';
import { generateDietPlan, generateExercisePlan } from '../services/api';
import MarkdownRenderer from '../components/ui/MarkdownRenderer';
import { Leaf, Dumbbell, RefreshCw, Download, ChevronRight, Salad, Zap } from 'lucide-react';

export default function WellnessPage() {
  const { patientId, currentReport, currentDiet, update } = usePatient();
  const navigate = useNavigate();

  const [dietPlan, setDietPlan] = useState(currentDiet || '');
  const [exercisePlan, setExercisePlan] = useState('');
  const [loadingDiet, setLoadingDiet] = useState(false);
  const [loadingExercise, setLoadingExercise] = useState(false);
  const [error, setError] = useState('');

  const genDiet = async () => {
    if (!currentReport) { setError('Please complete the diagnosis interview first to generate a diet plan.'); return; }
    setLoadingDiet(true); setError('');
    try {
      const res = await generateDietPlan({ patient_id: patientId, current_report: currentReport });
      setDietPlan(res.diet_plan || '');
      update({ currentDiet: res.diet_plan || '' });
    } catch (e) { setError(e.message); }
    finally { setLoadingDiet(false); }
  };

  const genExercise = async () => {
    if (!currentReport) { setError('Please complete the diagnosis interview first.'); return; }
    if (!dietPlan) { setError('Please generate the diet plan first, then generate the exercise plan.'); return; }
    setLoadingExercise(true); setError('');
    try {
      const res = await generateExercisePlan({ patient_id: patientId, current_report: currentReport, current_diet: dietPlan });
      setExercisePlan(res.exercise_plan || '');
    } catch (e) { setError(e.message); }
    finally { setLoadingExercise(false); }
  };

  const download = (text, filename) => {
    const blob = new Blob([text], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="section-title">Wellness Plans</div>
      <div className="section-subtitle">AI-generated personalised diet & exercise prescriptions based on your diagnosis</div>

      {!currentReport && (
        <div style={{ marginBottom:20, padding:'14px 18px', background:'var(--amber-dim)', border:'1px solid rgba(245,158,11,0.3)', borderRadius:'var(--radius)', fontSize:14, color:'var(--amber)', display:'flex', alignItems:'center', gap:10 }}>
          <Zap size={16} />
          Complete the AI Diagnosis interview first to unlock personalised wellness plans.
          <button className="btn btn-sm" style={{ marginLeft:'auto', background:'var(--amber)', color:'#000' }} onClick={() => navigate('/diagnosis')}>
            Go to Diagnosis
          </button>
        </div>
      )}

      {error && (
        <div style={{ marginBottom:16, padding:'12px 16px', background:'var(--red-dim)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:'var(--radius)', fontSize:13, color:'var(--red)' }}>{error}</div>
      )}

      <div className="wellness-grid">
        {/* Diet Card */}
        <div className="card wellness-card">
          <div className="wellness-header" style={{ borderColor:'rgba(16,185,129,0.3)' }}>
            <div className="wellness-icon" style={{ background:'var(--green-dim)', color:'var(--green)' }}>
              <Salad size={20} />
            </div>
            <div>
              <div style={{ fontSize:17, fontWeight:700 }}>Diet Plan</div>
              <div style={{ fontSize:12, color:'var(--text-muted)' }}>Personalised nutrition prescription</div>
            </div>
            <div style={{ marginLeft:'auto', display:'flex', gap:8 }}>
              {dietPlan && (
                <button className="btn btn-ghost btn-sm btn-icon" title="Download" onClick={() => download(dietPlan, `diet-plan-${patientId}.md`)}>
                  <Download size={15} />
                </button>
              )}
              <button
                className="btn btn-secondary btn-sm"
                onClick={genDiet}
                disabled={loadingDiet || !currentReport}
              >
                {loadingDiet ? <><div className="spinner" style={{width:14,height:14}} />Generating…</> : <><RefreshCw size={14} />{dietPlan ? 'Regenerate' : 'Generate'}</>}
              </button>
            </div>
          </div>
          <div className="wellness-body">
            {dietPlan ? (
              <MarkdownRenderer content={dietPlan} />
            ) : (
              <div className="wellness-empty">
                <Leaf size={36} style={{ color:'var(--green)', opacity:0.4, marginBottom:12 }} />
                <div>Click <strong>Generate</strong> to create a personalised diet plan from your diagnosis</div>
              </div>
            )}
          </div>
        </div>

        {/* Exercise Card */}
        <div className="card wellness-card">
          <div className="wellness-header" style={{ borderColor:'rgba(14,165,233,0.3)' }}>
            <div className="wellness-icon" style={{ background:'var(--blue-glow)', color:'var(--blue)' }}>
              <Dumbbell size={20} />
            </div>
            <div>
              <div style={{ fontSize:17, fontWeight:700 }}>Exercise Plan</div>
              <div style={{ fontSize:12, color:'var(--text-muted)' }}>Personalised activity prescription</div>
            </div>
            <div style={{ marginLeft:'auto', display:'flex', gap:8 }}>
              {exercisePlan && (
                <button className="btn btn-ghost btn-sm btn-icon" title="Download" onClick={() => download(exercisePlan, `exercise-plan-${patientId}.md`)}>
                  <Download size={15} />
                </button>
              )}
              <button
                className="btn btn-secondary btn-sm"
                onClick={genExercise}
                disabled={loadingExercise || !dietPlan}
              >
                {loadingExercise ? <><div className="spinner" style={{width:14,height:14}} />Generating…</> : <><RefreshCw size={14} />{exercisePlan ? 'Regenerate' : 'Generate'}</>}
              </button>
            </div>
          </div>
          <div className="wellness-body">
            {exercisePlan ? (
              <MarkdownRenderer content={exercisePlan} />
            ) : (
              <div className="wellness-empty">
                <Dumbbell size={36} style={{ color:'var(--blue)', opacity:0.4, marginBottom:12 }} />
                <div>Generate the diet plan first, then click <strong>Generate</strong> for an exercise prescription</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {(dietPlan || exercisePlan) && (
        <div style={{ marginTop:24, display:'flex', justifyContent:'flex-end' }}>
          <button className="btn btn-primary" onClick={() => navigate('/digital-twin')}>
            Set Up Digital Twin <ChevronRight size={16} />
          </button>
        </div>
      )}

      <style>{`
        .wellness-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        @media(max-width:900px) { .wellness-grid { grid-template-columns: 1fr; } }
        .wellness-card { display: flex; flex-direction: column; min-height: 500px; }
        .wellness-header { display:flex; align-items:center; gap:14px; padding-bottom:16px; margin-bottom:16px; border-bottom:1px solid; }
        .wellness-icon { width:48px; height:48px; border-radius:14px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .wellness-body { flex:1; overflow-y:auto; max-height:520px; }
        .wellness-empty { display:flex; flex-direction:column; align-items:center; justify-content:center; height:260px; color:var(--text-muted); text-align:center; font-size:14px; line-height:1.5; }
      `}</style>
    </div>
  );
}

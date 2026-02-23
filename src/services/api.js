import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 120000, // 2 min — AI calls can be slow
});

// ─── Response interceptor ─────────────────────────────────────────
api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const msg = err?.response?.data?.error || err.message || 'Network error';
    return Promise.reject(new Error(msg));
  }
);

// ─── Health ───────────────────────────────────────────────────────
export const healthCheck = () => api.get('/api/health');

// ─── Patients ────────────────────────────────────────────────────
export const listPatients = () => api.get('/api/patients');
export const getPatient   = (patientId) => api.get(`/api/patients/${patientId}`);
export const getPatientLogs = (patientId) => api.get(`/api/logs/${patientId}`);

// ─── Chat / Differential Diagnosis ───────────────────────────────
/**
 * @param {{ patient_id, message, conversation_id, conversation_history }} data
 */
export const sendChatMessage = (data) => api.post('/api/chat', data);

// ─── Document Analyzer (images + PDFs) ──────────────────────────────
/**
 * Unified analyzer — sends patient_id + file as multipart/form-data
 * @param {string} patientId
 * @param {File}   file
 */
export const uploadDocument = (patientId, file) => {
  const form = new FormData();
  form.append('patient_id', patientId);
  form.append('file', file);
  return axios.post(`${BASE_URL}/api/document-analyzer`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000, // AI image analysis can be slow
  }).then((r) => r.data);
};

// ─── PDF Reader (legacy) ───────────────────────────────────────────
/**
 * @param {File} file
 */
export const uploadPDF = (file) => {
  const form = new FormData();
  form.append('file', file);
  return axios.post(`${BASE_URL}/pdf-reader`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  }).then((r) => r.data);
};


// ─── Diet Plan ────────────────────────────────────────────────────
/**
 * @param {{ patient_id, current_report }} data
 */
export const generateDietPlan = (data) => api.post('/api/diet-plan', data);

// ─── Exercise Plan ────────────────────────────────────────────────
/**
 * @param {{ patient_id, current_report, current_diet }} data
 */
export const generateExercisePlan = (data) => api.post('/api/exercise-plan', data);

// ─── First Aid ────────────────────────────────────────────────────
/**
 * @param {{ patient_id, current_symptoms }} data
 */
export const generateFirstAid = (data) => api.post('/api/first-aid', data);

// ─── Medicine Safety ──────────────────────────────────────────────
/**
 * @param {{ patient_id, current_report, prescription_data }} data
 */
export const checkMedicineSafety = (data) => api.post('/api/medicine-check', data);

// ─── Digital Twin ─────────────────────────────────────────────────
/**
 * Full analysis: daily + weekly + monthly logs
 * @param {{ patient_id, daily_logs, weekly_logs, previous_weekly_logs, monthly_logs, previous_monthly_logs }} data
 */
export const digitalTwinAnalyze   = (data) => api.post('/api/digital-twin/analyze', data);

/**
 * Quick daily check
 * @param {{ patient_id, daily_logs }} data
 */
export const digitalTwinQuickCheck = (data) => api.post('/api/digital-twin/quick-check', data);

export default api;

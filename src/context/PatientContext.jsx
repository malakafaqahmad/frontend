import { createContext, useContext, useState, useCallback } from 'react';

const PatientContext = createContext(null);

const STORAGE_KEY = 'hms_patient_context';

// Ensure string fields are always strings (localStorage can store stale objects)
function toStr(v) { return (v == null || typeof v !== 'string') ? '' : v; }

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    return {
      ...raw,
      currentReport: toStr(raw.currentReport),
      currentDiet:   toStr(raw.currentDiet),
      patientId:     toStr(raw.patientId),
    };
  }
  catch { return {}; }
}


function save(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function PatientProvider({ children }) {
  const [state, setState] = useState(() => ({
    patientId: '',
    patientData: null,
    conversationId: null,
    conversationHistory: [],
    currentPhase: 'initial_interview',
    currentReport: '',
    currentDiet: '',
    diffDiagnoses: null,
    finalReport: null,
    digitalTwinResult: null,
    uploadedFiles: [],
    ...load(),
  }));


  const update = useCallback((patch) => {
    setState((prev) => {
      const next = { ...prev, ...patch };
      save(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setState({
      patientId: '',
      patientData: null,
      conversationId: null,
      conversationHistory: [],
      currentPhase: 'initial_interview',
      currentReport: '',
      currentDiet: '',
      diffDiagnoses: null,
      finalReport: null,
      digitalTwinResult: null,
      uploadedFiles: [],
    });

  }, []);

  return (
    <PatientContext.Provider value={{ ...state, update, reset }}>
      {children}
    </PatientContext.Provider>
  );
}

export const usePatient = () => {
  const ctx = useContext(PatientContext);
  if (!ctx) throw new Error('usePatient must be used within PatientProvider');
  return ctx;
};

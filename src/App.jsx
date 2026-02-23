import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import { PatientProvider } from './context/PatientContext';
import Sidebar from './components/layout/Sidebar';
import Topbar from './components/layout/Topbar';

// Pages
import LandingPage       from './pages/LandingPage';
import DiagnosisPage     from './pages/DiagnosisPage';
import MedicalRecordsPage from './pages/MedicalRecordsPage';
import WellnessPage      from './pages/WellnessPage';
import DigitalTwinPage   from './pages/DigitalTwinPage';
import MedicineCheckPage from './pages/MedicineCheckPage';
import ProgressPage      from './pages/ProgressPage';
import FirstAidPage      from './pages/FirstAidPage';

function AppLayout() {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar />
        <div className="page-body">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <PatientProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/"               element={<LandingPage />} />
            <Route path="/diagnosis"      element={<DiagnosisPage />} />
            <Route path="/records"        element={<MedicalRecordsPage />} />
            <Route path="/wellness"       element={<WellnessPage />} />
            <Route path="/digital-twin"   element={<DigitalTwinPage />} />
            <Route path="/medicine-check" element={<MedicineCheckPage />} />
            <Route path="/progress"       element={<ProgressPage />} />
            <Route path="/first-aid"      element={<FirstAidPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </PatientProvider>
  );
}

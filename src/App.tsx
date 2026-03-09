import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Onboarding from './pages/Onboarding';
import LoadingQuests from './pages/LoadingQuests';
import Dashboard from './pages/Dashboard';
import './App.css';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-slate-900 text-slate-50 font-body antialiased flex flex-col items-center selection:bg-amber-500/30">
        <div className="w-full max-w-md min-h-screen bg-slate-900 shadow-2xl relative overflow-hidden flex flex-col">
          <Routes>
            {/* Redirect root to onboarding for now (MVP flow) */}
            <Route path="/" element={<Navigate to="/onboarding" replace />} />

            {/* Core MVP Routes */}
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/generating" element={<LoadingQuests />} />
            <Route path="/dashboard" element={<Dashboard />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;

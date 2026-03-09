import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Auth from './pages/Auth';
import Onboarding from './pages/Onboarding';
import LoadingQuests from './pages/LoadingQuests';
import Dashboard from './pages/Dashboard';
import './App.css';

// ProtectedRoute: Redirect to /auth if not logged in
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

// PublicRoute: Redirect to appropriate screen if already logged in
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (user) {
    // If user has a life_rhythm, go to dashboard; otherwise onboarding
    if (profile?.life_rhythm) {
      return <Navigate to="/dashboard" replace />;
    }
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Determine where root "/" should redirect
  const rootRedirect = !user
    ? '/auth'
    : profile?.life_rhythm
      ? '/dashboard'
      : '/onboarding';

  return (
    <Routes>
      <Route path="/" element={<Navigate to={rootRedirect} replace />} />

      {/* Public */}
      <Route path="/auth" element={
        <PublicRoute><Auth /></PublicRoute>
      } />

      {/* Protected */}
      <Route path="/onboarding" element={
        <ProtectedRoute><Onboarding /></ProtectedRoute>
      } />
      <Route path="/generating" element={
        <ProtectedRoute><LoadingQuests /></ProtectedRoute>
      } />
      <Route path="/dashboard" element={
        <ProtectedRoute><Dashboard /></ProtectedRoute>
      } />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="min-h-screen bg-slate-900 text-slate-50 font-body antialiased flex flex-col items-center selection:bg-amber-500/30">
          <div className="w-full max-w-md min-h-screen bg-slate-900 shadow-2xl relative overflow-hidden flex flex-col">
            <AppRoutes />
          </div>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;

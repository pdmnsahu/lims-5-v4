import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AppShell from './components/shared/AppShell';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import UsersPage from './pages/UsersPage';
import ClientsPage from './pages/ClientsPage';
import SampleGroupsPage from './pages/SampleGroupsPage';
import SampleGroupDetailPage from './pages/SampleGroupDetailPage';
import MyTestsPage from './pages/MyTestsPage';
import ReviewTestsPage from './pages/ReviewTestsPage';
import ReportsPage from './pages/ReportsPage';
import SuperAdminAllGroupsPage from './pages/SuperAdminAllGroupsPage';
import SuperAdminAllTestsPage from './pages/SuperAdminAllTestsPage';
import AuditPage from './pages/AuditPage';
import { PageSpinner } from './components/shared/UI';

function RoleRoute({ roles, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
}

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen"><PageSpinner /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen"><PageSpinner /></div>;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route path="/" element={<Protected><AppShell /></Protected>}>
        <Route index element={<Navigate to="/dashboard" replace />} />

        {/* All roles */}
        <Route path="dashboard" element={<DashboardPage />} />

        {/* Super Admin — no test-definitions route */}
        <Route path="users"      element={<RoleRoute roles={['super_admin']}><UsersPage /></RoleRoute>} />
        <Route path="clients"    element={<RoleRoute roles={['super_admin']}><ClientsPage /></RoleRoute>} />
        <Route path="all-groups" element={<RoleRoute roles={['super_admin']}><SuperAdminAllGroupsPage /></RoleRoute>} />
        <Route path="all-tests"  element={<RoleRoute roles={['super_admin']}><SuperAdminAllTestsPage /></RoleRoute>} />
        <Route path="audit"      element={<RoleRoute roles={['super_admin']}><AuditPage /></RoleRoute>} />

        {/* Admin + Lab Manager */}
        <Route path="sample-groups"     element={<RoleRoute roles={['admin','lab_manager']}><SampleGroupsPage /></RoleRoute>} />
        <Route path="sample-groups/:id" element={<RoleRoute roles={['admin','lab_manager','super_admin']}><SampleGroupDetailPage /></RoleRoute>} />

        {/* Admin */}
        <Route path="reports" element={<RoleRoute roles={['admin']}><ReportsPage /></RoleRoute>} />

        {/* Lab Manager */}
        <Route path="review-tests" element={<RoleRoute roles={['lab_manager']}><ReviewTestsPage /></RoleRoute>} />

        {/* Chemist */}
        <Route path="my-tests" element={<RoleRoute roles={['chemist']}><MyTestsPage /></RoleRoute>} />

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

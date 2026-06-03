import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ToastProvider } from '@/components/ui/Toast';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { PublicRoute } from '@/components/PublicRoute';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { LearnerLayout } from '@/components/layout/LearnerLayout';
import { LoginPage } from '@/pages/LoginPage';
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage';
import { ResetPasswordPage } from '@/pages/ResetPasswordPage';
import { AdminDashboard } from '@/pages/AdminDashboard';
import { LearnerDashboard } from '@/pages/LearnerDashboard';
import { ProfilePage } from '@/pages/ProfilePage';
import {
  SegmentListPage,
  SegmentCreateWizard,
  SegmentDetailsPage,
  SegmentEditPage,
  UserListPage,
  UserCreatePage,
  UserProfilePage,
  AssignTrainingPage,
} from '@/pages/admin';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function RootRedirect() {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={user?.role === 'admin' ? '/admin' : '/learner'} replace />;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public auth routes */}
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Route>

      {/* Protected admin routes */}
      <Route element={<ProtectedRoute requiredRole="admin" />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/profile" element={<ProfilePage />} />
          <Route path="/admin/users" element={<UserListPage />} />
          <Route path="/admin/users/create" element={<UserCreatePage />} />
          <Route path="/admin/users/:userId" element={<UserProfilePage />} />
          <Route path="/admin/assign-training" element={<AssignTrainingPage />} />
          <Route path="/admin/content" element={<SegmentListPage />} />
          <Route path="/admin/content/segments/create" element={<SegmentCreateWizard />} />
          <Route path="/admin/content/segments/:id" element={<SegmentDetailsPage />} />
          <Route path="/admin/content/segments/:id/edit" element={<SegmentEditPage />} />
          <Route path="/admin/*" element={<AdminDashboard />} />
        </Route>
      </Route>

      {/* Protected learner routes */}
      <Route element={<ProtectedRoute requiredRole="learner" />}>
        <Route element={<LearnerLayout />}>
          <Route path="/learner" element={<LearnerDashboard />} />
          <Route path="/learner/profile" element={<ProfilePage />} />
          <Route path="/learner/*" element={<LearnerDashboard />} />
        </Route>
      </Route>

      {/* Root redirect based on role */}
      <Route path="/" element={<RootRedirect />} />

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <div className="p-[12px] min-h-screen bg-white">
              <AppRoutes />
            </div>
        </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;

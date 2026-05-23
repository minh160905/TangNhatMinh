import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import AppLayout from '../components/layout/AppLayout';

// Auth
import LoginPage from '../pages/auth/LoginPage';

// Admin
import UsersPage from '../pages/admin/UsersPage';
import ClassesPage from '../pages/admin/ClassesPage';
import AssignmentsPage from '../pages/admin/AssignmentsPage';
import SubjectsPage from '../pages/admin/SubjectsPage';
import AdminSchedulePage from '../pages/admin/SchedulePage';

// Teacher
import ScoreEntryPage from '../pages/teacher/ScoreEntryPage';
import AchievementReviewPage from '../pages/teacher/AchievementReviewPage';
import NotificationSendPage from '../pages/teacher/NotificationSendPage';
import CommentsPage from '../pages/teacher/CommentsPage';
import TeacherSchedulePage from '../pages/teacher/TeacherSchedulePage';
import TeacherClassPage from '../pages/teacher/TeacherClassPage';

// Student
import ScoreReportPage from '../pages/student/ScoreReportPage';
import AchievementSubmitPage from '../pages/student/AchievementSubmitPage';
import StudentSchedulePage from '../pages/student/StudentSchedulePage';

// Parent
import ChildReportPage from '../pages/parent/ChildReportPage';
import ParentSchedulePage from '../pages/parent/ParentSchedulePage';

// Notifications (shared)
import NotificationsPage from '../pages/shared/NotificationsPage';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user?.role)) return <Navigate to="/" replace />;
  return children;
};

const DashboardRedirect = () => {
  const { user } = useAuthStore();
  const role = user?.role;
  if (role === 'ADMIN') return <Navigate to="/admin/users" replace />;
  if (role === 'TEACHER') return <Navigate to="/teacher/scores" replace />;
  if (role === 'STUDENT') return <Navigate to="/student/report" replace />;
  if (role === 'PARENT') return <Navigate to="/parent/report" replace />;
  return <Navigate to="/login" replace />;
};

const AppRouter = () => {
  const { isAuthenticated } = useAuthStore();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />} />

        <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route index element={<DashboardRedirect />} />

          {/* Admin */}
          <Route path="admin/users" element={<ProtectedRoute allowedRoles={['ADMIN']}><UsersPage /></ProtectedRoute>} />
          <Route path="admin/classes" element={<ProtectedRoute allowedRoles={['ADMIN']}><ClassesPage /></ProtectedRoute>} />
          <Route path="admin/assignments" element={<ProtectedRoute allowedRoles={['ADMIN']}><AssignmentsPage /></ProtectedRoute>} />
          <Route path="admin/subjects" element={<ProtectedRoute allowedRoles={['ADMIN']}><SubjectsPage /></ProtectedRoute>} />
          <Route path="admin/schedule" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminSchedulePage /></ProtectedRoute>} />

          {/* Teacher */}
          <Route path="teacher/scores" element={<ProtectedRoute allowedRoles={['TEACHER']}><ScoreEntryPage /></ProtectedRoute>} />
          <Route path="teacher/achievements" element={<ProtectedRoute allowedRoles={['TEACHER']}><AchievementReviewPage /></ProtectedRoute>} />
          <Route path="teacher/notifications" element={<ProtectedRoute allowedRoles={['TEACHER']}><NotificationSendPage /></ProtectedRoute>} />
          <Route path="teacher/comments" element={<ProtectedRoute allowedRoles={['TEACHER']}><CommentsPage /></ProtectedRoute>} />
          <Route path="teacher/schedule" element={<ProtectedRoute allowedRoles={['TEACHER']}><TeacherSchedulePage /></ProtectedRoute>} />
          <Route path="teacher/my-class" element={<ProtectedRoute allowedRoles={['TEACHER']}><TeacherClassPage /></ProtectedRoute>} />

          {/* Student */}
          <Route path="student/report" element={<ProtectedRoute allowedRoles={['STUDENT']}><ScoreReportPage /></ProtectedRoute>} />
          <Route path="student/achievements" element={<ProtectedRoute allowedRoles={['STUDENT']}><AchievementSubmitPage /></ProtectedRoute>} />
          <Route path="student/schedule" element={<ProtectedRoute allowedRoles={['STUDENT']}><StudentSchedulePage /></ProtectedRoute>} />

          {/* Parent */}
          <Route path="parent/report" element={<ProtectedRoute allowedRoles={['PARENT']}><ChildReportPage /></ProtectedRoute>} />
          <Route path="parent/schedule" element={<ProtectedRoute allowedRoles={['PARENT']}><ParentSchedulePage /></ProtectedRoute>} />

          {/* Shared – not for ADMIN */}
          <Route path="notifications" element={<ProtectedRoute allowedRoles={['TEACHER', 'STUDENT', 'PARENT']}><NotificationsPage /></ProtectedRoute>} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRouter;

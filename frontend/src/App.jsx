import { Route, Routes } from 'react-router';
import GuestRoute from './components/GuestRoute.jsx';
import MainLayout from './components/layout/MainLayout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import ApplicationsPage from './pages/ApplicationsPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import ForgotPasswordPage from './pages/ForgotPasswordPage.jsx';
import FriendsPage from './pages/FriendsPage.jsx';
import HashtagPage from './pages/HashtagPage.jsx';
import HomePage from './pages/HomePage.jsx';
import InternshipDetailPage from './pages/InternshipDetailPage.jsx';
import InternshipsPage from './pages/InternshipsPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import NotificationsPage from './pages/NotificationsPage.jsx';
import PlansPage from './pages/PlansPage.jsx';
import PostDetailPage from './pages/PostDetailPage.jsx';
import PublicSpacePage from './pages/PublicSpacePage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import ResumeBuilderPage from './pages/ResumeBuilderPage.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<HomePage />} />

        {/* Only for visitors who are not logged in */}
        <Route element={<GuestRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        </Route>

        {/* Only for logged-in users */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/public-space" element={<PublicSpacePage />} />
          <Route path="/posts/:id" element={<PostDetailPage />} />
          <Route path="/hashtags/:tag" element={<HashtagPage />} />
          <Route path="/friends" element={<FriendsPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/internships" element={<InternshipsPage />} />
          <Route path="/internships/:id" element={<InternshipDetailPage />} />
          <Route path="/applications" element={<ApplicationsPage />} />
          <Route path="/plans" element={<PlansPage />} />
          <Route path="/resume" element={<ResumeBuilderPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

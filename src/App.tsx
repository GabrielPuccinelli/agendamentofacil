import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import OnboardingPage from './pages/OnboardingPage';
import PublicPage from './pages/PublicPage';
import OrganizationPage from './pages/OrganizationPage';
import MemberDashboardPage from './pages/MemberDashboardPage';
import EditProfilePage from './pages/EditProfilePage';
import CompanyDashboardPage from './pages/CompanyDashboardPage';
import InviteCreatePage from './pages/InviteCreatePage';
import InviteAcceptPage from './pages/InviteAcceptPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<AuthPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/company/dashboard" element={<CompanyDashboardPage />} />
        <Route path="/profile/edit" element={<EditProfilePage />} />
        <Route path="/:organizationSlug/p/:memberSlug/dashboard" element={<MemberDashboardPage />} />
        <Route path="/company/services" element={<CompanyDashboardPage />} />
        <Route path="/company/team" element={<CompanyDashboardPage />} />
        <Route path="/company/invite" element={<InviteCreatePage />} />
        <Route path="/invite/:token" element={<InviteAcceptPage />} />
        <Route path="/e/:organizationSlug" element={<OrganizationPage />} />
        <Route path="/e/:organizationSlug/p/:memberSlug" element={<PublicPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

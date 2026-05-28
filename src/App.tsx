import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';

const HomePage = lazy(() => import('./pages/HomePage'));
const AuthPage = lazy(() => import('./pages/AuthPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const OnboardingPage = lazy(() => import('./pages/OnboardingPage'));
const PublicPage = lazy(() => import('./pages/PublicPage'));
const OrganizationPage = lazy(() => import('./pages/OrganizationPage'));
const MemberDashboardPage = lazy(() => import('./pages/MemberDashboardPage'));
const EditProfilePage = lazy(() => import('./pages/EditProfilePage'));
const CompanyDashboardPage = lazy(() => import('./pages/CompanyDashboardPage'));
const InviteCreatePage = lazy(() => import('./pages/InviteCreatePage'));
const InviteAcceptPage = lazy(() => import('./pages/InviteAcceptPage'));

function PageLoader() {
  return (
    <div className="flex justify-center items-center min-h-screen bg-slate-950">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
        <p className="text-indigo-400 text-sm">Carregando...</p>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
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
      </Suspense>
    </BrowserRouter>
  );
}

export default App;

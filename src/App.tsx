// src/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import AuthPage from './pages/AuthPage'
import DashboardPage from './pages/DashboardPage'
import OnboardingPage from './pages/OnboardingPage'
import PublicPage from './pages/PublicPage'
import OrganizationPage from './pages/OrganizationPage'
import MemberDashboardPage from "./pages/MemberDashboardPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rotas de Admin */}
        <Route path="/" element={<AuthPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/member/:memberId/dashboard" element={<MemberDashboardPage />} />

        {/* Rotas Públicas (ESTRUTURA CORRIGIDA) */}

        {/* Rota da EMPRESA (Vitrine de Profissionais) */}
        <Route path="/e/:organizationSlug" element={<OrganizationPage />} />

        {/* Rota do PROFISSIONAL (Agenda/Booking) - AGORA ANINHADA */}
        <Route path="/e/:organizationSlug/p/:memberSlug" element={<PublicPage />} />

      </Routes>
    </BrowserRouter>
  )
}

export default App

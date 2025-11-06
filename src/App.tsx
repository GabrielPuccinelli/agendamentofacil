// src/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import AuthPage from './pages/AuthPage'
import DashboardPage from './pages/DashboardPage'
import OnboardingPage from './pages/OnboardingPage'
import PublicPage from './pages/PublicPage'
import OrganizationPage from './pages/OrganizationPage'
import MemberDashboardPage from './pages/MemberDashboardPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rotas de Admin */}
        <Route path="/" element={<AuthPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/member/:memberId/dashboard" element={<MemberDashboardPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />

        {/* Rotas Públicas (NOVA ESTRUTURA) */}

        {/* Rota da EMPRESA (Vitrine de Profissionais) */}
        <Route path="/e/:slug" element={<OrganizationPage />} />

        {/* Rota do PROFISSIONAL (Agenda/Booking) */}
        <Route path="/p/:slug" element={<PublicPage />} /> 

      </Routes>
    </BrowserRouter>
  )
}

export default App
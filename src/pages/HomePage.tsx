// src/pages/HomePage.tsx
import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Link } from 'react-router-dom';

const HomePage: React.FC = () => {
  return (
    <div className="bg-gray-50">
      <Header />

      <main>
        {/* Hero Section */}
        <section className="bg-white py-20">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-5xl font-extrabold text-gray-800">
              Agende mais, trabalhe melhor
            </h1>
            <p className="mt-4 text-lg text-gray-600">
              Elimine tarefas manuais, reduza interrupções e automatize o atendimento com o Agendamento Fácil.
            </p>
            <Link to="/login" className="mt-8 inline-block bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg">
              Começar Gratuitamente
            </Link>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center text-gray-800">Tudo que você precisa para crescer</h2>
            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white p-8 rounded-lg shadow-md">
                <h3 className="text-xl font-bold">Agendamento Online</h3>
                <p className="mt-4 text-gray-600">Clientes agendam 24h por dia, de qualquer dispositivo.</p>
              </div>
              <div className="bg-white p-8 rounded-lg shadow-md">
                <h3 className="text-xl font-bold">Lembretes Inteligentes</h3>
                <p className="mt-4 text-gray-600">Notificações automáticas por e-mail, SMS e WhatsApp.</p>
              </div>
              <div className="bg-white p-8 rounded-lg shadow-md">
                <h3 className="text-xl font-bold">Gestão de Equipes</h3>
                <p className="mt-4 text-gray-600">Controle agendas e permissões em tempo real.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="bg-white py-20">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold text-gray-800">Escolha o Plano que Melhor lhe Atende</h2>
            <div className="mt-8 inline-block bg-white p-8 rounded-lg shadow-md border">
              <h3 className="text-2xl font-bold">Plano Completo</h3>
              <p className="mt-4 text-5xl font-extrabold">R$9,90<span className="text-lg font-medium">/mês</span></p>
              <p className="mt-4 text-gray-600">Acesso a todos os serviços.</p>
              <Link to="/login" className="mt-8 inline-block bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg">
                Assinar Agora
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default HomePage;

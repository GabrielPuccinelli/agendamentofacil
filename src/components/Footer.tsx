import React from 'react';
import { Link } from 'react-router-dom';

const CalendarIcon = () => (
  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-slate-400">
      <div className="container mx-auto px-4 py-14">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 pb-10 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl gradient-brand flex items-center justify-center shadow-md shadow-indigo-500/20">
                <CalendarIcon />
              </div>
              <span className="text-white font-bold text-lg">Agendamento Fácil</span>
            </div>
            <p className="text-sm leading-relaxed max-w-xs">
              Transformando a forma como empresas gerenciam seus agendamentos. Simples, moderno e eficiente.
            </p>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4">Produto</h3>
            <ul className="space-y-2.5">
              <li>
                <a href="#features" className="text-sm hover:text-white transition-colors duration-200">
                  Recursos
                </a>
              </li>
              <li>
                <a href="#pricing" className="text-sm hover:text-white transition-colors duration-200">
                  Preços
                </a>
              </li>
              <li>
                <a href="#how-it-works" className="text-sm hover:text-white transition-colors duration-200">
                  Como funciona
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4">Suporte</h3>
            <ul className="space-y-2.5">
              <li>
                <a href="#" className="text-sm hover:text-white transition-colors duration-200">
                  Central de Ajuda
                </a>
              </li>
              <li>
                <a href="#" className="text-sm hover:text-white transition-colors duration-200">
                  Contato
                </a>
              </li>
              <li>
                <Link to="/login" className="text-sm hover:text-white transition-colors duration-200">
                  Acessar Conta
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm">
          <p>&copy; {new Date().getFullYear()} Agendamento Fácil. Todos os direitos reservados.</p>
          <div className="flex items-center gap-1 text-slate-500">
            <span>Feito com</span>
            <span className="text-red-400">♥</span>
            <span>no Brasil</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

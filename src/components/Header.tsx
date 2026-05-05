import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const CalendarIcon = () => (
  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const Header: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'glass-white shadow-lg shadow-black/5'
          : 'bg-transparent'
      }`}
    >
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl gradient-brand flex items-center justify-center shadow-md shadow-indigo-500/30">
            <CalendarIcon />
          </div>
          <span className="text-xl font-bold gradient-text">
            Agendamento Fácil
          </span>
        </Link>

        <nav className="flex items-center gap-6">
          <a
            href="#features"
            className="hidden md:block text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors duration-200"
          >
            Recursos
          </a>
          <a
            href="#pricing"
            className="hidden md:block text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors duration-200"
          >
            Preços
          </a>
          <Link
            to="/login"
            className="btn-primary py-2 px-5 text-sm"
          >
            Entrar
          </Link>
        </nav>
      </div>
    </header>
  );
};

export default Header;

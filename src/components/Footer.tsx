// src/components/Footer.tsx
import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-800 text-white py-8">
      <div className="container mx-auto px-4">
        <div className="flex justify-between">
          <div>
            <h2 className="text-xl font-bold">Agendamento Fácil</h2>
            <p className="mt-2">Transformando a forma como empresas gerenciam seus agendamentos.</p>
          </div>
          <div>
            <h3 className="font-bold">Contato</h3>
            <ul className="mt-2">
              <li><a href="#" className="hover:underline">Suporte</a></li>
              <li><a href="#" className="hover:underline">Contato</a></li>
            </ul>
          </div>
        </div>
        <div className="mt-8 border-t border-gray-700 pt-4 text-center">
          <p>&copy; {new Date().getFullYear()} Agendamento Fácil. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

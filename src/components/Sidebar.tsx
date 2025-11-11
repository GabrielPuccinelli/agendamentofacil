// src/components/Sidebar.tsx
import React from 'react';
import { Link } from 'react-router-dom';

// Tipos para as props do componente
type UserProfile = {
  avatarUrl: string;
  name: string;
  phone: string | null;
} | null;

type MemberLink = {
  id: string;
  name: string;
  slug: string;
};

type SidebarProps = {
  userProfile: UserProfile;
  members: MemberLink[];
  organizationSlug: string | null;
  onLogout: () => void;
};

const Sidebar: React.FC<SidebarProps> = ({ userProfile, members, organizationSlug, onLogout }) => {
  return (
    <aside className="w-64 bg-gray-800 text-white p-6 flex flex-col min-h-screen">
      <div className="text-center mb-10">
        <img
          src={userProfile?.avatarUrl || 'https://via.placeholder.com/150'}
          alt="Avatar"
          className="w-24 h-24 rounded-full mx-auto mb-4 border-4 border-gray-600"
        />
        <h2 className="text-xl font-bold">{userProfile?.name || 'Carregando...'}</h2>
        <p className="text-sm text-gray-400">{userProfile?.phone || ''}</p>
      </div>

      <nav className="flex flex-col flex-grow">
        <ul className="flex-grow">
          <li className="mb-4">
            <Link to="/dashboard" className="flex items-center p-2 rounded hover:bg-gray-700">
              <span className="mr-3">🏠</span>
              <span>Dashboard</span>
            </Link>
          </li>
          <li className="mb-4">
            <Link to="/profile/edit" className="flex items-center p-2 rounded hover:bg-gray-700">
              <span className="mr-3">✏️</span>
              <span>Editar Perfil</span>
            </Link>
          </li>
          {members.length > 0 && organizationSlug && (
            <li className="mb-4">
              <h3 className="text-xs uppercase text-gray-500 font-bold mb-2">Membros</h3>
              <ul>
                {members.map((member) => (
                  <li key={member.id} className="mb-2">
                    <Link
                      to={`/${organizationSlug}/p/${member.slug}/dashboard`}
                      className="flex items-center p-2 rounded hover:bg-gray-700 text-sm"
                    >
                      <span className="mr-3">👤</span>
                      <span>{member.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
          )}
        </ul>

        {/* Botão Sair movido para o final da navegação */}
        <div>
          <button
            onClick={onLogout}
            className="w-full text-left p-2 rounded hover:bg-gray-700 flex items-center"
          >
            <span className="mr-3">🚪</span>
            <span>Sair</span>
          </button>
        </div>
      </nav>
    </aside>
  );
};

export default Sidebar;

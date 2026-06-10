import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Home, LayoutDashboard } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-violet-950 flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <p className="text-7xl font-extrabold gradient-text mb-4">404</p>
        <h1 className="text-2xl font-bold text-white mb-2">Página não encontrada</h1>
        <p className="text-indigo-300 mb-8 leading-relaxed">
          O endereço que você tentou acessar não existe ou foi movido.
          Verifique o link ou volte para o início.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild className="gradient-brand shadow-lg shadow-indigo-500/25">
            <Link to="/">
              <Home className="w-4 h-4" />
              Página inicial
            </Link>
          </Button>
          <Button asChild variant="outline" className="bg-white/5 border-white/15 text-white hover:bg-white/10 hover:text-white">
            <Link to="/dashboard">
              <LayoutDashboard className="w-4 h-4" />
              Meu painel
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

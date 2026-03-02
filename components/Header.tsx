
import React, { useState } from 'react';
import { Wallet, LayoutDashboard, ListChecks, Tags, Receipt, TrendingUp, LogOut, Users, ArrowLeftCircle, ShieldAlert, LineChart, Menu, X } from 'lucide-react';
import { User } from '../types';

interface HeaderProps {
  currentView?: 'dashboard' | 'payable' | 'categories' | 'expenses' | 'income' | 'investments' | 'members';
  onNavigate?: (view: 'dashboard' | 'payable' | 'categories' | 'expenses' | 'income' | 'investments' | 'members') => void;
  user?: User;
  onLogout?: () => void;
  onReturnToMain?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ currentView = 'dashboard', onNavigate, user, onLogout, onReturnToMain }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const getLinkClass = (view: string) => 
    `flex items-center gap-3 px-4 py-3 rounded-md transition-colors cursor-pointer text-base font-medium w-full ${
      currentView === view 
        ? 'bg-purple-800 text-white shadow-inner' 
        : 'text-purple-100 hover:bg-purple-600 hover:text-white'
    }`;

  const handleNavigate = (view: any) => {
    if (onNavigate) {
      onNavigate(view);
      setIsMenuOpen(false);
    }
  };

  const isMemberAccess = user?.parentId;

  return (
    <>
      {/* Aviso de Modo de Acesso (Apenas se estiver acessando como membro) */}
      {isMemberAccess && onReturnToMain && (
        <div className="bg-orange-500 text-white text-sm py-2 px-4 shadow-md print:hidden relative z-50">
           <div className="max-w-6xl mx-auto flex justify-between items-center">
              <div className="flex items-center gap-2">
                 <ShieldAlert size={16} />
                 <span>Você está acessando o perfil de: <strong>{user.name}</strong></span>
              </div>
              <button 
                onClick={onReturnToMain}
                className="bg-white text-orange-600 hover:bg-orange-50 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 transition-colors shadow-sm"
              >
                <ArrowLeftCircle size={14} /> Voltar para Conta Principal
              </button>
           </div>
        </div>
      )}

      <header className={`text-white pt-4 pb-16 px-4 print:hidden shadow-lg transition-colors ${isMemberAccess ? 'bg-gray-800 border-t border-gray-700' : 'bg-purple-700'}`}>
        <div className="max-w-6xl mx-auto">
          <div className={`flex items-center justify-between gap-4 mb-6 border-b pb-4 ${isMemberAccess ? 'border-gray-600' : 'border-purple-600'}`}>
            <div className="flex items-center gap-3">
              {onNavigate && user && (
                <button 
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="p-2 -ml-2 rounded-md text-purple-100 hover:bg-purple-600 hover:text-white transition-colors focus:outline-none"
                >
                  {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
              )}
              <div className={`p-2 rounded-full ${isMemberAccess ? 'bg-gray-700 text-orange-400' : 'bg-white text-purple-700'}`}>
                <Wallet className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold leading-tight hidden sm:block">Finanças Pessoais</h1>
                {user && <div className={`text-xs ${isMemberAccess ? 'text-gray-400' : 'text-purple-200'}`}>Olá, <span className="font-semibold text-white">{user.name}</span></div>}
              </div>
            </div>

            {user && onLogout && (
              <div className="flex items-center gap-2 sm:gap-3">
                  <button 
                    onClick={() => handleNavigate('members')}
                    className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded transition-colors ${
                      isMemberAccess 
                        ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' 
                        : 'bg-purple-800 hover:bg-purple-600 text-white'
                    } ${currentView === 'members' ? 'ring-2 ring-white' : ''}`}
                  >
                    <Users size={14} /> <span className="hidden sm:inline">Membros</span>
                  </button>
                  <button 
                    onClick={onLogout}
                    className="flex items-center gap-2 text-xs bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded transition-colors shadow-sm text-white"
                  >
                    <LogOut size={14} /> <span className="hidden sm:inline">Sair</span>
                  </button>
              </div>
            )}
          </div>
            
          {onNavigate && user && isMenuOpen && (
            <nav className={`flex flex-col p-2 rounded-lg gap-1 animate-fade-in-up ${isMemberAccess ? 'bg-gray-700/50' : 'bg-purple-800/40'}`}>
              <button onClick={() => handleNavigate('dashboard')} className={getLinkClass('dashboard')}>
                <LayoutDashboard size={20} />
                <span>Dashboard</span>
              </button>
              <button onClick={() => handleNavigate('expenses')} className={getLinkClass('expenses')}>
                <Receipt size={20} />
                <span>Despesas</span>
              </button>
              <button onClick={() => handleNavigate('income')} className={getLinkClass('income')}>
                <TrendingUp size={20} />
                <span>Receitas</span>
              </button>
              <button onClick={() => handleNavigate('investments')} className={getLinkClass('investments')}>
                <LineChart size={20} />
                <span>Investimentos</span>
              </button>
              <button onClick={() => handleNavigate('payable')} className={getLinkClass('payable')}>
                <ListChecks size={20} />
                <span>A Pagar</span>
              </button>
              <button onClick={() => handleNavigate('categories')} className={getLinkClass('categories')}>
                <Tags size={20} />
                <span>Categorias</span>
              </button>
            </nav>
          )}
        </div>
      </header>
    </>
  );
};

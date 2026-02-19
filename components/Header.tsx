
import React from 'react';
import { Wallet, LayoutDashboard, ListChecks, Tags, Receipt, TrendingUp } from 'lucide-react';

interface HeaderProps {
  currentView?: 'dashboard' | 'payable' | 'categories' | 'expenses' | 'income';
  onNavigate?: (view: 'dashboard' | 'payable' | 'categories' | 'expenses' | 'income') => void;
}

export const Header: React.FC<HeaderProps> = ({ currentView = 'dashboard', onNavigate }) => {
  const getLinkClass = (view: string) => 
    `flex items-center gap-2 px-4 py-2 rounded-md transition-colors cursor-pointer ${
      currentView === view 
        ? 'bg-purple-800 text-white shadow-inner' 
        : 'text-purple-100 hover:bg-purple-600 hover:text-white'
    }`;

  return (
    <header className="bg-purple-700 text-white pt-6 pb-20 px-4 print:hidden">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
          <div className="flex items-center gap-2">
            <Wallet className="w-8 h-8" />
            <div>
              <h1 className="text-2xl font-bold leading-tight">Finanças Pessoais</h1>
              <div className="text-xs opacity-80">Gerencie seu dinheiro</div>
            </div>
          </div>
          
          {onNavigate && (
            <nav className="flex flex-wrap items-center bg-purple-800/50 p-1 rounded-lg gap-1">
              <button onClick={() => onNavigate('dashboard')} className={getLinkClass('dashboard')}>
                <LayoutDashboard size={18} />
                <span className="hidden sm:inline">Dashboard</span>
              </button>
              <button onClick={() => onNavigate('expenses')} className={getLinkClass('expenses')}>
                <Receipt size={18} />
                <span className="hidden sm:inline">Despesas</span>
              </button>
              <button onClick={() => onNavigate('income')} className={getLinkClass('income')}>
                <TrendingUp size={18} />
                <span className="hidden sm:inline">Receitas</span>
              </button>
              <button onClick={() => onNavigate('payable')} className={getLinkClass('payable')}>
                <ListChecks size={18} />
                <span className="hidden sm:inline">A Pagar</span>
              </button>
              <button onClick={() => onNavigate('categories')} className={getLinkClass('categories')}>
                <Tags size={18} />
                <span className="hidden sm:inline">Categorias</span>
              </button>
            </nav>
          )}
        </div>
      </div>
    </header>
  );
};

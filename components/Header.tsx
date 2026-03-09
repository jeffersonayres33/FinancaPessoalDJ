
import React, { useState, useEffect, useRef } from 'react';
import { Wallet, LayoutDashboard, ListChecks, Tags, Receipt, TrendingUp, LogOut, Users, ArrowLeftCircle, ShieldAlert, LineChart, Menu, X, User as UserIcon, Settings, Download, Shield, Share, PlusSquare, Upload } from 'lucide-react';
import { User } from '../types';

interface HeaderProps {
  currentView?: 'dashboard' | 'payable' | 'categories' | 'expenses' | 'income' | 'investments' | 'members';
  onNavigate?: (view: 'dashboard' | 'payable' | 'categories' | 'expenses' | 'income' | 'investments' | 'members') => void;
  user?: User;
  onLogout?: () => void;
  onReturnToMain?: () => void;
  onBackup?: () => void;
  onRestoreBackup?: (file: File) => void;
  onInstall?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ currentView = 'dashboard', onNavigate, user, onLogout, onReturnToMain, onBackup, onRestoreBackup, onInstall }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showInstallInstructions, setShowInstallInstructions] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsStandalone(window.matchMedia('(display-mode: standalone)').matches);
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream);
  }, []);

  // Prevent scrolling when menu is open
  useEffect(() => {
    if (isMenuOpen || showInstallInstructions) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMenuOpen, showInstallInstructions]);

  const getLinkClass = (view: string) => 
    `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors cursor-pointer text-base font-medium w-full ${
      currentView === view 
        ? 'bg-purple-100 text-purple-800' 
        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
    }`;

  const handleNavigate = (view: any) => {
    if (onNavigate) {
      onNavigate(view);
      setIsMenuOpen(false);
    }
  };

  const handleInstallClick = () => {
    if (onInstall) {
      onInstall();
    } else {
      setShowInstallInstructions(true);
    }
    setIsMenuOpen(false);
  };

  const isMemberAccess = user?.parentId;

  return (
    <>
      {/* Modal de Instruções de Instalação */}
      {showInstallInstructions && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowInstallInstructions(false)}>
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-2xl transform transition-all scale-100" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">Instalar Aplicativo</h3>
              <button onClick={() => setShowInstallInstructions(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4 text-gray-600">
              {isIOS ? (
                <>
                  <p>Para instalar no iPhone/iPad:</p>
                  <ol className="list-decimal list-inside space-y-2 text-sm">
                    <li className="flex items-center gap-2">Toque no botão <strong>Compartilhar</strong> <Share size={16} className="inline" /></li>
                    <li className="flex items-center gap-2">Role para baixo e toque em <strong>Adicionar à Tela de Início</strong> <PlusSquare size={16} className="inline" /></li>
                    <li>Confirme tocando em <strong>Adicionar</strong>.</li>
                  </ol>
                </>
              ) : (
                <>
                  <p>Para instalar no Android ou Computador:</p>
                  <ol className="list-decimal list-inside space-y-2 text-sm">
                    <li>No Computador: Clique no ícone de instalação <Download size={16} className="inline" /> na barra de endereços do Chrome.</li>
                    <li>No Android: Toque no menu do navegador (três pontos) e selecione <strong>Instalar aplicativo</strong> ou <strong>Adicionar à tela inicial</strong>.</li>
                    <li>Siga as instruções na tela.</li>
                  </ol>
                </>
              )}
            </div>

            <button 
              onClick={() => setShowInstallInstructions(false)} 
              className="mt-6 w-full bg-purple-600 text-white py-3 rounded-lg font-medium hover:bg-purple-700 transition-colors"
            >
              Entendi
            </button>
          </div>
        </div>
      )}

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
          <div className={`flex items-center justify-between gap-4 mb-2`}>
            <div className="flex items-center gap-3">
              {onNavigate && user && (
                <button 
                  onClick={() => setIsMenuOpen(true)}
                  className="p-2 -ml-2 rounded-md text-purple-100 hover:bg-purple-600 hover:text-white transition-colors focus:outline-none"
                >
                  <Menu size={24} />
                </button>
              )}
              <div className={`p-2 rounded-full ${isMemberAccess ? 'bg-gray-700 text-orange-400' : 'bg-white text-purple-700'}`}>
                <Wallet className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold leading-tight">Finanças Pessoais</h1>
              </div>
            </div>
          </div>
            
          {/* Overlay do Menu */}
          {isMenuOpen && (
            <div 
              className="fixed inset-0 bg-black/50 z-40 transition-opacity"
              onClick={() => setIsMenuOpen(false)}
            />
          )}

          {/* Drawer do Menu */}
          <div className={`fixed top-0 left-0 h-full w-80 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
            {/* Header do Menu */}
            <div className={`p-6 flex items-center justify-between ${isMemberAccess ? 'bg-gray-800' : 'bg-purple-700'} text-white`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${isMemberAccess ? 'bg-gray-700 text-orange-400' : 'bg-white text-purple-700'}`}>
                  <Wallet className="w-6 h-6" />
                </div>
                <h2 className="text-lg font-bold">Menu</h2>
              </div>
              <button 
                onClick={() => setIsMenuOpen(false)}
                className="p-2 rounded-md text-purple-100 hover:bg-purple-600 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Links de Navegação */}
            <div className="flex-1 overflow-y-auto p-4">
              {onNavigate && user && (
                <nav className="flex flex-col gap-1">
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
                  {user.role === 'admin' && (
                    <button onClick={() => handleNavigate('admin')} className={getLinkClass('admin')}>
                      <Shield size={20} />
                      <span>Painel Admin</span>
                    </button>
                  )}
                  {!isStandalone && (
                    <button onClick={handleInstallClick} className="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors cursor-pointer text-base font-medium w-full text-purple-600 bg-purple-50 hover:bg-purple-100 hover:text-purple-800 mt-2">
                      <Download size={20} />
                      <span>Instalar App</span>
                    </button>
                  )}
                  {onBackup && (
                    <button onClick={() => { onBackup(); setIsMenuOpen(false); }} className="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors cursor-pointer text-base font-medium w-full text-gray-600 hover:bg-gray-100 hover:text-gray-900 mt-4 border-t border-gray-100 pt-4">
                      <Download size={20} />
                      <span>Backup</span>
                    </button>
                  )}
                  {onRestoreBackup && (
                    <>
                      <input 
                        type="file" 
                        accept=".json" 
                        ref={fileInputRef} 
                        style={{ display: 'none' }} 
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            onRestoreBackup(file);
                            setIsMenuOpen(false);
                          }
                          // Reset input
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }} 
                      />
                      <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors cursor-pointer text-base font-medium w-full text-gray-600 hover:bg-gray-100 hover:text-gray-900 mt-2">
                        <Upload size={20} />
                        <span>Restaurar Backup</span>
                      </button>
                    </>
                  )}
                </nav>
              )}
            </div>

            {/* Footer do Menu (Usuário e Ações) */}
            {user && (
              <div className="p-4 border-t border-gray-100 bg-gray-50">
                <div className="flex items-center gap-3 mb-4 px-2">
                  <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-700">
                    <UserIcon size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  </div>
                  <button 
                    onClick={() => handleNavigate('profile')}
                    className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-full transition-colors"
                    title="Configurações da Conta"
                  >
                    <Settings size={18} />
                  </button>
                </div>

                <div className="flex flex-col gap-2">
                  <button 
                    onClick={() => handleNavigate('members')}
                    className={`flex items-center justify-center gap-2 text-sm px-4 py-2 rounded-lg transition-colors font-medium ${
                      currentView === 'members' 
                        ? 'bg-purple-100 text-purple-800' 
                        : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Users size={16} /> Gerenciar Membros
                  </button>
                  
                  {onLogout && (
                    <button 
                      onClick={onLogout}
                      className="flex items-center justify-center gap-2 text-sm px-4 py-2 rounded-lg transition-colors font-medium bg-red-50 text-red-600 hover:bg-red-100 border border-red-100"
                    >
                      <LogOut size={16} /> Sair da Conta
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  );
};

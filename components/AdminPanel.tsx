import React, { useState, useEffect } from 'react';
import { Shield, UserPlus, Users, ToggleLeft, ToggleRight, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { authService } from '../services/authService';
import { User } from '../types';

interface AdminPanelProps {
  currentUser: User;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ currentUser }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showUserList, setShowUserList] = useState(false);
  const [isPublicRegistration, setIsPublicRegistration] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const enabled = await authService.isPublicRegistrationEnabled();
      setIsPublicRegistration(enabled);
    } catch (e) {
      console.error("Erro ao carregar configurações:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUsers = async () => {
      setLoadingUsers(true);
      try {
          const data = await authService.getAllUsers();
          setUsers(data);
          setShowUserList(true);
      } catch (e: any) {
          setMessage({ text: e.message || 'Erro ao carregar usuários.', type: 'error' });
      } finally {
          setLoadingUsers(false);
      }
  };

  const handleToggleRegistration = async () => {
    setIsLoading(true);
    setMessage(null);
    try {
      const newValue = !isPublicRegistration;
      await authService.togglePublicRegistration(newValue);
      setIsPublicRegistration(newValue);
      setMessage({ 
        text: `Cadastro público ${newValue ? 'HABILITADO' : 'DESABILITADO'} com sucesso.`, 
        type: 'success' 
      });
    } catch (e: any) {
      setMessage({ text: e.message || 'Erro ao alterar configuração.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  if (currentUser.role !== 'admin') {
    return (
      <div className="p-8 text-center text-gray-500">
        <Shield size={48} className="mx-auto mb-4 text-gray-300" />
        <h2 className="text-xl font-bold text-gray-700">Acesso Restrito</h2>
        <p>Você não tem permissão para acessar o painel de administrador.</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
        <div className="bg-gray-900 text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gray-800 p-2 rounded-lg">
              <Shield size={24} className="text-purple-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Painel do Administrador</h2>
              <p className="text-gray-400 text-sm">Gerencie o acesso e configurações do sistema</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {message && (
            <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
              {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
              {message.text}
            </div>
          )}

          <div className="grid gap-6 md:grid-cols-2 mb-8">
            {/* Card de Controle de Registro */}
            <div className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${isPublicRegistration ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                    <UserPlus size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800">Cadastro Público</h3>
                    <p className="text-sm text-gray-500">Permitir que qualquer pessoa crie uma conta</p>
                  </div>
                </div>
                <button 
                  onClick={handleToggleRegistration}
                  disabled={isLoading}
                  className={`text-2xl transition-colors focus:outline-none ${isPublicRegistration ? 'text-green-500 hover:text-green-600' : 'text-gray-300 hover:text-gray-400'}`}
                >
                  {isLoading ? <Loader2 size={24} className="animate-spin text-purple-600" /> : (
                    isPublicRegistration ? <ToggleRight size={40} /> : <ToggleLeft size={40} />
                  )}
                </button>
              </div>
              
              <div className={`text-sm p-3 rounded-lg ${isPublicRegistration ? 'bg-green-50 text-green-800' : 'bg-gray-50 text-gray-600'}`}>
                Status: <strong>{isPublicRegistration ? 'ABERTO' : 'FECHADO'}</strong>
                <p className="mt-1 text-xs opacity-80">
                  {isPublicRegistration 
                    ? 'Qualquer pessoa com o link pode criar uma conta.' 
                    : 'Apenas usuários convidados ou pré-cadastrados podem acessar.'}
                </p>
              </div>
            </div>

            {/* Card de Gestão de Usuários */}
            <div className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-purple-100 text-purple-600 p-2 rounded-lg">
                  <Users size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800">Gerenciar Usuários</h3>
                  <p className="text-sm text-gray-500">Listar e gerenciar contas do sistema</p>
                </div>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                Visualize todos os usuários cadastrados na plataforma.
              </p>
              <button 
                onClick={loadUsers}
                disabled={loadingUsers}
                className="w-full py-2 bg-white border border-purple-200 text-purple-700 hover:bg-purple-50 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                {loadingUsers ? <Loader2 size={16} className="animate-spin" /> : <Users size={16} />}
                {showUserList ? 'Atualizar Lista' : 'Ver Lista de Usuários'}
              </button>
            </div>
          </div>

          {/* Lista de Usuários */}
          {showUserList && (
              <div className="border border-gray-200 rounded-xl overflow-hidden animate-fade-in">
                  <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                      <h3 className="font-bold text-gray-700">Usuários Cadastrados ({users.length})</h3>
                  </div>
                  <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                          <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
                              <tr>
                                  <th className="px-6 py-3">Nome</th>
                                  <th className="px-6 py-3">Email</th>
                                  <th className="px-6 py-3">Função</th>
                                  <th className="px-6 py-3">ID</th>
                              </tr>
                          </thead>
                          <tbody>
                              {users.map((u) => (
                                  <tr key={u.id} className="bg-white border-b border-gray-50 hover:bg-gray-50">
                                      <td className="px-6 py-4 font-medium text-gray-900">{u.name}</td>
                                      <td className="px-6 py-4 text-gray-500">{u.email}</td>
                                      <td className="px-6 py-4">
                                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                                              {u.role === 'admin' ? 'ADMIN' : 'USUÁRIO'}
                                          </span>
                                      </td>
                                      <td className="px-6 py-4 text-gray-400 text-xs font-mono">{u.id.substring(0, 8)}...</td>
                                  </tr>
                              ))}
                              {users.length === 0 && (
                                  <tr>
                                      <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                                          Nenhum usuário encontrado.
                                      </td>
                                  </tr>
                              )}
                          </tbody>
                      </table>
                  </div>
              </div>
          )}
        </div>
      </div>
    </div>
  );
};

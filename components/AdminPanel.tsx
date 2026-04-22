import React, { useState, useEffect } from 'react';
import { Shield, UserPlus, Users, ToggleLeft, ToggleRight, Loader2, AlertCircle, CheckCircle, CheckSquare, Key, X, Eye, EyeOff, Edit } from 'lucide-react';
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
  const [isExpenseMarkPaidEnabled, setIsExpenseMarkPaidEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // New states for individual password/email reset
  const [resettingUser, setResettingUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // New states for data migration
  const [showMigrateModal, setShowMigrateModal] = useState(false);
  const [migrateSourceId, setMigrateSourceId] = useState('');
  const [migrateTargetId, setMigrateTargetId] = useState('');
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrateSuccess, setMigrateSuccess] = useState(false);
  const [migrateError, setMigrateError] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  // Limpa mensagens locais ao abrir o modal para um novo usuário
  useEffect(() => {
    if (resettingUser) {
      setNewPassword('');
      setConfirmPassword('');
      setShowNewPassword(false);
      setShowConfirmPassword(false);
      setModalError(null);
      setResetSuccess(false);
    }
  }, [resettingUser]);

  const loadSettings = async () => {
    try {
      const [enabled, expenseMarkPaidEnabled] = await Promise.all([
        authService.isPublicRegistrationEnabled(),
        authService.isExpenseMarkPaidEnabled()
      ]);
      setIsPublicRegistration(enabled);
      setIsExpenseMarkPaidEnabled(expenseMarkPaidEnabled);
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
          setUsers(data || []);
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

  const handleToggleExpenseMarkPaid = async () => {
    setIsLoading(true);
    setMessage(null);
    try {
      const newValue = !isExpenseMarkPaidEnabled;
      await authService.toggleExpenseMarkPaid(newValue);
      setIsExpenseMarkPaidEnabled(newValue);
      setMessage({ 
        text: `Opção "Marcar como Pago" nas Despesas ${newValue ? 'HABILITADA' : 'DESABILITADA'} com sucesso.`, 
        type: 'success' 
      });
    } catch (e: any) {
      setMessage({ text: e.message || 'Erro ao alterar configuração.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdminResetPassword = async () => {
    if (!resettingUser) return;
    
    // Valida se digitou uma nova senha
    if (!newPassword || newPassword.length === 0) {
      setModalError('Por favor, informe a nova senha.');
      return;
    }
    
    if (newPassword.length < 6) {
      setModalError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setModalError('As senhas não coincidem. Verifique se digitou corretamente.');
      return;
    }

    setIsResetting(true);
    setModalError(null);
    try {
      await authService.adminUpdateUserPassword(resettingUser.id, newPassword);
      setResetSuccess(true);
      
      // Feedback no painel principal também
      setMessage({ text: `Senha de ${resettingUser.name} alterada com sucesso!`, type: 'success' });
      
      const isSelfReset = currentUser && currentUser.id === resettingUser.id;

      // Fecha o modal após um delay para o usuário ver o sucesso
      setTimeout(() => {
        setResettingUser(null);
        setNewPassword('');
        setConfirmPassword('');
        setShowNewPassword(false);
        setShowConfirmPassword(false);
        setResetSuccess(false);

        if (isSelfReset && newPassword) {
            authService.logout();
            window.location.reload();
        }
      }, 1500);
    } catch (e: any) {
      const errMsg = e.message || '';
      if (errMsg.includes('Invalid token')) {
          setModalError('Sua sessão expirou ou foi invalidada. Pressione a tecla F5 para recarregar ou faça o login novamente.');
      } else if (errMsg.includes('Database error') || errMsg.includes('loading user') || errMsg.includes('corrompido')) {
          setModalError('Este usuário (membro) possui um problema no provedor de autenticação (não encontrado ou corrompido). Exclua-o e crie outro membro.');
      } else {
          setModalError(errMsg || 'Erro ao alterar dados do usuário.');
      }
    } finally {
      setIsResetting(false);
    }
  };

  const handleAdminMigrateData = async () => {
    if (!migrateSourceId || !migrateTargetId) {
      setMigrateError('Selecione ambos os perfis (Origem e Destino).');
      return;
    }
    if (migrateSourceId === migrateTargetId) {
      setMigrateError('O usuário de Origem e Destino não podem ser o mesmo.');
      return;
    }

    setIsMigrating(true);
    setMigrateError(null);
    try {
      await authService.adminMigrateData(migrateSourceId, migrateTargetId);
      setMigrateSuccess(true);
      
      setMessage({ text: `Dados transferidos com sucesso!`, type: 'success' });
      
      setTimeout(() => {
        setShowMigrateModal(false);
        setMigrateSourceId('');
        setMigrateTargetId('');
        setMigrateSuccess(false);
      }, 2000);
    } catch (e: any) {
      setMigrateError(e.message || 'Erro ao transferir dados.');
    } finally {
      setIsMigrating(false);
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
    <>
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

            {/* Card de Migração de Dados */}
            <div className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-orange-100 text-orange-600 p-2 rounded-lg">
                  <AlertCircle size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800">Transferir Dados</h3>
                  <p className="text-sm text-gray-500">Migrar transações entre perfis</p>
                </div>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                Transfira todas as configurações e transações de um perfil com erro para um novo membro.
              </p>
              <button 
                onClick={() => {
                  if (!showUserList) loadUsers();
                  setShowMigrateModal(true);
                }}
                className="w-full py-2 bg-white border border-orange-200 text-orange-700 hover:bg-orange-50 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                Ferramenta de Migração
              </button>
            </div>

            {/* Card de Configuração de Despesas */}
            <div className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${isExpenseMarkPaidEnabled ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                    <CheckSquare size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800">Botão "Marcar como Pago"</h3>
                    <p className="text-sm text-gray-500">Habilitar botão de pagamento rápido nas Despesas</p>
                  </div>
                </div>
                <button 
                  onClick={handleToggleExpenseMarkPaid}
                  disabled={isLoading}
                  className={`text-2xl transition-colors focus:outline-none ${isExpenseMarkPaidEnabled ? 'text-blue-500 hover:text-blue-600' : 'text-gray-300 hover:text-gray-400'}`}
                >
                  {isLoading ? <Loader2 size={24} className="animate-spin text-purple-600" /> : (
                    isExpenseMarkPaidEnabled ? <ToggleRight size={40} /> : <ToggleLeft size={40} />
                  )}
                </button>
              </div>
              
              <div className={`text-sm p-3 rounded-lg ${isExpenseMarkPaidEnabled ? 'bg-blue-50 text-blue-800' : 'bg-gray-50 text-gray-600'}`}>
                Status: <strong>{isExpenseMarkPaidEnabled ? 'HABILITADO' : 'DESABILITADO'}</strong>
                <p className="mt-1 text-xs opacity-80">
                  {isExpenseMarkPaidEnabled 
                    ? 'O botão de "Marcar como Pago" aparecerá na lista de Despesas.' 
                    : 'Apenas a edição completa da despesa permitirá alterar o status.'}
                </p>
              </div>
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
                                  <th className="px-6 py-3 text-center">Ações</th>
                              </tr>
                          </thead>
                          <tbody>
                              {users.map((u) => (
                                  <tr key={u.id} className="bg-white border-b border-gray-50 hover:bg-gray-50">
                                      <td className="px-6 py-4 font-medium text-gray-900">
                                        <div className="flex flex-col">
                                          <span>{u.name}</span>
                                          <span className={`w-fit px-2 py-0.5 mt-1 rounded-full text-[10px] font-bold ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                                              {u.role === 'admin' ? 'ADMIN' : 'USUÁRIO'}
                                          </span>
                                        </div>
                                      </td>
                                      <td className="px-6 py-4 text-gray-500">{u.email}</td>
                                      <td className="px-6 py-4 text-center">
                                          <button 
                                            onClick={() => setResettingUser(u)}
                                            className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                            title="Alterar Senha"
                                          >
                                            <Key size={18} />
                                          </button>
                                      </td>
                                  </tr>
                              ))}
                              {users.length === 0 && (
                                  <tr>
                                      <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                                          Nenhum usuário encontrado.
                                      </td>
                                  </tr>
                              )}
                          </tbody>
                      </table>
                  </div>
              </div>
          )}

          {/* Modal de Reset de Senha */}
        </div>
      </div>
      </div>
      {resettingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[9999]">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl animate-scale-in">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-purple-100 p-2 rounded-lg text-purple-600">
                  <Key size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Alterar Senha</h3>
                  <p className="text-xs text-gray-500">Para: {resettingUser.name}</p>
                </div>
              </div>
              <button 
                onClick={() => setResettingUser(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6">
              {modalError && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 border border-red-100 rounded-lg text-sm flex items-center gap-2 animate-shake">
                  <AlertCircle size={16} />
                  {modalError}
                </div>
              )}

              {resetSuccess && (
                 <div className="mb-4 p-3 bg-green-50 text-green-700 border border-green-100 rounded-lg text-sm flex items-center gap-2 animate-bounce-in">
                    <CheckCircle size={16} />
                    Senha alterada com sucesso!
                 </div>
              )}

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nova Senha
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    disabled={isResetting || resetSuccess}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all disabled:bg-gray-50 disabled:text-gray-400 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                    disabled={isResetting || resetSuccess}
                  >
                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirmar Nova Senha
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita a nova senha"
                    disabled={isResetting || resetSuccess}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all disabled:bg-gray-50 disabled:text-gray-400 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                    disabled={isResetting || resetSuccess}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <p className="mt-2 text-xs text-gray-500 italic">
                Atenção: A alteração de senha é imediata e irreversível.
              </p>
            </div>

            <div className="p-6 bg-gray-50 rounded-b-xl flex gap-3">
              <button
                onClick={() => setResettingUser(null)}
                disabled={isResetting || resetSuccess}
                className="flex-1 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              >
                {resetSuccess ? 'Fechar' : 'Cancelar'}
              </button>
              <button
                onClick={handleAdminResetPassword}
                disabled={isResetting || resetSuccess || !newPassword}
                className={`flex-1 py-2 text-white font-medium rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${resetSuccess ? 'bg-green-600 hover:bg-green-700' : 'bg-purple-600 hover:bg-purple-700'}`}
              >
                {isResetting ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : resetSuccess ? (
                  <CheckCircle size={18} />
                ) : (
                  <Key size={18} />
                )}
                {resetSuccess ? 'Concluído!' : 'Alterar Senha'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal Profile Transfer */}
      {showMigrateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100 flex flex-col max-h-[90vh]">
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4 flex justify-between items-center shrink-0">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <AlertCircle size={24} />
                Transferir Dados ("Migração")
              </h2>
              <button 
                onClick={() => {
                  setShowMigrateModal(false);
                  setMigrateError(null);
                  setMigrateSourceId('');
                  setMigrateTargetId('');
                }}
                className="text-white/80 hover:text-white transition-colors p-1 rounded-full hover:bg-white/20"
                disabled={isMigrating}
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
              <p className="text-gray-600 mb-6 text-sm">
                Utilize esta ferramenta para mover <strong>todas as despesas, categorias e análises</strong> de um membro antigo ou corrompido para uma nova conta recém-criada. O processo é irreversível.
              </p>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    1. Perfil de Origem (Aquele que tem os dados)
                  </label>
                  <select
                    value={migrateSourceId}
                    onChange={(e) => setMigrateSourceId(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                    disabled={isMigrating || migrateSuccess}
                  >
                    <option value="">-- Selecione o perfil de origem --</option>
                    {users.map(u => (
                      <option key={`source-${u.id}`} value={u.id}>
                        {u.name} ({u.email || 'Sem e-mail'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-center p-2 text-gray-400">
                  <AlertCircle size={20} className="rotate-180 transform" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    2. Perfil de Destino (Para onde enviar os dados)
                  </label>
                  <select
                    value={migrateTargetId}
                    onChange={(e) => setMigrateTargetId(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                    disabled={isMigrating || migrateSuccess}
                  >
                    <option value="">-- Selecione o perfil NOVO --</option>
                    {users.map(u => (
                      <option key={`target-${u.id}`} value={u.id}>
                        {u.name} ({u.email || 'Sem e-mail'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {migrateError && (
                <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm rounded-r-lg">
                  {migrateError}
                </div>
              )}
            </div>

            <div className="p-4 border-t bg-gray-50 flex flex-col sm:flex-row gap-3 shrink-0">
              <button
                onClick={() => setShowMigrateModal(false)}
                disabled={isMigrating}
                className="w-full sm:flex-1 py-2.5 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-100 transition-colors text-sm"
              >
                {migrateSuccess ? 'Fechar' : 'Cancelar'}
              </button>
              <button
                onClick={handleAdminMigrateData}
                disabled={isMigrating || migrateSuccess || !migrateSourceId || !migrateTargetId}
                className={`w-full sm:flex-1 py-2.5 text-white font-medium rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm ${migrateSuccess ? 'bg-green-600 hover:bg-green-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
              >
                {isMigrating ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : migrateSuccess ? (
                  <CheckCircle size={18} />
                ) : (
                  <AlertCircle size={18} />
                )}
                {migrateSuccess ? 'Transferência Concluída!' : 'Iniciar Transferência'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

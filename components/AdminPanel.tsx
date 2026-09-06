import React, { useState, useEffect, useMemo } from 'react';
import { Shield, UserPlus, Users, ToggleLeft, ToggleRight, Loader2, AlertCircle, CheckCircle, CheckSquare, Key, X, Eye, EyeOff, Edit, Calendar, ShieldCheck, User as UserIcon, Search, Filter, ArrowUpDown, ArrowUp, ArrowDown, GitBranch, Crown, ChevronDown, ChevronUp, CornerDownRight, Share2 } from 'lucide-react';
import { authService } from '../services/authService';
import { User } from '../types';

interface AdminPanelProps {
  currentUser: User;
}

type SortField = 'name' | 'email' | 'role' | 'createdAt';
type SortDirection = 'asc' | 'desc';

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

  // New states for role update
  const [editingRoleUser, setEditingRoleUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState<'admin' | 'user'>('user');
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [roleSuccess, setRoleSuccess] = useState(false);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'user' | 'member'>('all');

  // Sorting state
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Tabs for user list: 'table' (Todos os Usuários) ou 'hierarchy' (Contas Pai e Filhos)
  const [userListTab, setUserListTab] = useState<'table' | 'hierarchy'>('table');
  const [hierarchyFilter, setHierarchyFilter] = useState<'all' | 'with_members'>('all');
  const [collapsedParents, setCollapsedParents] = useState<Record<string, boolean>>({});

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

  const formatRegistrationDate = (dateString?: string) => {
    if (!dateString) return { date: 'Não informada', time: '' };
    try {
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return { date: dateString, time: '' };
      const date = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d);
      const time = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(d);
      return { date, time: `${time}h` };
    } catch {
      return { date: dateString, time: '' };
    }
  };

  const handleUpdateRole = async () => {
    if (!editingRoleUser) return;
    setIsUpdatingRole(true);
    setRoleError(null);
    try {
      await authService.updateUserRole(editingRoleUser.id, selectedRole);
      setRoleSuccess(true);
      setUsers(prev => prev.map(u => u.id === editingRoleUser.id ? { ...u, role: selectedRole } : u));
      setMessage({
        text: `Nível de acesso de ${editingRoleUser.name} alterado para ${selectedRole === 'admin' ? 'Administrador' : 'Usuário Padrão'} com sucesso!`,
        type: 'success'
      });
      setTimeout(() => {
        setEditingRoleUser(null);
        setRoleSuccess(false);
      }, 1400);
    } catch (e: any) {
      setRoleError(e.message || 'Erro ao alterar nível de acesso.');
    } finally {
      setIsUpdatingRole(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch = !searchTerm.trim() || 
      (u.name && u.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    if (roleFilter === 'admin') return u.role === 'admin';
    if (roleFilter === 'user') return u.role !== 'admin' && !u.parentId;
    if (roleFilter === 'member') return !!u.parentId;

    return true;
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection(field === 'createdAt' ? 'desc' : 'asc');
    }
  };

  const sortedUsers = useMemo(() => {
    return [...filteredUsers].sort((a, b) => {
      let result = 0;
      if (sortField === 'name') {
        const nameA = (a.name || '').trim().toLowerCase();
        const nameB = (b.name || '').trim().toLowerCase();
        result = nameA.localeCompare(nameB, 'pt-BR');
      } else if (sortField === 'email') {
        const emailA = (a.email || '').trim().toLowerCase();
        const emailB = (b.email || '').trim().toLowerCase();
        result = emailA.localeCompare(emailB, 'pt-BR');
      } else if (sortField === 'role') {
        // Hierarchy: Admin (1) -> Usuário Padrão (2) -> Membro Vinculado (3)
        const getRoleWeight = (u: User) => {
          if (u.role === 'admin') return 1;
          if (!u.parentId) return 2;
          return 3;
        };
        result = getRoleWeight(a) - getRoleWeight(b);
        if (result === 0) {
          result = (a.name || '').localeCompare(b.name || '', 'pt-BR');
        }
      } else if (sortField === 'createdAt') {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        result = timeA - timeB;
      }

      return sortDirection === 'asc' ? result : -result;
    });
  }, [filteredUsers, sortField, sortDirection]);

  const renderSortHeader = (label: string, field: SortField) => {
    const isActive = sortField === field;
    return (
      <button
        type="button"
        onClick={() => handleSort(field)}
        className={`group inline-flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider transition-colors hover:text-purple-700 select-none py-1 rounded focus:outline-none focus:ring-2 focus:ring-purple-500/20 ${
          isActive ? 'text-purple-700 font-extrabold' : 'text-gray-600'
        }`}
        title={`Clique para ordenar por ${label} (${isActive && sortDirection === 'asc' ? 'Decrescente' : 'Crescente'})`}
      >
        <span>{label}</span>
        <span
          className={`p-1 rounded transition-colors ${
            isActive ? 'bg-purple-100 text-purple-700' : 'text-gray-400 group-hover:text-purple-600 group-hover:bg-purple-50'
          }`}
        >
          {isActive ? (
            sortDirection === 'asc' ? <ArrowUp size={13} className="stroke-[2.5]" /> : <ArrowDown size={13} className="stroke-[2.5]" />
          ) : (
            <ArrowUpDown size={12} className="opacity-40 group-hover:opacity-100" />
          )}
        </span>
      </button>
    );
  };

  // Agrupamento de Contas Pai (Principais) e Filhos (Membros)
  const familyData = useMemo(() => {
    // Conta Pai: usuário que não possui parentId
    const parents = users.filter(u => !u.parentId);

    const groups = parents.map(parent => {
      const children = users.filter(u => u.parentId === parent.id);
      return {
        parent,
        children
      };
    });

    // Membros órfãos (possuem parentId mas a conta pai não está na lista)
    const orphanChildren = users.filter(u => u.parentId && !users.some(p => p.id === u.parentId));

    return {
      groups,
      orphanChildren,
      totalParents: parents.length,
      totalChildren: users.filter(u => !!u.parentId).length,
      parentsWithChildrenCount: groups.filter(g => g.children.length > 0).length
    };
  }, [users]);

  // Filtro e Ordenação das Contas Pai e Filhos
  const filteredFamilyGroups = useMemo(() => {
    let result = familyData.groups;

    // Filtro por ter membros vinculados
    if (hierarchyFilter === 'with_members') {
      result = result.filter(g => g.children.length > 0);
    }

    // Filtro por termo de busca (busca no pai ou nos filhos)
    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase().trim();
      result = result.filter(g => {
        const parentMatch = 
          (g.parent.name && g.parent.name.toLowerCase().includes(query)) ||
          (g.parent.email && g.parent.email.toLowerCase().includes(query));
        
        const childMatch = g.children.some(c => 
          (c.name && c.name.toLowerCase().includes(query)) ||
          (c.email && c.email.toLowerCase().includes(query))
        );

        return parentMatch || childMatch;
      });
    }

    // Ordenação: contas com mais membros primeiro, depois ordem alfabética por nome
    return [...result].sort((a, b) => {
      if (b.children.length !== a.children.length) {
        return b.children.length - a.children.length;
      }
      return (a.parent.name || '').localeCompare(b.parent.name || '', 'pt-BR');
    });
  }, [familyData, hierarchyFilter, searchTerm]);

  const toggleCollapseParent = (parentId: string) => {
    setCollapsedParents(prev => ({
      ...prev,
      [parentId]: !prev[parentId]
    }));
  };

  const handleExpandAll = () => {
    setCollapsedParents({});
  };

  const handleCollapseAll = () => {
    const allCollapsed: Record<string, boolean> = {};
    familyData.groups.forEach(g => {
      allCollapsed[g.parent.id] = true;
    });
    setCollapsedParents(allCollapsed);
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
              <div className="border border-gray-200 rounded-xl overflow-hidden animate-fade-in shadow-xs bg-white">
                  {/* Seletor de Abas de Visualização */}
                  <div className="bg-gray-100/90 px-6 pt-3 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setUserListTab('table')}
                          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer ${
                            userListTab === 'table'
                              ? 'border-purple-600 text-purple-700 bg-white rounded-t-lg shadow-2xs'
                              : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-white/50 rounded-t-lg'
                          }`}
                        >
                          <Users size={16} />
                          <span>Todos os Usuários</span>
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            userListTab === 'table' ? 'bg-purple-100 text-purple-700' : 'bg-gray-200 text-gray-600'
                          }`}>
                            {users.length}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setUserListTab('hierarchy')}
                          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer ${
                            userListTab === 'hierarchy'
                              ? 'border-purple-600 text-purple-700 bg-white rounded-t-lg shadow-2xs'
                              : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-white/50 rounded-t-lg'
                          }`}
                        >
                          <GitBranch size={16} />
                          <span>Contas Pai e Filhos (Membros)</span>
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            userListTab === 'hierarchy' ? 'bg-purple-100 text-purple-700' : 'bg-gray-200 text-gray-600'
                          }`}>
                            {familyData.totalChildren} {familyData.totalChildren === 1 ? 'filho' : 'filhos'}
                          </span>
                        </button>
                      </div>

                      <div className="text-xs text-gray-500 pb-2 hidden sm:block">
                        {userListTab === 'table' 
                          ? 'Visão tabular de todas as contas cadastradas' 
                          : 'Visão simples de contas principais (pai) e seus membros vinculados (filhos)'}
                      </div>
                  </div>

                  {userListTab === 'table' ? (
                    <div>
                      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div>
                            <h3 className="font-bold text-gray-800 flex items-center gap-2">
                              <Users size={18} className="text-purple-600" />
                              Usuários Cadastrados ({sortedUsers.length}{sortedUsers.length !== users.length ? ` de ${users.length}` : ''})
                            </h3>
                            <p className="text-xs text-gray-500 mt-0.5">
                              Clique nas colunas para ordenar • Ordenado por{' '}
                              <span className="font-semibold text-purple-700">
                                {sortField === 'name' ? 'Nome' : sortField === 'email' ? 'Email' : sortField === 'role' ? 'Nível de Acesso' : 'Data do Cadastro'}
                              </span>{' '}
                              ({sortDirection === 'asc' ? 'Crescente' : 'Decrescente'})
                            </p>
                          </div>

                          {/* Busca e Filtros */}
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="relative">
                              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                              <input
                                type="text"
                                placeholder="Buscar por nome ou e-mail..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-8 pr-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 w-48 sm:w-56"
                              />
                            </div>

                            <select
                              value={roleFilter}
                              onChange={(e) => setRoleFilter(e.target.value as any)}
                              className="px-2.5 py-1.5 text-xs bg-white border border-gray-200 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-medium"
                            >
                              <option value="all">Todos os Níveis</option>
                              <option value="admin">Apenas Administradores</option>
                              <option value="user">Usuários Padrão</option>
                              <option value="member">Membros Vinculados</option>
                            </select>
                          </div>
                      </div>

                      <div className="overflow-x-auto">
                          <table className="w-full text-sm text-left">
                              <thead className="text-xs uppercase bg-gray-50/80 border-b border-gray-200">
                                  <tr>
                                      <th className="px-6 py-3.5">
                                        {renderSortHeader('Nome / Usuário', 'name')}
                                      </th>
                                      <th className="px-6 py-3.5">
                                        {renderSortHeader('Email', 'email')}
                                      </th>
                                      <th className="px-6 py-3.5">
                                        {renderSortHeader('Nível de Acesso', 'role')}
                                      </th>
                                      <th className="px-6 py-3.5">
                                        {renderSortHeader('Data do Cadastro', 'createdAt')}
                                      </th>
                                      <th className="px-6 py-3.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        Ações
                                      </th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                  {sortedUsers.map((u) => {
                                      const regInfo = formatRegistrationDate(u.createdAt);
                                      const isAdmin = u.role === 'admin';
                                      const isMember = !!u.parentId;
                                      const isCurrentUser = currentUser.id === u.id;

                                      return (
                                        <tr key={u.id} className="bg-white hover:bg-gray-50/70 transition-colors">
                                            {/* Usuário / Nome */}
                                            <td className="px-6 py-4 font-medium text-gray-900">
                                              <div className="flex items-center gap-3">
                                                <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                                                  isAdmin 
                                                    ? 'bg-purple-100 text-purple-700 border border-purple-200' 
                                                    : isMember 
                                                    ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                                                    : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                                }`}>
                                                  {u.name ? u.name.charAt(0).toUpperCase() : '?'}
                                                </div>
                                                <div>
                                                  <div className="flex items-center gap-1.5 font-semibold text-gray-900">
                                                    <span>{u.name}</span>
                                                    {isCurrentUser && (
                                                      <span className="text-[10px] bg-purple-50 text-purple-700 px-1.5 py-0.2 rounded font-semibold border border-purple-200">
                                                        Você
                                                      </span>
                                                    )}
                                                  </div>
                                                  <span className="text-[11px] text-gray-400 font-mono">ID: {u.id.slice(0, 8)}...</span>
                                                </div>
                                              </div>
                                            </td>

                                            {/* Email */}
                                            <td className="px-6 py-4 text-gray-600 text-xs font-mono">
                                              {u.email || <span className="text-gray-400 italic">Sem e-mail informado</span>}
                                            </td>

                                            {/* Nível de Acesso */}
                                            <td className="px-6 py-4">
                                              <div className="flex flex-col items-start gap-1">
                                                {isAdmin ? (
                                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200 shadow-2xs">
                                                    <Shield size={12} className="text-purple-600" />
                                                    Administrador
                                                  </span>
                                                ) : isMember ? (
                                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                                    <Users size={12} className="text-blue-500" />
                                                    Membro Vinculado
                                                  </span>
                                                ) : (
                                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                    <UserIcon size={12} className="text-emerald-600" />
                                                    Usuário Padrão
                                                  </span>
                                                )}

                                                {/* Badge do Plano */}
                                                {u.plan === 'premium' ? (
                                                  <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 inline-flex items-center gap-1">
                                                    ⭐ Plano Premium
                                                  </span>
                                                ) : (
                                                  <span className="text-[10px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                                    Plano Gratuito
                                                  </span>
                                                )}
                                              </div>
                                            </td>

                                            {/* Data do Cadastro */}
                                            <td className="px-6 py-4">
                                              <div className="flex items-start gap-2 text-gray-700">
                                                <Calendar size={14} className="text-gray-400 mt-0.5 shrink-0" />
                                                <div>
                                                  <div className="font-medium text-xs text-gray-800">{regInfo.date}</div>
                                                  {regInfo.time && (
                                                    <div className="text-[11px] text-gray-400 font-mono">às {regInfo.time}</div>
                                                  )}
                                                </div>
                                              </div>
                                            </td>

                                            {/* Ações */}
                                            <td className="px-6 py-4 text-center">
                                              <div className="flex items-center justify-center gap-1">
                                                <button 
                                                  onClick={() => {
                                                    setEditingRoleUser(u);
                                                    setSelectedRole(u.role || 'user');
                                                    setRoleError(null);
                                                    setRoleSuccess(false);
                                                  }}
                                                  className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors border border-transparent hover:border-purple-200"
                                                  title="Alterar Nível de Acesso (Administrador / Usuário)"
                                                >
                                                  <ShieldCheck size={18} />
                                                </button>
                                                <button 
                                                  onClick={() => setResettingUser(u)}
                                                  className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors border border-transparent hover:border-purple-200"
                                                  title="Alterar Senha"
                                                >
                                                  <Key size={18} />
                                                </button>
                                              </div>
                                            </td>
                                        </tr>
                                      );
                                  })}
                                  {sortedUsers.length === 0 && (
                                      <tr>
                                          <td colSpan={5} className="px-6 py-10 text-center text-gray-500">
                                              <div className="flex flex-col items-center justify-center gap-2">
                                                <Users size={32} className="text-gray-300" />
                                                <span className="font-medium">Nenhum usuário encontrado com os filtros atuais.</span>
                                              </div>
                                          </td>
                                      </tr>
                                  )}
                              </tbody>
                          </table>
                      </div>
                    </div>
                  ) : (
                    /* Nova Aba: Hierarquia das Contas Pai e Filhos (Membros) */
                    <div>
                      {/* Barra Superior com Métricas e Controles */}
                      <div className="p-5 sm:p-6 bg-gray-50/70 border-b border-gray-200">
                        {/* Mini Cards de Resumo */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                          <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                              <Crown size={20} />
                            </div>
                            <div>
                              <div className="text-xs text-gray-500 font-medium">Contas Pai (Principais)</div>
                              <div className="text-xl font-bold text-gray-900">{familyData.totalParents}</div>
                            </div>
                          </div>

                          <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                              <Users size={20} />
                            </div>
                            <div>
                              <div className="text-xs text-gray-500 font-medium">Filhos (Membros Vinculados)</div>
                              <div className="text-xl font-bold text-gray-900">{familyData.totalChildren}</div>
                            </div>
                          </div>

                          <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                              <GitBranch size={20} />
                            </div>
                            <div>
                              <div className="text-xs text-gray-500 font-medium">Contas com Filhos</div>
                              <div className="text-xl font-bold text-gray-900">{familyData.parentsWithChildrenCount}</div>
                            </div>
                          </div>
                        </div>

                        {/* Barra de Busca e Filtros */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="relative">
                              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                              <input
                                type="text"
                                placeholder="Buscar pai ou filho por nome ou email..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-8 pr-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 w-56 sm:w-72"
                              />
                            </div>

                            <select
                              value={hierarchyFilter}
                              onChange={(e) => setHierarchyFilter(e.target.value as any)}
                              className="px-2.5 py-1.5 text-xs bg-white border border-gray-200 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-medium"
                            >
                              <option value="all">Todas as Contas Pai ({familyData.totalParents})</option>
                              <option value="with_members">Apenas com Filhos/Membros ({familyData.parentsWithChildrenCount})</option>
                            </select>
                          </div>

                          <div className="flex items-center gap-2 text-xs">
                            <button
                              type="button"
                              onClick={handleExpandAll}
                              className="px-3 py-1.5 text-gray-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg border border-gray-200 transition-colors font-medium bg-white"
                            >
                              Expandir Todos
                            </button>
                            <button
                              type="button"
                              onClick={handleCollapseAll}
                              className="px-3 py-1.5 text-gray-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg border border-gray-200 transition-colors font-medium bg-white"
                            >
                              Recolher Todos
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Lista de Contas Pai e Filhos */}
                      <div className="p-5 sm:p-6 space-y-4 bg-gray-50/30">
                        {filteredFamilyGroups.map((group) => {
                          const parentReg = formatRegistrationDate(group.parent.createdAt);
                          const isParentAdmin = group.parent.role === 'admin';
                          const isParentCurrentUser = currentUser.id === group.parent.id;
                          const isCollapsed = !!collapsedParents[group.parent.id];
                          const hasChildren = group.children.length > 0;

                          return (
                            <div 
                              key={group.parent.id} 
                              className={`border rounded-xl transition-all duration-200 overflow-hidden bg-white shadow-xs ${
                                hasChildren ? 'border-purple-200/90' : 'border-gray-200'
                              }`}
                            >
                              {/* Cabeçalho da Conta Pai */}
                              <div className={`p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                                hasChildren ? 'bg-gradient-to-r from-purple-50/50 via-white to-white' : 'bg-white'
                              }`}>
                                <div className="flex items-start sm:items-center gap-3.5">
                                  {/* Avatar do Pai */}
                                  <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs ${
                                    isParentAdmin 
                                      ? 'bg-purple-600 text-white shadow-purple-200' 
                                      : 'bg-emerald-600 text-white shadow-emerald-200'
                                  }`}>
                                    {group.parent.name ? group.parent.name.charAt(0).toUpperCase() : '?'}
                                  </div>

                                  <div>
                                    <div className="flex flex-wrap items-center gap-2 mb-1">
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-800 border border-purple-200">
                                        <Crown size={11} className="text-purple-600" />
                                        Conta Pai (Principal)
                                      </span>

                                      {isParentAdmin ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                          <Shield size={10} />
                                          Admin
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                          <UserIcon size={10} />
                                          Usuário Padrão
                                        </span>
                                      )}

                                      {group.parent.plan === 'premium' ? (
                                        <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                                          ⭐ Premium
                                        </span>
                                      ) : (
                                        <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.2 rounded">
                                          Gratuito
                                        </span>
                                      )}

                                      {isParentCurrentUser && (
                                        <span className="text-[10px] bg-purple-50 text-purple-700 px-1.5 py-0.2 rounded font-semibold border border-purple-200">
                                          Sua Conta
                                        </span>
                                      )}
                                    </div>

                                    <div className="text-base font-bold text-gray-900 flex items-center gap-2">
                                      <span>{group.parent.name}</span>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 mt-0.5">
                                      <span className="font-mono text-gray-600">{group.parent.email || 'Sem e-mail'}</span>
                                      <span className="text-gray-300">•</span>
                                      <span className="flex items-center gap-1 text-gray-500">
                                        <Calendar size={12} className="text-gray-400" />
                                        Cadastro: {parentReg.date} {parentReg.time && `(${parentReg.time})`}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Lado Direito: Badge de Filhos e Ações */}
                                <div className="flex items-center justify-between md:justify-end gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-gray-100">
                                  <div>
                                    {hasChildren ? (
                                      <button
                                        type="button"
                                        onClick={() => toggleCollapseParent(group.parent.id)}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100/70 transition-colors cursor-pointer"
                                      >
                                        <Users size={14} className="text-blue-600" />
                                        <span>{group.children.length} {group.children.length === 1 ? 'filho vinculado' : 'filhos vinculados'}</span>
                                        {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                                      </button>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-100 text-gray-500">
                                        Sem membros vinculados
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-1">
                                    <button 
                                      onClick={() => {
                                        setEditingRoleUser(group.parent);
                                        setSelectedRole(group.parent.role || 'user');
                                        setRoleError(null);
                                        setRoleSuccess(false);
                                      }}
                                      className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors border border-transparent hover:border-purple-200"
                                      title="Alterar Nível de Acesso da Conta Pai"
                                    >
                                      <ShieldCheck size={18} />
                                    </button>
                                    <button 
                                      onClick={() => setResettingUser(group.parent)}
                                      className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors border border-transparent hover:border-purple-200"
                                      title="Alterar Senha da Conta Pai"
                                    >
                                      <Key size={18} />
                                    </button>
                                  </div>
                                </div>
                              </div>

                              {/* Lista de Filhos (Membros vinculados) */}
                              {hasChildren && !isCollapsed && (
                                <div className="px-4 pb-4 pt-1 bg-purple-50/20 border-t border-purple-100">
                                  <div className="ml-2 sm:ml-5 pl-3 sm:pl-4 border-l-2 border-purple-300 space-y-2.5 pt-3">
                                    <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                                      <Users size={13} className="text-blue-600" />
                                      <span>Membros da Família ({group.children.length})</span>
                                    </div>

                                    {group.children.map((child) => {
                                      const childReg = formatRegistrationDate(child.createdAt);
                                      const isChildAdmin = child.role === 'admin';
                                      const isChildCurrentUser = currentUser.id === child.id;
                                      const sharesFinance = (child.dataContextId === group.parent.dataContextId) || (child.dataContextId === group.parent.id);

                                      return (
                                        <div 
                                          key={child.id}
                                          className="bg-white rounded-lg p-3 sm:p-3.5 border border-gray-200 shadow-2xs hover:border-blue-300 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                                        >
                                          <div className="flex items-start sm:items-center gap-3">
                                            <CornerDownRight size={16} className="text-purple-400 mt-1 sm:mt-0 shrink-0" />
                                            
                                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0 border border-blue-200">
                                              {child.name ? child.name.charAt(0).toUpperCase() : '?'}
                                            </div>

                                            <div>
                                              <div className="flex flex-wrap items-center gap-2">
                                                <span className="font-semibold text-gray-900 text-sm">{child.name}</span>
                                                
                                                <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                                  Filho (Membro)
                                                </span>

                                                {isChildAdmin && (
                                                  <span className="text-[10px] font-bold bg-purple-50 text-purple-700 px-1.5 py-0.2 rounded border border-purple-200">
                                                    Admin
                                                  </span>
                                                )}

                                                {isChildCurrentUser && (
                                                  <span className="text-[10px] bg-purple-50 text-purple-700 px-1.5 py-0.2 rounded font-semibold border border-purple-200">
                                                    Você
                                                  </span>
                                                )}
                                              </div>

                                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 mt-0.5">
                                                <span className="font-mono text-gray-600">{child.email || 'Sem e-mail'}</span>
                                                <span className="text-gray-300">•</span>
                                                <span className="text-gray-500">Cadastrado em {childReg.date}</span>
                                                <span className="text-gray-300">•</span>
                                                {sharesFinance ? (
                                                  <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                                                    <Share2 size={11} className="text-emerald-600" />
                                                    Compartilha dados com o Pai
                                                  </span>
                                                ) : (
                                                  <span className="text-[11px] text-gray-500">
                                                    Dados próprios
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                          </div>

                                          {/* Ações do Filho */}
                                          <div className="flex items-center justify-end gap-1 shrink-0 pt-1 sm:pt-0">
                                            <button 
                                              onClick={() => {
                                                setEditingRoleUser(child);
                                                setSelectedRole(child.role || 'user');
                                                setRoleError(null);
                                                setRoleSuccess(false);
                                              }}
                                              className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors border border-transparent hover:border-purple-200"
                                              title="Alterar Nível de Acesso do Membro"
                                            >
                                              <ShieldCheck size={16} />
                                            </button>
                                            <button 
                                              onClick={() => setResettingUser(child)}
                                              className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors border border-transparent hover:border-purple-200"
                                              title="Alterar Senha do Membro"
                                            >
                                              <Key size={16} />
                                            </button>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              {/* Mensagem se não tiver filhos */}
                              {!hasChildren && (
                                <div className="px-5 py-2.5 bg-gray-50/60 border-t border-gray-100 text-xs text-gray-400 flex items-center gap-2 italic">
                                  <Users size={13} className="text-gray-300" />
                                  <span>Nenhum membro (filho) vinculado a esta conta principal.</span>
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {/* Seção de Membros Órfãos (caso existam) */}
                        {familyData.orphanChildren.length > 0 && (
                          <div className="border border-amber-200 rounded-xl p-5 bg-amber-50/50 shadow-2xs mt-6">
                            <div className="flex items-center gap-2 text-amber-800 font-bold text-sm mb-1">
                              <AlertCircle size={16} className="text-amber-600" />
                              <span>Membros Vinculados com Conta Pai Não Encontrada ({familyData.orphanChildren.length})</span>
                            </div>
                            <p className="text-xs text-amber-700 mb-3">
                              Estes usuários possuem identificador de conta pai que não corresponde a nenhuma conta principal na listagem atual.
                            </p>
                            <div className="space-y-2">
                              {familyData.orphanChildren.map(orphan => (
                                <div key={orphan.id} className="bg-white p-3 rounded-lg border border-amber-200 flex items-center justify-between gap-3 text-xs">
                                  <div>
                                    <div className="font-semibold text-gray-800">{orphan.name}</div>
                                    <div className="text-gray-500 font-mono">{orphan.email}</div>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <button 
                                      onClick={() => {
                                        setEditingRoleUser(orphan);
                                        setSelectedRole(orphan.role || 'user');
                                        setRoleError(null);
                                        setRoleSuccess(false);
                                      }}
                                      className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg"
                                      title="Alterar Nível"
                                    >
                                      <ShieldCheck size={16} />
                                    </button>
                                    <button 
                                      onClick={() => setResettingUser(orphan)}
                                      className="p-1.5 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg"
                                      title="Alterar Senha"
                                    >
                                      <Key size={16} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {filteredFamilyGroups.length === 0 && (
                          <div className="py-12 text-center text-gray-500 bg-white rounded-xl border border-gray-200">
                            <Users size={36} className="mx-auto text-gray-300 mb-2" />
                            <div className="font-medium text-gray-700">Nenhuma conta encontrada.</div>
                            <p className="text-xs text-gray-400 mt-1">Tente ajustar o termo de pesquisa ou a opção de filtro.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
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

      {/* Modal de Alteração de Nível de Acesso */}
      {editingRoleUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-[9999] animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-scale-in">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-purple-50 to-indigo-50/50">
              <div className="flex items-center gap-3">
                <div className="bg-purple-600 p-2.5 rounded-xl text-white shadow-xs">
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">Alterar Nível de Acesso</h3>
                  <p className="text-xs text-gray-500 font-medium">Permissões de: {editingRoleUser.name}</p>
                </div>
              </div>
              <button 
                onClick={() => setEditingRoleUser(null)}
                disabled={isUpdatingRole}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="text-xs text-gray-500">
                Selecione o nível de permissão atribuído a <strong className="text-gray-800">{editingRoleUser.email || editingRoleUser.name}</strong>:
              </div>

              <div className="space-y-3">
                {/* Opção: Administrador */}
                <div
                  onClick={() => setSelectedRole('admin')}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3.5 ${
                    selectedRole === 'admin'
                      ? 'border-purple-600 bg-purple-50/50 shadow-xs'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/50'
                  }`}
                >
                  <div className={`p-2 rounded-lg mt-0.5 ${selectedRole === 'admin' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                    <Shield size={18} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-gray-900">Administrador</span>
                      {selectedRole === 'admin' && (
                        <span className="text-xs font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">Selecionado</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                      Acesso irrestrito a todas as configurações, painel administrativo, gerenciamento de usuários e migração de dados.
                    </p>
                  </div>
                </div>

                {/* Opção: Usuário Padrão */}
                <div
                  onClick={() => setSelectedRole('user')}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3.5 ${
                    selectedRole === 'user'
                      ? 'border-purple-600 bg-purple-50/50 shadow-xs'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/50'
                  }`}
                >
                  <div className={`p-2 rounded-lg mt-0.5 ${selectedRole === 'user' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                    <UserIcon size={18} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-gray-900">Usuário Padrão</span>
                      {selectedRole === 'user' && (
                        <span className="text-xs font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">Selecionado</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                      Acesso padrão ao controle das suas próprias despesas, receitas, cartões e membros dependentes vinculados.
                    </p>
                  </div>
                </div>
              </div>

              {/* Aviso se for alterar o próprio usuário logado */}
              {currentUser.id === editingRoleUser.id && selectedRole !== 'admin' && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-amber-800 text-xs">
                  <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Cuidado:</strong> Você está prestes a remover o privilégio de Administrador da sua própria conta. Você não terá mais acesso a este painel.
                  </span>
                </div>
              )}

              {/* Erro */}
              {roleError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 text-xs">
                  <AlertCircle size={16} className="text-red-500 shrink-0" />
                  <span>{roleError}</span>
                </div>
              )}

              {/* Sucesso */}
              {roleSuccess && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-xl flex items-center gap-2 text-green-700 text-xs">
                  <CheckCircle size={16} className="text-green-500 shrink-0" />
                  <span>Nível de acesso atualizado com sucesso!</span>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setEditingRoleUser(null)}
                disabled={isUpdatingRole}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-xl transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleUpdateRole}
                disabled={isUpdatingRole || roleSuccess || (editingRoleUser.role || 'user') === selectedRole}
                className="px-5 py-2 text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition-all shadow-xs flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUpdatingRole ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Salvando...
                  </>
                ) : roleSuccess ? (
                  <>
                    <CheckCircle size={16} />
                    Atualizado!
                  </>
                ) : (
                  'Salvar Nível'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

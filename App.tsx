
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Header } from './components/Header';
import { StatCard } from './components/Summary'; 
import { DespesaForm } from './components/DespesaForm';
import { Charts, EvolutionChart, CategoryEvolutionChart } from './components/Charts';
import { AIInsight } from './components/AIInsight';
import { CategoryManager } from './components/CategoryManager';
import { AccountsPayable } from './components/AccountsPayable';
import { ExpenseList } from './components/ExpenseList';
import { IncomeList } from './components/IncomeList';
import { BalanceByCategory } from './components/BalanceByCategory';
import { Toast } from './components/Toast';
import { ConfirmModal } from './components/ConfirmModal';
import { AuthScreen } from './components/AuthScreen';
import { MemberManager } from './components/MemberManager';
import { authService } from './services/authService';
import { dataService } from './services/dataService';
import { Despesa, TransactionType, TransactionStatus, Category, User } from './types';
import { formatCurrency, getCurrentLocalDateString } from './utils';
import { 
  ArrowUpCircle, 
  ArrowDownCircle, 
  DollarSign, 
  Percent, 
  Settings, 
  Eye, 
  EyeOff, 
  Calendar as CalendarIcon,
  Clock,
  ArrowUp,
  ArrowDown,
  Loader2,
  WifiOff
} from 'lucide-react';

type View = 'dashboard' | 'payable' | 'categories' | 'expenses' | 'income' | 'members';

// Definição dos Widgets Disponíveis
const AVAILABLE_WIDGETS = [
  { id: 'total_income', label: 'Receitas Totais', default: true },
  { id: 'total_expense', label: 'Despesas Totais', default: true },
  { id: 'balance', label: 'Saldo do Mês', default: true },
  { id: 'pending_expenses', label: 'Contas a Pagar', default: true },
  { id: 'savings_rate', label: 'Taxa de Economia', default: true },
  { id: 'balance_by_category', label: 'Saldo por Categoria', default: true }, 
  { id: 'evolution_chart', label: 'Evolução de Gastos', default: true },
  { id: 'category_evolution', label: 'Evolução por Categoria', default: true },
  { id: 'chart_expense', label: 'Gráfico: Despesas por Categoria', default: true },
  { id: 'chart_income', label: 'Gráfico: Receitas por Categoria', default: true },
  { id: 'ai_insight', label: 'Análise de Inteligência Artificial', default: true },
];

// Componente Interno Autenticado
const AuthenticatedApp: React.FC<{ user: User, onLogout: () => void, onUpdateUser: (u: User) => void }> = ({ user, onLogout, onUpdateUser }) => {
  const currentDate = new Date();
  
  // Storage Keys apenas para preferências de UI (Widgets), dados reais vêm do DB
  const STORAGE_KEY_WIDGETS = `dashboard_widgets_${user.id}`; 
  const STORAGE_KEY_ORDER = `dashboard_widget_order_${user.id}`; 

  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [loadingData, setLoadingData] = useState(true);
  const [connectionError, setConnectionError] = useState(false);
  
  // Dashboard Filters
  const [filterMonth, setFilterMonth] = useState(currentDate.getMonth());
  const [filterYear, setFilterYear] = useState(currentDate.getFullYear());
  const [isCustomizing, setIsCustomizing] = useState(false);

  // Widget Configuration State (Local Persisted)
  const [visibleWidgets, setVisibleWidgets] = useState<Record<string, boolean>>(() => {
    try {
        const saved = localStorage.getItem(STORAGE_KEY_WIDGETS);
        return saved ? JSON.parse(saved) : AVAILABLE_WIDGETS.reduce((acc, w) => ({ ...acc, [w.id]: w.default }), {});
    } catch { return {}; }
  });

  const [widgetOrder, setWidgetOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ORDER);
      if (saved) {
        const parsedOrder = JSON.parse(saved);
        const currentIds = AVAILABLE_WIDGETS.map(w => w.id);
        const mergedOrder = [...new Set([...parsedOrder, ...currentIds])].filter(id => currentIds.includes(id));
        return mergedOrder;
      }
    } catch (e) { }
    return AVAILABLE_WIDGETS.map(w => w.id);
  });

  const [isDespesaModalOpen, setIsDespesaModalOpen] = useState(false);
  const [editingDespesa, setEditingDespesa] = useState<Despesa | null>(null);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; isVisible: boolean }>({
    message: '',
    type: 'success',
    isVisible: false
  });

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  // DATA STATES
  const [categories, setCategories] = useState<Category[]>([]);
  const [despesas, setDespesas] = useState<Despesa[]>([]);

  // --- DATA FETCHING (SUPABASE) ---
  const loadData = useCallback(async () => {
    setLoadingData(true);
    setConnectionError(false);
    try {
        // 1. Busca Categorias e Transações em paralelo
        let [cats, trans] = await Promise.all([
            dataService.fetchCategories(user.dataContextId),
            dataService.fetchTransactions(user.dataContextId)
        ]);

        // 2. Se não houver categorias (primeiro acesso), popula com as iniciais
        if (cats.length === 0) {
            console.log("Banco vazio detectado. Populando categorias iniciais...");
            cats = await dataService.seedCategories(user.dataContextId);
            showToast('Banco de dados configurado com sucesso!', 'success');
        }
        
        setCategories(cats);
        setDespesas(trans);

    } catch (e: any) {
        console.error("Erro fatal ao carregar dados:", e);
        setConnectionError(true);
        showToast('Erro de conexão com o Supabase. Verifique suas chaves de API.', 'error');
    } finally {
        setLoadingData(false);
    }
  }, [user.dataContextId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // --- UI PERSISTENCE ---
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_WIDGETS, JSON.stringify(visibleWidgets));
  }, [visibleWidgets, STORAGE_KEY_WIDGETS]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_ORDER, JSON.stringify(widgetOrder));
  }, [widgetOrder, STORAGE_KEY_ORDER]);

  // --- DERIVED STATE ---
  const dashboardData = useMemo(() => {
    const filtered = despesas.filter(t => {
      const [y, m] = t.date.split('-').map(Number);
      return (m - 1) === filterMonth && y === filterYear;
    });

    let income = 0;
    let expense = 0;
    let pending = 0;

    for (const t of filtered) {
        if (t.type === 'income' && t.status === 'paid') {
            income += t.amount;
        } else if (t.type === 'expense') {
            if (t.status === 'paid') {
                expense += t.amount;
            } else {
                pending += t.amount;
            }
        }
    }
    
    const total = income - expense;
    let savingsRate = 0;
    if (income > 0) {
      savingsRate = ((income - expense) / income) * 100;
    }

    return { income, expense, total, pending, savingsRate, filteredTransactions: filtered };
  }, [despesas, filterMonth, filterYear]);

  // --- HANDLERS ---
  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type, isVisible: true });
  }, []);

  const toggleWidget = useCallback((id: string) => {
    setVisibleWidgets(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const moveWidget = useCallback((index: number, direction: 'up' | 'down') => {
    setWidgetOrder(prev => {
        const newOrder = [...prev];
        const swapIndex = direction === 'up' ? index - 1 : index + 1;
        if (swapIndex < 0 || swapIndex >= newOrder.length) return prev;
        [newOrder[index], newOrder[swapIndex]] = [newOrder[swapIndex], newOrder[index]];
        return newOrder;
    });
  }, []);

  const closeConfirmModal = useCallback(() => {
    setConfirmModal(prev => ({ ...prev, isOpen: false }));
  }, []);

  const handleReturnToParent = useCallback(async () => {
    if (user.parentId) {
      const parentUser = await authService.switchUser(user.parentId);
      if (parentUser) {
        onUpdateUser(parentUser);
        setCurrentView('members');
        showToast(`Bem-vindo de volta, ${parentUser.name}!`, 'success');
      } else {
        showToast('Erro ao retornar para a conta principal.', 'error');
      }
    }
  }, [user, onUpdateUser, showToast]);

  const handleAddDespesa = useCallback(async (
    title: string, 
    amount: number, 
    type: TransactionType, 
    category: string, 
    status: TransactionStatus, 
    date: string, 
    paymentDate?: string, 
    installmentsCount: number = 1, 
    observation?: string
  ) => {
    try {
        const createdAt = new Date().toISOString();
        const newTransactions: Despesa[] = [];

        if (type === 'expense' && installmentsCount > 1) {
            const installmentValue = amount / installmentsCount;
            const [startYear, startMonth, startDay] = date.split('-').map(Number);
            
            for (let i = 0; i < installmentsCount; i++) {
                const targetDate = new Date(startYear, (startMonth - 1) + i, startDay);
                const y = targetDate.getFullYear();
                const m = String(targetDate.getMonth() + 1).padStart(2, '0');
                const d = String(targetDate.getDate()).padStart(2, '0');
                const formattedDate = `${y}-${m}-${d}`;
                
                newTransactions.push({
                    id: uuidv4(), // Será substituído pelo Supabase se omitido, mas geramos aqui para optimistic UI se quisessemos
                    title: `${title}`, 
                    amount: installmentValue,
                    type,
                    category,
                    date: formattedDate,
                    status: i === 0 ? status : 'pending', 
                    paymentDate: (i === 0 && status === 'paid') ? paymentDate : undefined,
                    createdAt,
                    observation: i === 0 ? observation : undefined,
                    installments: {
                        current: i + 1,
                        total: installmentsCount
                    }
                });
            }
        } else {
            newTransactions.push({
                id: uuidv4(),
                title,
                amount,
                type,
                category,
                date: date || getCurrentLocalDateString(),
                status,
                paymentDate: status === 'paid' && type === 'expense' ? paymentDate : undefined,
                createdAt,
                observation,
                installments: undefined
            });
        }

        // Enviar para Supabase e esperar resposta para ter os IDs reais
        const promises = newTransactions.map(t => dataService.addTransaction(t, user.dataContextId));
        const results = await Promise.all(promises);

        // Atualizar estado local com os dados retornados do banco (garante IDs e datas corretos)
        const validResults = results.filter(r => r !== null) as Despesa[];
        
        setDespesas((prev) => [...validResults, ...prev]);
        showToast('Transação adicionada com sucesso!', 'success');
    } catch (e) {
        console.error(e);
        showToast('Erro ao salvar transação.', 'error');
    }
  }, [user.dataContextId, showToast]);

  const handleUpdateDespesa = useCallback(async (updatedDespesa: Despesa) => {
    const finalDespesa = {
      ...updatedDespesa,
      paymentDate: updatedDespesa.status === 'paid' && updatedDespesa.type === 'expense' 
        ? updatedDespesa.paymentDate 
        : undefined
    };

    try {
        await dataService.updateTransaction(finalDespesa);
        setDespesas((prev) => prev.map(t => t.id === finalDespesa.id ? finalDespesa : t));
        setEditingDespesa(null);
        showToast('Transação atualizada com sucesso!', 'success');
    } catch (e) {
        showToast('Erro ao atualizar.', 'error');
    }
  }, [showToast]);

  const handleToggleStatus = useCallback(async (t: Despesa) => {
    const newStatus: TransactionStatus = t.status === 'paid' ? 'pending' : 'paid';
    const updated: Despesa = {
        ...t,
        status: newStatus,
        paymentDate: newStatus === 'paid' ? (t.paymentDate || getCurrentLocalDateString()) : undefined
    };
    try {
        await dataService.updateTransaction(updated);
        setDespesas((prev) => prev.map(item => item.id === updated.id ? updated : item));
        showToast(`Status alterado para ${newStatus === 'paid' ? 'PAGO' : 'NÃO PAGO'}`, 'success');
    } catch (e) {
        showToast('Erro ao alterar status.', 'error');
    }
  }, [showToast]);

  const handleDeleteDespesa = useCallback((id: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Excluir Transação",
      message: "Tem certeza que deseja excluir esta transação? Esta ação não pode ser desfeita.",
      onConfirm: async () => {
        try {
            await dataService.deleteTransaction(id);
            setDespesas((prev) => prev.filter((t) => t.id !== id));
            showToast('Transação removida com sucesso.', 'success');
        } catch (e) {
            showToast('Erro ao remover.', 'error');
        } finally {
            setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  }, [showToast]);

  const handleMarkAsPaid = useCallback(async (ids: string[], paymentDate: string) => {
    try {
        await dataService.markAsPaid(ids, paymentDate);
        setDespesas((prev) => prev.map((t) => {
          if (ids.includes(t.id)) {
            return { ...t, status: 'paid' as TransactionStatus, paymentDate: paymentDate };
          }
          return t;
        }));
        showToast(`${ids.length} conta(s) marcadas como pagas.`, 'success');
    } catch (e) {
        showToast('Erro ao atualizar contas.', 'error');
    }
  }, [showToast]);

  const handleAddCategory = useCallback(async (name: string, type: 'income' | 'expense' | 'both', budget?: number) => {
    if (categories.some(c => c.name.toLowerCase() === name.toLowerCase())) {
        showToast('Já existe uma categoria com este nome.', 'error');
        return;
    }
    const newCat = { id: uuidv4(), name, type, budget: budget || 0 };
    try {
        const savedCat = await dataService.addCategory(newCat, user.dataContextId);
        if (savedCat) {
            setCategories(prev => [...prev, savedCat]);
            showToast('Categoria criada com sucesso.', 'success');
        }
    } catch (e) {
        showToast('Erro ao criar categoria.', 'error');
    }
  }, [categories, user.dataContextId, showToast]);

  const handleEditCategory = useCallback(async (id: string, name: string, type: 'income' | 'expense' | 'both', budget?: number) => {
    const updated = { id, name, type, budget: budget || 0 };
    try {
        await dataService.updateCategory(updated);
        setCategories(prev => prev.map(c => c.id === id ? updated : c));
        showToast('Categoria atualizada.', 'success');
    } catch (e) {
        showToast('Erro ao atualizar categoria.', 'error');
    }
  }, [showToast]);

  const requestDeleteCategory = useCallback((id: string) => {
     const categoryToDelete = categories.find(c => c.id === id);
     if (!categoryToDelete) return;
     
     const isCategoryInUse = despesas.some(t => t.category === categoryToDelete.name);
     if (isCategoryInUse) {
       showToast('Erro de Integridade: Categoria em uso por transações existentes.', 'error');
       return;
     }

     setConfirmModal({
        isOpen: true,
        title: "Excluir Categoria",
        message: `Deseja excluir "${categoryToDelete.name}"?`,
        onConfirm: async () => {
            try {
                await dataService.deleteCategory(id);
                setCategories(prev => prev.filter(c => c.id !== id));
                showToast('Categoria excluída.', 'success');
            } catch (e) {
                showToast('Erro ao excluir categoria.', 'error');
            } finally {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
            }
        }
     });
  }, [categories, despesas, showToast]);

  const openNewDespesaModal = useCallback(() => {
    setEditingDespesa(null);
    setIsDespesaModalOpen(true);
  }, []);

  const openEditDespesaModal = useCallback((despesa: Despesa) => {
    setEditingDespesa(despesa);
    setIsDespesaModalOpen(true);
  }, []);

  // --- RENDERIZADORES DE VIEW ---
  
  const renderDashboard = () => {
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    const years = Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - 2 + i);

    const getWidgetComponent = (id: string) => {
      switch (id) {
        case 'total_income': return <StatCard title="Receitas Totais" value={formatCurrency(dashboardData.income)} icon={ArrowUpCircle} colorClass="text-green-600" bgClass="bg-green-100" />;
        case 'total_expense': return <StatCard title="Despesas Totais" value={formatCurrency(dashboardData.expense)} icon={ArrowDownCircle} colorClass="text-red-600" bgClass="bg-red-100" />;
        case 'pending_expenses': return <StatCard title="Contas a Pagar" value={formatCurrency(dashboardData.pending)} icon={Clock} colorClass="text-yellow-600" bgClass="bg-yellow-100" borderClass="border-l-4 border-yellow-400" />;
        case 'balance': return <StatCard title="Saldo do Mês" value={formatCurrency(dashboardData.total)} icon={DollarSign} colorClass={dashboardData.total >= 0 ? "text-blue-600" : "text-red-600"} bgClass={dashboardData.total >= 0 ? "bg-blue-100" : "bg-red-100"} borderClass={dashboardData.total >= 0 ? "border-l-4 border-blue-500" : "border-l-4 border-red-500"} />;
        case 'savings_rate': return <StatCard title="Taxa de Economia" value={`${dashboardData.savingsRate.toFixed(1)}%`} icon={Percent} colorClass={dashboardData.savingsRate >= 20 ? "text-emerald-600" : (dashboardData.savingsRate > 0 ? "text-yellow-600" : "text-red-600")} bgClass={dashboardData.savingsRate >= 20 ? "bg-emerald-100" : "bg-gray-100"} />;
        case 'balance_by_category': return <BalanceByCategory categories={categories} expenses={dashboardData.filteredTransactions} />;
        case 'evolution_chart': return <EvolutionChart despesas={despesas} year={filterYear} />;
        case 'category_evolution': return <CategoryEvolutionChart despesas={despesas} year={filterYear} />;
        case 'chart_expense': return <Charts despesas={dashboardData.filteredTransactions} type="expense" title={`Despesas: ${months[filterMonth]}`} />;
        case 'chart_income': return <Charts despesas={dashboardData.filteredTransactions} type="income" title={`Receitas: ${months[filterMonth]}`} />;
        case 'ai_insight': return <AIInsight despesas={dashboardData.filteredTransactions} />;
        default: return null;
      }
    };

    const getWidgetSpanClass = (id: string) => {
      switch (id) {
        case 'balance_by_category':
        case 'evolution_chart':
        case 'category_evolution':
        case 'ai_insight': return 'md:col-span-2 lg:col-span-4';
        case 'chart_expense':
        case 'chart_income': return 'md:col-span-1 lg:col-span-2';
        default: return 'col-span-1';
      }
    };

    return (
      <div className="space-y-6">
        <div className="bg-white p-4 rounded-lg shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 -mt-10 mb-2 relative z-10">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-md">
              <CalendarIcon size={18} className="text-gray-500 ml-2" />
              <select value={filterMonth} onChange={(e) => setFilterMonth(Number(e.target.value))} className="bg-transparent p-1 text-sm font-medium outline-none text-gray-700 cursor-pointer">
                {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-md">
              <select value={filterYear} onChange={(e) => setFilterYear(Number(e.target.value))} className="bg-transparent p-1 text-sm font-medium outline-none text-gray-700 cursor-pointer">
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>
          <button onClick={() => setIsCustomizing(!isCustomizing)} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${isCustomizing ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            <Settings size={16} /> Personalizar Dashboard
          </button>
        </div>

        {isCustomizing && (
          <div className="bg-white p-6 rounded-lg shadow-md border border-purple-100 animate-fade-in mb-6">
            <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2"><Settings size={16} /> Visibilidade e Ordem dos Widgets</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {widgetOrder.map((widgetId, index) => {
                const widgetDef = AVAILABLE_WIDGETS.find(w => w.id === widgetId);
                if (!widgetDef) return null;
                const isVisible = visibleWidgets[widgetId];
                return (
                  <div key={widgetId} className={`flex items-center justify-between p-3 rounded-md border transition-all ${isVisible ? 'border-purple-200 bg-purple-50' : 'border-gray-200 bg-gray-50'}`}>
                    <div className="flex items-center gap-3">
                      <button onClick={() => toggleWidget(widgetId)} className={`p-1.5 rounded-full transition-colors ${isVisible ? 'text-purple-700 hover:bg-purple-100' : 'text-gray-400 hover:bg-gray-200'}`}>
                        {isVisible ? <Eye size={18} /> : <EyeOff size={18} />}
                      </button>
                      <span className={`text-sm font-medium ${isVisible ? 'text-purple-900' : 'text-gray-500'}`}>{widgetDef.label}</span>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => moveWidget(index, 'up')} disabled={index === 0} className="p-1 text-gray-500 hover:text-purple-600 hover:bg-white rounded disabled:opacity-30"><ArrowUp size={16} /></button>
                      <button onClick={() => moveWidget(index, 'down')} disabled={index === widgetOrder.length - 1} className="p-1 text-gray-500 hover:text-purple-600 hover:bg-white rounded disabled:opacity-30"><ArrowDown size={16} /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
           {widgetOrder.map((widgetId) => {
             if (!visibleWidgets[widgetId]) return null;
             return (
               <div key={widgetId} className={`animate-fade-in-up ${getWidgetSpanClass(widgetId)}`}>
                  {getWidgetComponent(widgetId)}
               </div>
             );
           })}
        </div>
      </div>
    );
  };

  if (loadingData) {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 text-gray-500">
              <Loader2 size={48} className="animate-spin mb-4 text-purple-600" />
              <p>Carregando seus dados...</p>
          </div>
      );
  }

  if (connectionError) {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center bg-red-50 text-red-600 p-4 text-center">
              <WifiOff size={64} className="mb-4" />
              <h2 className="text-2xl font-bold mb-2">Erro de Conexão</h2>
              <p className="mb-6 max-w-md">Não foi possível conectar ao banco de dados Supabase. Verifique se as chaves de API em <code>services/supabaseClient.ts</code> estão corretas.</p>
              <button onClick={() => window.location.reload()} className="bg-red-600 text-white px-6 py-2 rounded-md hover:bg-red-700 transition-colors">
                  Tentar Novamente
              </button>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Header 
        currentView={currentView} 
        onNavigate={setCurrentView} 
        user={user} 
        onLogout={onLogout}
        onReturnToMain={handleReturnToParent} 
      />
      
      <main className="max-w-6xl mx-auto px-4 w-full flex-1 -mt-4 pb-12">
        {currentView === 'dashboard' && renderDashboard()}
        
        {currentView === 'expenses' && (
          <ExpenseList 
            despesas={despesas}
            onDeleteDespesa={handleDeleteDespesa}
            onEditDespesa={openEditDespesaModal}
            onOpenNew={openNewDespesaModal}
            categories={categories}
          />
        )}

        {currentView === 'income' && (
          <IncomeList 
            receitas={despesas}
            onDeleteReceita={handleDeleteDespesa}
            onEditReceita={openEditDespesaModal}
            onOpenNew={openNewDespesaModal}
            categories={categories}
            onToggleStatus={handleToggleStatus}
          />
        )}

        {currentView === 'payable' && (
          <AccountsPayable 
            despesas={despesas} 
            onMarkAsPaid={handleMarkAsPaid} 
            categories={categories}
          />
        )}

        {currentView === 'categories' && (
          <CategoryManager 
            categories={categories}
            onAdd={handleAddCategory}
            onEdit={handleEditCategory}
            onDelete={requestDeleteCategory}
          />
        )}

        {currentView === 'members' && (
          <MemberManager 
             currentUser={user}
             onUpdateUser={onUpdateUser}
             onSwitchUser={onUpdateUser}
          />
        )}
      </main>

      <DespesaForm
        isOpen={isDespesaModalOpen}
        onClose={() => setIsDespesaModalOpen(false)}
        onAddDespesa={handleAddDespesa}
        onUpdateDespesa={handleUpdateDespesa}
        initialData={editingDespesa}
        categories={categories}
        forceType={currentView === 'income' ? 'income' : (currentView === 'expenses' ? 'expense' : undefined)}
      />

      <Toast 
        message={toast.message} 
        type={toast.type} 
        isVisible={toast.isVisible} 
        onClose={() => setToast(prev => ({ ...prev, isVisible: false }))} 
      />

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={closeConfirmModal}
      />
    </div>
  );
};

// Componente Principal Wrapper
const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(authService.getCurrentUser());

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
  };

  const handleLogout = () => {
    authService.logout();
    setUser(null);
  };

  if (!user) {
    return <AuthScreen onLoginSuccess={handleLogin} />;
  }

  return (
     <AuthenticatedApp 
        key={user.id} // Força remontagem se o ID do usuário mudar
        user={user} 
        onLogout={handleLogout}
        onUpdateUser={setUser}
     />
  );
};

export default App;


import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Header } from './components/Header';
import { StatCard, BalanceCard, SplitStatCard } from './components/Summary'; 
import { DespesaForm } from './components/DespesaForm';
import { Charts, EvolutionChart, CategoryEvolutionChart } from './components/Charts';
import { InvestmentEvolutionChart, CashFlowChart, BalanceProjectionChart, TopExpensesChart, MoneyDestinationChart } from './components/DashboardCharts';
import { AIInsight } from './components/AIInsight';
import { CategoryManager } from './components/CategoryManager';
import { AccountsPayable } from './components/AccountsPayable';
import { ExpenseList } from './components/ExpenseList';
import { IncomeList } from './components/IncomeList';
import { InvestmentList } from './components/InvestmentList';
import { BalanceByCategory } from './components/BalanceByCategory';
import { Toast } from './components/Toast';
import { ConfirmModal } from './components/ConfirmModal';
import { AuthScreen } from './components/AuthScreen';
import { MemberManager } from './components/MemberManager';
import { UserProfileModal } from './components/UserProfileModal';
import { AdminPanel } from './components/AdminPanel';
import { HelpSection } from './components/HelpSection';
import { BackupModal } from './components/BackupModal';
import { SubscriptionPaywall } from './components/SubscriptionPaywall';
import { AdBanner } from './components/AdBanner';
import { authService } from './services/authService';
import { dataService } from './services/dataService';
import { syncService } from './services/syncService';
import { validateConfig, supabase } from './services/supabaseClient';
import { Despesa, TransactionType, TransactionStatus, Category, User } from './types';
import { formatCurrency, getCurrentLocalDateString, getFinancialMonthRange, getFinancialYearRange, getCurrentFinancialPeriod } from './utils';
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

type View = 'dashboard' | 'payable' | 'categories' | 'expenses' | 'income' | 'investments' | 'members' | 'admin' | 'help';

// Definição dos Widgets Disponíveis
const AVAILABLE_WIDGETS = [
  { id: 'total_income', label: 'Receitas Totais', default: true },
  { id: 'total_expense', label: 'Despesas Totais', default: true },
  { id: 'balance', label: 'Saldo do Mês', default: true },
  { id: 'pending_expenses', label: 'Contas a Pagar', default: true },
  { id: 'total_investment', label: 'Saldo Investido', default: true },
  { id: 'savings_rate', label: 'Taxa de Economia', default: true },
  { id: 'balance_by_category', label: 'Saldo por Categoria', default: true }, 
  { id: 'evolution_chart', label: 'Evolução de Gastos', default: true },
  { id: 'category_evolution', label: 'Evolução por Categoria', default: true },
  { id: 'chart_expense', label: 'Gráfico: Despesas por Categoria', default: true },
  { id: 'chart_income', label: 'Gráfico: Receitas por Categoria', default: true },
  { id: 'investment_evolution', label: 'Evolução de Aportes', default: true },
  { id: 'cash_flow', label: 'Fluxo de Caixa Completo', default: true },
  { id: 'balance_projection', label: 'Projeção de Saldo', default: true },
  { id: 'top_expenses', label: 'Top 10 Maiores Despesas', default: true },
  { id: 'money_destination', label: 'Destino do Dinheiro', default: true },
  { id: 'ai_insight', label: 'Análise de Inteligência Artificial', default: true },
];

// Componente Interno Autenticado
const AuthenticatedApp: React.FC<{ user: User, onLogout: () => void, onUpdateUser: (u: User) => void, onInstall?: () => void }> = ({ user, onLogout, onUpdateUser, onInstall }) => {
  const currentDate = new Date();
  
  // Storage Keys apenas para preferências de UI (Widgets), dados reais vêm do DB
  const STORAGE_KEY_WIDGETS = `dashboard_widgets_${user.id}`; 
  const STORAGE_KEY_ORDER = `dashboard_widget_order_${user.id}`; 

  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [loadingData, setLoadingData] = useState(true);
  const [connectionError, setConnectionError] = useState(false);
  const [connectionErrorMessage, setConnectionErrorMessage] = useState('');
  
  // Dashboard Filters
  const currentFinancialPeriod = getCurrentFinancialPeriod(user?.financialMonthStartDay || 1);
  const [filterMonth, setFilterMonth] = useState(currentFinancialPeriod.month);
  const [filterYear, setFilterYear] = useState(currentFinancialPeriod.year);
  const [isCustomizing, setIsCustomizing] = useState(false);

  // Widget Configuration State (Local Persisted)
  const [visibleWidgets, setVisibleWidgets] = useState<Record<string, boolean>>(() => {
    try {
        const saved = localStorage.getItem(STORAGE_KEY_WIDGETS);
        const defaults = AVAILABLE_WIDGETS.reduce((acc, w) => ({ ...acc, [w.id]: w.default }), {} as Record<string, boolean>);
        if (saved) {
            const parsed = JSON.parse(saved);
            // Merge defaults and parsed so new widgets are true by default
            return { ...defaults, ...parsed };
        }
        return defaults;
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
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);
  const [editingDespesa, setEditingDespesa] = useState<Despesa | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isGlobalLoading, setIsGlobalLoading] = useState(false);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; isVisible: boolean }>({
    message: '',
    type: 'success',
    isVisible: false
  });

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type, isVisible: true });
  }, []);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    action: 'delete_transaction' | 'delete_category' | 'delete_multiple_transactions' | 'delete_multiple_categories' | null;
    targetId: string | null;
    targetIds?: string[];
    checkboxLabel?: string;
    isCheckboxChecked?: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    action: null,
    targetId: null,
    targetIds: [],
    isCheckboxChecked: false
  });

  // DATA STATES
  const [categories, setCategories] = useState<Category[]>([]);
  const [despesas, setDespesas] = useState<Despesa[]>([]);

  // ...

  const handleConfirmModalAction = async () => {
    setIsGlobalLoading(true);
    try {
        if (!confirmModal.targetId && (!confirmModal.targetIds || confirmModal.targetIds.length === 0)) return;

        if (confirmModal.action === 'delete_transaction' && confirmModal.targetId) {
        const id = confirmModal.targetId;
        const stopFuture = confirmModal.isCheckboxChecked;

        try {
            if (!navigator.onLine) {
              syncService.addToQueue('DELETE_TRANSACTION', id);
              setDespesas((prev) => {
                const updated = prev.filter((t) => t.id !== id);
                localStorage.setItem(`finances_trans_${user.dataContextId}`, JSON.stringify(updated));
                return updated;
              });
              showToast('Transação removida localmente.', 'success');
            } else {
              if (stopFuture) {
                  const transactionToDelete = despesas.find(t => t.id === id);
                  await dataService.stopRecurringAndDeleteTransaction(id, user.dataContextId, transactionToDelete);
                  
                  // Atualiza estado local: remove a atual e atualiza anteriores para não fixas
                  setDespesas((prev) => {
                      const deleted = prev.find(t => t.id === id);
                      let updated = prev.filter((t) => t.id !== id);
                      
                      if (deleted) {
                          updated = updated.map(t => {
                              // Critério para encontrar "pais": mesmo título, categoria, fixa e data anterior ou igual
                              if (t.isFixed && t.title === deleted.title && t.category === deleted.category && t.date <= deleted.date) {
                                  return { ...t, isFixed: false };
                              }
                              return t;
                          });
                      }
                      localStorage.setItem(`finances_trans_${user.dataContextId}`, JSON.stringify(updated));
                      return updated;
                  });
                  showToast('Transação e recorrência futura removidas.', 'success');
              } else {
                  await dataService.deleteTransaction(id);
                  setDespesas((prev) => {
                    const updated = prev.filter((t) => t.id !== id);
                    localStorage.setItem(`finances_trans_${user.dataContextId}`, JSON.stringify(updated));
                    return updated;
                  });
                  showToast('Transação removida com sucesso.', 'success');
              }
            }
        } catch (e) {
            console.error(e);
            showToast('Erro ao remover.', 'error');
        }
    } else if (confirmModal.action === 'delete_category' && confirmModal.targetId) {
        const id = confirmModal.targetId;
        try {
            if (!navigator.onLine) {
              syncService.addToQueue('DELETE_CATEGORY', id);
              setCategories(prev => {
                const updated = prev.filter(c => c.id !== id);
                localStorage.setItem(`finances_cats_${user.dataContextId}`, JSON.stringify(updated));
                return updated;
              });
              showToast('Categoria excluída localmente.', 'success');
            } else {
              await dataService.deleteCategory(id);
              setCategories(prev => {
                const updated = prev.filter(c => c.id !== id);
                localStorage.setItem(`finances_cats_${user.dataContextId}`, JSON.stringify(updated));
                return updated;
              });
              showToast('Categoria excluída.', 'success');
            }
        } catch (e) {
            console.error(e);
            showToast('Erro ao excluir categoria.', 'error');
        }
    } else if (confirmModal.action === 'delete_multiple_transactions') {
        const ids = confirmModal.targetIds || [];
        if (ids.length === 0) return;
        try {
            if (!navigator.onLine) {
              ids.forEach(id => syncService.addToQueue('DELETE_TRANSACTION', id));
              setDespesas((prev) => {
                const updated = prev.filter((t) => !ids.includes(t.id));
                localStorage.setItem(`finances_trans_${user.dataContextId}`, JSON.stringify(updated));
                return updated;
              });
              showToast(`${ids.length} transações removidas localmente.`, 'success');
            } else {
              // We can delete them one by one or create a bulk delete in dataService.
              // For simplicity, we'll delete them sequentially for now.
              for (const id of ids) {
                 await dataService.deleteTransaction(id);
              }
              setDespesas((prev) => {
                const updated = prev.filter((t) => !ids.includes(t.id));
                localStorage.setItem(`finances_trans_${user.dataContextId}`, JSON.stringify(updated));
                return updated;
              });
              showToast(`${ids.length} transações removidas com sucesso.`, 'success');
            }
        } catch (e) {
            console.error(e);
            showToast('Erro ao remover transações.', 'error');
        }
    } else if (confirmModal.action === 'delete_multiple_categories') {
        const ids = confirmModal.targetIds || [];
        if (ids.length === 0) return;
        try {
            if (!navigator.onLine) {
              ids.forEach(id => syncService.addToQueue('DELETE_CATEGORY', id));
              setCategories(prev => {
                const updated = prev.filter(c => !ids.includes(c.id));
                localStorage.setItem(`finances_cats_${user.dataContextId}`, JSON.stringify(updated));
                return updated;
              });
              showToast(`${ids.length} categorias excluídas localmente.`, 'success');
            } else {
              for (const id of ids) {
                 await dataService.deleteCategory(id);
              }
              setCategories(prev => {
                const updated = prev.filter(c => !ids.includes(c.id));
                localStorage.setItem(`finances_cats_${user.dataContextId}`, JSON.stringify(updated));
                return updated;
              });
              showToast(`${ids.length} categorias excluídas.`, 'success');
            }
        } catch (e) {
            console.error(e);
            showToast('Erro ao excluir categorias.', 'error');
        }
    }
    
    setConfirmModal(prev => ({ ...prev, isOpen: false }));
    } finally {
        setIsGlobalLoading(false);
    }
  };

  const handleDeleteDespesa = useCallback((id: string) => {
    const transaction = despesas.find(t => t.id === id);
    const isFixed = transaction?.isFixed;

    setConfirmModal({
      isOpen: true,
      title: "Excluir Transação",
      message: "Tem certeza que deseja excluir esta transação? Esta ação não pode ser desfeita.",
      action: 'delete_transaction',
      targetId: id,
      checkboxLabel: isFixed ? "O sistema não lançará mais essa transação fixa para data futuro" : undefined,
      isCheckboxChecked: isFixed ? true : undefined
    });
  }, [despesas]);
  
  const handleDeleteCategory = useCallback((id: string) => {
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
         action: 'delete_category',
         targetId: id
      });
  }, [categories, despesas, showToast]);

  const handleBulkDeleteTransactions = useCallback((ids: string[]) => {
    setConfirmModal({
      isOpen: true,
      title: "Excluir Transações",
      message: `Tem certeza que deseja excluir as ${ids.length} transações selecionadas? Esta ação não pode ser desfeita.`,
      action: 'delete_multiple_transactions',
      targetId: null,
      targetIds: ids
    });
  }, []);

  const handleBulkEditTransactions = useCallback(async (ids: string[], data: Partial<Despesa>) => {
    setIsGlobalLoading(true);
    try {
      const updatedAt = new Date().toISOString();
      if (!navigator.onLine) {
        // Local update
        setDespesas((prev) => {
          const updated = prev.map(t => ids.includes(t.id) ? { ...t, ...data, updatedAt } : t);
          localStorage.setItem(`finances_trans_${user.dataContextId}`, JSON.stringify(updated));
          return updated;
        });
        showToast(`${ids.length} transações atualizadas localmente.`, 'success');
      } else {
        await dataService.updateTransactionsBulk(ids, { ...data, updatedAt });
        setDespesas((prev) => {
          const updated = prev.map(t => ids.includes(t.id) ? { ...t, ...data, updatedAt } : t);
          localStorage.setItem(`finances_trans_${user.dataContextId}`, JSON.stringify(updated));
          return updated;
        });
        showToast(`${ids.length} transações atualizadas com sucesso.`, 'success');
      }
    } catch (e) {
      console.error(e);
      showToast('Erro ao atualizar transações em massa.', 'error');
    } finally {
      setIsGlobalLoading(false);
    }
  }, [user.dataContextId, showToast]);

  const handleBulkDeleteCategories = useCallback((ids: string[]) => {
    const categoriesToDelete = categories.filter(c => ids.includes(c.id));
    const isCategoryInUse = categoriesToDelete.some(c => despesas.some(t => t.category === c.name));
    
    if (isCategoryInUse) {
      showToast('Erro de Integridade: Uma ou mais categorias selecionadas estão em uso por transações existentes.', 'error');
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: "Excluir Categorias",
      message: `Tem certeza que deseja excluir as ${ids.length} categorias selecionadas?`,
      action: 'delete_multiple_categories',
      targetId: null,
      targetIds: ids
    });
  }, [categories, despesas, showToast]);





  // --- DATA FETCHING (SUPABASE) ---
  const loadData = useCallback(async () => {
    setLoadingData(true);
    setConnectionError(false);
    setConnectionErrorMessage('');
    
    // Se estiver offline, tenta carregar do cache local
    if (!navigator.onLine) {
      try {
        const cachedCats = localStorage.getItem(`finances_cats_${user.dataContextId}`);
        const cachedTrans = localStorage.getItem(`finances_trans_${user.dataContextId}`);
        if (cachedCats) setCategories(JSON.parse(cachedCats));
        if (cachedTrans) setDespesas(JSON.parse(cachedTrans));
        showToast('Modo offline. Dados carregados do cache.', 'success');
      } catch (e) {
        console.error("Erro ao carregar cache local:", e);
      } finally {
        setLoadingData(false);
      }
      return;
    }

    const configCheck = validateConfig();
    if (!configCheck.valid) {
        setLoadingData(false);
        setConnectionError(true);
        setConnectionErrorMessage(configCheck.message || 'Erro de configuração do Supabase.');
        return;
    }

    try {
        // Processa a fila de sincronização antes de buscar dados novos
        await syncService.processQueue();

        // 1. Busca Categorias e Transações em paralelo
        // Adicionamos um timeout geral para evitar travamentos infinitos
        const fetchPromise = Promise.all([
            dataService.fetchCategories(user.dataContextId),
            dataService.fetchTransactions(user.dataContextId)
        ]);

        const timeoutPromise = new Promise<[Category[], Despesa[]]>((_, reject) => 
            setTimeout(() => reject(new Error('Tempo limite de conexão excedido.')), 15000)
        );

        let [cats, trans] = await Promise.race([fetchPromise, timeoutPromise]);

        // 2. Se não houver categorias (primeiro acesso), popula com as iniciais
        if (cats.length === 0) {
            console.log("Banco vazio detectado. Populando categorias iniciais...");
            cats = await dataService.seedCategories(user.dataContextId);
            showToast('Banco de dados configurado com sucesso!', 'success');
        }
        
        setCategories(cats);
        setDespesas(trans);

        // Verifica e gera despesas recorrentes (apenas se online)
        if (navigator.onLine) {
            const newRecurring = await dataService.checkAndGenerateRecurringExpenses(trans, user.dataContextId);
            if (newRecurring.length > 0) {
                trans = [...newRecurring, ...trans]; // Atualiza a lista local com as novas
                setDespesas(trans);
                showToast(`${newRecurring.length} transação(ões) recorrente(s) gerada(s) automaticamente.`, 'success');
            }
        }

        // Salva no cache local para uso offline
        localStorage.setItem(`finances_cats_${user.dataContextId}`, JSON.stringify(cats));
        localStorage.setItem(`finances_trans_${user.dataContextId}`, JSON.stringify(trans));

    } catch (e: any) {
        console.error("Erro fatal ao carregar dados:", e);
        if (e.message?.includes("Refresh Token") || e.message?.includes("invalid claim") || e.message?.includes("JWT")) {
            onLogout();
            return;
        }
        setConnectionError(true);
        setConnectionErrorMessage(e.message || 'Erro desconhecido ao conectar ao Supabase.');
    } finally {
        setLoadingData(false);
    }
  }, [user.dataContextId, showToast, onLogout]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // --- OFFLINE/ONLINE LISTENERS ---
  useEffect(() => {
    const handleOnline = async () => {
      setIsOffline(false);
      showToast('Conexão restabelecida. Sincronizando dados...', 'success');
      await syncService.processQueue();
      loadData(); // Recarrega os dados do servidor após sincronizar
    };

    const handleOffline = () => {
      setIsOffline(true);
      showToast('Você está offline. As alterações serão salvas localmente e sincronizadas quando a conexão voltar.', 'error');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [loadData, showToast]);

  // --- UI PERSISTENCE ---
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_WIDGETS, JSON.stringify(visibleWidgets));
  }, [visibleWidgets, STORAGE_KEY_WIDGETS]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_ORDER, JSON.stringify(widgetOrder));
  }, [widgetOrder, STORAGE_KEY_ORDER]);

  // --- DERIVED STATE ---
  const dashboardData = useMemo(() => {
    let finStartForPrevious: Date | null = null;
    let finEndForPrevious: Date | null = null;

    const filtered = despesas.filter(t => {
      const [y, m, d] = (t.date || '').split('-').map(Number);
      const tDate = new Date(y, m - 1, d);
      tDate.setHours(12, 0, 0, 0);

      const startDay = user?.financialMonthStartDay || 1;

      if (filterYear !== -1 && filterMonth !== -1) {
          const { startDate: finStart, endDate: finEnd } = getFinancialMonthRange(filterYear, filterMonth, startDay);
          finStartForPrevious = finStart;
          finEndForPrevious = finEnd;
          return tDate >= finStart && tDate <= finEnd;
      } else if (filterYear !== -1 && filterMonth === -1) {
          const { startDate: finStart, endDate: finEnd } = getFinancialYearRange(filterYear, startDay);
          finStartForPrevious = finStart;
          finEndForPrevious = finEnd;
          return tDate >= finStart && tDate <= finEnd;
      } else if (filterYear === -1 && filterMonth !== -1) {
          return (m - 1) === filterMonth;
      }
      return true;
    });

    let income = 0;
    let expense = 0;
    let pending = 0;
    let investmentIn = 0;
    let investmentOut = 0;

    for (const t of filtered) {
        if (t.type === 'income' && t.status === 'paid') {
            income += t.amount;
        } else if (t.type === 'expense') {
            if (t.status === 'paid') {
                expense += t.amount;
            } else {
                pending += t.amount;
            }
        } else if (t.type === 'investment' && t.status === 'paid') {
            if (t.amount >= 0) {
                investmentIn += t.amount;
            } else {
                investmentOut += Math.abs(t.amount);
            }
        }
    }
    
    // Calcula o Saldo do Mês Anterior
    let previousMonthBalance = 0;
    
    // Só calculamos se for uma visão de mês/ano específica onde finStartForPrevious foi setado
    if (finStartForPrevious != null) {
      for (const t of despesas) {
        const [y, m, d] = (t.date || '').split('-').map(Number);
        const tDate = new Date(y, m - 1, d);
        tDate.setHours(12, 0, 0, 0);
        
        // Pega tudo antes do início do período selecionado
        if (tDate < finStartForPrevious) {
           if (t.type === 'income' && t.status === 'paid') {
               previousMonthBalance += t.amount;
           } else if (t.type === 'expense' && t.status === 'paid') {
               previousMonthBalance -= t.amount;
           }
        }
      }
    } else {
      // Se estiver na visão geral, considera nulo para não exibir painel
      previousMonthBalance = 0;
    }

    const currentBalance = income - expense;
    // O Saldo Disponível é a soma de todos os ganhos e despesas anteriores + atuais
    const totalAvailable = currentBalance + previousMonthBalance;
    const investmentTotal = investmentIn - investmentOut;
    let savingsRate = 0;
    if (income > 0) {
      savingsRate = ((income - expense) / income) * 100;
    }

    return { 
      income, 
      expense, 
      currentBalance, 
      previousMonthBalance, 
      totalAvailable, 
      pending, 
      investmentTotal, 
      savingsRate, 
      filteredTransactions: filtered,
      isPeriodFilterActive: finStartForPrevious != null
    };
  }, [despesas, filterMonth, filterYear, user]);

  // --- HANDLERS ---
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

  const handleBackup = useCallback(() => {
    setIsBackupModalOpen(true);
  }, []);

  const executeBackup = useCallback(async (selections: Record<string, any>) => {
    try {
      showToast('Gerando backup...', 'success');
      
      const dataContextIds = new Set<string>();
      Object.keys(selections).forEach(id => dataContextIds.add(id));
      
      const formattedMembers = (user.members || []).map((m: any) => {
        const memberDataContextId = m.data_context_id || m.dataContextId;
        return {
          id: m.id,
          name: m.name,
          email: m.email,
          dataContextId: memberDataContextId,
          parentId: m.parent_id || m.parentId,
          role: m.role
        };
      }).filter((m: any) => dataContextIds.has(m.dataContextId));

      const allCategories: any[] = [];
      const allTransactions: any[] = [];

      await Promise.all(Array.from(dataContextIds).map(async (dcId) => {
        const userSelections = selections[dcId];
        if (!userSelections) return;

        const [cats, trans] = await Promise.all([
          dataService.fetchCategories(dcId),
          dataService.fetchTransactions(dcId)
        ]);

        if (userSelections.categories) {
          allCategories.push(...cats);
        }

        const filteredTrans = trans.filter(t => {
          if (t.type === 'expense' && t.status === 'paid' && userSelections.expenses) return true;
          if (t.type === 'expense' && t.status === 'pending' && userSelections.payables) return true;
          if (t.type === 'income' && userSelections.incomes) return true;
          if (t.type === 'investment' && userSelections.investments) return true;
          return false;
        });

        allTransactions.push(...filteredTrans);
      }));
      
      const backupData = {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          dataContextId: user.dataContextId,
          role: user.role
        },
        members: formattedMembers,
        categories: allCategories,
        transactions: allTransactions,
        exportDate: new Date().toISOString()
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_financas_${getCurrentLocalDateString()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      showToast('Backup concluído!', 'success');
    } catch (e) {
      console.error("Erro no backup:", e);
      showToast('Erro ao gerar backup.', 'error');
    }
  }, [user, showToast]);

  const handleRestoreBackup = useCallback(async (file: File) => {
    try {
      showToast('Lendo arquivo de backup...', 'success');
      const text = await file.text();
      const backupData = JSON.parse(text);

      if (!backupData.categories || !backupData.transactions) {
        throw new Error("Arquivo de backup inválido.");
      }

      showToast('Restaurando dados...', 'success');
      await dataService.restoreBackup(user, backupData);
      
      showToast('Backup restaurado com sucesso!', 'success');
      loadData(); // Recarrega os dados da tela
    } catch (e: any) {
      console.error(e);
      showToast(e.message || 'Erro ao restaurar backup.', 'error');
    }
  }, [user, showToast, loadData]);

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
    observation?: string,
    isFixed?: boolean
  ) => {
    setIsGlobalLoading(true);
    try {
        const createdAt = new Date().toISOString();
        const newTransactions: Despesa[] = [];

        if ((type === 'expense' || type === 'investment') && installmentsCount > 1 && !isFixed) {
            const installmentValue = amount / installmentsCount;
            const [startYear, startMonth, startDay] = (date || '').split('-').map(Number);
            
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
                    status: (i === 0 ? status : 'pending'),
                    paymentDate: (i === 0 && status === 'paid') ? paymentDate : undefined,
                    createdAt,
                    observation: i === 0 ? observation : undefined,
                    installments: {
                        current: i + 1,
                        total: installmentsCount
                    },
                    isFixed: false
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
                installments: undefined,
                isFixed: !!isFixed
            });
        }

        // Enviar para Supabase e esperar resposta para ter os IDs reais
        if (!navigator.onLine) {
          newTransactions.forEach(t => syncService.addToQueue('ADD_TRANSACTION', t, user.dataContextId));
          setDespesas(prev => {
            const updated = [...newTransactions, ...prev];
            localStorage.setItem(`finances_trans_${user.dataContextId}`, JSON.stringify(updated));
            return updated;
          });
          showToast('Transação salva localmente.', 'success');
        } else {
          const promises = newTransactions.map(t => dataService.addTransaction(t, user.dataContextId));
          const results = await Promise.all(promises);

          // Atualizar estado local com os dados retornados do banco (garante IDs e datas corretos)
          const validResults = results.filter(r => r !== null) as Despesa[];
          
          setDespesas((prev) => {
            const updated = [...validResults, ...prev];
            localStorage.setItem(`finances_trans_${user.dataContextId}`, JSON.stringify(updated));
            return updated;
          });
          showToast('Transação adicionada com sucesso!', 'success');
        }
    } catch (e) {
        console.error(e);
        showToast('Erro ao salvar transação.', 'error');
        throw e; // Re-throw para o formulário
    } finally {
        setIsGlobalLoading(false);
    }
  }, [user.dataContextId, showToast]);

  const handleUpdateDespesa = useCallback(async (updatedDespesa: Despesa) => {
    setIsGlobalLoading(true);
    const finalDespesa = {
      ...updatedDespesa,
      updatedAt: new Date().toISOString(),
      paymentDate: updatedDespesa.status === 'paid' && updatedDespesa.type === 'expense' 
        ? updatedDespesa.paymentDate 
        : undefined
    };

    try {
        if (!navigator.onLine) {
          syncService.addToQueue('UPDATE_TRANSACTION', finalDespesa);
          setDespesas((prev) => {
            const updated = prev.map(t => t.id === finalDespesa.id ? finalDespesa : t);
            localStorage.setItem(`finances_trans_${user.dataContextId}`, JSON.stringify(updated));
            return updated;
          });
          setEditingDespesa(null);
          showToast('Transação atualizada localmente.', 'success');
        } else {
          await dataService.updateTransaction(finalDespesa);
          setDespesas((prev) => {
            const updated = prev.map(t => t.id === finalDespesa.id ? finalDespesa : t);
            localStorage.setItem(`finances_trans_${user.dataContextId}`, JSON.stringify(updated));
            return updated;
          });
          setEditingDespesa(null);
          showToast('Transação atualizada com sucesso!', 'success');
        }
    } catch (e) {
        console.error('Erro em handleUpdateDespesa:', e);
        showToast('Erro ao atualizar.', 'error');
        throw e; // Re-throw para que o formulário saiba que falhou
    } finally {
        setIsGlobalLoading(false);
    }
  }, [showToast, user.dataContextId]);

  const handleToggleStatus = useCallback(async (t: Despesa) => {
    setIsGlobalLoading(true);
    const newStatus: TransactionStatus = t.status === 'paid' ? 'pending' : 'paid';
    const updated: Despesa = {
        ...t,
        status: newStatus,
        paymentDate: newStatus === 'paid' ? (t.paymentDate || getCurrentLocalDateString()) : undefined
    };
    try {
        if (!navigator.onLine) {
          syncService.addToQueue('UPDATE_TRANSACTION', updated);
          setDespesas((prev) => {
            const updatedList = prev.map(item => item.id === updated.id ? updated : item);
            localStorage.setItem(`finances_trans_${user.dataContextId}`, JSON.stringify(updatedList));
            return updatedList;
          });
          showToast(`Status alterado para ${newStatus === 'paid' ? 'PAGO' : 'NÃO PAGO'} localmente`, 'success');
        } else {
          await dataService.updateTransaction(updated);
          setDespesas((prev) => {
            const updatedList = prev.map(item => item.id === updated.id ? updated : item);
            localStorage.setItem(`finances_trans_${user.dataContextId}`, JSON.stringify(updatedList));
            return updatedList;
          });
          showToast(`Status alterado para ${newStatus === 'paid' ? 'PAGO' : 'NÃO PAGO'}`, 'success');
        }
    } catch (e) {
        showToast('Erro ao alterar status.', 'error');
    } finally {
        setIsGlobalLoading(false);
    }
  }, [showToast, user.dataContextId]);



  const handleMarkAsPaid = useCallback(async (ids: string[], paymentDate: string) => {
    setIsGlobalLoading(true);
    try {
        if (!navigator.onLine) {
          ids.forEach(id => {
            const transaction = despesas.find(t => t.id === id);
            if (transaction) {
              syncService.addToQueue('UPDATE_TRANSACTION', { ...transaction, status: 'paid', paymentDate });
            }
          });
          setDespesas((prev) => {
            const updated = prev.map((t) => {
              if (ids.includes(t.id)) {
                return { ...t, status: 'paid' as TransactionStatus, paymentDate: paymentDate };
              }
              return t;
            });
            localStorage.setItem(`finances_trans_${user.dataContextId}`, JSON.stringify(updated));
            return updated;
          });
          showToast(`${ids.length} conta(s) marcadas como pagas localmente.`, 'success');
        } else {
          await dataService.markAsPaid(ids, paymentDate);
          setDespesas((prev) => {
            const updated = prev.map((t) => {
              if (ids.includes(t.id)) {
                return { ...t, status: 'paid' as TransactionStatus, paymentDate: paymentDate };
              }
              return t;
            });
            localStorage.setItem(`finances_trans_${user.dataContextId}`, JSON.stringify(updated));
            return updated;
          });
          showToast(`${ids.length} conta(s) marcadas como pagas.`, 'success');
        }
    } catch (e) {
        showToast('Erro ao atualizar contas.', 'error');
    } finally {
        setIsGlobalLoading(false);
    }
  }, [despesas, showToast, user.dataContextId]);

  const handleAddCategory = useCallback(async (name: string, type: 'income' | 'expense' | 'both' | 'investment', budget?: number) => {
    if (categories.some(c => (c.name?.toLowerCase() || '') === name.toLowerCase())) {
        showToast('Já existe uma categoria com este nome.', 'error');
        return;
    }
    setIsGlobalLoading(true);
    const newCat = { id: uuidv4(), name, type, budget: budget || 0 };
    try {
        if (!navigator.onLine) {
          syncService.addToQueue('ADD_CATEGORY', newCat, user.dataContextId);
          setCategories(prev => {
            const updated = [...prev, newCat];
            localStorage.setItem(`finances_cats_${user.dataContextId}`, JSON.stringify(updated));
            return updated;
          });
          showToast('Categoria criada localmente.', 'success');
        } else {
          const savedCat = await dataService.addCategory(newCat, user.dataContextId);
          if (savedCat) {
              setCategories(prev => {
                const updated = [...prev, savedCat];
                localStorage.setItem(`finances_cats_${user.dataContextId}`, JSON.stringify(updated));
                return updated;
              });
              showToast('Categoria criada com sucesso.', 'success');
          }
        }
    } catch (e) {
        showToast('Erro ao criar categoria.', 'error');
    } finally {
        setIsGlobalLoading(false);
    }
  }, [categories, user.dataContextId, showToast]);

  const handleEditCategory = useCallback(async (id: string, name: string, type: 'income' | 'expense' | 'both' | 'investment', budget?: number) => {
    setIsGlobalLoading(true);
    const updated = { id, name, type, budget: budget || 0 };
    try {
        if (!navigator.onLine) {
          syncService.addToQueue('UPDATE_CATEGORY', updated);
          setCategories(prev => {
            const updatedList = prev.map(c => c.id === id ? updated : c);
            localStorage.setItem(`finances_cats_${user.dataContextId}`, JSON.stringify(updatedList));
            return updatedList;
          });
          showToast('Categoria atualizada localmente.', 'success');
        } else {
          await dataService.updateCategory(updated);
          setCategories(prev => {
            const updatedList = prev.map(c => c.id === id ? updated : c);
            localStorage.setItem(`finances_cats_${user.dataContextId}`, JSON.stringify(updatedList));
            return updatedList;
          });
          showToast('Categoria atualizada.', 'success');
        }
    } catch (e) {
        showToast('Erro ao atualizar categoria.', 'error');
    } finally {
        setIsGlobalLoading(false);
    }
  }, [showToast, user.dataContextId]);



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
        case 'total_income': 
          const isPositivePrev = dashboardData.isPeriodFilterActive && dashboardData.previousMonthBalance > 0;
          return (
            <SplitStatCard 
              title="Receitas Totais" 
              currentTitle="Entradas do Mês"
              currentValue={dashboardData.income}
              previousBalanceTitle="Saldo Anterior"
              previousBalanceValue={isPositivePrev ? dashboardData.previousMonthBalance : null}
              totalTitle="Total em Caixa"
              totalValue={dashboardData.income + (isPositivePrev ? dashboardData.previousMonthBalance : 0)}
              icon={ArrowUpCircle} 
              colorClass="text-green-600" 
              bgClass="bg-green-100" 
              borderClass=""
              formatCurrency={formatCurrency}
            />
          );
        case 'total_expense': 
          const isNegativePrev = dashboardData.isPeriodFilterActive && dashboardData.previousMonthBalance < 0;
          return (
            <SplitStatCard 
              title="Despesas Totais" 
              currentTitle="Saídas do Mês"
              currentValue={dashboardData.expense}
              previousBalanceTitle="Débito Anterior"
              previousBalanceValue={isNegativePrev ? Math.abs(dashboardData.previousMonthBalance) : null}
              totalTitle="SAÍDAS TOTAIS"
              totalValue={dashboardData.expense + (isNegativePrev ? Math.abs(dashboardData.previousMonthBalance) : 0)}
              icon={ArrowDownCircle} 
              colorClass="text-red-600" 
              bgClass="bg-red-100" 
              borderClass=""
              formatCurrency={formatCurrency}
            />
          );
        case 'pending_expenses': return <StatCard title="Contas a Pagar" value={formatCurrency(dashboardData.pending)} icon={Clock} colorClass="text-yellow-600" bgClass="bg-yellow-100" borderClass="border-l-4 border-yellow-400" />;
        case 'total_investment': return <StatCard title="Saldo Investido" value={formatCurrency(dashboardData.investmentTotal)} icon={ArrowUp} colorClass="text-purple-600" bgClass="bg-purple-100" borderClass="border-l-4 border-purple-500" />;
        case 'balance': 
          return (
            <BalanceCard 
              title={filterMonth === -1 ? "Saldo Total" : "Saldo do Mês"} 
              currentBalance={dashboardData.currentBalance} 
              previousBalance={dashboardData.isPeriodFilterActive ? dashboardData.previousMonthBalance : null} 
              totalAvailable={dashboardData.totalAvailable} 
              icon={DollarSign} 
              formatCurrency={formatCurrency}
            />
          );
        case 'savings_rate': return <StatCard title="Taxa de Economia" value={`${dashboardData.savingsRate.toFixed(1)}%`} icon={Percent} colorClass={dashboardData.savingsRate >= 20 ? "text-emerald-600" : (dashboardData.savingsRate > 0 ? "text-yellow-600" : "text-red-600")} bgClass={dashboardData.savingsRate >= 20 ? "bg-emerald-100" : "bg-gray-100"} />;
        case 'balance_by_category': return <BalanceByCategory categories={categories} expenses={dashboardData.filteredTransactions} />;
        case 'evolution_chart': return <EvolutionChart despesas={despesas} year={filterYear} user={user!} />;
        case 'category_evolution': return <CategoryEvolutionChart despesas={despesas} year={filterYear} user={user!} />;
        case 'chart_expense': return <Charts despesas={dashboardData.filteredTransactions} type="expense" title={`Despesas: ${filterMonth === -1 ? 'Todos os Meses' : months[filterMonth]}`} />;
        case 'chart_income': return <Charts despesas={dashboardData.filteredTransactions} type="income" title={`Receitas: ${filterMonth === -1 ? 'Todos os Meses' : months[filterMonth]}`} />;
        case 'investment_evolution': return <InvestmentEvolutionChart despesas={despesas} year={filterYear} user={user!} />;
        case 'cash_flow': return <CashFlowChart despesas={despesas} year={filterYear} user={user!} />;
        case 'balance_projection': return <BalanceProjectionChart despesas={dashboardData.filteredTransactions} />;
        case 'top_expenses': return <TopExpensesChart despesas={dashboardData.filteredTransactions} />;
        case 'money_destination': return <MoneyDestinationChart despesas={dashboardData.filteredTransactions} />;
        case 'ai_insight': return <AIInsight despesas={dashboardData.filteredTransactions} user={user!} onOpenPaywall={() => setIsPaywallOpen(true)} />;
        default: return null;
      }
    };

    const getWidgetSpanClass = (id: string) => {
      switch (id) {
        case 'balance_by_category':
        case 'evolution_chart':
        case 'category_evolution':
        case 'investment_evolution':
        case 'cash_flow':
        case 'ai_insight': return 'md:col-span-2 lg:col-span-4';
        case 'chart_expense':
        case 'chart_income':
        case 'balance_projection':
        case 'top_expenses':
        case 'money_destination': return 'md:col-span-1 lg:col-span-2';
        default: return 'col-span-1';
      }
    };

    return (
      <div className="space-y-6">
        <div className="bg-white p-4 rounded-lg shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 -mt-10 mb-2 relative z-10">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-md">
                <CalendarIcon size={18} className="text-gray-500 ml-2" />
                <select value={filterMonth} onChange={(e) => setFilterMonth(Number(e.target.value))} className="bg-transparent p-1 text-sm font-medium outline-none text-gray-700 cursor-pointer">
                  <option value={-1}>Todos</option>
                  {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-md">
                <select value={filterYear} onChange={(e) => setFilterYear(Number(e.target.value))} className="bg-transparent p-1 text-sm font-medium outline-none text-gray-700 cursor-pointer">
                  <option value={-1}>Todos</option>
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>
            {filterMonth !== -1 && filterYear !== -1 && (
              <span className="text-xs text-gray-500 px-1">
                Período: {getFinancialMonthRange(filterYear, filterMonth, user?.financialMonthStartDay || 1).startDate.toLocaleDateString('pt-BR')} a {getFinancialMonthRange(filterYear, filterMonth, user?.financialMonthStartDay || 1).endDate.toLocaleDateString('pt-BR')}
              </span>
            )}
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
              <p className="mb-6 max-w-md">
                Não foi possível conectar ao banco de dados Supabase.<br/>
                <span className="text-sm font-mono bg-red-100 p-1 rounded mt-2 block">{connectionErrorMessage}</span>
              </p>
              <button 
                  onClick={loadData} 
                  className="bg-red-600 text-white px-6 py-2 rounded-md hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                  <Loader2 size={18} className={loadingData ? "animate-spin" : "hidden"} />
                  Tentar Novamente
              </button>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Header 
        currentView={currentView} 
        onNavigate={(view) => {
          if (view === 'profile' as any) {
            setIsProfileModalOpen(true);
          } else {
            setCurrentView(view as View);
          }
        }} 
        user={user} 
        onLogout={onLogout}
        onReturnToMain={handleReturnToParent} 
        onBackup={handleBackup}
        onRestoreBackup={handleRestoreBackup}
        onInstall={onInstall}
        onOpenPaywall={() => setIsPaywallOpen(true)}
      />
      
      <main className="max-w-6xl mx-auto px-4 w-full flex-1 -mt-4 pb-12">
        {currentView === 'dashboard' && renderDashboard()}
        
        {currentView === 'expenses' && (
          <ExpenseList 
            despesas={despesas}
            onDeleteDespesa={handleDeleteDespesa}
            onBulkDeleteDespesas={handleBulkDeleteTransactions}
            onBulkEditDespesas={handleBulkEditTransactions}
            onEditDespesa={openEditDespesaModal}
            onOpenNew={openNewDespesaModal}
            categories={categories}
            onToggleStatus={handleToggleStatus}
            user={user}
            onOpenPaywall={() => setIsPaywallOpen(true)}
          />
        )}

        {currentView === 'income' && (
          <IncomeList 
            receitas={despesas}
            onDeleteReceita={handleDeleteDespesa}
            onBulkDeleteReceitas={handleBulkDeleteTransactions}
            onBulkEditReceitas={handleBulkEditTransactions}
            onEditReceita={openEditDespesaModal}
            onOpenNew={openNewDespesaModal}
            categories={categories}
            onToggleStatus={handleToggleStatus}
            user={user}
            onOpenPaywall={() => setIsPaywallOpen(true)}
          />
        )}

        {currentView === 'investments' && (
          <InvestmentList 
            investimentos={despesas}
            onDeleteInvestimento={handleDeleteDespesa}
            onBulkDeleteInvestimentos={handleBulkDeleteTransactions}
            onBulkEditInvestimentos={handleBulkEditTransactions}
            onEditInvestimento={openEditDespesaModal}
            onOpenNew={openNewDespesaModal}
            categories={categories}
            onToggleStatus={handleToggleStatus}
            user={user}
            onOpenPaywall={() => setIsPaywallOpen(true)}
          />
        )}

        {currentView === 'payable' && (
          <AccountsPayable 
            despesas={despesas} 
            onMarkAsPaid={handleMarkAsPaid} 
            categories={categories}
            onDeleteConta={handleDeleteDespesa}
            onEditConta={openEditDespesaModal}
            user={user}
            onOpenPaywall={() => setIsPaywallOpen(true)}
          />
        )}

        {currentView === 'categories' && (
          <CategoryManager 
            categories={categories}
            onAdd={handleAddCategory}
            onEdit={handleEditCategory}
            onDelete={handleDeleteCategory}
            onBulkDelete={handleBulkDeleteCategories}
          />
        )}

        {currentView === 'members' && !user.parentId && (
          <MemberManager 
             currentUser={user}
             onUpdateUser={onUpdateUser}
             onSwitchUser={onUpdateUser}
             onOpenPaywall={() => setIsPaywallOpen(true)}
          />
        )}

        {currentView === 'admin' && (
          <AdminPanel currentUser={user} />
        )}

        {currentView === 'help' && (
          <HelpSection />
        )}
      </main>

      {user.plan !== 'premium' && (
        <div className="max-w-6xl mx-auto px-4 w-full pb-4">
          <AdBanner format="banner" />
        </div>
      )}

      <DespesaForm
        isOpen={isDespesaModalOpen}
        onClose={() => setIsDespesaModalOpen(false)}
        onAddDespesa={handleAddDespesa}
        onUpdateDespesa={handleUpdateDespesa}
        initialData={editingDespesa}
        categories={categories}
        forceType={currentView === 'income' ? 'income' : currentView === 'investments' ? 'investment' : (currentView === 'expenses' ? 'expense' : undefined)}
        user={user}
        onOpenPaywall={() => setIsPaywallOpen(true)}
      />

      <UserProfileModal
        user={user}
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onUpdateUser={onUpdateUser}
        showToast={showToast}
      />

      <BackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        user={user}
        onConfirm={executeBackup}
      />

      {isPaywallOpen && (
        <SubscriptionPaywall 
          user={user} 
          onClose={() => setIsPaywallOpen(false)} 
          onSubscribe={(plan) => {
            console.log('Assinando plano:', plan);
            // Aqui seria a integração com o RevenueCat ou Stripe
            setIsPaywallOpen(false);
            showToast('Redirecionando para pagamento...', 'success');
          }} 
        />
      )}

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
        onConfirm={handleConfirmModalAction}
        onCancel={closeConfirmModal}
        checkboxLabel={confirmModal.checkboxLabel}
        isCheckboxChecked={confirmModal.isCheckboxChecked}
        onCheckboxChange={(checked) => setConfirmModal(prev => ({ ...prev, isCheckboxChecked: checked }))}
      />

      {isGlobalLoading && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center pointer-events-auto">
          <div className="bg-white/10 p-6 rounded-2xl flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-200">
            <Settings className="w-12 h-12 text-white animate-spin" />
            <p className="text-white font-medium text-lg tracking-wide">Aguarde!</p>
          </div>
        </div>
      )}
    </div>
  );
};

// Componente Principal Wrapper
const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(authService.getCurrentUser());
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      console.log('👋 beforeinstallprompt disparado!');
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Verifica se já está instalado
    if (window.matchMedia('(display-mode: standalone)').matches) {
      console.log('✅ App já está rodando em modo standalone');
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  useEffect(() => {
    // Escuta mudanças de estado de autenticação (ex: token expirado, logout em outra aba)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log(`Supabase Auth Event: ${event}`);
      
      if (event === 'SIGNED_OUT' || (event === 'TOKEN_REFRESHED' && !session)) {
        // Limpa usuário local se o Supabase deslogar ou revogar token
        setUser(null);
        localStorage.removeItem('finances_current_user');
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('sb-') || key.includes('supabase.auth.token')) {
            localStorage.removeItem(key);
          }
        });
      }
      
      // Se o evento for INITIAL_SESSION e não houver sessão, mas houver usuário local,
      // pode ser um sinal de que o refresh token falhou silenciosamente.
      if (event === 'INITIAL_SESSION' && !session && user) {
          console.warn("Sessão inicial vazia mas usuário local existe. Verificando...");
          authService.checkSession().then(sUser => {
              if (!sUser) {
                  setUser(null);
              }
          });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  const handleInstallClick = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the install prompt');
        } else {
          console.log('User dismissed the install prompt');
        }
        setDeferredPrompt(null);
      });
    }
  };

  useEffect(() => {
    const verifySession = async () => {
      if (user) {
        const sessionUser = await authService.checkSession();
        if (!sessionUser) {
          // Sessão do Supabase expirou ou é inválida
          authService.logout();
          setUser(null);
        }
      }
      setIsCheckingSession(false);
    };
    verifySession();
  }, [user]);

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
  };

  const handleLogout = useCallback(() => {
    authService.logout();
    setUser(null);
  }, []);

  if (isCheckingSession) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
          <p className="text-gray-600 font-medium">Verificando sessão...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen onLoginSuccess={handleLogin} />;
  }

  return (
     <AuthenticatedApp 
        key={user.id} // Força remontagem se o ID do usuário mudar
        user={user} 
        onLogout={handleLogout}
        onUpdateUser={setUser}
        onInstall={deferredPrompt ? handleInstallClick : undefined}
     />
  );
};

export default App;


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
import { Despesa, TransactionType, TransactionStatus, Category } from './types';
import { INITIAL_DESPESAS, INITIAL_CATEGORIES } from './constants';
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
  ArrowDown
} from 'lucide-react';

type View = 'dashboard' | 'payable' | 'categories' | 'expenses' | 'income';

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

const App: React.FC = () => {
  const currentDate = new Date();

  // --- STATE MANAGEMENT ---
  const [currentView, setCurrentView] = useState<View>('dashboard');
  
  // Dashboard Filters
  const [filterMonth, setFilterMonth] = useState(currentDate.getMonth());
  const [filterYear, setFilterYear] = useState(currentDate.getFullYear());
  const [isCustomizing, setIsCustomizing] = useState(false);

  // Helper para carregamento seguro do LocalStorage
  const loadFromStorage = <T,>(key: string, fallback: T): T => {
    try {
      const saved = localStorage.getItem(key);
      if (!saved) return fallback;
      const parsed = JSON.parse(saved);
      // Validação básica: se for array e o fallback também for array, aceita.
      if (Array.isArray(fallback) && !Array.isArray(parsed)) return fallback;
      return parsed;
    } catch (e) {
      console.error(`Erro ao carregar ${key} do armazenamento:`, e);
      return fallback;
    }
  };

  // Widget Configuration State (Persisted)
  const [visibleWidgets, setVisibleWidgets] = useState<Record<string, boolean>>(() => 
    loadFromStorage('dashboard_widgets', AVAILABLE_WIDGETS.reduce((acc, w) => ({ ...acc, [w.id]: w.default }), {}))
  );

  // Widget Order State (Persisted)
  const [widgetOrder, setWidgetOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('dashboard_widget_order');
      if (saved) {
        const parsedOrder = JSON.parse(saved);
        const currentIds = AVAILABLE_WIDGETS.map(w => w.id);
        const mergedOrder = [...new Set([...parsedOrder, ...currentIds])].filter(id => currentIds.includes(id));
        return mergedOrder;
      }
    } catch (e) { console.error('Error parsing order', e); }
    return AVAILABLE_WIDGETS.map(w => w.id);
  });

  // Despesa Modal State
  const [isDespesaModalOpen, setIsDespesaModalOpen] = useState(false);
  const [editingDespesa, setEditingDespesa] = useState<Despesa | null>(null);

  // Global UI States
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

  const [categories, setCategories] = useState<Category[]>(() => 
    loadFromStorage('finances_categories', INITIAL_CATEGORIES)
  );

  const [despesas, setDespesas] = useState<Despesa[]>(() => {
    const loaded = loadFromStorage('finances_despesas', INITIAL_DESPESAS);
    // Sanitização de dados antigos se necessário
    return loaded.map((t: any) => ({
      ...t,
      status: t.status || 'paid',
      amount: Number(t.amount) || 0 // Garante que amount é number
    }));
  });

  // --- PERSISTENCE ---
  // Usar useEffect com try/catch para evitar erros de QuotaExceeded
  useEffect(() => {
    try {
      localStorage.setItem('finances_despesas', JSON.stringify(despesas));
    } catch (e) {
      console.error("Erro ao salvar despesas (Provável Quota Exceeded):", e);
      // Aqui poderia adicionar um aviso ao usuário
    }
  }, [despesas]);

  useEffect(() => {
    try {
      localStorage.setItem('finances_categories', JSON.stringify(categories));
    } catch (e) { console.error("Erro ao salvar categorias:", e); }
  }, [categories]);

  useEffect(() => {
    localStorage.setItem('dashboard_widgets', JSON.stringify(visibleWidgets));
  }, [visibleWidgets]);

  useEffect(() => {
    localStorage.setItem('dashboard_widget_order', JSON.stringify(widgetOrder));
  }, [widgetOrder]);

  // --- DERIVED STATE (Filtered for Dashboard) ---
  const dashboardData = useMemo(() => {
    // Filter transactions by Month and Year
    const filtered = despesas.filter(t => {
      // Como as datas são YYYY-MM-DD strings, podemos fazer parsing manual 
      // para evitar a criação excessiva de objetos Date ou problemas de timezone
      const [y, m] = t.date.split('-').map(Number);
      // Ajuste: m no split é 1-12, filterMonth é 0-11
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
    
    // Savings Rate: (Income - Expense) / Income
    let savingsRate = 0;
    if (income > 0) {
      savingsRate = ((income - expense) / income) * 100;
    }

    return { income, expense, total, pending, savingsRate, filteredTransactions: filtered };
  }, [despesas, filterMonth, filterYear]);

  // --- HANDLERS (Wrapped in useCallback) ---
  
  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type, isVisible: true });
  }, []);

  const toggleWidget = useCallback((id: string) => {
    setVisibleWidgets(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
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

  // --- CRUD HANDLERS ---
  const handleAddDespesa = useCallback((
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
    const newDespesas: Despesa[] = [];
    const createdAt = new Date().toISOString();
    
    if (type === 'expense' && installmentsCount > 1) {
      const installmentValue = amount / installmentsCount;
      
      // Lógica de datas para parcelas (Mantendo dia fixo)
      const [startYear, startMonth, startDay] = date.split('-').map(Number);
      
      for (let i = 0; i < installmentsCount; i++) {
        // Criar data manualmente para evitar overflow de mês (ex: 31 de fev)
        // JS Date lida com overflow automaticamente, mas precisamos garantir YYYY-MM-DD
        const targetDate = new Date(startYear, (startMonth - 1) + i, startDay);
        
        // Formatar de volta para YYYY-MM-DD
        const y = targetDate.getFullYear();
        const m = String(targetDate.getMonth() + 1).padStart(2, '0');
        const d = String(targetDate.getDate()).padStart(2, '0');
        const formattedDate = `${y}-${m}-${d}`;
        
        newDespesas.push({
          id: uuidv4(),
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
      newDespesas.push({
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

    setDespesas((prev) => [...newDespesas, ...prev]);
    showToast('Transação adicionada com sucesso!', 'success');
  }, [showToast]);

  const handleUpdateDespesa = useCallback((updatedDespesa: Despesa) => {
    const finalDespesa = {
      ...updatedDespesa,
      paymentDate: updatedDespesa.status === 'paid' && updatedDespesa.type === 'expense' 
        ? updatedDespesa.paymentDate 
        : undefined
    };

    setDespesas((prev) => 
      prev.map(t => t.id === finalDespesa.id ? finalDespesa : t)
    );
    setEditingDespesa(null);
    showToast('Transação atualizada com sucesso!', 'success');
  }, [showToast]);

  const handleToggleStatus = useCallback((t: Despesa) => {
    const newStatus: TransactionStatus = t.status === 'paid' ? 'pending' : 'paid';
    const updated: Despesa = {
        ...t,
        status: newStatus,
        paymentDate: newStatus === 'paid' ? (t.paymentDate || getCurrentLocalDateString()) : undefined
    };
    
    setDespesas((prev) => 
      prev.map(item => item.id === updated.id ? updated : item)
    );
    showToast(`Status alterado para ${newStatus === 'paid' ? 'PAGO' : 'NÃO PAGO'}`, 'success');
  }, [showToast]);

  const handleDeleteDespesa = useCallback((id: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Excluir Transação",
      message: "Tem certeza que deseja excluir esta transação? Esta ação não pode ser desfeita.",
      onConfirm: () => {
        setDespesas((prev) => prev.filter((t) => t.id !== id));
        showToast('Transação removida com sucesso.', 'success');
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  }, [showToast]);

  const handleMarkAsPaid = useCallback((ids: string[], paymentDate: string) => {
    setDespesas((prev) => prev.map((t) => {
      if (ids.includes(t.id)) {
        return { 
          ...t, 
          status: 'paid' as TransactionStatus,
          paymentDate: paymentDate 
        };
      }
      return t;
    }));
    showToast(`${ids.length} conta(s) marcadas como pagas.`, 'success');
  }, [showToast]);

  // --- CATEGORY HANDLERS ---
  const handleAddCategory = useCallback((name: string, type: 'income' | 'expense' | 'both', budget?: number) => {
    setCategories(prev => {
        if (prev.some(c => c.name.toLowerCase() === name.toLowerCase())) {
            showToast('Já existe uma categoria com este nome.', 'error');
            return prev;
        }
        const newCat = { id: uuidv4(), name, type, budget: budget || 0 };
        showToast('Categoria criada com sucesso.', 'success');
        return [...prev, newCat];
    });
  }, [showToast]);

  const handleEditCategory = useCallback((id: string, name: string, type: 'income' | 'expense' | 'both', budget?: number) => {
    setCategories(prev => prev.map(c => c.id === id ? { ...c, name, type, budget: budget || 0 } : c));
    showToast('Categoria atualizada.', 'success');
  }, [showToast]);

  const handleDeleteCategory = useCallback((id: string) => {
    setCategories(prev => {
        const categoryToDelete = prev.find(c => c.id === id);
        if (!categoryToDelete) return prev;
        return prev.filter(c => c.id !== id);
    });
  }, []);

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
        onConfirm: () => {
            handleDeleteCategory(id);
            showToast('Categoria excluída.', 'success');
            setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
     });
  }, [categories, despesas, handleDeleteCategory, showToast]);


  // --- MODAL TRIGGERS ---
  const openNewDespesaModal = useCallback(() => {
    setEditingDespesa(null);
    setIsDespesaModalOpen(true);
  }, []);

  const openEditDespesaModal = useCallback((despesa: Despesa) => {
    setEditingDespesa(despesa);
    setIsDespesaModalOpen(true);
  }, []);

  // --- DASHBOARD RENDERER ---
  const renderDashboard = () => {
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    const years = Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - 2 + i);

    // Helpers for dynamic rendering
    const getWidgetComponent = (id: string) => {
      switch (id) {
        case 'total_income':
          return (
            <StatCard
              title="Receitas Totais"
              value={formatCurrency(dashboardData.income)}
              icon={ArrowUpCircle}
              colorClass="text-green-600"
              bgClass="bg-green-100"
            />
          );
        case 'total_expense':
          return (
            <StatCard
              title="Despesas Totais"
              value={formatCurrency(dashboardData.expense)}
              icon={ArrowDownCircle}
              colorClass="text-red-600"
              bgClass="bg-red-100"
            />
          );
        case 'pending_expenses':
          return (
            <StatCard
              title="Contas a Pagar"
              value={formatCurrency(dashboardData.pending)}
              icon={Clock}
              colorClass="text-yellow-600"
              bgClass="bg-yellow-100"
              borderClass="border-l-4 border-yellow-400"
            />
          );
        case 'balance':
          return (
            <StatCard
              title="Saldo do Mês"
              value={formatCurrency(dashboardData.total)}
              icon={DollarSign}
              colorClass={dashboardData.total >= 0 ? "text-blue-600" : "text-red-600"}
              bgClass={dashboardData.total >= 0 ? "bg-blue-100" : "bg-red-100"}
              borderClass={dashboardData.total >= 0 ? "border-l-4 border-blue-500" : "border-l-4 border-red-500"}
            />
          );
        case 'savings_rate':
          return (
             <StatCard
                title="Taxa de Economia"
                value={`${dashboardData.savingsRate.toFixed(1)}%`}
                icon={Percent}
                colorClass={dashboardData.savingsRate >= 20 ? "text-emerald-600" : (dashboardData.savingsRate > 0 ? "text-yellow-600" : "text-red-600")}
                bgClass={dashboardData.savingsRate >= 20 ? "bg-emerald-100" : "bg-gray-100"}
              />
          );
        case 'balance_by_category':
          // Passamos apenas as despesas filtradas para otimizar
          return <BalanceByCategory categories={categories} expenses={dashboardData.filteredTransactions} />;
        case 'evolution_chart':
          return <EvolutionChart despesas={despesas} year={filterYear} />;
        case 'category_evolution':
          return <CategoryEvolutionChart despesas={despesas} year={filterYear} />;
        case 'chart_expense':
          return <Charts despesas={dashboardData.filteredTransactions} type="expense" title={`Despesas: ${months[filterMonth]}`} />;
        case 'chart_income':
          return <Charts despesas={dashboardData.filteredTransactions} type="income" title={`Receitas: ${months[filterMonth]}`} />;
        case 'ai_insight':
          return <AIInsight despesas={dashboardData.filteredTransactions} />;
        default:
          return null;
      }
    };

    const getWidgetSpanClass = (id: string) => {
      // Configuração de grid spans para layout responsivo
      switch (id) {
        case 'balance_by_category':
        case 'evolution_chart':
        case 'category_evolution':
        case 'ai_insight':
          return 'md:col-span-2 lg:col-span-4'; // Full width on large screens
        case 'chart_expense':
        case 'chart_income':
          return 'md:col-span-1 lg:col-span-2'; // Half width on large screens
        default:
          return 'col-span-1'; // Single card
      }
    };

    return (
      <div className="space-y-6">
        {/* Filters & Customization Bar */}
        <div className="bg-white p-4 rounded-lg shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 -mt-10 mb-2 relative z-10">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-md">
              <CalendarIcon size={18} className="text-gray-500 ml-2" />
              <select 
                value={filterMonth} 
                onChange={(e) => setFilterMonth(Number(e.target.value))}
                className="bg-transparent p-1 text-sm font-medium outline-none text-gray-700 cursor-pointer"
              >
                {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-md">
              <select 
                value={filterYear} 
                onChange={(e) => setFilterYear(Number(e.target.value))}
                className="bg-transparent p-1 text-sm font-medium outline-none text-gray-700 cursor-pointer"
              >
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          <button
            onClick={() => setIsCustomizing(!isCustomizing)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              isCustomizing 
                ? 'bg-purple-100 text-purple-700' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Settings size={16} />
            Personalizar Dashboard
          </button>
        </div>

        {/* Customization Panel */}
        {isCustomizing && (
          <div className="bg-white p-6 rounded-lg shadow-md border border-purple-100 animate-fade-in mb-6">
            <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
              <Settings size={16} /> Visibilidade e Ordem dos Widgets
            </h3>
            <p className="text-xs text-gray-500 mb-4">Use as setas para reorganizar a ordem de exibição.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {widgetOrder.map((widgetId, index) => {
                const widgetDef = AVAILABLE_WIDGETS.find(w => w.id === widgetId);
                if (!widgetDef) return null;
                const isVisible = visibleWidgets[widgetId];

                return (
                  <div 
                    key={widgetId}
                    className={`flex items-center justify-between p-3 rounded-md border transition-all ${
                      isVisible 
                        ? 'border-purple-200 bg-purple-50' 
                        : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => toggleWidget(widgetId)}
                        className={`p-1.5 rounded-full transition-colors ${isVisible ? 'text-purple-700 hover:bg-purple-100' : 'text-gray-400 hover:bg-gray-200'}`}
                        title={isVisible ? 'Ocultar' : 'Mostrar'}
                      >
                        {isVisible ? <Eye size={18} /> : <EyeOff size={18} />}
                      </button>
                      <span className={`text-sm font-medium ${isVisible ? 'text-purple-900' : 'text-gray-500'}`}>
                        {widgetDef.label}
                      </span>
                    </div>

                    <div className="flex gap-1">
                      <button 
                        onClick={() => moveWidget(index, 'up')}
                        disabled={index === 0}
                        className="p-1 text-gray-500 hover:text-purple-600 hover:bg-white rounded disabled:opacity-30 disabled:hover:bg-transparent"
                        title="Mover para Cima"
                      >
                        <ArrowUp size={16} />
                      </button>
                      <button 
                        onClick={() => moveWidget(index, 'down')}
                        disabled={index === widgetOrder.length - 1}
                        className="p-1 text-gray-500 hover:text-purple-600 hover:bg-white rounded disabled:opacity-30 disabled:hover:bg-transparent"
                        title="Mover para Baixo"
                      >
                        <ArrowDown size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Dynamic Widgets Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
           {widgetOrder.map((widgetId) => {
             // Only render if visible
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

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Header currentView={currentView} onNavigate={setCurrentView} />
      
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

export default App;

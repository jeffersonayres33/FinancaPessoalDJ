
import React, { useState, useMemo } from 'react';
import { Plus, Edit2, Trash2, X, Search, Tag, ArrowUpCircle, ArrowDownCircle, ArrowRightLeft, DollarSign } from 'lucide-react';
import { Category } from '../types';
import { formatCurrency } from '../utils';

interface CategoryManagerProps {
  categories: Category[];
  onAdd: (name: string, type: 'income' | 'expense' | 'both' | 'investment', budget?: number) => void;
  onEdit: (id: string, name: string, type: 'income' | 'expense' | 'both' | 'investment', budget: number, effectConfig?: { type: 'all' | 'immediate' | 'future', month: number, year: number }) => void;
  onDelete: (id: string) => void;
  onBulkDelete?: (ids: string[]) => void;
  isPeriodFilterActive?: boolean;
}

export const CategoryManager: React.FC<CategoryManagerProps> = ({ categories, onAdd, onEdit, onDelete, onBulkDelete, isPeriodFilterActive = true }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'expense' | 'income' | 'investment'>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Add State
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<'income' | 'expense' | 'both' | 'investment'>('expense');
  const [newBudget, setNewBudget] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState<'income' | 'expense' | 'both' | 'investment'>('expense');
  const [editBudget, setEditBudget] = useState('');
  const [editErrorMsg, setEditErrorMsg] = useState('');
  
  // Budget Effect Modal State
  const [pendingEdit, setPendingEdit] = useState<{ id: string, name: string, type: any, budget: number } | null>(null);
  const [effectType, setEffectType] = useState<'all' | 'immediate' | 'future'>('immediate');
  const [effectMonth, setEffectMonth] = useState<number>(new Date().getMonth());
  const [effectYear, setEffectYear] = useState<number>(new Date().getFullYear());

  const filteredCategories = useMemo(() => {
    return categories.filter(cat => {
      const matchesSearch = (cat.name?.toLowerCase() || '').includes(searchTerm.toLowerCase());
      const matchesFilter = typeFilter === 'all' 
        ? true 
        : (typeFilter === 'income' ? (cat.type === 'income' || cat.type === 'both') : 
           typeFilter === 'expense' ? (cat.type === 'expense' || cat.type === 'both') :
           cat.type === 'investment');
      return matchesSearch && matchesFilter;
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [categories, searchTerm, typeFilter]);

  const expenseCategories = filteredCategories.filter(c => c.type === 'expense' || c.type === 'both');
  const incomeCategories = filteredCategories.filter(c => c.type === 'income' || c.type === 'both');
  const investmentCategories = filteredCategories.filter(c => c.type === 'investment');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    
    if (!newBudget || parseFloat(newBudget) <= 0) {
      setErrorMsg('O orçamento deve ser maior que zero.');
      return;
    }

    if (newName.trim()) {
      onAdd(newName, newType, parseFloat(newBudget));
      setNewName('');
      setNewBudget('');
      setIsAdding(false);
    }
  };

  const startEdit = (cat: Category) => {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditType(cat.type === 'both' ? 'expense' : cat.type);
    setEditBudget(cat.budget ? cat.budget.toString() : '');
    setEditErrorMsg('');
  };

  const saveEdit = () => {
    setEditErrorMsg('');
    
    if (!editBudget || parseFloat(editBudget) <= 0) {
      setEditErrorMsg('O orçamento é obrigatório.');
      return;
    }

    if (editName.trim() && editingId) {
      const cat = categories.find(c => c.id === editingId);
      const newB = parseFloat(editBudget);
      
      // Se não havia orçamento antes ou o valor é o mesmo, salva direto
      // Ou se estivermos visualizando "Todos os Períodos" (não há mês específico para ser marco)
      if (!isPeriodFilterActive || !cat || !cat.budget || cat.budget === newB) {
        onEdit(editingId, editName, editType, newB);
        setEditingId(null);
      } else {
        // O valor mudou e há um mês filtrado! Pede confirmação de período
        setPendingEdit({ id: editingId, name: editName, type: editType, budget: newB });
      }
    }
  };

  const confirmEdit = () => {
    if (pendingEdit) {
      onEdit(pendingEdit.id, pendingEdit.name, pendingEdit.type, pendingEdit.budget, { type: effectType, month: effectMonth, year: effectYear });
      setPendingEdit(null);
      setEditingId(null);
    }
  };

  const renderCategoryGrid = (cats: Category[], emptyMessage: string) => {
    if (cats.length === 0) {
      return (
        <div className="py-8 text-center text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-200">
          <p className="text-sm">{emptyMessage}</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {cats.map(cat => (
          <div 
            key={cat.id} 
            className={`bg-white rounded-lg p-4 shadow-sm border transition-all hover:shadow-md relative group ${editingId === cat.id ? 'ring-2 ring-purple-500 border-transparent' : selectedIds.includes(cat.id) ? 'border-purple-400 ring-1 ring-purple-400' : 'border-gray-100'}`}
          >
            {!editingId && (
              <div className="absolute top-3 right-3 z-10">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(cat.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedIds(prev => [...prev, cat.id]);
                    } else {
                      setSelectedIds(prev => prev.filter(id => id !== cat.id));
                    }
                  }}
                  className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ opacity: selectedIds.includes(cat.id) ? 1 : undefined }}
                />
              </div>
            )}
            {editingId === cat.id ? (
              <div className="space-y-3 animate-fade-in">
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                  autoFocus
                  placeholder="Nome"
                />
                <select
                  value={editType}
                  onChange={e => setEditType(e.target.value as any)}
                  className="w-full p-2 border border-gray-300 rounded text-sm outline-none bg-white"
                >
                  <option value="expense">Despesa</option>
                  <option value="income">Receita</option>
                  <option value="investment">Investimento</option>
                </select>
                <div className="relative">
                   <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                     <span className="text-gray-500 text-xs">R$</span>
                   </div>
                   <input
                    type="number"
                    value={editBudget}
                    onChange={e => setEditBudget(e.target.value)}
                    placeholder="Orçamento *"
                    className={`w-full pl-8 p-2 border rounded text-sm focus:ring-2 outline-none ${editErrorMsg ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-purple-500'}`}
                    required
                   />
                </div>
                {editErrorMsg && <p className="text-xs text-red-500">{editErrorMsg}</p>}
                
                <div className="flex gap-2 justify-end pt-2">
                   <button onClick={() => setEditingId(null)} className="px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded">Cancelar</button>
                   <button onClick={saveEdit} className="px-3 py-1 text-xs font-medium bg-purple-600 text-white hover:bg-purple-700 rounded">Salvar</button>
                </div>
              </div>
            ) : (
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3 w-full">
                  <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-lg ${
                    cat.type === 'income' ? 'bg-green-100 text-green-700' : 
                    cat.type === 'expense' ? 'bg-red-100 text-red-700' : 
                    cat.type === 'investment' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {cat.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-800 truncate" title={cat.name}>{cat.name}</h3>
                    {cat.budget && cat.budget > 0 ? (
                      <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                        <DollarSign size={12} className="text-purple-500" /> 
                        <span>Orçamento: {formatCurrency(cat.budget)}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-red-400 block mt-0.5 font-medium">Orçamento pendente</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2">
                  <button onClick={() => startEdit(cat)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"><Edit2 size={16} /></button>
                  <button onClick={() => onDelete(cat.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"><Trash2 size={16} /></button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header & Main Controls */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Categorias</h2>
            <p className="text-gray-500 text-sm">Gerencie como você organiza suas finanças</p>
          </div>
          <div className="flex items-center gap-3">
            {selectedIds.length > 0 && onBulkDelete && (
              <button
                onClick={() => {
                  onBulkDelete(selectedIds);
                  setSelectedIds([]);
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700"
              >
                <Trash2 size={20} />
                Excluir Selecionados ({selectedIds.length})
              </button>
            )}
            <button 
              onClick={() => setIsAdding(!isAdding)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${isAdding ? 'bg-gray-100 text-gray-600' : 'bg-purple-600 text-white hover:bg-purple-700 shadow-md'}`}
            >
              {isAdding ? <X size={20} /> : <Plus size={20} />}
              {isAdding ? 'Cancelar' : 'Nova Categoria'}
            </button>
          </div>
        </div>

        {/* Add Form */}
        {isAdding && (
          <form onSubmit={handleAdd} className="bg-purple-50 p-4 rounded-lg border border-purple-100 animate-fade-in mb-6">
            <div className="flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1 w-full">
                <label className="block text-xs font-semibold text-purple-800 mb-1 uppercase tracking-wider">Nome</label>
                <input
                    type="text"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    placeholder="Ex: Supermercado"
                    className="w-full p-2 border border-purple-200 rounded-md focus:ring-2 focus:ring-purple-500 outline-none"
                    autoFocus required
                />
                </div>
                <div className="w-full md:w-48">
                <label className="block text-xs font-semibold text-purple-800 mb-1 uppercase tracking-wider">Tipo</label>
                <select
                    value={newType}
                    onChange={e => setNewType(e.target.value as any)}
                    className="w-full p-2 border border-purple-200 rounded-md focus:ring-2 focus:ring-purple-500 outline-none bg-white"
                >
                    <option value="expense">Despesa</option>
                    <option value="income">Receita</option>
                    <option value="investment">Investimento</option>
                </select>
                </div>
                <div className="w-full md:w-40">
                <label className="block text-xs font-semibold text-purple-800 mb-1 uppercase tracking-wider">Orçamento (Mensal) *</label>
                <input
                    type="number"
                    value={newBudget}
                    onChange={e => setNewBudget(e.target.value)}
                    placeholder="R$ 0,00"
                    className={`w-full p-2 border rounded-md focus:ring-2 outline-none ${errorMsg ? 'border-red-300 focus:ring-red-500' : 'border-purple-200 focus:ring-purple-500'}`}
                    required
                />
                </div>
                <button type="submit" className="w-full md:w-auto bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-md font-medium transition-colors h-[42px]">
                Salvar
                </button>
            </div>
            {errorMsg && <p className="text-xs text-red-500 mt-2">{errorMsg}</p>}
          </form>
        )}

        {/* Global Filters */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between border-t border-gray-100 pt-4">
          <div className="flex items-center gap-4 w-full sm:w-auto">
            {filteredCategories.length > 0 && (
              <div className="flex items-center gap-2 mr-2">
                <input
                  type="checkbox"
                  checked={selectedIds.length === filteredCategories.length && filteredCategories.length > 0}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedIds(filteredCategories.map(c => c.id));
                    } else {
                      setSelectedIds([]);
                    }
                  }}
                  className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500 cursor-pointer"
                />
                <span className="text-sm text-gray-600">Todos</span>
              </div>
            )}
            <div className="grid grid-cols-2 sm:flex sm:flex-row p-1 bg-gray-100 rounded-lg w-full sm:w-auto gap-1">
              <button onClick={() => setTypeFilter('all')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${typeFilter === 'all' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}>Todos</button>
              <button onClick={() => setTypeFilter('expense')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${typeFilter === 'expense' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500'}`}>Despesas</button>
              <button onClick={() => setTypeFilter('income')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${typeFilter === 'income' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500'}`}>Receitas</button>
              <button onClick={() => setTypeFilter('investment')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${typeFilter === 'investment' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}>Investimentos</button>
            </div>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Buscar categoria..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 p-2 bg-gray-50 border border-transparent focus:bg-white focus:border-purple-300 rounded-md text-sm outline-none transition-all"
            />
          </div>
        </div>
      </div>

      {/* Sections Organized by Block */}
      <div className="space-y-12">
        {/* Despesas Block */}
        {(typeFilter === 'all' || typeFilter === 'expense') && (
          <section className="animate-fade-in">
            <div className="flex items-center gap-2 mb-4 border-b border-red-100 pb-2">
              <ArrowDownCircle className="text-red-500" size={24} />
              <h3 className="text-lg font-bold text-gray-800 uppercase tracking-wide">Despesas</h3>
              <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-100 ml-auto">
                {expenseCategories.length} categorias
              </span>
            </div>
            {renderCategoryGrid(expenseCategories, "Nenhuma categoria de despesa encontrada.")}
          </section>
        )}

        {/* Receitas Block */}
        {(typeFilter === 'all' || typeFilter === 'income') && (
          <section className="animate-fade-in">
            <div className="flex items-center gap-2 mb-4 border-b border-green-100 pb-2">
              <ArrowUpCircle className="text-green-500" size={24} />
              <h3 className="text-lg font-bold text-gray-800 uppercase tracking-wide">Receitas</h3>
              <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-100 ml-auto">
                {incomeCategories.length} categorias
              </span>
            </div>
            {renderCategoryGrid(incomeCategories, "Nenhuma categoria de receita encontrada.")}
          </section>
        )}

        {/* Investimentos Block */}
        {(typeFilter === 'all' || typeFilter === 'investment') && (
          <section className="animate-fade-in">
            <div className="flex items-center gap-2 mb-4 border-b border-blue-100 pb-2">
              <ArrowRightLeft className="text-blue-500" size={24} />
              <h3 className="text-lg font-bold text-gray-800 uppercase tracking-wide">Investimentos</h3>
              <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100 ml-auto">
                {investmentCategories.length} categorias
              </span>
            </div>
            {renderCategoryGrid(investmentCategories, "Nenhuma categoria de investimento encontrada.")}
          </section>
        )}
      </div>

      {filteredCategories.length === 0 && (
         <div className="py-16 text-center text-gray-400 bg-white rounded-lg border border-dashed border-gray-300">
           <Tag size={48} className="mx-auto mb-3 opacity-20" />
           <p className="text-lg font-medium">Nenhuma categoria encontrada.</p>
           <p className="text-sm">Tente ajustar sua busca ou filtros.</p>
         </div>
      )}

      {/* Confirmation Modal for Budget Change */}
      {pendingEdit && (
        <div className="fixed inset-0 bg-black/60 z-50 flex flex-col items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col border border-gray-100 animate-scale-in">
            
            {/* Header & Scrollable Body */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 min-h-0">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Alteração de Orçamento</h3>
              <p className="text-gray-600 mb-4 sm:mb-6 text-sm">
                Você alterou o orçamento da categoria <strong>{pendingEdit.name}</strong> para {formatCurrency(pendingEdit.budget)}. 
                Como deseja aplicar esta alteração?
              </p>
              
              <div className="space-y-2 sm:space-y-3">
                <label className="flex items-start gap-3 p-3 sm:p-4 rounded-lg border border-gray-200 cursor-pointer hover:border-gray-300 transition-colors">
                  <div className="pt-0.5">
                    <input 
                      type="radio" 
                      name="effect" 
                      checked={effectType === 'all'} 
                      onChange={() => setEffectType('all')}
                      className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 text-sm sm:text-base">Todas as datas (Passado, Presente e Futuro)</div>
                    <div className="text-xs text-gray-500 mt-1 line-clamp-2 sm:line-clamp-none">
                      Isso sobrescreverá qualquer histórico de orçamento. O novo valor será o padrão para sempre.
                    </div>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 sm:p-4 rounded-lg border border-gray-200 cursor-pointer hover:border-purple-300 transition-colors">
                  <div className="pt-0.5">
                    <input 
                      type="radio" 
                      name="effect" 
                      checked={effectType === 'immediate'} 
                      onChange={() => setEffectType('immediate')}
                      className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 text-sm sm:text-base">Efeito Imediato Mês Específico</div>
                    <div className="text-xs text-gray-500 mt-1 line-clamp-2 sm:line-clamp-none">
                      Começa a valer no mês selecionado. Os meses anteriores mantêm o valor antigo.
                    </div>
                  </div>
                </label>
                
                <label className="flex items-start gap-3 p-3 sm:p-4 rounded-lg border border-gray-200 cursor-pointer hover:border-blue-300 transition-colors">
                  <div className="pt-0.5">
                    <input 
                      type="radio" 
                      name="effect" 
                      checked={effectType === 'future'} 
                      onChange={() => setEffectType('future')}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 text-sm sm:text-base">Efeito Futuro A Partir do Mês Específico</div>
                    <div className="text-xs text-gray-500 mt-1 line-clamp-2 sm:line-clamp-none">
                      O mês selecionado mantém o valor antigo e o novo valor só passa a valer a partir do mês seguinte a ele.
                    </div>
                  </div>
                </label>

                {(effectType === 'immediate' || effectType === 'future') && (
                   <div className="flex flex-wrap gap-2 items-center bg-gray-50 p-3 rounded-lg border border-gray-100">
                      <span className="text-sm font-medium text-gray-700 whitespace-nowrap">Mês Base:</span>
                      <div className="flex flex-1 gap-2 min-w-[200px]">
                        <select 
                          value={effectMonth} 
                          onChange={(e) => setEffectMonth(Number(e.target.value))}
                          className="flex-1 w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm bg-white"
                        >
                          <option value={0}>Janeiro</option>
                          <option value={1}>Fevereiro</option>
                          <option value={2}>Março</option>
                          <option value={3}>Abril</option>
                          <option value={4}>Maio</option>
                          <option value={5}>Junho</option>
                          <option value={6}>Julho</option>
                          <option value={7}>Agosto</option>
                          <option value={8}>Setembro</option>
                          <option value={9}>Outubro</option>
                          <option value={10}>Novembro</option>
                          <option value={11}>Dezembro</option>
                        </select>
                        <input 
                          type="number" 
                          value={effectYear} 
                          onChange={(e) => setEffectYear(Number(e.target.value))}
                          className="w-20 sm:w-24 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm bg-white"
                        />
                      </div>
                   </div>
                )}
              </div>
            </div>
            
            {/* Sticky Footer */}
            <div className="p-4 sm:p-6 border-t border-gray-100 flex flex-col sm:flex-row justify-end gap-2 bg-gray-50 rounded-b-xl flex-shrink-0">
              <button 
                onClick={() => setPendingEdit(null)} 
                className="w-full sm:w-auto px-4 py-2 font-medium text-gray-600 hover:bg-gray-200 bg-white border border-gray-300 rounded-lg transition-colors text-center"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmEdit} 
                className="w-full sm:w-auto px-4 py-2 font-medium bg-purple-600 text-white hover:bg-purple-700 rounded-lg transition-colors border border-transparent text-center"
              >
                Confirmar
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};


import React, { useState, useMemo } from 'react';
import { Plus, Edit2, Trash2, X, Search, Tag, ArrowUpCircle, ArrowDownCircle, ArrowRightLeft, DollarSign } from 'lucide-react';
import { Category } from '../types';
import { formatCurrency } from '../utils';

interface CategoryManagerProps {
  categories: Category[];
  onAdd: (name: string, type: 'income' | 'expense' | 'both', budget?: number) => void;
  onEdit: (id: string, name: string, type: 'income' | 'expense' | 'both', budget?: number) => void;
  onDelete: (id: string) => void;
}

export const CategoryManager: React.FC<CategoryManagerProps> = ({ categories, onAdd, onEdit, onDelete }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'expense' | 'income'>('all');
  
  // Add State
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<'income' | 'expense' | 'both'>('expense');
  const [newBudget, setNewBudget] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState<'income' | 'expense' | 'both'>('expense');
  const [editBudget, setEditBudget] = useState('');
  const [editErrorMsg, setEditErrorMsg] = useState('');

  const filteredCategories = useMemo(() => {
    return categories.filter(cat => {
      const matchesSearch = cat.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = typeFilter === 'all' 
        ? true 
        : (typeFilter === 'income' ? (cat.type === 'income' || cat.type === 'both') : (cat.type === 'expense' || cat.type === 'both'));
      return matchesSearch && matchesFilter;
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [categories, searchTerm, typeFilter]);

  const expenseCategories = filteredCategories.filter(c => c.type === 'expense' || c.type === 'both');
  const incomeCategories = filteredCategories.filter(c => c.type === 'income' || c.type === 'both');

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
      onEdit(editingId, editName, editType, parseFloat(editBudget));
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
            className={`bg-white rounded-lg p-4 shadow-sm border transition-all hover:shadow-md group ${editingId === cat.id ? 'ring-2 ring-purple-500 border-transparent' : 'border-gray-100'}`}
          >
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
                    'bg-blue-100 text-blue-700'
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
          <button 
            onClick={() => setIsAdding(!isAdding)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${isAdding ? 'bg-gray-100 text-gray-600' : 'bg-purple-600 text-white hover:bg-purple-700 shadow-md'}`}
          >
            {isAdding ? <X size={20} /> : <Plus size={20} />}
            {isAdding ? 'Cancelar' : 'Nova Categoria'}
          </button>
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
          <div className="flex p-1 bg-gray-100 rounded-lg w-full sm:w-auto">
            <button onClick={() => setTypeFilter('all')} className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md text-sm font-medium transition-all ${typeFilter === 'all' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}>Todos</button>
            <button onClick={() => setTypeFilter('expense')} className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md text-sm font-medium transition-all ${typeFilter === 'expense' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500'}`}>Despesas</button>
            <button onClick={() => setTypeFilter('income')} className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md text-sm font-medium transition-all ${typeFilter === 'income' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500'}`}>Receitas</button>
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
      </div>

      {filteredCategories.length === 0 && (
         <div className="py-16 text-center text-gray-400 bg-white rounded-lg border border-dashed border-gray-300">
           <Tag size={48} className="mx-auto mb-3 opacity-20" />
           <p className="text-lg font-medium">Nenhuma categoria encontrada.</p>
           <p className="text-sm">Tente ajustar sua busca ou filtros.</p>
         </div>
      )}
    </div>
  );
};

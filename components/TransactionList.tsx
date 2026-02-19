import React, { useState, useMemo } from 'react';
import { Trash2, Search, Filter, CheckCircle, Clock } from 'lucide-react';
import { Transaction, Category } from '../types';
import { formatCurrency, formatDate } from '../utils';

interface TransactionListProps {
  transactions: Transaction[];
  onDeleteTransaction: (id: string) => void;
  categories: Category[];
}

export const TransactionList: React.FC<TransactionListProps> = ({ transactions, onDeleteTransaction, categories }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchesSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter ? t.category === categoryFilter : true;
      const matchesDate = dateFilter ? t.date.startsWith(dateFilter) : true;
      
      return matchesSearch && matchesCategory && matchesDate;
    });
  }, [transactions, searchTerm, categoryFilter, dateFilter]);

  if (transactions.length === 0) {
    return (
      <div className="text-center py-10 bg-white rounded-lg shadow-sm">
        <p className="text-gray-500">Nenhuma transação cadastrada ainda.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col h-full">
      {/* Filters Header */}
      <div className="p-4 border-b bg-gray-50">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar transações..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm"
            />
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md border text-sm font-medium transition-colors ${showFilters ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
          >
            <Filter size={18} /> Filtros
          </button>
        </div>

        {showFilters && (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-gray-200 animate-fade-in">
            <select 
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md text-sm outline-none focus:border-purple-500"
            >
              <option value="">Todas as Categorias</option>
              {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
            <input 
              type="date" 
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md text-sm outline-none focus:border-purple-500"
            />
            { (categoryFilter || dateFilter) && (
              <button 
                onClick={() => { setCategoryFilter(''); setDateFilter(''); }}
                className="text-sm text-red-500 hover:text-red-700 text-left sm:col-span-2"
              >
                Limpar filtros
              </button>
            )}
          </div>
        )}
      </div>

      {/* List */}
      <div className="overflow-x-auto flex-1">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Título</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoria</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
              <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredTransactions.map((transaction) => (
              <tr key={transaction.id} className="hover:bg-gray-50 transition-colors">
                 <td className="px-6 py-4 whitespace-nowrap">
                  {transaction.status === 'paid' ? (
                    <span className="flex items-center text-green-600 text-xs font-medium bg-green-100 px-2 py-1 rounded-full w-fit">
                      <CheckCircle size={12} className="mr-1" />
                      {transaction.type === 'income' ? 'Recebido' : 'Pago'}
                    </span>
                  ) : (
                    <span className="flex items-center text-yellow-600 text-xs font-medium bg-yellow-100 px-2 py-1 rounded-full w-fit">
                      <Clock size={12} className="mr-1" />
                      Não Pago
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{transaction.title}</td>
                <td className={`px-6 py-4 text-sm font-medium ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                  {transaction.type === 'expense' && '- '}
                  {formatCurrency(transaction.amount)}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">{transaction.category}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{formatDate(transaction.date)}</td>
                <td className="px-6 py-4 text-right text-sm font-medium">
                  <button
                    onClick={() => onDeleteTransaction(transaction.id)}
                    className="text-gray-400 hover:text-red-600 transition-colors"
                    title="Remover"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {filteredTransactions.length === 0 && (
           <div className="p-8 text-center text-gray-500 text-sm">
             Nenhuma transação encontrada com os filtros atuais.
           </div>
        )}
      </div>
    </div>
  );
};
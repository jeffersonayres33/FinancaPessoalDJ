
import React, { useState, useMemo } from 'react';
import { Search, Filter, Trash2, Edit2, Plus, Calendar, CheckCircle, Clock, ArrowDownUp, Layers, CalendarCheck, FileText, Printer, FileSpreadsheet, Repeat, TrendingUp, TrendingDown, LayoutGrid, List as ListIcon, Lock } from 'lucide-react';
import { Despesa, Category, User } from '../types';
import { formatCurrency, formatDate, getFinancialMonthRange, getFinancialYearRange, getCurrentFinancialPeriod } from '../utils';
import { BulkEditModal } from './BulkEditModal';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface IncomeListProps {
  receitas: Despesa[];
  onDeleteReceita: (id: string) => void;
  onBulkDeleteReceitas?: (ids: string[]) => void;
  onBulkEditReceitas?: (ids: string[], data: Partial<Despesa>) => void;
  onEditReceita: (receita: Despesa) => void;
  onOpenNew: () => void;
  categories: Category[];
  onToggleStatus: (receita: Despesa) => void;
  user?: User;
  onOpenPaywall?: () => void;
}

export const IncomeList: React.FC<IncomeListProps> = React.memo(({ 
  receitas, 
  onDeleteReceita, 
  onBulkDeleteReceitas,
  onBulkEditReceitas,
  onEditReceita,
  onOpenNew,
  categories,
  onToggleStatus,
  user,
  onOpenPaywall
}) => {
  const currentDate = new Date();
  const currentFinancialPeriod = getCurrentFinancialPeriod(user?.financialMonthStartDay || 1);
  const [month, setMonth] = useState<number>(currentFinancialPeriod.month);
  const [year, setYear] = useState<number>(currentFinancialPeriod.year);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending'>('all');
  const [recurrenceFilter, setRecurrenceFilter] = useState<'all' | 'fixed' | 'variable'>('all');
  const [installmentFilter, setInstallmentFilter] = useState<'all' | 'installment' | 'single'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'title' | 'createdAt'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false);

  const [categoryFilter, setCategoryFilter] = useState('all');

  // Filtros Avançados
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [createdStartDate, setCreatedStartDate] = useState('');
  const [createdEndDate, setCreatedEndDate] = useState('');

  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  const years = Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - 2 + i);

  const clearFilters = () => {
    setMonth(currentFinancialPeriod.month);
    setYear(currentFinancialPeriod.year);
    setSearchTerm('');
    setStatusFilter('all');
    setRecurrenceFilter('all');
    setInstallmentFilter('all');
    setCategoryFilter('all');
    setMinAmount('');
    setMaxAmount('');
    setStartDate('');
    setEndDate('');
    setCreatedStartDate('');
    setCreatedEndDate('');
  };

  const filteredIncome = useMemo(() => {
    return receitas
      .filter(t => t.type === 'income') // Only income
      .filter(t => {
        const [y, m, d] = (t.date || '').split('-').map(Number);
        const tDate = new Date(y, m - 1, d);
        tDate.setHours(12, 0, 0, 0); // Avoid timezone issues
        
        // Se tiver filtro de data específico, ignora o filtro de mês/ano principal
        let dateMatch = true;
        if (startDate || endDate) {
            const tDateStr = t.date;
            if (startDate && tDateStr < startDate) dateMatch = false;
            if (endDate && tDateStr > endDate) dateMatch = false;
        } else {
            const startDay = user?.financialMonthStartDay || 1;

            if (year !== -1 && month !== -1) {
                // Filter by specific financial month
                const { startDate: finStart, endDate: finEnd } = getFinancialMonthRange(year, month, startDay);
                if (tDate < finStart || tDate > finEnd) dateMatch = false;
            } else if (year !== -1 && month === -1) {
                // Filter by specific financial year
                const { startDate: finStart, endDate: finEnd } = getFinancialYearRange(year, startDay);
                if (tDate < finStart || tDate > finEnd) dateMatch = false;
            } else if (year === -1 && month !== -1) {
                // Filter by month across all years (fallback to calendar month)
                if ((m - 1) !== month) dateMatch = false;
            }
            // If both are -1, dateMatch remains true
        }

        // Creation Date Logic
        let createdDateMatch = true;
        if (createdStartDate || createdEndDate) {
          const createdAtDate = t.createdAt ? t.createdAt.split('T')[0] : t.date;
          if (createdStartDate && createdAtDate < createdStartDate) createdDateMatch = false;
          if (createdEndDate && createdAtDate > createdEndDate) createdDateMatch = false;
        }

        const statusMatch = statusFilter === 'all' || t.status === statusFilter;
        const searchMatch = (t.title?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
                            (t.category?.toLowerCase() || '').includes(searchTerm.toLowerCase());
        const categoryMatch = categoryFilter === 'all' || t.category === categoryFilter;
        
        let amountMatch = true;
        if (minAmount) amountMatch = amountMatch && t.amount >= Number(minAmount);
        if (maxAmount) amountMatch = amountMatch && t.amount <= Number(maxAmount);

        let installmentMatch = true;
        if (installmentFilter === 'installment') installmentMatch = !!t.installments && t.installments.current !== 0;
        if (installmentFilter === 'single') installmentMatch = !t.installments || t.installments.current === 0;

        let recurrenceMatch = true;
        if (recurrenceFilter === 'fixed') recurrenceMatch = !!t.isFixed;
        if (recurrenceFilter === 'variable') recurrenceMatch = !t.isFixed;

        return dateMatch && createdDateMatch && statusMatch && searchMatch && amountMatch && installmentMatch && recurrenceMatch && categoryMatch;
      })
      .sort((a, b) => {
        let comparison = 0;
        if (sortBy === 'date') {
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
        } else if (sortBy === 'amount') {
          comparison = a.amount - b.amount;
        } else if (sortBy === 'createdAt') {
          comparison = new Date(a.createdAt || a.date).getTime() - new Date(b.createdAt || b.date).getTime();
        } else {
          comparison = (a.title || '').localeCompare(b.title || '');
        }
        return sortOrder === 'asc' ? comparison : -comparison;
      });
  }, [receitas, month, year, statusFilter, sortBy, sortOrder, searchTerm, minAmount, maxAmount, startDate, endDate, createdStartDate, createdEndDate, installmentFilter, recurrenceFilter, categoryFilter]);

  const totalFiltered = filteredIncome.reduce((acc, t) => acc + t.amount, 0);
  const totalPaid = filteredIncome.filter(t => t.status === 'paid').reduce((acc, t) => acc + t.amount, 0);
  const totalPending = filteredIncome.filter(t => t.status === 'pending').reduce((acc, t) => acc + t.amount, 0);

  // Calculate Selected Total
  const selectedTotal = useMemo(() => {
    return receitas
      .filter(d => selectedIds.includes(d.id))
      .reduce((acc, curr) => acc + curr.amount, 0);
  }, [receitas, selectedIds]);

  const exportToPDF = () => {
    if (user?.plan !== 'premium' && onOpenPaywall) {
      onOpenPaywall();
      return;
    }
    const doc = new jsPDF();
    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-BR');
    const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const periodText = (month === -1 && year === -1) ? 'Todos os Períodos' : 
                       (month === -1) ? `Ano ${year}` :
                       (year === -1) ? `${months[month]} (Todos os Anos)` :
                       `${months[month]}/${year}`;

    const itemsToExport = selectedIds.length > 0 
      ? filteredIncome.filter(t => selectedIds.includes(t.id))
      : filteredIncome;
    
    const totalExport = itemsToExport.reduce((acc, curr) => acc + curr.amount, 0);

    doc.setFontSize(18);
    doc.text(`Relatório de Receitas - ${periodText}`, 14, 15);
    
    doc.setFontSize(10);
    doc.text(`Gerado em: ${dateStr}; às ${timeStr};`, 14, 22);
    doc.text(`Usuário: ${user?.name || 'Não identificado'}`, 14, 27);
    doc.text(`Total Receitas (${selectedIds.length > 0 ? 'Selecionado' : 'Filtrado'}): ${formatCurrency(totalExport)}`, 14, 32);
    doc.text(`Quantidade de itens: ${itemsToExport.length}`, 14, 37);

    const tableData = itemsToExport.map(t => [
      formatDate(t.date),
      t.title,
      t.category,
      t.isFixed ? (t.installments?.current === 0 ? 'Fixa (Inativa)' : 'Fixa') : 'Variável',
      t.status === 'paid' ? 'Recebido' : 'Pendente',
      formatCurrency(t.amount)
    ]);

    autoTable(doc, {
      head: [['Data', 'Título', 'Categoria', 'Tipo', 'Status', 'Valor']],
      body: tableData,
      startY: 45,
      headStyles: { fillColor: [22, 163, 74] }, // Green header
    });

    // Abrir em nova aba em vez de baixar
    window.open(doc.output('bloburl'), '_blank');
  };

  const exportToExcel = () => {
    if (user?.plan !== 'premium' && onOpenPaywall) {
      onOpenPaywall();
      return;
    }
    const itemsToExport = selectedIds.length > 0 
      ? filteredIncome.filter(t => selectedIds.includes(t.id))
      : filteredIncome;

    const ws = XLSX.utils.json_to_sheet(itemsToExport.map(t => ({
      Data: formatDate(t.date),
      Título: t.title,
      Categoria: t.category,
      Tipo: t.isFixed ? (t.installments?.current === 0 ? 'Fixa (Inativa)' : 'Fixa') : 'Variável',
      Status: t.status === 'paid' ? 'Recebido' : 'Pendente',
      Valor: t.amount,
      Observação: t.observation || ''
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Receitas");
    XLSX.writeFile(wb, `receitas_relatorio.xlsx`);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-lg shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            Receitas
            <span className="text-sm font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
              {filteredIncome.length} itens
            </span>
          </h2>
          <p className="text-gray-500 text-sm mt-1">
             Total filtrado: <span className="font-bold text-green-600">{formatCurrency(totalFiltered)}</span>
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2 relative items-center">
           {/* Selected Total Display */}
           {selectedIds.length > 0 && (
              <div className="hidden sm:block mr-2 animate-fade-in text-right">
                 <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Valor selecionado</div>
                 <div className="text-sm font-bold text-green-700">{formatCurrency(selectedTotal)}</div>
              </div>
           )}

           <div className="flex gap-2 w-full sm:w-auto">
              <div className="flex bg-gray-100 rounded-md p-1 mr-2">
                <button 
                  onClick={() => setViewMode('grid')} 
                  className={`p-1.5 rounded-sm ${viewMode === 'grid' ? 'bg-white shadow-sm text-green-600' : 'text-gray-500 hover:text-gray-700'}`} 
                  title="Visualização em Blocos"
                >
                  <LayoutGrid size={16} />
                </button>
                <button 
                  onClick={() => setViewMode('list')} 
                  className={`p-1.5 rounded-sm ${viewMode === 'list' ? 'bg-white shadow-sm text-green-600' : 'text-gray-500 hover:text-gray-700'}`} 
                  title="Visualização em Lista"
                >
                  <ListIcon size={16} />
                </button>
              </div>
              <button 
                onClick={exportToPDF} 
                className={`relative flex-1 sm:flex-none px-3 py-2 rounded-md font-medium text-sm transition-colors flex items-center justify-center gap-2 ${user?.plan !== 'premium' ? 'bg-gray-50 text-gray-400 border border-gray-200' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`} 
                title="Exportar PDF"
              >
                <Printer size={18} /> 
                <span className="hidden sm:inline">PDF</span>
                {user?.plan !== 'premium' && (
                  <div className="absolute bottom-1 right-1 text-gray-400">
                    <Lock size={10} />
                  </div>
                )}
              </button>
              <button 
                onClick={exportToExcel} 
                className={`relative flex-1 sm:flex-none px-3 py-2 rounded-md font-medium text-sm transition-colors flex items-center justify-center gap-2 ${user?.plan !== 'premium' ? 'bg-gray-50 text-gray-400 border border-gray-200' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`} 
                title="Exportar Excel"
              >
                <FileSpreadsheet size={18} /> 
                <span className="hidden sm:inline">Excel</span>
                {user?.plan !== 'premium' && (
                  <div className="absolute bottom-1 right-1 text-gray-400">
                    <Lock size={10} />
                  </div>
                )}
              </button>
           </div>

           <button 
             onClick={onOpenNew}
             className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-medium text-sm transition-colors flex items-center justify-center gap-2 shadow-sm w-full sm:w-auto mt-2 sm:mt-0"
           >
             <Plus size={18} /> Nova Receita
           </button>
        </div>
      </div>

      {/* Mobile Selected Value (Shows below title on mobile only when selected) */}
      {selectedIds.length > 0 && (
        <div className="sm:hidden bg-green-50 p-2 rounded-md border border-green-100 flex justify-between items-center animate-fade-in mb-4">
             <span className="text-xs font-bold text-gray-600 uppercase">Valor selecionado:</span>
             <span className="text-sm font-bold text-green-700">{formatCurrency(selectedTotal)}</span>
        </div>
      )}

      {/* Filters Section */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-4">
           {/* Month/Year Selectors */}
           <div className="flex flex-col gap-1 w-full md:w-auto">
             <div className="flex items-center gap-2 w-full md:w-auto">
                <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-md flex-1 md:flex-none">
                  <Calendar size={18} className="text-gray-500 ml-2" />
                  <select 
                    value={month} 
                    onChange={(e) => setMonth(Number(e.target.value))} 
                    className="bg-transparent p-1 text-sm font-medium outline-none text-gray-700 cursor-pointer w-full md:w-auto"
                  >
                    <option value={-1}>Todos</option>
                    {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-md">
                  <select 
                    value={year} 
                    onChange={(e) => setYear(Number(e.target.value))} 
                    className="bg-transparent p-1 text-sm font-medium outline-none text-gray-700 cursor-pointer"
                  >
                    <option value={-1}>Todos</option>
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
             </div>
             {month !== -1 && year !== -1 && (
               <span className="text-xs text-gray-500 px-1">
                 Período: {getFinancialMonthRange(year, month, user?.financialMonthStartDay || 1).startDate.toLocaleDateString('pt-BR')} a {getFinancialMonthRange(year, month, user?.financialMonthStartDay || 1).endDate.toLocaleDateString('pt-BR')}
               </span>
             )}
           </div>

           <div className="relative w-full md:w-auto flex-1">
             <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
             <input
               type="text"
               placeholder="Buscar receita..."
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-full focus:ring-2 focus:ring-green-500 outline-none text-sm"
             />
           </div>
           
           <div className="flex gap-2 w-full md:w-auto">
             <button 
               onClick={() => setShowFilters(!showFilters)}
               className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${showFilters ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
             >
               <Filter size={16} /> Filtros
             </button>
             
             <div className="flex bg-gray-100 rounded-full p-1">
                <button onClick={() => { setSortBy('date'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }} className={`p-2 rounded-full ${sortBy === 'date' ? 'bg-white shadow-sm text-green-600' : 'text-gray-500'}`} title="Ordenar por Data"><Calendar size={16} /></button>
                <button onClick={() => { setSortBy('createdAt'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }} className={`p-2 rounded-full ${sortBy === 'createdAt' ? 'bg-white shadow-sm text-green-600' : 'text-gray-500'}`} title="Ordenar por Data de Criação"><Clock size={16} /></button>
                <button onClick={() => { setSortBy('amount'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }} className={`p-2 rounded-full ${sortBy === 'amount' ? 'bg-white shadow-sm text-green-600' : 'text-gray-500'}`} title="Ordenar por Valor"><ArrowDownUp size={16} /></button>
             </div>
           </div>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3 pt-4 border-t border-gray-100 animate-fade-in-down">
             <select 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="p-2 border border-gray-300 rounded-md text-sm outline-none bg-white"
             >
                <option value="all">Status: Todos</option>
                <option value="paid">Recebidos</option>
                <option value="pending">Pendentes</option>
             </select>

             <select 
                value={recurrenceFilter} 
                onChange={(e) => setRecurrenceFilter(e.target.value as any)}
                className="p-2 border border-gray-300 rounded-md text-sm outline-none bg-white"
             >
                <option value="all">Tipo: Todos</option>
                <option value="fixed">Fixas</option>
                <option value="variable">Variáveis</option>
             </select>

             <select 
                value={installmentFilter} 
                onChange={(e) => setInstallmentFilter(e.target.value as any)}
                className="p-2 border border-gray-300 rounded-md text-sm outline-none bg-white"
             >
                <option value="all">Parcelamento: Todos</option>
                <option value="installment">Parcelados</option>
                <option value="single">À Vista</option>
             </select>

             <select 
                value={categoryFilter} 
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="p-2 border border-gray-300 rounded-md text-sm outline-none bg-white"
             >
                <option value="all">Categoria: Todas</option>
                {categories.filter(c => c.type === 'income' || c.type === 'both').map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                ))}
             </select>

             <input type="number" placeholder="Min R$" value={minAmount} onChange={e => setMinAmount(e.target.value)} className="p-2 border border-gray-300 rounded-md text-sm outline-none" />
             <input type="number" placeholder="Max R$" value={maxAmount} onChange={e => setMaxAmount(e.target.value)} className="p-2 border border-gray-300 rounded-md text-sm outline-none" />
             
             <div className="md:col-span-2 flex flex-col gap-1">
                <span className="text-xs text-gray-500 font-medium">Data de Criação</span>
                <div className="flex gap-2 items-center">
                  <input type="date" value={createdStartDate} onChange={e => setCreatedStartDate(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md text-sm outline-none" placeholder="Data Inicial" />
                  <span className="text-gray-400">-</span>
                  <input type="date" value={createdEndDate} onChange={e => setCreatedEndDate(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md text-sm outline-none" placeholder="Data Final" />
                </div>
             </div>

             <div className="md:col-span-3 lg:col-span-5 flex justify-end">
                <button onClick={clearFilters} className="text-xs text-red-500 hover:underline">Limpar Filtros</button>
             </div>
          </div>
        )}

        {/* Resumo Rápido */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mt-4 pt-4 border-t border-gray-100 text-sm gap-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="text-gray-500">Exibindo {filteredIncome.length} receitas</div>
              {filteredIncome.length > 0 && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === filteredIncome.length && filteredIncome.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIds(filteredIncome.map(t => t.id));
                      } else {
                        setSelectedIds([]);
                      }
                    }}
                    className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500 cursor-pointer"
                  />
                  <span className="text-gray-600">Selecionar Todos</span>
                </div>
              )}
              {selectedIds.length > 0 && onBulkDeleteReceitas && (
                <button
                  onClick={() => {
                    onBulkDeleteReceitas(selectedIds);
                    setSelectedIds([]);
                  }}
                  className="text-red-600 hover:text-red-800 font-medium flex items-center gap-1 bg-red-50 px-2 py-1 rounded-md transition-colors"
                >
                  <Trash2 size={14} /> Excluir ({selectedIds.length})
                </button>
              )}
              {selectedIds.length > 1 && onBulkEditReceitas && (
                <button
                  onClick={() => setIsBulkEditModalOpen(true)}
                  className="text-green-600 hover:text-green-800 font-medium flex items-center gap-1 bg-green-50 px-2 py-1 rounded-md transition-colors"
                >
                  <Edit2 size={14} /> <span className="hidden sm:inline">Editar em Massa</span><span className="sm:hidden">Editar</span> ({selectedIds.length})
                </button>
              )}
            </div>
            <div className="flex gap-4 font-medium flex-wrap">
                <span className="text-green-600">Recebido: {formatCurrency(totalPaid)}</span>
                <span className="text-yellow-600">Pendente: {formatCurrency(totalPending)}</span>
                <span className="text-gray-800">Total: {formatCurrency(totalFiltered)}</span>
            </div>
        </div>
      </div>

      {/* Lista de Cards ou Tabela */}
      {filteredIncome.length > 0 ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredIncome.map((t) => (
              <div 
                key={t.id} 
                className={`bg-white rounded-xl shadow-sm border transition-all hover:shadow-md relative overflow-hidden group ${selectedIds.includes(t.id) ? 'border-purple-400 ring-1 ring-purple-400' : 'border-gray-100'}`}
              >
                <div className="absolute top-4 right-4 z-10">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(t.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIds(prev => [...prev, t.id]);
                      } else {
                        setSelectedIds(prev => prev.filter(id => id !== t.id));
                      }
                    }}
                    className="w-5 h-5 text-purple-600 rounded border-gray-300 focus:ring-purple-500 cursor-pointer"
                  />
                </div>
                <div className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-bold text-gray-800 text-lg leading-tight">{t.title}</h3>
                      <div className="flex gap-2 mt-1 flex-wrap">
                         <span className="text-xs font-medium px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                            {t.category}
                         </span>
                         {t.isFixed && (
                           <span className={`text-xs font-medium px-2 py-0.5 rounded flex items-center gap-1 ${t.installments?.current === 0 ? 'bg-red-100 text-red-700' : 'bg-indigo-100 text-indigo-700'}`} title={t.installments?.current === 0 ? "Receita Fixa (Inativa)" : "Receita Fixa (Recorrente)"}>
                              <Repeat size={10} /> {t.installments?.current === 0 ? 'Fixa (Inativa)' : 'Fixa'}
                           </span>
                         )}
                         {t.isAutoGenerated && (
                           <span className="text-xs font-medium px-2 py-0.5 rounded bg-amber-100 text-amber-700 flex items-center gap-1" title="Lançado automaticamente pelo sistema">
                              <Repeat size={10} /> Lançado auto
                           </span>
                         )}
                         {t.installments && t.installments.current !== 0 && t.installments.total > 1 && (
                           <span className="text-xs font-medium px-2 py-0.5 rounded bg-purple-100 text-purple-700 flex items-center gap-1">
                              <Layers size={10} /> Parcelado {t.installments.current}/{t.installments.total}
                           </span>
                         )}
                      </div>
                    </div>
                    <div className="text-right mt-1 mr-6">
                       <span className="block font-bold text-lg text-green-600">{formatCurrency(t.amount)}</span>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                     <div className="flex items-center text-sm text-gray-600">
                        <Calendar size={14} className="mr-2 opacity-70" />
                        <span className="mr-1">Data:</span>
                        <span className="font-medium">{formatDate(t.date)}</span>
                     </div>

                     <div className="flex flex-col gap-2">
                       {t.status === 'paid' ? (
                         <div className="flex items-center text-[10px] font-bold px-2 py-0.5 rounded w-fit text-green-700 bg-green-50 border border-green-100">
                            <CheckCircle size={10} className="mr-1" />
                            <span>RECEBIDO {t.paymentDate && <span className="font-normal opacity-80 ml-1">em {formatDate(t.paymentDate)}</span>}</span>
                         </div>
                       ) : (
                         <div className="flex items-center text-[10px] font-bold px-2 py-0.5 rounded w-fit text-yellow-700 bg-yellow-50 border border-yellow-100">
                            <Clock size={10} className="mr-1" />
                            <span>PENDENTE</span>
                         </div>
                       )}
                     </div>

                     {t.observation && (
                       <div className="flex items-start text-xs text-gray-500 bg-gray-50 p-2 rounded mt-2 border border-gray-100">
                          <FileText size={12} className="mr-1 mt-0.5 flex-shrink-0" />
                          <p className="line-clamp-2">{t.observation}</p>
                       </div>
                     )}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                     <div className="flex flex-col">
                       <div className="text-xs text-gray-400 italic">
                          {t.createdAt ? `Criado em ${formatDate(t.createdAt)}` : ''}
                       </div>
                       {t.updatedAt && (
                         <div className="text-xs text-gray-400 italic">
                            Data da edição: {formatDate(t.updatedAt)}
                         </div>
                       )}
                     </div>
                     <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onToggleStatus) onToggleStatus(t);
                          }}
                          className={`p-2 rounded-full transition-colors ${t.status === 'paid' ? 'text-yellow-500 hover:bg-yellow-50' : 'text-green-500 hover:bg-green-50'}`}
                          title={t.status === 'paid' ? 'Marcar como Pendente' : 'Marcar como Recebido'}
                        >
                           {t.status === 'paid' ? <Clock size={16} /> : <CheckCircle size={16} />}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditReceita(t);
                          }}
                          className="p-2 text-blue-500 hover:bg-blue-50 rounded-full transition-colors"
                          title="Editar"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteReceita(t.id);
                          }}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                          title="Excluir"
                        >
                          <Trash2 size={16} />
                        </button>
                     </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 text-xs uppercase tracking-wider">
                    <th className="p-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.length === filteredIncome.length && filteredIncome.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedIds(filteredIncome.map(t => t.id));
                          } else {
                            setSelectedIds([]);
                          }
                        }}
                        className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500 cursor-pointer"
                      />
                    </th>
                    <th className="p-3 font-medium">Data</th>
                    <th className="p-3 font-medium">Descrição</th>
                    <th className="p-3 font-medium">Categoria</th>
                    <th className="p-3 font-medium">Status</th>
                    <th className="p-3 font-medium text-right">Valor</th>
                    <th className="p-3 font-medium text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredIncome.map((t) => (
                    <tr key={t.id} className={`hover:bg-gray-50 transition-colors cursor-pointer ${selectedIds.includes(t.id) ? 'bg-purple-50/50' : ''}`} onClick={() => {
                      if (selectedIds.includes(t.id)) {
                        setSelectedIds(prev => prev.filter(id => id !== t.id));
                      } else {
                        setSelectedIds(prev => [...prev, t.id]);
                      }
                    }}>
                      <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(t.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedIds(prev => [...prev, t.id]);
                            } else {
                              setSelectedIds(prev => prev.filter(id => id !== t.id));
                            }
                          }}
                          className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500 cursor-pointer"
                        />
                      </td>
                      <td className="p-3 text-sm text-gray-600 whitespace-nowrap">
                        {formatDate(t.date)}
                      </td>
                      <td className="p-3">
                        <div className="font-medium text-gray-800">{t.title}</div>
                        {t.observation && <div className="text-xs text-gray-400 line-clamp-1 mt-0.5">{t.observation}</div>}
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          <span className="text-xs font-medium px-2 py-0.5 rounded bg-gray-100 text-gray-600 whitespace-nowrap">
                            {t.category}
                          </span>
                          {t.isFixed && (
                            <span className={`text-xs font-medium px-1.5 py-0.5 rounded flex items-center gap-1 whitespace-nowrap ${t.installments?.current === 0 ? 'bg-red-100 text-red-700' : 'bg-indigo-100 text-indigo-700'}`} title={t.installments?.current === 0 ? "Receita Fixa (Inativa)" : "Receita Fixa (Recorrente)"}>
                              <Repeat size={10} /> {t.installments?.current === 0 ? 'Fixa (Inativa)' : 'Fixa'}
                            </span>
                          )}
                          {t.installments && t.installments.current !== 0 && t.installments.total > 1 && (
                            <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 flex items-center gap-1 whitespace-nowrap">
                              <Layers size={10} /> {t.installments.current}/{t.installments.total}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        {t.status === 'paid' ? (
                          <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded text-green-700 bg-green-50 border border-green-100 whitespace-nowrap">
                            <CheckCircle size={10} className="mr-1" /> RECEBIDO
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded text-yellow-700 bg-yellow-50 border border-yellow-100 whitespace-nowrap">
                            <Clock size={10} className="mr-1" /> PENDENTE
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right font-bold text-green-600 whitespace-nowrap">
                        {formatCurrency(t.amount)}
                      </td>
                      <td className="p-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onToggleStatus) onToggleStatus(t);
                            }}
                            className={`p-1.5 rounded-md transition-colors ${t.status === 'paid' ? 'text-yellow-500 hover:bg-yellow-50' : 'text-green-500 hover:bg-green-50'}`}
                            title={t.status === 'paid' ? 'Marcar como Pendente' : 'Marcar como Recebido'}
                          >
                             {t.status === 'paid' ? <Clock size={14} /> : <CheckCircle size={14} />}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditReceita(t);
                            }}
                            className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-md transition-colors"
                            title="Editar"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteReceita(t.id);
                            }}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                            title="Excluir"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
         <div className="p-12 text-center text-gray-400 flex flex-col items-center bg-white rounded-lg shadow-sm">
           <CalendarCheck size={48} className="mb-4 opacity-20" />
           <p>Nenhuma receita encontrada para os filtros selecionados.</p>
         </div>
      )}

      <BulkEditModal 
        isOpen={isBulkEditModalOpen}
        onClose={() => setIsBulkEditModalOpen(false)}
        onConfirm={(data) => {
          if (onBulkEditReceitas) {
            onBulkEditReceitas(selectedIds, data);
            setSelectedIds([]);
          }
        }}
        categories={categories}
        type="income"
        selectedCount={selectedIds.length}
      />
    </div>
  );
});

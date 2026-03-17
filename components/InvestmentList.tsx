import React, { useState, useMemo } from 'react';
import { Search, Filter, Trash2, Edit2, Plus, Calendar, ArrowDownUp, FileText, Printer, FileSpreadsheet, TrendingUp, TrendingDown, DollarSign, CalendarCheck, Repeat, Clock } from 'lucide-react';
import { Despesa, Category, User } from '../types';
import { formatCurrency, formatDate } from '../utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface InvestmentListProps {
  investimentos: Despesa[];
  onDeleteInvestimento: (id: string) => void;
  onBulkDeleteInvestimentos?: (ids: string[]) => void;
  onEditInvestimento: (investimento: Despesa) => void;
  onOpenNew: () => void;
  categories: Category[];
  onToggleStatus: (investimento: Despesa) => void;
  user?: User;
}

export const InvestmentList: React.FC<InvestmentListProps> = React.memo(({ 
  investimentos, 
  onDeleteInvestimento, 
  onBulkDeleteInvestimentos,
  onEditInvestimento,
  onOpenNew,
  categories,
  onToggleStatus,
  user
}) => {
  const currentDate = new Date();
  
  const [month, setMonth] = useState<number>(currentDate.getMonth());
  const [year, setYear] = useState<number>(currentDate.getFullYear());
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'in' | 'out'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'title' | 'createdAt'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [categoryFilter, setCategoryFilter] = useState('all');
  const [recurrenceFilter, setRecurrenceFilter] = useState<'all' | 'fixed' | 'variable'>('all');

  // Filtros Avançados
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  const years = Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - 2 + i);

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setCategoryFilter('all');
    setRecurrenceFilter('all');
    setMinAmount('');
    setMaxAmount('');
    setStartDate('');
    setEndDate('');
  };

  const filteredInvestments = useMemo(() => {
    return investimentos
      .filter(t => t.type === 'investment')
      .filter(t => {
        const [y, m] = t.date.split('-').map(Number);
        
        // Se tiver filtro de data específico, ignora o filtro de mês/ano principal
        let dateMatch = true;
        if (startDate || endDate) {
            const tDate = new Date(t.date);
            if (startDate) dateMatch = dateMatch && tDate >= new Date(startDate);
            if (endDate) dateMatch = dateMatch && tDate <= new Date(endDate);
        } else {
            // Se month ou year for -1, considera "Todos"
            const monthMatch = month === -1 || (m - 1) === month;
            const yearMatch = year === -1 || y === year;
            dateMatch = monthMatch && yearMatch;
        }

        const statusMatch = statusFilter === 'all' || t.status === statusFilter;
        const searchMatch = t.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            t.category.toLowerCase().includes(searchTerm.toLowerCase());
        const categoryMatch = categoryFilter === 'all' || t.category === categoryFilter;
        const recurrenceMatch = recurrenceFilter === 'all' || 
                                (recurrenceFilter === 'fixed' && t.isFixed) || 
                                (recurrenceFilter === 'variable' && !t.isFixed);
        
        let amountMatch = true;
        if (minAmount) amountMatch = amountMatch && t.amount >= Number(minAmount);
        if (maxAmount) amountMatch = amountMatch && t.amount <= Number(maxAmount);

        return dateMatch && statusMatch && searchMatch && amountMatch && categoryMatch && recurrenceMatch;
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
          comparison = a.title.localeCompare(b.title);
        }
        return sortOrder === 'asc' ? comparison : -comparison;
      });
  }, [investimentos, month, year, statusFilter, sortBy, sortOrder, searchTerm, minAmount, maxAmount, startDate, endDate, categoryFilter, recurrenceFilter]);

  // Calculate totals for all time (not just filtered)
  const allTimeInvestments = useMemo(() => investimentos.filter(t => t.type === 'investment'), [investimentos]);
  const totalIn = allTimeInvestments.filter(t => t.status === 'in').reduce((acc, t) => acc + t.amount, 0);
  const totalOut = allTimeInvestments.filter(t => t.status === 'out').reduce((acc, t) => acc + t.amount, 0);
  const totalBalance = totalIn - totalOut;

  const filteredTotalIn = filteredInvestments.filter(t => t.status === 'in').reduce((acc, t) => acc + t.amount, 0);
  const filteredTotalOut = filteredInvestments.filter(t => t.status === 'out').reduce((acc, t) => acc + t.amount, 0);

  const exportToPDF = () => {
    const doc = new jsPDF();
    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-BR');
    const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const periodText = (month === -1 && year === -1) ? 'Todos os Períodos' : 
                       (month === -1) ? `Ano ${year}` :
                       (year === -1) ? `${months[month]} (Todos os Anos)` :
                       `${months[month]}/${year}`;
    
    doc.setFontSize(18);
    doc.text(`Relatório de Investimentos - ${periodText}`, 14, 15);
    
    doc.setFontSize(10);
    doc.text(`Gerado em: ${dateStr}; às ${timeStr};`, 14, 22);
    doc.text(`Usuário: ${user?.name || 'Não identificado'}`, 14, 27);
    doc.text(`Total Entradas (Filtrado): ${formatCurrency(filteredTotalIn)}`, 14, 32);
    doc.text(`Total Saídas (Filtrado): ${formatCurrency(filteredTotalOut)}`, 14, 37);
    doc.text(`Quantidade de itens: ${filteredInvestments.length}`, 14, 42);

    const tableData = filteredInvestments.map(t => [
      formatDate(t.date),
      t.title,
      t.category,
      t.status === 'in' ? 'Entrada' : 'Saída',
      formatCurrency(t.amount)
    ]);

    autoTable(doc, {
      head: [['Data', 'Título', 'Categoria', 'Tipo', 'Valor']],
      body: tableData,
      startY: 50,
      headStyles: { fillColor: [59, 130, 246] }, // Blue header
    });

    // Abrir em nova aba em vez de baixar
    window.open(doc.output('bloburl'), '_blank');
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filteredInvestments.map(t => ({
      Data: formatDate(t.date),
      Título: t.title,
      Categoria: t.category,
      Tipo: t.status === 'in' ? 'Entrada' : 'Saída',
      Valor: t.amount,
      Observação: t.observation || ''
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Investimentos");
    XLSX.writeFile(wb, `investimentos_relatorio.xlsx`);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Resumo Geral (All Time) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-blue-500 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 font-medium">Investimento Total</p>
            <h3 className="text-2xl font-bold text-gray-800 mt-1">{formatCurrency(totalIn)}</h3>
          </div>
          <div className="p-3 bg-blue-50 rounded-full text-blue-600">
            <TrendingUp size={24} />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-orange-500 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 font-medium">Saída Total</p>
            <h3 className="text-2xl font-bold text-gray-800 mt-1">{formatCurrency(totalOut)}</h3>
          </div>
          <div className="p-3 bg-orange-50 rounded-full text-orange-600">
            <TrendingDown size={24} />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-emerald-500 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 font-medium">Saldo Total</p>
            <h3 className="text-2xl font-bold text-gray-800 mt-1">{formatCurrency(totalBalance)}</h3>
          </div>
          <div className="p-3 bg-emerald-50 rounded-full text-emerald-600">
            <DollarSign size={24} />
          </div>
        </div>
      </div>

      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-lg shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            Investimentos
            <span className="text-sm font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
              {filteredInvestments.length} itens
            </span>
          </h2>
          <p className="text-gray-500 text-sm mt-1">
             Entradas: <span className="font-bold text-blue-600">{formatCurrency(filteredTotalIn)}</span> | 
             Saídas: <span className="font-bold text-orange-600">{formatCurrency(filteredTotalOut)}</span>
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2 relative">
           <div className="flex gap-2">
              <button onClick={exportToPDF} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-md font-medium text-sm transition-colors flex items-center gap-2" title="Exportar PDF">
                <Printer size={18} /> <span className="hidden sm:inline">PDF</span>
              </button>
              <button onClick={exportToExcel} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-md font-medium text-sm transition-colors flex items-center gap-2" title="Exportar Excel">
                <FileSpreadsheet size={18} /> <span className="hidden sm:inline">Excel</span>
              </button>
           </div>

           <button 
             onClick={onOpenNew}
             className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium text-sm transition-colors flex items-center gap-2 shadow-sm"
           >
             <Plus size={18} /> Novo Investimento
           </button>
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-4">
           {/* Month/Year Selectors */}
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

           <div className="relative w-full md:w-auto flex-1">
             <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
             <input
               type="text"
               placeholder="Buscar investimento..."
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 outline-none text-sm"
             />
           </div>
           
           <div className="flex gap-2 w-full md:w-auto">
             <button 
               onClick={() => setShowFilters(!showFilters)}
               className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${showFilters ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
             >
               <Filter size={16} /> Filtros
             </button>
             
             <div className="flex bg-gray-100 rounded-full p-1">
                <button onClick={() => { setSortBy('date'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }} className={`p-2 rounded-full ${sortBy === 'date' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`} title="Ordenar por Data"><Calendar size={16} /></button>
                <button onClick={() => { setSortBy('createdAt'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }} className={`p-2 rounded-full ${sortBy === 'createdAt' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`} title="Ordenar por Data de Criação"><Clock size={16} /></button>
                <button onClick={() => { setSortBy('amount'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }} className={`p-2 rounded-full ${sortBy === 'amount' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`} title="Ordenar por Valor"><ArrowDownUp size={16} /></button>
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
                <option value="all">Tipo: Todos</option>
                <option value="in">Entradas</option>
                <option value="out">Saídas</option>
             </select>

             <select 
                value={recurrenceFilter} 
                onChange={(e) => setRecurrenceFilter(e.target.value as any)}
                className="p-2 border border-gray-300 rounded-md text-sm outline-none bg-white"
             >
                <option value="all">Recorrência: Todas</option>
                <option value="fixed">Fixos</option>
                <option value="variable">Variáveis</option>
             </select>

             <select 
                value={categoryFilter} 
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="p-2 border border-gray-300 rounded-md text-sm outline-none bg-white"
             >
                <option value="all">Categoria: Todas</option>
                {categories.filter(c => c.type === 'investment' || c.type === 'both').map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                ))}
             </select>

             <input type="number" placeholder="Min R$" value={minAmount} onChange={e => setMinAmount(e.target.value)} className="p-2 border border-gray-300 rounded-md text-sm outline-none" />
             <input type="number" placeholder="Max R$" value={maxAmount} onChange={e => setMaxAmount(e.target.value)} className="p-2 border border-gray-300 rounded-md text-sm outline-none" />
             
             <div className="md:col-span-3 lg:col-span-5 flex justify-end">
                <button onClick={clearFilters} className="text-xs text-red-500 hover:underline">Limpar Filtros</button>
             </div>
          </div>
        )}

        {/* Resumo Rápido */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mt-4 pt-4 border-t border-gray-100 text-sm gap-4">
            <div className="flex items-center gap-4">
              <div className="text-gray-500">Exibindo {filteredInvestments.length} investimentos</div>
              {filteredInvestments.length > 0 && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === filteredInvestments.length && filteredInvestments.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIds(filteredInvestments.map(t => t.id));
                      } else {
                        setSelectedIds([]);
                      }
                    }}
                    className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500 cursor-pointer"
                  />
                  <span className="text-gray-600">Selecionar Todos</span>
                </div>
              )}
              {selectedIds.length > 0 && onBulkDeleteInvestimentos && (
                <button
                  onClick={() => {
                    onBulkDeleteInvestimentos(selectedIds);
                    setSelectedIds([]);
                  }}
                  className="text-red-600 hover:text-red-800 font-medium flex items-center gap-1 bg-red-50 px-2 py-1 rounded-md transition-colors"
                >
                  <Trash2 size={14} /> Excluir Selecionados ({selectedIds.length})
                </button>
              )}
            </div>
            <div className="flex gap-4 font-medium flex-wrap">
                <span className="text-blue-600">Entradas: {formatCurrency(filteredTotalIn)}</span>
                <span className="text-orange-600">Saídas: {formatCurrency(filteredTotalOut)}</span>
            </div>
        </div>
      </div>

      {/* Lista de Cards */}
      {filteredInvestments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredInvestments.map((t) => (
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
                         <span className="text-xs font-medium px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 flex items-center gap-1" title="Investimento Fixo (Recorrente)">
                            <Repeat size={10} /> Fixo
                         </span>
                       )}
                       {t.isAutoGenerated && (
                         <span className="text-xs font-medium px-2 py-0.5 rounded bg-amber-100 text-amber-700 flex items-center gap-1" title="Lançado automaticamente pelo sistema">
                            <Repeat size={10} /> Lançado auto
                         </span>
                       )}
                    </div>
                  </div>
                  <div className="text-right mt-1 mr-6">
                     <span className={`block font-bold text-lg ${t.status === 'in' ? 'text-blue-600' : 'text-orange-600'}`}>
                        {t.status === 'out' ? '-' : ''}{formatCurrency(t.amount)}
                     </span>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                   <div className="flex items-center text-sm text-gray-600">
                      <Calendar size={14} className="mr-2 opacity-70" />
                      <span className="mr-1">Data:</span>
                      <span className="font-medium">{formatDate(t.date)}</span>
                   </div>

                   {t.status === 'in' ? (
                     <div className="flex items-center text-sm text-blue-700 bg-blue-50 p-1.5 rounded">
                        <TrendingUp size={14} className="mr-2" />
                        <div>
                          <span className="font-bold block text-xs">ENTRADA</span>
                        </div>
                     </div>
                   ) : (
                     <div className="flex items-center text-sm text-orange-700 bg-orange-50 p-1.5 rounded">
                        <TrendingDown size={14} className="mr-2" />
                        <div>
                          <span className="font-bold block text-xs">SAÍDA</span>
                        </div>
                     </div>
                   )}

                   {t.observation && (
                     <div className="flex items-start text-xs text-gray-500 bg-gray-50 p-2 rounded mt-2 border border-gray-100">
                        <FileText size={12} className="mr-1 mt-0.5 flex-shrink-0" />
                        <p className="line-clamp-2">{t.observation}</p>
                     </div>
                   )}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                   <div className="text-xs text-gray-400 italic">
                      {t.createdAt ? `Criado em ${formatDate(t.createdAt)}` : ''}
                   </div>
                   <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditInvestimento(t);
                        }}
                        className="p-2 text-blue-500 hover:bg-blue-50 rounded-full transition-colors"
                        title="Editar"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteInvestimento(t.id);
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
         <div className="p-12 text-center text-gray-400 flex flex-col items-center bg-white rounded-lg shadow-sm">
           <CalendarCheck size={48} className="mb-4 opacity-20" />
           <p>Nenhum investimento encontrado para os filtros selecionados.</p>
         </div>
      )}
    </div>
  );
});

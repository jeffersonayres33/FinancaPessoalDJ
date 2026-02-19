
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, Filter, Trash2, Edit2, Plus, Calendar, ArrowDownUp, FileText, Printer, Download, FileSpreadsheet, File as FileIcon, ChevronDown, CalendarCheck, CheckCircle, Clock } from 'lucide-react';
import { Despesa, Category } from '../types';
import { formatCurrency, formatDate, printData } from '../utils';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

interface IncomeListProps {
  receitas: Despesa[];
  onDeleteReceita: (id: string) => void;
  onEditReceita: (receita: Despesa) => void;
  onOpenNew: () => void;
  categories: Category[];
  onToggleStatus: (receita: Despesa) => void;
}

type SortOption = 'date-asc' | 'date-desc' | 'alpha-asc' | 'alpha-desc' | 'amount-asc' | 'amount-desc';

export const IncomeList: React.FC<IncomeListProps> = ({ 
  receitas, 
  onDeleteReceita, 
  onEditReceita,
  onOpenNew,
  categories,
  onToggleStatus
}) => {
  const currentDate = new Date();
  
  // State for Filters
  const [month, setMonth] = useState<number>(currentDate.getMonth());
  const [year, setYear] = useState<number>(currentDate.getFullYear());
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending'>('all');
  const [sortBy, setSortBy] = useState<SortOption>('date-asc');
  
  // Advanced Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Export Menu State
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // Close export menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Derived filtered data
  const filteredIncome = useMemo(() => {
    return receitas
      .filter(t => t.type === 'income') // Only income
      .filter(t => {
        const tDate = new Date(t.date);
        
        // Date Logic
        let dateMatch = true;
        if (startDate || endDate) {
          if (startDate && t.date < startDate) dateMatch = false;
          if (endDate && t.date > endDate) dateMatch = false;
        } else {
          const tMonth = tDate.getMonth();
          const tYear = tDate.getFullYear();
          if (year !== -1 && tYear !== year) dateMatch = false;
          if (month !== -1 && tMonth !== month) dateMatch = false;
        }

        // Status Filter
        const statusMatch = statusFilter === 'all' ? true : t.status === statusFilter;

        // Search Filter
        const searchMatch = t.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            t.category.toLowerCase().includes(searchTerm.toLowerCase());

        // Amount Filter
        let amountMatch = true;
        if (minAmount && t.amount < Number(minAmount)) amountMatch = false;
        if (maxAmount && t.amount > Number(maxAmount)) amountMatch = false;

        return dateMatch && searchMatch && amountMatch && statusMatch;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'date-asc':
            return new Date(a.date).getTime() - new Date(b.date).getTime();
          case 'date-desc':
            return new Date(b.date).getTime() - new Date(a.date).getTime();
          case 'alpha-asc':
            return a.title.localeCompare(b.title);
          case 'alpha-desc':
            return b.title.localeCompare(a.title);
          case 'amount-asc':
            return a.amount - b.amount;
          case 'amount-desc':
            return b.amount - a.amount;
          default:
            return 0;
        }
      });
  }, [receitas, month, year, statusFilter, sortBy, searchTerm, minAmount, maxAmount, startDate, endDate]);

  const totalValue = filteredIncome.reduce((acc, t) => acc + t.amount, 0);

  const clearFilters = () => {
    setMonth(currentDate.getMonth());
    setYear(currentDate.getFullYear());
    setStatusFilter('all');
    setSortBy('date-asc');
    setSearchTerm('');
    setMinAmount('');
    setMaxAmount('');
    setStartDate('');
    setEndDate('');
  };

  const handlePrint = () => {
    const headers = ['Data', 'Título', 'Categoria', 'Valor', 'Status', 'Observação'];
    const rows = filteredIncome.map(t => [
        formatDate(t.date),
        t.title,
        t.category,
        formatCurrency(t.amount),
        t.status === 'paid' ? 'PAGO' : 'NÃO PAGO',
        t.observation || '-'
    ]);

    printData('Relatório de Receitas', headers, rows);
  };

  const handleExportCSV = () => {
    const headers = ['Data', 'Título', 'Categoria', 'Valor', 'Status', 'Observação'];
    const rows = filteredIncome.map(t => {
      const date = new Date(t.date).toLocaleDateString('pt-BR');
      const amount = t.amount.toFixed(2).replace('.', ',');
      const status = t.status === 'paid' ? 'Pago' : 'Não Pago';
      const safeTitle = `"${t.title.replace(/"/g, '""')}"`;
      const safeCategory = `"${t.category.replace(/"/g, '""')}"`;
      const safeObservation = t.observation ? `"${t.observation.replace(/"/g, '""')}"` : '""';
      return [date, safeTitle, safeCategory, amount, status, safeObservation].join(';');
    });
    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `relatorio_receitas_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowExportMenu(false);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(18);
    doc.text("Relatório de Receitas", 14, 15);
    
    // Metadata
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 22);
    doc.text(`Total Filtrado: ${formatCurrency(totalValue)}`, 14, 27);

    // Table Data
    const tableData = filteredIncome.map(t => [
      formatDate(t.date),
      t.title,
      t.category,
      formatCurrency(t.amount),
      t.status === 'paid' ? 'Pago' : 'Não Pago'
    ]);

    autoTable(doc, {
      head: [['Data', 'Título', 'Categoria', 'Valor', 'Status']],
      body: tableData,
      startY: 35,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [22, 163, 74] }, // Green header for income
    });

    doc.save(`relatorio_receitas_${new Date().toISOString().split('T')[0]}.pdf`);
    setShowExportMenu(false);
  };

  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const years = Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - 2 + i);

  return (
    <div className="space-y-6">
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
             Total filtrado: <span className="font-bold text-green-600">{formatCurrency(totalValue)}</span>
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2 relative">
          
          {/* Export Dropdown */}
          <div className="relative" ref={exportMenuRef}>
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-md font-medium text-sm transition-colors flex items-center gap-2"
              title="Exportar dados"
            >
              <Download size={18} /> 
              <span className="hidden sm:inline">Exportar</span>
              <ChevronDown size={14} />
            </button>

            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-20 border border-gray-100 animate-fade-in">
                <div className="py-1">
                  <button
                    onClick={handleExportCSV}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <FileSpreadsheet size={16} className="text-green-600" /> Excel (CSV)
                  </button>
                  <button
                    onClick={handleExportPDF}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <FileIcon size={16} className="text-red-600" /> Arquivo PDF
                  </button>
                </div>
              </div>
            )}
          </div>
          
          <button
            onClick={handlePrint}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-md font-medium text-sm transition-colors flex items-center gap-2"
            title="Imprimir visualização atual"
          >
            <Printer size={18} /> <span className="hidden sm:inline">Imprimir</span>
          </button>

          <button
            onClick={onOpenNew}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-medium text-sm transition-colors flex items-center gap-2 shadow-sm"
          >
            <Plus size={18} /> Nova Receita
          </button>
        </div>
      </div>

      {/* Main Filter Bar */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          
          {/* Month/Year/Status Selection */}
          <div className="flex gap-2 col-span-1 sm:col-span-2">
            <select 
              value={month} 
              onChange={(e) => setMonth(Number(e.target.value))}
              disabled={!!startDate || !!endDate}
              className="flex-1 p-2 border border-gray-300 rounded-md text-sm outline-none bg-white disabled:bg-gray-100 disabled:text-gray-400"
            >
              <option value="-1">Todos os Meses</option>
              {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
            <select 
              value={year} 
              onChange={(e) => setYear(Number(e.target.value))}
              disabled={!!startDate || !!endDate}
              className="w-24 p-2 border border-gray-300 rounded-md text-sm outline-none bg-white disabled:bg-gray-100 disabled:text-gray-400"
            >
              <option value="-1">Todos</option>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            
            {/* Payment Status Filter */}
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="flex-1 p-2 border border-gray-300 rounded-md text-sm outline-none bg-white"
            >
              <option value="all">Status: Todos</option>
              <option value="paid">Pagos</option>
              <option value="pending">Não Pagos</option>
            </select>
          </div>

          {/* Sort */}
          <div className="relative col-span-1">
             <ArrowDownUp size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
             <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="w-full pl-9 p-2 border border-gray-300 rounded-md text-sm outline-none bg-white appearance-none"
            >
              <option value="date-asc">Data (Antiga → Nova)</option>
              <option value="date-desc">Data (Nova → Antiga)</option>
              <option value="alpha-asc">Nome (A → Z)</option>
              <option value="alpha-desc">Nome (Z → A)</option>
              <option value="amount-asc">Valor (Menor → Maior)</option>
              <option value="amount-desc">Valor (Maior → Menor)</option>
            </select>
          </div>

          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-md border text-sm font-medium transition-colors ${showFilters ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-gray-50 text-gray-600 border-gray-300 hover:bg-gray-100'}`}
          >
            <Filter size={18} /> Filtros Avançados
          </button>
        </div>

        {/* Collapsible Advanced Filters */}
        {showFilters && (
          <div className="border-t border-gray-100 pt-4 mt-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
             {/* Period Custom */}
             <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 uppercase">Período (Substitui Mês/Ano)</label>
                <div className="flex gap-2 items-center">
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-2 border rounded text-sm" />
                  <span className="text-gray-400">-</span>
                  <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-2 border rounded text-sm" />
                </div>
             </div>

             {/* Values */}
             <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 uppercase">Valor (R$)</label>
                <div className="flex gap-2 items-center">
                  <input type="number" placeholder="Min" value={minAmount} onChange={e => setMinAmount(e.target.value)} className="w-full p-2 border rounded text-sm" />
                  <span className="text-gray-400">-</span>
                  <input type="number" placeholder="Max" value={maxAmount} onChange={e => setMaxAmount(e.target.value)} className="w-full p-2 border rounded text-sm" />
                </div>
             </div>

             {/* Search */}
             <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 uppercase">Busca</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input 
                    type="text" 
                    placeholder="Título ou Categoria" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 p-2 border border-gray-300 rounded-md text-sm outline-none"
                  />
                </div>
             </div>
             
             <div className="md:col-span-2 lg:col-span-3 flex justify-end">
                <button onClick={clearFilters} className="text-sm text-red-500 hover:text-red-700 underline">Limpar todos os filtros</button>
             </div>
          </div>
        )}
      </div>

      {/* Grid of Blocks */}
      {filteredIncome.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredIncome.map((t) => (
            <div 
              key={t.id} 
              className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col justify-between border-l-4 border-green-500"
            >
              {/* Card Header */}
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-bold text-gray-800 text-lg leading-tight">{t.title}</h3>
                  <div className="flex gap-2 mt-1 flex-wrap">
                     <span className="text-xs font-medium px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                        {t.category}
                     </span>
                  </div>
                </div>
                <div className="text-right">
                   <span className="block font-bold text-lg text-green-600">
                      {formatCurrency(t.amount)}
                   </span>
                </div>
              </div>

              {/* Card Body Details */}
              <div className="space-y-2 mb-4">
                 <div className="flex items-center text-sm text-gray-600">
                    <Calendar size={14} className="mr-2 opacity-70" />
                    <span className="mr-1">Data:</span>
                    <span className="font-medium">{formatDate(t.date)}</span>
                 </div>

                 {/* Payment Status Label */}
                 {t.status === 'paid' ? (
                   <div className="flex items-center text-sm text-green-700 bg-green-50 p-1.5 rounded">
                      <CheckCircle size={14} className="mr-2" />
                      <div>
                        <span className="font-bold block text-xs">PAGO</span>
                        {t.paymentDate && <span className="text-xs">em {formatDate(t.paymentDate)}</span>}
                      </div>
                   </div>
                 ) : (
                   <div className="flex items-center text-sm text-yellow-700 bg-yellow-50 p-1.5 rounded">
                      <Clock size={14} className="mr-2" />
                      <span className="font-bold text-xs">NÃO PAGO</span>
                   </div>
                 )}

                 {/* Observação */}
                 {t.observation && (
                   <div className="flex items-start text-xs text-gray-500 bg-gray-50 p-2 rounded mt-2 border border-gray-100">
                      <FileText size={12} className="mr-1 mt-0.5 flex-shrink-0" />
                      <p className="line-clamp-2">{t.observation}</p>
                   </div>
                 )}
              </div>

              {/* Card Footer Actions & Metadata */}
              <div className="flex items-end justify-between pt-3 border-t border-gray-100">
                 <div className="text-xs text-gray-400 italic">
                    {t.createdAt ? `Criado em ${formatDate(t.createdAt)}` : ''}
                 </div>
                 <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleStatus(t);
                      }}
                      className={`p-2 rounded-full transition-colors ${
                        t.status === 'paid' 
                        ? 'text-gray-400 hover:text-yellow-600 hover:bg-yellow-50' 
                        : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                      }`}
                      title={t.status === 'paid' ? "Marcar como Não Pago" : "Marcar como Pago"}
                    >
                      <CheckCircle size={16} className={t.status === 'paid' ? 'fill-green-600 text-white' : ''} />
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
          ))}
        </div>
      ) : (
         <div className="p-12 text-center text-gray-400 flex flex-col items-center bg-white rounded-lg shadow-sm">
           <CalendarCheck size={48} className="mb-4 opacity-20" />
           <p>Nenhuma receita encontrada para os filtros selecionados.</p>
         </div>
      )}
    </div>
  );
};

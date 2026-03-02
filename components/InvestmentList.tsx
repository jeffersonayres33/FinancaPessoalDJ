import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, Filter, Trash2, Edit2, Plus, Calendar, ArrowDownUp, FileText, Printer, Download, FileSpreadsheet, File as FileIcon, ChevronDown, CalendarCheck, CheckCircle, Clock, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { Despesa, Category } from '../types';
import { formatCurrency, formatDate, printData, getCurrentLocalDateString } from '../utils';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

interface InvestmentListProps {
  investimentos: Despesa[];
  onDeleteInvestimento: (id: string) => void;
  onEditInvestimento: (investimento: Despesa) => void;
  onOpenNew: () => void;
  categories: Category[];
  onToggleStatus: (investimento: Despesa) => void;
}

type SortOption = 'date-asc' | 'date-desc' | 'alpha-asc' | 'alpha-desc' | 'amount-asc' | 'amount-desc';

export const InvestmentList: React.FC<InvestmentListProps> = ({ 
  investimentos, 
  onDeleteInvestimento, 
  onEditInvestimento,
  onOpenNew,
  categories,
  onToggleStatus
}) => {
  const currentDate = new Date();
  
  // State for Filters
  const [month, setMonth] = useState<number>(currentDate.getMonth());
  const [year, setYear] = useState<number>(currentDate.getFullYear());
  const [statusFilter, setStatusFilter] = useState<'all' | 'in' | 'out'>('all');
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
  const filteredInvestments = useMemo(() => {
    return investimentos
      .filter(t => t.type === 'investment')
      .filter(t => {
        // Date Logic
        let dateMatch = true;
        if (startDate || endDate) {
          if (startDate && t.date < startDate) dateMatch = false;
          if (endDate && t.date > endDate) dateMatch = false;
        } else {
          const [y, m] = t.date.split('-').map(Number);
          const tYear = y;
          const tMonth = m - 1;
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
            return a.date.localeCompare(b.date);
          case 'date-desc':
            return b.date.localeCompare(a.date);
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
  }, [investimentos, month, year, statusFilter, sortBy, searchTerm, minAmount, maxAmount, startDate, endDate]);

  // Calculate totals for all time (not just filtered)
  const allTimeInvestments = investimentos.filter(t => t.type === 'investment');
  const totalIn = allTimeInvestments.filter(t => t.status === 'in').reduce((acc, t) => acc + t.amount, 0);
  const totalOut = allTimeInvestments.filter(t => t.status === 'out').reduce((acc, t) => acc + t.amount, 0);
  const totalBalance = totalIn - totalOut;

  const filteredTotalIn = filteredInvestments.filter(t => t.status === 'in').reduce((acc, t) => acc + t.amount, 0);
  const filteredTotalOut = filteredInvestments.filter(t => t.status === 'out').reduce((acc, t) => acc + t.amount, 0);

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
    const headers = ['Data', 'Título', 'Categoria', 'Valor', 'Tipo', 'Observação'];
    const rows = filteredInvestments.map(t => [
        formatDate(t.date),
        t.title,
        t.category,
        formatCurrency(t.amount),
        t.status === 'in' ? 'ENTRADA' : 'SAÍDA',
        t.observation || '-'
    ]);

    printData('Relatório de Investimentos', headers, rows);
  };

  const handleExportCSV = () => {
    const headers = ['Data', 'Título', 'Categoria', 'Valor', 'Tipo', 'Observação'];
    const rows = filteredInvestments.map(t => {
      const date = formatDate(t.date);
      const amount = t.amount.toFixed(2).replace('.', ',');
      const status = t.status === 'in' ? 'Entrada' : 'Saída';
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
    link.setAttribute('download', `relatorio_investimentos_${getCurrentLocalDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowExportMenu(false);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(18);
    doc.text("Relatório de Investimentos", 14, 15);
    
    // Metadata
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 22);
    doc.text(`Total Entradas (Filtrado): ${formatCurrency(filteredTotalIn)}`, 14, 27);
    doc.text(`Total Saídas (Filtrado): ${formatCurrency(filteredTotalOut)}`, 14, 32);

    // Table Data
    const tableData = filteredInvestments.map(t => [
      formatDate(t.date),
      t.title,
      t.category,
      formatCurrency(t.amount),
      t.status === 'in' ? 'Entrada' : 'Saída'
    ]);

    autoTable(doc, {
      head: [['Data', 'Título', 'Categoria', 'Valor', 'Tipo']],
      body: tableData,
      startY: 40,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] }, // Blue header for investments
    });

    doc.save(`relatorio_investimentos_${getCurrentLocalDateString()}.pdf`);
    setShowExportMenu(false);
  };

  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const years = Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - 2 + i);

  return (
    <div className="space-y-6">
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
             Entradas (filtro): <span className="font-bold text-blue-600">{formatCurrency(filteredTotalIn)}</span> | 
             Saídas (filtro): <span className="font-bold text-orange-600">{formatCurrency(filteredTotalOut)}</span>
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
                    <FileSpreadsheet size={16} className="text-blue-600" /> Excel (CSV)
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
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium text-sm transition-colors flex items-center gap-2 shadow-sm"
          >
            <Plus size={18} /> Novo Investimento
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
              <option value="all">Tipo: Todos</option>
              <option value="in">Entradas</option>
              <option value="out">Saídas</option>
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
            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-md border text-sm font-medium transition-colors ${showFilters ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-gray-50 text-gray-600 border-gray-300 hover:bg-gray-100'}`}
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
      {filteredInvestments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredInvestments.map((t) => (
            <div 
              key={t.id} 
              className={`bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col justify-between border-l-4 ${t.status === 'in' ? 'border-blue-500' : 'border-orange-500'}`}
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
                   <span className={`block font-bold text-lg ${t.status === 'in' ? 'text-blue-600' : 'text-orange-600'}`}>
                      {t.status === 'out' ? '-' : ''}{formatCurrency(t.amount)}
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
};

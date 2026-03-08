
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, Filter, Trash2, Edit2, Plus, Calendar, CheckCircle, Clock, ArrowDownUp, FileText, Printer, Download, FileSpreadsheet, File as FileIcon, ChevronDown, CheckSquare, Square, X, CalendarCheck, Layers, CheckCircle2, Repeat } from 'lucide-react';
import { Despesa, Category } from '../types';
import { formatCurrency, formatDate, printData, getCurrentLocalDateString } from '../utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface AccountsPayableProps {
  despesas: Despesa[];
  onDeleteConta: (id: string) => void;
  onEditConta: (conta: Despesa) => void;
  onOpenNew: () => void;
  categories: Category[];
  onMarkAsPaid: (ids: string[], date: string) => void;
}

type SortOption = 'date-asc' | 'date-desc' | 'alpha-asc' | 'alpha-desc' | 'amount-asc' | 'amount-desc';

export const AccountsPayable: React.FC<AccountsPayableProps> = ({ 
  despesas, 
  onDeleteConta, 
  onEditConta,
  onOpenNew,
  categories,
  onMarkAsPaid
}) => {
  const currentDate = new Date();
  
  // State for Filters
  const [month, setMonth] = useState<number>(currentDate.getMonth());
  const [year, setYear] = useState<number>(currentDate.getFullYear());
  const [sortBy, setSortBy] = useState<SortOption>('date-asc');
  
  // Advanced Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Selection State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkPaymentModal, setShowBulkPaymentModal] = useState(false);
  const [bulkPaymentDate, setBulkPaymentDate] = useState(getCurrentLocalDateString());

  // Derived filtered data
  const filteredContas = useMemo(() => {
    return despesas
      .filter(t => t.type === 'expense' && t.status === 'pending') // Only pending expenses
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

        // Search Filter
        const searchMatch = t.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            t.category.toLowerCase().includes(searchTerm.toLowerCase());

        // Category Filter
        const categoryMatch = categoryFilter === 'all' || t.category === categoryFilter;

        // Amount Filter
        let amountMatch = true;
        if (minAmount && t.amount < Number(minAmount)) amountMatch = false;
        if (maxAmount && t.amount > Number(maxAmount)) amountMatch = false;

        return dateMatch && searchMatch && amountMatch && categoryMatch;
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
  }, [despesas, month, year, sortBy, searchTerm, minAmount, maxAmount, startDate, endDate, categoryFilter]);

  const totalPending = filteredContas.reduce((acc, c) => acc + c.amount, 0);

  // Calculate Selected Total
  const selectedTotal = useMemo(() => {
    return despesas
      .filter(d => selectedIds.includes(d.id))
      .reduce((acc, curr) => acc + curr.amount, 0);
  }, [despesas, selectedIds]);

  const clearFilters = () => {
    setMonth(currentDate.getMonth());
    setYear(currentDate.getFullYear());
    setSortBy('date-asc');
    setSearchTerm('');
    setMinAmount('');
    setMaxAmount('');
    setStartDate('');
    setEndDate('');
    setCategoryFilter('all');
  };

  // Selection Handlers
  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredContas.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredContas.map(c => c.id));
    }
  };

  const initiateBulkPayment = () => {
    if (selectedIds.length === 0) return;
    setShowBulkPaymentModal(true);
  };

  const handleBulkPayment = () => {
    onMarkAsPaid(selectedIds, bulkPaymentDate);
    setShowBulkPaymentModal(false);
    setSelectedIds([]);
  };

  const handleExportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filteredContas.map(t => ({
      Data: formatDate(t.date),
      Título: t.title,
      Categoria: t.category,
      Valor: t.amount,
      Status: 'Pendente',
      Observação: t.observation || ''
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Contas a Pagar");
    XLSX.writeFile(wb, `contas_a_pagar_${getCurrentLocalDateString()}.xlsx`);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text("Relatório de Contas a Pagar", 14, 15);
    
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 22);
    doc.text(`Total Pendente (Filtrado): ${formatCurrency(totalPending)}`, 14, 27);

    const tableData = filteredContas.map(t => [
      formatDate(t.date),
      t.title,
      t.category,
      formatCurrency(t.amount),
      'Pendente'
    ]);

    autoTable(doc, {
      head: [['Data', 'Título', 'Categoria', 'Valor', 'Status']],
      body: tableData,
      startY: 35,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [220, 38, 38] }, // Red header
    });

    doc.save(`relatorio_contas_${getCurrentLocalDateString()}.pdf`);
  };

  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const years = Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - 2 + i);

  return (
    <div className="space-y-6 relative animate-fade-in">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-lg shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            Contas a Pagar
            <span className="text-sm font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
              {filteredContas.length} itens
            </span>
          </h2>
          <p className="text-gray-500 text-sm mt-1">
             Total Pendente: <span className="font-bold text-red-600">{formatCurrency(totalPending)}</span>
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2 relative items-center">
          {/* Selected Total Display */}
          {selectedIds.length > 0 && (
             <div className="hidden sm:block mr-2 animate-fade-in text-right">
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Valor selecionado</div>
                <div className="text-sm font-bold text-purple-700">{formatCurrency(selectedTotal)}</div>
             </div>
          )}

          {/* Bulk Action Button */}
          {selectedIds.length > 0 && (
            <button 
              type="button"
              onClick={initiateBulkPayment}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-bold shadow-sm flex items-center gap-2 transition-colors animate-fade-in text-sm"
            >
              <CheckCircle2 size={18} />
              Pagar {selectedIds.length}
            </button>
          )}

          <div className="flex gap-2">
             <button onClick={handleExportPDF} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-md font-medium text-sm transition-colors flex items-center gap-2" title="Exportar PDF">
               <Printer size={18} /> <span className="hidden sm:inline">PDF</span>
             </button>
             <button onClick={handleExportExcel} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-md font-medium text-sm transition-colors flex items-center gap-2" title="Exportar Excel">
               <FileSpreadsheet size={18} /> <span className="hidden sm:inline">Excel</span>
             </button>
          </div>

          <button
            onClick={onOpenNew}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md font-medium text-sm transition-colors flex items-center gap-2 shadow-sm"
          >
            <Plus size={18} /> Nova Conta
          </button>
        </div>
      </div>
      
      {/* Mobile Selected Value (Shows below title on mobile only when selected) */}
      {selectedIds.length > 0 && (
        <div className="sm:hidden bg-purple-50 p-2 rounded-md border border-purple-100 flex justify-between items-center animate-fade-in -mt-4">
             <span className="text-xs font-bold text-gray-600 uppercase">Valor selecionado:</span>
             <span className="text-sm font-bold text-purple-700">{formatCurrency(selectedTotal)}</span>
        </div>
      )}

      {/* Filters Section */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-4">
          
          {/* Month/Year Selection */}
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

          {/* Search */}
          <div className="relative w-full md:w-auto flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Buscar conta..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-full focus:ring-2 focus:ring-purple-500 outline-none text-sm"
            />
          </div>

          <div className="flex gap-2 w-full md:w-auto">
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${showFilters ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              <Filter size={16} /> Filtros
            </button>
            
            <div className="flex bg-gray-100 rounded-full p-1">
               <button onClick={() => setSortBy('date-asc')} className={`p-2 rounded-full ${sortBy.includes('date') ? 'bg-white shadow-sm text-purple-600' : 'text-gray-500'}`} title="Ordenar por Data"><Calendar size={16} /></button>
               <button onClick={() => setSortBy('amount-desc')} className={`p-2 rounded-full ${sortBy.includes('amount') ? 'bg-white shadow-sm text-purple-600' : 'text-gray-500'}`} title="Ordenar por Valor"><ArrowDownUp size={16} /></button>
            </div>
          </div>
        </div>

        {/* Collapsible Advanced Filters */}
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3 pt-4 border-t border-gray-100 animate-fade-in-down">
             {/* Period Custom */}
             <div className="md:col-span-2 flex gap-2 items-center">
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md text-sm outline-none" placeholder="Data Inicial" />
                <span className="text-gray-400">-</span>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md text-sm outline-none" placeholder="Data Final" />
             </div>

             {/* Category */}
             <select 
               value={categoryFilter} 
               onChange={(e) => setCategoryFilter(e.target.value)}
               className="p-2 border border-gray-300 rounded-md text-sm outline-none bg-white"
             >
               <option value="all">Categoria: Todas</option>
               {categories.filter(c => c.type === 'expense' || c.type === 'both').map(c => (
                   <option key={c.id} value={c.name}>{c.name}</option>
               ))}
             </select>

             {/* Values */}
             <div className="flex gap-2 items-center md:col-span-2">
                <input type="number" placeholder="Min R$" value={minAmount} onChange={e => setMinAmount(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md text-sm outline-none" />
                <span className="text-gray-400">-</span>
                <input type="number" placeholder="Max R$" value={maxAmount} onChange={e => setMaxAmount(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md text-sm outline-none" />
             </div>
             
             <div className="md:col-span-3 lg:col-span-5 flex justify-end">
                <button onClick={clearFilters} className="text-xs text-red-500 hover:underline">Limpar Filtros</button>
             </div>
          </div>
        )}
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-full shadow-lg z-50 flex items-center gap-4 animate-fade-in-up">
          <span className="font-medium">{selectedIds.length} selecionados</span>
          <div className="h-4 w-px bg-gray-700"></div>
          <button 
            onClick={() => setShowBulkPaymentModal(true)}
            className="flex items-center gap-2 hover:text-green-400 transition-colors font-medium"
          >
            <CheckCircle2 size={18} /> Marcar como Pago
          </button>
          <button 
            onClick={() => setSelectedIds([])}
            className="ml-2 p-1 hover:bg-gray-800 rounded-full"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Bulk Payment Modal */}
      {showBulkPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Confirmar Pagamento em Lote</h3>
            <p className="text-gray-600 mb-4">
              Deseja marcar {selectedIds.length} contas como pagas?
            </p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Data do Pagamento</label>
              <input 
                type="date" 
                value={bulkPaymentDate}
                onChange={(e) => setBulkPaymentDate(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setShowBulkPaymentModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleBulkPayment}
                className="px-4 py-2 bg-green-600 text-white hover:bg-green-700 rounded-md transition-colors"
              >
                Confirmar Pagamento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Grid of Cards */}
      {filteredContas.length > 0 ? (
        <>
          {/* Select All / Deselect All */}
          <div className="flex items-center justify-between bg-white p-3 rounded-lg shadow-sm border border-gray-100 mb-4">
             <div className="flex items-center gap-2 cursor-pointer text-gray-700 hover:text-blue-600 transition-colors" onClick={toggleSelectAll}>
                {selectedIds.length === filteredContas.length ? (
                    <CheckSquare size={20} className="text-blue-600" />
                ) : (
                    <Square size={20} />
                )}
                <span className="font-medium text-sm">
                   {selectedIds.length === filteredContas.length ? 'Remover todas as seleções' : 'Selecionar tudo'}
                </span>
             </div>
             <div className="text-sm text-gray-500">
                {selectedIds.length} de {filteredContas.length} selecionados
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredContas.map((t) => (
            <div 
              key={t.id} 
              className={`bg-white rounded-xl shadow-sm border border-gray-100 transition-all hover:shadow-md relative overflow-hidden group ${selectedIds.includes(t.id) ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}
              onClick={() => toggleSelection(t.id)}
            >
              <div className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <div className="mt-1 cursor-pointer text-gray-400 hover:text-blue-500 transition-colors" onClick={(e) => { e.stopPropagation(); toggleSelection(t.id); }}>
                        {selectedIds.includes(t.id) ? (
                            <CheckSquare size={20} className="text-blue-600" />
                        ) : (
                            <Square size={20} />
                        )}
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-800 text-lg leading-tight">{t.title}</h3>
                        <div className="flex gap-2 mt-1 flex-wrap">
                        <span className="text-xs font-medium px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                            {t.category}
                        </span>
                        {t.isAutoGenerated && (
                            <span className="text-xs font-medium px-2 py-0.5 rounded bg-amber-100 text-amber-700 flex items-center gap-1" title="Lançado automaticamente pelo sistema">
                                <Repeat size={10} /> Lançado auto
                            </span>
                        )}
                        {t.installments && t.installments.total > 1 && (
                            <span className="inline-flex items-center text-xs font-normal text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded">
                                <Layers size={10} className="mr-1" /> {t.installments.current}/{t.installments.total}
                            </span>
                        )}
                        </div>
                    </div>
                  </div>
                  <div className="text-right mt-1 mr-6">
                     <span className="block font-bold text-lg text-gray-800">
                        {formatCurrency(t.amount)}
                     </span>
                  </div>
                </div>

                <div className="space-y-2 mb-4 pl-8">
                   <div className="flex items-center text-sm text-gray-600">
                      <Calendar size={14} className="mr-2 opacity-70" />
                      <span className="mr-1">Vencimento:</span>
                      <span className={`font-medium ${new Date(t.date) < new Date() ? 'text-red-600' : ''}`}>
                          {formatDate(t.date)}
                      </span>
                   </div>

                   <div className="flex items-center text-sm text-red-700 bg-red-50 p-1.5 rounded w-fit">
                      <Clock size={14} className="mr-2" />
                      <span className="font-bold text-xs">PENDENTE</span>
                   </div>

                   {t.observation && (
                     <div className="flex items-start text-xs text-gray-500 bg-gray-50 p-2 rounded mt-2 border border-gray-100">
                        <FileText size={12} className="mr-1 mt-0.5 flex-shrink-0" />
                        <p className="line-clamp-2">{t.observation}</p>
                     </div>
                   )}
                </div>

                <div className="flex items-end justify-between pt-3 border-t border-gray-100 pl-8">
                   <div className="text-xs text-gray-400 italic">
                      {t.createdAt ? `Criado em ${formatDate(t.createdAt)}` : ''}
                   </div>
                   <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditConta(t);
                        }}
                        className="p-2 text-blue-500 hover:bg-blue-50 rounded-full transition-colors"
                        title="Editar"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteConta(t.id);
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
        </>
      ) : (
         <div className="p-12 text-center text-gray-400 flex flex-col items-center bg-white rounded-lg shadow-sm">
           <CalendarCheck size={48} className="mb-4 opacity-20" />
           <p>Nenhuma conta encontrada para os filtros selecionados.</p>
         </div>
      )}
    </div>
  );
};

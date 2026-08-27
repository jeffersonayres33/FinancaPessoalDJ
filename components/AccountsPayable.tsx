
import React, { useState, useMemo, useRef } from 'react';
import { Search, Filter, Trash2, Edit2, Calendar, CheckCircle, Clock, ArrowDownUp, FileText, Printer, Download, FileSpreadsheet, File as FileIcon, ChevronDown, CheckSquare, Square, X, CalendarCheck, Layers, CheckCircle2, Repeat, LayoutGrid, List as ListIcon, FastForward } from 'lucide-react';
import { Despesa, Category, User } from '../types';
import { formatCurrency, formatDate, getCurrentLocalDateString, getFinancialMonthRange, getFinancialYearRange, getCurrentFinancialPeriod } from '../utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface AccountsPayableProps {
  despesas: Despesa[];
  onDeleteConta: (id: string) => void;
  onEditConta: (conta: Despesa) => void;
  categories: Category[];
  onMarkAsPaid: (ids: string[], date: string) => void;
  onAnticipateInstallments?: (ids: string[], paymentDate: string) => Promise<void> | void;
  user?: User;
  onOpenPaywall?: () => void;
}

type SortOption = 'date-asc' | 'date-desc' | 'alpha-asc' | 'alpha-desc' | 'amount-asc' | 'amount-desc' | 'createdAt-asc' | 'createdAt-desc';

export const AccountsPayable: React.FC<AccountsPayableProps> = React.memo(({ 
  despesas, 
  onDeleteConta, 
  onEditConta,
  categories,
  onMarkAsPaid,
  onAnticipateInstallments,
  user,
  onOpenPaywall
}) => {
  const currentDate = new Date();
  const currentFinancialPeriod = getCurrentFinancialPeriod(user?.financialMonthStartDay || 1);
  
  // State for Filters
  const [month, setMonth] = useState<number>(currentFinancialPeriod.month);
  const [year, setYear] = useState<number>(currentFinancialPeriod.year);
  const [sortBy, setSortBy] = useState<SortOption>('date-asc');
  
  // Advanced Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [paymentStartDate, setPaymentStartDate] = useState('');
  const [paymentEndDate, setPaymentEndDate] = useState('');
  const [updatedStartDate, setUpdatedStartDate] = useState('');
  const [updatedEndDate, setUpdatedEndDate] = useState('');
  const [createdStartDate, setCreatedStartDate] = useState('');
  const [createdEndDate, setCreatedEndDate] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [recurrenceFilter, setRecurrenceFilter] = useState<'all' | 'fixed' | 'variable'>('all');
  const [installmentFilter, setInstallmentFilter] = useState<'all' | 'installment' | 'single'>('all');

  // Selection State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkPaymentModal, setShowBulkPaymentModal] = useState(false);
  const [bulkPaymentDate, setBulkPaymentDate] = useState(getCurrentLocalDateString());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Anticipation State
  const [anticipateTarget, setAnticipateTarget] = useState<Despesa | null>(null);
  const [selectedAnticipateIds, setSelectedAnticipateIds] = useState<string[]>([]);
  const [anticipatePaymentDate, setAnticipatePaymentDate] = useState<string>(getCurrentLocalDateString());

  // Derived filtered data
  const filteredContas = useMemo(() => {
    return despesas
      .filter(t => t.type === 'expense' && t.status === 'pending') // Only pending expenses
      .filter(t => {
        const [y, m, d] = (t.date || '').split('-').map(Number);
        const tDate = new Date(y, m - 1, d);
        tDate.setHours(12, 0, 0, 0); // Avoid timezone issues

        // Date Logic
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

        // Payment Date Logic
        let paymentDateMatch = true;
        if (paymentStartDate || paymentEndDate) {
          if (!t.paymentDate) {
            paymentDateMatch = false;
          } else {
            const pDateStr = t.paymentDate;
            if (paymentStartDate && pDateStr < paymentStartDate) paymentDateMatch = false;
            if (paymentEndDate && pDateStr > paymentEndDate) paymentDateMatch = false;
          }
        }

        // Updated Date Logic
        let updatedDateMatch = true;
        if (updatedStartDate || updatedEndDate) {
          if (!t.updatedAt) {
            updatedDateMatch = false;
          } else {
            const uDateStr = t.updatedAt.split('T')[0];
            if (updatedStartDate && uDateStr < updatedStartDate) updatedDateMatch = false;
            if (updatedEndDate && uDateStr > updatedEndDate) updatedDateMatch = false;
          }
        }

        // Search Filter
        const searchMatch = (t.title?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
                            (t.category?.toLowerCase() || '').includes(searchTerm.toLowerCase());

        // Category Filter
        const categoryMatch = categoryFilter === 'all' || t.category === categoryFilter;

        // Recurrence Filter
        let recurrenceMatch = true;
        if (recurrenceFilter === 'fixed') recurrenceMatch = !!t.isFixed;
        if (recurrenceFilter === 'variable') recurrenceMatch = !t.isFixed;

        // Installment Filter
        let installmentMatch = true;
        const isInstallment = !!t.installments && t.installments.total > 1 && t.installments.current > 0;
        if (recurrenceFilter !== 'fixed') {
            if (installmentFilter === 'installment') installmentMatch = isInstallment;
            if (installmentFilter === 'single') installmentMatch = !isInstallment;
        }

        // Amount Filter
        let amountMatch = true;
        if (minAmount && t.amount < Number(minAmount)) amountMatch = false;
        if (maxAmount && t.amount > Number(maxAmount)) amountMatch = false;

        return dateMatch && createdDateMatch && paymentDateMatch && updatedDateMatch && searchMatch && amountMatch && categoryMatch && recurrenceMatch && installmentMatch;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'date-asc':
            return a.date.localeCompare(b.date);
          case 'date-desc':
            return b.date.localeCompare(a.date);
          case 'alpha-asc':
            return (a.title || '').localeCompare(b.title || '');
          case 'alpha-desc':
            return (b.title || '').localeCompare(a.title || '');
          case 'amount-asc':
            return a.amount - b.amount;
          case 'amount-desc':
            return b.amount - a.amount;
          case 'createdAt-asc':
            return new Date(a.createdAt || a.date).getTime() - new Date(b.createdAt || b.date).getTime();
          case 'createdAt-desc':
            return new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime();
          default:
            return 0;
        }
      });
  }, [despesas, month, year, sortBy, searchTerm, minAmount, maxAmount, startDate, endDate, createdStartDate, createdEndDate, categoryFilter, recurrenceFilter, installmentFilter, user]);

  const totalPending = filteredContas.reduce((acc, c) => acc + c.amount, 0);

  // Calculate Selected Total
  const selectedTotal = useMemo(() => {
    return despesas
      .filter(d => selectedIds.includes(d.id))
      .reduce((acc, curr) => acc + curr.amount, 0);
  }, [despesas, selectedIds]);

  const clearFilters = () => {
    setMonth(currentFinancialPeriod.month);
    setYear(currentFinancialPeriod.year);
    setSortBy('date-asc');
    setSearchTerm('');
    setMinAmount('');
    setMaxAmount('');
    setStartDate('');
    setEndDate('');
    setPaymentStartDate('');
    setPaymentEndDate('');
    setUpdatedStartDate('');
    setUpdatedEndDate('');
    setCreatedStartDate('');
    setCreatedEndDate('');
    setCategoryFilter('all');
    setRecurrenceFilter('all');
    setInstallmentFilter('all');
    setSelectedIds([]);
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

  // Anticipation Calculations and Handlers
  const seriesInstallments = useMemo(() => {
    if (!anticipateTarget || !anticipateTarget.installments) return [];
    const normalizeTitle = (str: string) => str.replace(/\s*\(\d+\/\d+\)\s*/g, '').trim().toLowerCase();
    const targetBaseTitle = normalizeTitle(anticipateTarget.title);
    const targetTotal = anticipateTarget.installments.total;
    
    return despesas
      .filter(d => 
        d.type === 'expense' && 
        d.category === anticipateTarget.category &&
        d.installments && 
        d.installments.total === targetTotal &&
        normalizeTitle(d.title) === targetBaseTitle
      )
      .sort((a, b) => (a.installments?.current || 0) - (b.installments?.current || 0));
  }, [anticipateTarget, despesas]);

  const pendingSeriesInstallments = useMemo(() => {
    return seriesInstallments.filter(t => t.status === 'pending');
  }, [seriesInstallments]);

  const seriesStats = useMemo(() => {
    const totalAmount = seriesInstallments.reduce((acc, curr) => acc + curr.amount, 0);
    const paidItems = seriesInstallments.filter(t => t.status === 'paid');
    const paidAmount = paidItems.reduce((acc, curr) => acc + curr.amount, 0);
    const pendingAmount = pendingSeriesInstallments.reduce((acc, curr) => acc + curr.amount, 0);
    
    const selectedItems = pendingSeriesInstallments.filter(t => selectedAnticipateIds.includes(t.id));
    const selectedAmount = selectedItems.reduce((acc, curr) => acc + curr.amount, 0);

    return {
      totalCount: seriesInstallments.length || (anticipateTarget?.installments?.total || 0),
      paidCount: paidItems.length,
      pendingCount: pendingSeriesInstallments.length,
      selectedCount: selectedItems.length,
      totalAmount,
      paidAmount,
      pendingAmount,
      selectedAmount
    };
  }, [seriesInstallments, pendingSeriesInstallments, selectedAnticipateIds, anticipateTarget]);

  const openAnticipateModal = (conta: Despesa) => {
    setAnticipateTarget(conta);
    setAnticipatePaymentDate(getCurrentLocalDateString());
    setSelectedAnticipateIds([conta.id]);
  };

  const handleToggleAnticipate = (id: string) => {
    setSelectedAnticipateIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectNextN = (n: number) => {
    const ids = pendingSeriesInstallments.slice(0, n).map(t => t.id);
    setSelectedAnticipateIds(ids);
  };

  const handleSelectAllPending = () => {
    setSelectedAnticipateIds(pendingSeriesInstallments.map(t => t.id));
  };

  const handleClearAnticipateSelection = () => {
    setSelectedAnticipateIds([]);
  };

  const handleConfirmAnticipation = () => {
    if (selectedAnticipateIds.length === 0) return;
    if (onAnticipateInstallments) {
      onAnticipateInstallments(selectedAnticipateIds, anticipatePaymentDate);
    } else {
      onMarkAsPaid(selectedAnticipateIds, anticipatePaymentDate);
    }
    setAnticipateTarget(null);
    setSelectedAnticipateIds([]);
  };

  const handleExportExcel = () => {
    if (user?.plan !== 'premium' && onOpenPaywall) {
      onOpenPaywall();
      return;
    }
    const itemsToExport = selectedIds.length > 0 
      ? filteredContas.filter(t => selectedIds.includes(t.id))
      : filteredContas;

    const ws = XLSX.utils.json_to_sheet(itemsToExport.map(t => ({
      Data: formatDate(t.date),
      Título: t.title,
      Categoria: t.category,
      Valor: t.amount,
      Parcela: t.installments && t.installments.total > 1 && t.installments.current > 0 ? `${t.installments.current}/${t.installments.total}` : '-',
      Status: t.status === 'paid' ? 'Pago' : 'Pendente',
      Observação: t.observation || ''
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Contas a Pagar");
    XLSX.writeFile(wb, `contas_a_pagar_${getCurrentLocalDateString()}.xlsx`);
  };

  const handleExportPDF = () => {
    if (user?.plan !== 'premium' && onOpenPaywall) {
      onOpenPaywall();
      return;
    }
    const doc = new jsPDF();
    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-BR');
    const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    
    const itemsToExport = selectedIds.length > 0 
      ? filteredContas.filter(t => selectedIds.includes(t.id))
      : filteredContas;
    
    const totalExport = itemsToExport.reduce((acc, curr) => acc + curr.amount, 0);

    doc.setFontSize(18);
    doc.text("Relatório de Contas a Pagar", 14, 15);
    
    doc.setFontSize(10);
    doc.text(`Gerado em: ${dateStr}; às ${timeStr};`, 14, 22);
    doc.text(`Usuário: ${user?.name || 'Não identificado'}`, 14, 27);
    doc.text(`Total Pendente (${selectedIds.length > 0 ? 'Selecionado' : 'Filtrado'}): ${formatCurrency(totalExport)}`, 14, 32);
    doc.text(`Quantidade de itens: ${itemsToExport.length}`, 14, 37);

    const tableData: any[] = [];
    itemsToExport.forEach(t => {
      if (t.observation) {
        tableData.push([
          { content: formatDate(t.date), styles: { lineWidth: { top: 0.1, right: 0.1, bottom: 0, left: 0.1 } } },
          { content: t.title, styles: { fontStyle: 'bold', lineWidth: { top: 0.1, right: 0.1, bottom: 0, left: 0.1 } } },
          { content: t.category, styles: { lineWidth: { top: 0.1, right: 0.1, bottom: 0, left: 0.1 } } },
          { content: formatCurrency(t.amount), styles: { lineWidth: { top: 0.1, right: 0.1, bottom: 0, left: 0.1 } } },
          { content: t.installments && t.installments.total > 1 && t.installments.current > 0 ? `${t.installments.current}/${t.installments.total}` : '-', styles: { lineWidth: { top: 0.1, right: 0.1, bottom: 0, left: 0.1 } } },
          { content: t.status === 'paid' ? 'Pago' : 'Pendente', styles: { lineWidth: { top: 0.1, right: 0.1, bottom: 0, left: 0.1 } } }
        ]);
        tableData.push([
          { content: '', styles: { lineWidth: { top: 0, right: 0.1, bottom: 0.1, left: 0.1 } } },
          { content: t.observation, colSpan: 5, styles: { textColor: [150, 150, 150], fontSize: 6.5, lineWidth: { top: 0, right: 0.1, bottom: 0.1, left: 0.1 }, cellPadding: { top: 0, bottom: 2, left: 2, right: 2 } } }
        ]);
      } else {
        tableData.push([
          formatDate(t.date),
          t.title,
          t.category,
          formatCurrency(t.amount),
          t.installments && t.installments.total > 1 && t.installments.current > 0 ? `${t.installments.current}/${t.installments.total}` : '-',
          t.status === 'paid' ? 'Pago' : 'Pendente'
        ]);
      }
    });

    autoTable(doc, {
      head: [['Data', 'Título', 'Categoria', 'Valor', 'Parcela', 'Status']],
      body: tableData,
      startY: 45,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [220, 38, 38] }, // Red header
    });

    // Adicionar número de páginas no rodapé ("X de Y")
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(9);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Página ${i} de ${pageCount}`,
        doc.internal.pageSize.getWidth() - 14,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'right' }
      );
    }

    // Abrir em nova aba em vez de baixar
    window.open(doc.output('bloburl'), '_blank');
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
             <div className="flex bg-gray-100 rounded-md p-1 mr-2">
               <button 
                 onClick={() => setViewMode('grid')} 
                 className={`p-1.5 rounded-sm ${viewMode === 'grid' ? 'bg-white shadow-sm text-red-600' : 'text-gray-500 hover:text-gray-700'}`} 
                 title="Visualização em Blocos"
               >
                 <LayoutGrid size={16} />
               </button>
               <button 
                 onClick={() => setViewMode('list')} 
                 className={`p-1.5 rounded-sm ${viewMode === 'list' ? 'bg-white shadow-sm text-red-600' : 'text-gray-500 hover:text-gray-700'}`} 
                 title="Visualização em Lista"
               >
                 <ListIcon size={16} />
               </button>
             </div>
             <button onClick={handleExportPDF} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-md font-medium text-sm transition-colors flex items-center gap-2" title="Exportar PDF">
               <Printer size={18} /> <span className="hidden sm:inline">PDF</span>
             </button>
             <button onClick={handleExportExcel} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-md font-medium text-sm transition-colors flex items-center gap-2" title="Exportar Excel">
               <FileSpreadsheet size={18} /> <span className="hidden sm:inline">Excel</span>
             </button>
          </div>
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
               <button onClick={() => setSortBy(sortBy === 'date-asc' ? 'date-desc' : 'date-asc')} className={`p-2 rounded-full ${sortBy.includes('date') ? 'bg-white shadow-sm text-purple-600' : 'text-gray-500'}`} title="Ordenar por Data"><Calendar size={16} /></button>
               <button onClick={() => setSortBy(sortBy === 'createdAt-asc' ? 'createdAt-desc' : 'createdAt-asc')} className={`p-2 rounded-full ${sortBy.includes('createdAt') ? 'bg-white shadow-sm text-purple-600' : 'text-gray-500'}`} title="Ordenar por Data de Criação"><Clock size={16} /></button>
               <button onClick={() => setSortBy(sortBy === 'amount-desc' ? 'amount-asc' : 'amount-desc')} className={`p-2 rounded-full ${sortBy.includes('amount') ? 'bg-white shadow-sm text-purple-600' : 'text-gray-500'}`} title="Ordenar por Valor"><ArrowDownUp size={16} /></button>
            </div>
          </div>
        </div>

        {/* Collapsible Advanced Filters */}
        {showFilters && (
          <div className="flex flex-col gap-4 pt-4 border-t border-gray-100 animate-fade-in-down">
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
               <div className="flex flex-col gap-1">
                 <span className="text-xs text-gray-500 font-medium">Recorrência</span>
                 <select 
                   value={recurrenceFilter} 
                   onChange={(e) => setRecurrenceFilter(e.target.value as any)}
                   className="p-2 border border-gray-300 rounded-md text-sm outline-none bg-white"
                 >
                   <option value="all">Recorrência: Todos</option>
                   <option value="fixed">Fixas</option>
                   <option value="variable">Variáveis</option>
                 </select>
               </div>
               
               <div className="flex flex-col gap-1">
                 <span className="text-xs text-gray-500 font-medium">Parcelas</span>
                 <select 
                   value={installmentFilter} 
                   onChange={(e) => setInstallmentFilter(e.target.value as any)}
                   className="p-2 border border-gray-300 rounded-md text-sm outline-none bg-white disabled:opacity-50"
                   disabled={recurrenceFilter === 'fixed'}
                 >
                   <option value="all">Parcelas: Todas</option>
                   <option value="installment">Parcelados</option>
                   <option value="single">À vista</option>
                 </select>
               </div>
               
               <div className="flex flex-col gap-1">
                 <span className="text-xs text-gray-500 font-medium">Categoria</span>
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
               </div>

               <div className="flex flex-col gap-1">
                  <span className="text-xs text-gray-500 font-medium">Valor (R$)</span>
                  <div className="flex gap-2 items-center">
                    <input type="number" placeholder="Min" value={minAmount} onChange={e => setMinAmount(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md text-sm outline-none" />
                    <span className="text-gray-400">-</span>
                    <input type="number" placeholder="Max" value={maxAmount} onChange={e => setMaxAmount(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md text-sm outline-none" />
                  </div>
               </div>
             </div>

             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-3 border-t border-gray-50 pt-3">
               <div className="flex flex-col gap-1 lg:col-span-1">
                  <span className="text-xs text-gray-500 font-medium">Data de Vencimento</span>
                  <div className="flex gap-2 items-center">
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md text-xs outline-none" />
                    <span className="text-gray-400">-</span>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md text-xs outline-none" />
                  </div>
               </div>

               <div className="flex flex-col gap-1 lg:col-span-1">
                  <span className="text-xs text-gray-500 font-medium">Data do Pagamento</span>
                  <div className="flex gap-2 items-center">
                    <input type="date" value={paymentStartDate} onChange={e => setPaymentStartDate(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md text-xs outline-none" />
                    <span className="text-gray-400">-</span>
                    <input type="date" value={paymentEndDate} onChange={e => setPaymentEndDate(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md text-xs outline-none" />
                  </div>
               </div>

               <div className="flex flex-col gap-1 lg:col-span-1">
                  <span className="text-xs text-gray-500 font-medium">Data de Criação</span>
                  <div className="flex gap-2 items-center">
                    <input type="date" value={createdStartDate} onChange={e => setCreatedStartDate(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md text-xs outline-none" />
                    <span className="text-gray-400">-</span>
                    <input type="date" value={createdEndDate} onChange={e => setCreatedEndDate(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md text-xs outline-none" />
                  </div>
               </div>

               <div className="flex flex-col gap-1 lg:col-span-1">
                  <span className="text-xs text-gray-500 font-medium">Data de Edição</span>
                  <div className="flex gap-2 items-center">
                    <input type="date" value={updatedStartDate} onChange={e => setUpdatedStartDate(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md text-xs outline-none" />
                    <span className="text-gray-400">-</span>
                    <input type="date" value={updatedEndDate} onChange={e => setUpdatedEndDate(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md text-xs outline-none" />
                  </div>
               </div>
             </div>
             
             <div className="flex justify-end mt-2">
                <button onClick={clearFilters} className="text-xs text-red-500 hover:underline px-2 py-1">Limpar Filtros</button>
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

      {/* Anticipate Installments Modal */}
      {anticipateTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-gray-100">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-purple-700 via-purple-800 to-indigo-800 text-white p-5 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-xl text-purple-200 border border-white/20">
                  <FastForward size={22} className="text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    Antecipação de Parcelas
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-500/40 text-purple-100 border border-purple-300/30">
                      {seriesStats.totalCount}x parcelas
                    </span>
                  </h3>
                  <p className="text-purple-200 text-xs mt-0.5 font-medium">
                    {anticipateTarget.title} • <span className="opacity-90">{anticipateTarget.category}</span>
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setAnticipateTarget(null)}
                className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                title="Fechar"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {/* Progress & Totals Summary */}
              <div className="bg-purple-50/60 rounded-xl p-4 border border-purple-100">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-semibold text-purple-900">Progresso do Parcelamento</span>
                  <span className="text-xs font-bold text-purple-700">
                    {seriesStats.paidCount} de {seriesStats.totalCount} pagas ({seriesStats.totalCount > 0 ? Math.round((seriesStats.paidCount / seriesStats.totalCount) * 100) : 0}%)
                  </span>
                </div>
                {/* Progress bar */}
                <div className="w-full bg-purple-200/60 rounded-full h-2 overflow-hidden mb-3">
                  <div 
                    className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${seriesStats.totalCount > 0 ? (seriesStats.paidCount / seriesStats.totalCount) * 100 : 0}%` }}
                  ></div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-purple-100/80">
                  <div>
                    <div className="text-[11px] text-gray-500 font-medium">Total da Compra</div>
                    <div className="text-sm font-bold text-gray-800">{formatCurrency(seriesStats.totalAmount)}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-green-700 font-medium">Já Pago</div>
                    <div className="text-sm font-bold text-green-700">{formatCurrency(seriesStats.paidAmount)}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-red-600 font-medium">Saldo Restante</div>
                    <div className="text-sm font-bold text-red-600">{formatCurrency(seriesStats.pendingAmount)}</div>
                  </div>
                </div>
              </div>

              {/* Selection Fast-Actions */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold uppercase text-gray-600 tracking-wide flex items-center gap-1.5">
                    <Layers size={14} className="text-purple-600" />
                    Selecione as parcelas para adiantar
                  </label>
                  <span className="text-xs text-gray-500 font-medium">
                    {seriesStats.selectedCount} selecionada(s)
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-3">
                  <button
                    type="button"
                    onClick={() => handleSelectNextN(1)}
                    className="text-xs px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-purple-100 hover:text-purple-800 text-gray-700 font-medium transition-colors border border-gray-200 hover:border-purple-200"
                  >
                    + Próxima (1)
                  </button>
                  {seriesStats.pendingCount >= 2 && (
                    <button
                      type="button"
                      onClick={() => handleSelectNextN(2)}
                      className="text-xs px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-purple-100 hover:text-purple-800 text-gray-700 font-medium transition-colors border border-gray-200 hover:border-purple-200"
                    >
                      + Próximas 2
                    </button>
                  )}
                  {seriesStats.pendingCount >= 3 && (
                    <button
                      type="button"
                      onClick={() => handleSelectNextN(3)}
                      className="text-xs px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-purple-100 hover:text-purple-800 text-gray-700 font-medium transition-colors border border-gray-200 hover:border-purple-200"
                    >
                      + Próximas 3
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleSelectAllPending}
                    className="text-xs px-2.5 py-1 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-800 font-semibold transition-colors border border-purple-200"
                  >
                    Todas Pendentes ({seriesStats.pendingCount})
                  </button>
                  {selectedAnticipateIds.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearAnticipateSelection}
                      className="text-xs px-2.5 py-1 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors ml-auto"
                    >
                      Desmarcar todas
                    </button>
                  )}
                </div>

                {/* Installment Items Cards */}
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {seriesInstallments.map((t) => {
                    const isPaid = t.status === 'paid';
                    const isSelected = selectedAnticipateIds.includes(t.id);
                    const isAdvance = t.isAdvancePayment || t.installments?.isAdvancePayment;

                    return (
                      <div
                        key={t.id}
                        onClick={() => {
                          if (!isPaid) handleToggleAnticipate(t.id);
                        }}
                        className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                          isPaid 
                            ? 'bg-gray-50/80 border-gray-200 opacity-65 cursor-not-allowed' 
                            : isSelected
                              ? 'bg-purple-50/80 border-purple-400 ring-2 ring-purple-400/30 cursor-pointer shadow-xs'
                              : 'bg-white border-gray-200 hover:border-purple-300 hover:bg-gray-50/60 cursor-pointer'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {isPaid ? (
                            <div className="text-green-600">
                              <CheckCircle size={18} />
                            </div>
                          ) : (
                            <div className={`transition-colors ${isSelected ? 'text-purple-600' : 'text-gray-400'}`}>
                              {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                            </div>
                          )}

                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs px-2 py-0.5 rounded bg-purple-100 text-purple-800">
                                Parcela {t.installments?.current || 1}/{t.installments?.total || 1}
                              </span>
                              <span className="text-xs text-gray-600 font-medium">
                                Vencimento: {formatDate(t.date)}
                              </span>
                            </div>
                            
                            <div className="mt-1">
                              {isPaid ? (
                                isAdvance ? (
                                  <span className="inline-flex items-center text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded">
                                    <FastForward size={10} className="mr-1" /> Pago Antecipado em {formatDate(t.paymentDate || t.date)}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center text-[10px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded">
                                    <CheckCircle size={10} className="mr-1" /> Pago em {formatDate(t.paymentDate || t.date)}
                                  </span>
                                )
                              ) : isSelected ? (
                                <span className="inline-flex items-center text-[10px] font-bold text-purple-700 bg-purple-100/80 px-2 py-0.5 rounded">
                                  <FastForward size={10} className="mr-1" /> Será debitada no mês atual como "Pago Antecipado"
                                </span>
                              ) : (
                                <span className="inline-flex items-center text-[10px] font-semibold text-yellow-700 bg-yellow-100/80 px-2 py-0.5 rounded">
                                  <Clock size={10} className="mr-1" /> Pendente
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className={`font-bold text-sm ${isPaid ? 'text-gray-500' : isSelected ? 'text-purple-900' : 'text-gray-800'}`}>
                            {formatCurrency(t.amount)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Debit Date Configuration */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <label className="block text-xs font-bold uppercase text-gray-700 tracking-wide mb-1.5">
                  Data de Débito no Mês Atual
                </label>
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                  <input 
                    type="date" 
                    value={anticipatePaymentDate}
                    onChange={(e) => setAnticipatePaymentDate(e.target.value)}
                    className="p-2.5 bg-white border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 w-full sm:w-auto font-medium text-gray-800"
                  />
                  <p className="text-xs text-gray-500 leading-tight">
                    As parcelas antecipadas serão debitadas nesta data no mês corrente e receberão a etiqueta <strong className="text-purple-700">"Pago Antecipado"</strong>.
                  </p>
                </div>
              </div>

              {/* Anticipation Summary Box */}
              {selectedAnticipateIds.length > 0 && (
                <div className="bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-purple-500/10 p-4 rounded-xl border border-purple-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <div className="text-xs font-semibold text-purple-900">Total a Antecipar no Mês Atual:</div>
                    <div className="text-xs text-gray-600">
                      {seriesStats.selectedCount} parcela(s) selecionada(s)
                    </div>
                  </div>
                  <div className="text-xl font-extrabold text-purple-800">
                    {formatCurrency(seriesStats.selectedAmount)}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3 items-center">
              <button 
                type="button"
                onClick={() => setAnticipateTarget(null)}
                className="px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-200/80 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button 
                type="button"
                onClick={handleConfirmAnticipation}
                disabled={selectedAnticipateIds.length === 0}
                className="px-5 py-2.5 text-sm font-bold bg-purple-700 hover:bg-purple-800 text-white rounded-xl shadow-md hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2"
              >
                <FastForward size={16} />
                <span>Confirmar Antecipação ({selectedAnticipateIds.length})</span>
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

          {viewMode === 'grid' ? (
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
                          {t.isFixed && (
                              <span className="text-xs font-medium px-2 py-0.5 rounded bg-blue-100 text-blue-700 flex items-center gap-1" title="Despesa Fixa">
                                  <Repeat size={10} /> Fixa
                              </span>
                          )}
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

                  <div className="flex items-center justify-between pt-3 border-t border-gray-100 pl-8">
                     <div className="text-xs text-gray-400 italic">
                        {t.createdAt ? `Criado em ${formatDate(t.createdAt)}` : ''}
                     </div>
                     <div className="flex items-center gap-1.5">
                        {t.installments && t.installments.total > 1 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openAnticipateModal(t);
                            }}
                            className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 transition-colors shadow-xs"
                            title="Antecipar parcelas desta compra"
                          >
                            <FastForward size={13} />
                            <span>Antecipar</span>
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedIds([t.id]);
                            setShowBulkPaymentModal(true);
                          }}
                          className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 transition-colors shadow-xs"
                          title="Marcar como Pago"
                        >
                          <CheckCircle size={13} />
                          <span>Pagar</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditConta(t);
                          }}
                          className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-full transition-colors"
                          title="Editar"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteConta(t.id);
                          }}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                          title="Excluir"
                        >
                          <Trash2 size={15} />
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
                          checked={selectedIds.length === filteredContas.length && filteredContas.length > 0}
                          onChange={toggleSelectAll}
                          className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
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
                    {filteredContas.map((t) => (
                      <tr key={t.id} className={`hover:bg-gray-50 transition-colors cursor-pointer ${selectedIds.includes(t.id) ? 'bg-blue-50/50' : ''}`} onClick={() => toggleSelection(t.id)}>
                        <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(t.id)}
                            onChange={() => toggleSelection(t.id)}
                            className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                          />
                        </td>
                        <td className="p-3 text-sm text-gray-600 whitespace-nowrap">
                          <span className={`font-medium ${new Date(t.date) < new Date() ? 'text-red-600' : ''}`}>
                            {formatDate(t.date)}
                          </span>
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
                              <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 flex items-center gap-1 whitespace-nowrap" title="Despesa Fixa">
                                <Repeat size={10} /> Fixa
                              </span>
                            )}
                            {t.installments && t.installments.total > 1 && (
                              <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 flex items-center gap-1 whitespace-nowrap">
                                <Layers size={10} /> {t.installments.current}/{t.installments.total}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded text-red-700 bg-red-50 border border-red-100 whitespace-nowrap">
                            <Clock size={10} className="mr-1" /> PENDENTE
                          </span>
                        </td>
                        <td className="p-3 text-right font-bold text-gray-800 whitespace-nowrap">
                          {formatCurrency(t.amount)}
                        </td>
                        <td className="p-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            {t.installments && t.installments.total > 1 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openAnticipateModal(t);
                                }}
                                className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-md transition-colors"
                                title="Antecipar parcelas desta compra"
                              >
                                <FastForward size={12} />
                                <span>Antecipar</span>
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedIds([t.id]);
                                setShowBulkPaymentModal(true);
                              }}
                              className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 rounded-md transition-colors"
                              title="Marcar como Pago"
                            >
                              <CheckCircle size={12} />
                              <span>Pagar</span>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditConta(t);
                              }}
                              className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-md transition-colors"
                              title="Editar"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteConta(t.id);
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
          )}
        </>
      ) : (
         <div className="p-12 text-center text-gray-400 flex flex-col items-center bg-white rounded-lg shadow-sm">
           <CalendarCheck size={48} className="mb-4 opacity-20" />
           <p>Nenhuma conta encontrada para os filtros selecionados.</p>
         </div>
      )}
    </div>
  );
});

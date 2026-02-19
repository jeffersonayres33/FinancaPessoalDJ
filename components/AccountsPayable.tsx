
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, CheckSquare, Square, Check, CheckCircle2, Calendar, X, Printer, Download, FileSpreadsheet, File as FileIcon, ChevronDown, Filter, ArrowDownUp, Layers, CalendarCheck } from 'lucide-react';
import { Despesa, Category } from '../types';
import { formatCurrency, formatDate, printData } from '../utils';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

interface AccountsPayableProps {
  despesas: Despesa[];
  onMarkAsPaid: (ids: string[], paymentDate: string) => void;
  categories: Category[];
}

type SortOption = 'date-asc' | 'date-desc' | 'alpha-asc' | 'alpha-desc' | 'amount-asc' | 'amount-desc';

export const AccountsPayable: React.FC<AccountsPayableProps> = ({ despesas, onMarkAsPaid, categories }) => {
  const currentDate = new Date();

  // --- States for Filters (Copied from ExpenseList) ---
  const [month, setMonth] = useState<number>(currentDate.getMonth());
  const [year, setYear] = useState<number>(currentDate.getFullYear());
  const [installmentFilter, setInstallmentFilter] = useState<'all' | 'installment' | 'single'>('all');
  const [sortBy, setSortBy] = useState<SortOption>('date-asc');
  
  // Advanced Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Bulk Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modal State for Date Confirmation
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [pendingPaymentIds, setPendingPaymentIds] = useState<string[]>([]);
  const [paymentDateInput, setPaymentDateInput] = useState(new Date().toISOString().split('T')[0]);

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

  // --- Filtering Logic ---
  const payableDespesas = useMemo(() => {
    return despesas
      .filter(t => t.type === 'expense' && t.status === 'pending') // Force pending expenses
      .filter(t => {
        const tDate = new Date(t.date);
        
        // Date Logic (Custom Range OR Month/Year)
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

        // Installment Filter
        let installmentMatch = true;
        if (installmentFilter === 'installment') {
           installmentMatch = !!(t.installments && t.installments.total > 1);
        } else if (installmentFilter === 'single') {
           installmentMatch = !t.installments || t.installments.total === 1;
        }

        // Search Filter
        const searchMatch = t.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            t.category.toLowerCase().includes(searchTerm.toLowerCase());

        // Amount Filter
        let amountMatch = true;
        if (minAmount && t.amount < Number(minAmount)) amountMatch = false;
        if (maxAmount && t.amount > Number(maxAmount)) amountMatch = false;

        return dateMatch && searchMatch && amountMatch && installmentMatch;
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
  }, [despesas, month, year, sortBy, searchTerm, minAmount, maxAmount, startDate, endDate, installmentFilter]);

  // --- Calculate Selected Total ---
  const selectedTotal = useMemo(() => {
    return despesas
      .filter(d => selectedIds.has(d.id))
      .reduce((acc, curr) => acc + curr.amount, 0);
  }, [despesas, selectedIds]);

  const clearFilters = () => {
    setMonth(currentDate.getMonth());
    setYear(currentDate.getFullYear());
    setInstallmentFilter('all');
    setSortBy('date-asc');
    setSearchTerm('');
    setMinAmount('');
    setMaxAmount('');
    setStartDate('');
    setEndDate('');
  };

  const toggleSelection = (id: string) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedIds(newSelection);
  };

  const toggleAll = () => {
    if (selectedIds.size === payableDespesas.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(payableDespesas.map(t => t.id)));
    }
  };

  // Inititate Payment Flow
  const initiateBulkPayment = (e: React.MouseEvent) => {
    e.preventDefault();
    if (selectedIds.size === 0) return;
    setPendingPaymentIds(Array.from(selectedIds));
    setPaymentDateInput(new Date().toISOString().split('T')[0]); // Default to today
    setIsPaymentModalOpen(true);
  };

  const initiateSinglePayment = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setPendingPaymentIds([id]);
    setPaymentDateInput(new Date().toISOString().split('T')[0]); // Default to today
    setIsPaymentModalOpen(true);
  };

  // Confirm Payment
  const confirmPayment = () => {
    onMarkAsPaid(pendingPaymentIds, paymentDateInput);
    setIsPaymentModalOpen(false);
    setSelectedIds(new Set()); // Clear selection
    setPendingPaymentIds([]);
  };

  // --- Export & Print Handlers ---
  const handlePrint = () => {
    const headers = ['Vencimento', 'Título', 'Categoria', 'Valor', 'Status', 'Parcela'];
    const rows = payableDespesas.map(t => [
        formatDate(t.date),
        t.title,
        t.category,
        formatCurrency(t.amount),
        'Pendente',
        t.installments ? `${t.installments.current}/${t.installments.total}` : '-'
    ]);

    printData('Contas a Pagar', headers, rows);
  };

  const handleExportCSV = () => {
    const headers = ['Título', 'Vencimento', 'Categoria', 'Valor', 'Status', 'Parcela'];
    const rows = payableDespesas.map(t => {
      const date = new Date(t.date).toLocaleDateString('pt-BR');
      const amount = t.amount.toFixed(2).replace('.', ',');
      const safeTitle = `"${t.title.replace(/"/g, '""')}"`;
      const safeCategory = `"${t.category.replace(/"/g, '""')}"`;
      const installment = t.installments ? `${t.installments.current}/${t.installments.total}` : '-';
      return [safeTitle, date, safeCategory, amount, 'Pendente', installment].join(';');
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `contas_a_pagar_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowExportMenu(false);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text("Relatório de Contas a Pagar", 14, 15);
    
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 22);
    doc.text(`Total Pendente: ${formatCurrency(payableDespesas.reduce((acc, t) => acc + t.amount, 0))}`, 14, 27);

    const tableData = payableDespesas.map(t => [
      t.title,
      formatDate(t.date),
      t.category,
      formatCurrency(t.amount),
      t.installments ? `${t.installments.current}/${t.installments.total}` : '-'
    ]);

    autoTable(doc, {
      head: [['Título', 'Vencimento', 'Categoria', 'Valor', 'Parc.']],
      body: tableData,
      startY: 35,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [202, 138, 4] }, // Yellow-ish header for Warning/Pending
    });

    doc.save(`contas_a_pagar_${new Date().toISOString().split('T')[0]}.pdf`);
    setShowExportMenu(false);
  };

  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const years = Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - 2 + i);

  return (
    <div className="space-y-6 relative">
      {/* Header */}
      <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-yellow-400 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            Contas a Pagar
            <span className="text-sm font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
              {payableDespesas.length} pendentes
            </span>
          </h2>
          <p className="text-gray-500 text-sm mt-1">
             Total: <span className="font-bold text-red-600">{formatCurrency(payableDespesas.reduce((acc, t) => acc + t.amount, 0))}</span>
          </p>
        </div>

        <div className="flex flex-wrap gap-2 relative items-center">
          {/* Selected Total Display */}
          {selectedIds.size > 0 && (
             <div className="hidden sm:block mr-2 animate-fade-in text-right">
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Valor selecionado</div>
                <div className="text-sm font-bold text-purple-700">{formatCurrency(selectedTotal)}</div>
             </div>
          )}

          {/* Bulk Action Button */}
          {selectedIds.size > 0 && (
            <button 
              type="button"
              onClick={initiateBulkPayment}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-bold shadow-sm flex items-center gap-2 transition-colors animate-fade-in text-sm"
            >
              <CheckCircle2 size={18} />
              Pagar {selectedIds.size}
            </button>
          )}

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
            title="Imprimir lista"
          >
            <Printer size={18} /> <span className="hidden sm:inline">Imprimir</span>
          </button>
        </div>
      </div>
      
      {/* Mobile Selected Value (Shows below title on mobile only when selected) */}
      {selectedIds.size > 0 && (
        <div className="sm:hidden bg-purple-50 p-2 rounded-md border border-purple-100 flex justify-between items-center animate-fade-in -mt-4">
             <span className="text-xs font-bold text-gray-600 uppercase">Valor selecionado:</span>
             <span className="text-sm font-bold text-purple-700">{formatCurrency(selectedTotal)}</span>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col min-h-[400px]">
        {/* Filters Bar - Copied Logic, Adapted UI */}
        <div className="p-4 border-b bg-gray-50">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-2">
            
            {/* Month/Year Selection */}
            <div className="flex gap-2">
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
            </div>

            {/* Installment Filter */}
            <select 
              value={installmentFilter} 
              onChange={(e) => setInstallmentFilter(e.target.value as any)}
              className="p-2 border border-gray-300 rounded-md text-sm outline-none bg-white"
            >
              <option value="all">Parcelado: Todos</option>
              <option value="installment">Parcelados</option>
              <option value="single">À Vista</option>
            </select>

            {/* Sort */}
            <div className="relative">
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
              className={`flex items-center justify-center gap-2 px-4 py-2 rounded-md border text-sm font-medium transition-colors ${showFilters ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'}`}
            >
              <Filter size={18} /> Filtros Avançados
            </button>
          </div>

           {/* Collapsible Advanced Filters */}
          {showFilters && (
            <div className="border-t border-gray-200 pt-4 mt-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
              {/* Period Custom */}
              <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase">Período (Customizado)</label>
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

        {/* List */}
        <div className="overflow-x-auto flex-1">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 w-10">
                  <button onClick={toggleAll} className="text-gray-500 hover:text-purple-600">
                    {payableDespesas.length > 0 && selectedIds.size === payableDespesas.length ? <CheckSquare /> : <Square />}
                  </button>
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Título</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vencimento</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoria</th>
                <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Valor</th>
                <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {payableDespesas.map((t) => (
                <tr 
                  key={t.id} 
                  className={`hover:bg-gray-50 transition-colors cursor-pointer ${selectedIds.has(t.id) ? 'bg-purple-50' : ''}`}
                  onClick={() => toggleSelection(t.id)}
                >
                  <td className="px-6 py-4">
                    <div className={`text-gray-400 ${selectedIds.has(t.id) ? 'text-purple-600' : ''}`}>
                      {selectedIds.has(t.id) ? <CheckSquare size={20} /> : <Square size={20} />}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {t.title}
                    {t.installments && t.installments.total > 1 && (
                       <span className="ml-2 inline-flex items-center text-xs font-normal text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded">
                          <Layers size={10} className="mr-1" /> {t.installments.current}/{t.installments.total}
                       </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{formatDate(t.date)}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs print:border print:border-gray-300">
                      {t.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-bold text-red-600">
                    {formatCurrency(t.amount)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={(e) => initiateSinglePayment(e, t.id)}
                      className="text-green-600 hover:text-green-800 hover:bg-green-100 p-2 rounded-full transition-colors"
                      title="Marcar como pago"
                    >
                      <Check size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {payableDespesas.length === 0 && (
            <div className="p-10 text-center text-gray-400 flex flex-col items-center">
              <CalendarCheck size={48} className="mb-4 opacity-20" />
              <p>Nenhuma conta pendente encontrada para os filtros selecionados.</p>
            </div>
          )}
        </div>
      </div>

      {/* Payment Date Confirmation Modal */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm overflow-hidden animate-fade-in-up">
            <div className="flex justify-between items-center p-4 border-b bg-green-50">
              <h3 className="text-lg font-bold text-green-800 flex items-center gap-2">
                <Calendar size={20} /> Confirmar Pagamento
              </h3>
              <button 
                onClick={() => setIsPaymentModalOpen(false)} 
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6">
              <p className="text-gray-600 mb-4 text-sm">
                Confirme a data em que o pagamento foi realizado para {pendingPaymentIds.length} conta(s).
              </p>
              
              <label className="block text-sm font-medium text-gray-700 mb-1">Data do Pagamento</label>
              <input 
                type="date"
                value={paymentDateInput}
                onChange={(e) => setPaymentDateInput(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 outline-none"
              />

              <div className="flex gap-3 mt-6">
                <button 
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="flex-1 py-2 text-gray-600 hover:bg-gray-100 rounded border border-gray-300 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={confirmPayment}
                  className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-bold transition-colors shadow-sm"
                >
                  Confirmar Baixa
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

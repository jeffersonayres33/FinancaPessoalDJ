import React, { useState, useEffect, useRef } from 'react';
import { PlusCircle, X, CheckCircle, Clock, Layers, Camera, Loader2, FileText, AlertCircle, Repeat, Calendar } from 'lucide-react';
import { TransactionType, TransactionStatus, Despesa, Category } from '../types';
import { getCurrentLocalDateString } from '../utils';

interface DespesaFormProps {
  onAddDespesa: (title: string, amount: number, type: TransactionType, category: string, status: TransactionStatus, date: string, paymentDate?: string, installments?: number, observation?: string, isFixed?: boolean) => Promise<void> | void;
  onUpdateDespesa?: (despesa: Despesa) => Promise<void> | void;
  categories: Category[];
  onClose: () => void;
  isOpen: boolean;
  initialData?: Despesa | null;
  forceType?: TransactionType; // Se fornecido, força o tipo e esconde o seletor
}

export const DespesaForm: React.FC<DespesaFormProps> = ({ 
  onAddDespesa, 
  onUpdateDespesa,
  categories, 
  onClose, 
  isOpen,
  initialData,
  forceType
}) => {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<TransactionType>('expense');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState<TransactionStatus>('pending');
  const [date, setDate] = useState(getCurrentLocalDateString());
  const [paymentDate, setPaymentDate] = useState(getCurrentLocalDateString());
  const [installments, setInstallments] = useState(1);
  const [observation, setObservation] = useState('');
  const [isFixed, setIsFixed] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setAmount(initialData.amount.toString());
      setType(initialData.type);
      setCategory(initialData.category);
      setStatus(initialData.status);
      setDate(initialData.date);
      setPaymentDate(initialData.paymentDate || getCurrentLocalDateString());
      setInstallments(initialData.installments?.total || 1);
      setObservation(initialData.observation || '');
      setIsFixed(!!initialData.isFixed);
    } else {
      setTitle('');
      setAmount('');
      setType(forceType || 'expense');
      setCategory('');
      setStatus(forceType === 'investment' ? 'in' : 'pending');
      setDate(getCurrentLocalDateString());
      setPaymentDate(getCurrentLocalDateString());
      setInstallments(1);
      setObservation('');
      setIsFixed(false);
    }
    setAnalysisError('');
    setIsSaving(false);
  }, [initialData, isOpen, forceType]);

  const availableCategories = categories.filter(c => c.type === type || c.type === 'both');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !amount || !category) return;

    setIsSaving(true);

    try {
        const finalPaymentDate = (type === 'expense' && status === 'paid') ? paymentDate : undefined;
        const currentIsFixed = isFixed === true;

        if (initialData && onUpdateDespesa) {
          const initialIsFixed = !!initialData.isFixed;
          
          // Se era fixa e mudou para variável, avisa
          if (initialIsFixed && !currentIsFixed) {
             if (!window.confirm('Ao mudar para despesa Variável, o sistema NÃO irá mais lançar esta despesa automaticamente nos próximos meses. Deseja continuar?')) {
                 setIsSaving(false);
                 return;
             }
          }

          const updatePayload: Despesa = {
            id: initialData.id,
            title,
            amount: Number(amount),
            type,
            category,
            status,
            date,
            paymentDate: finalPaymentDate,
            observation,
            isFixed: currentIsFixed,
            createdAt: initialData.createdAt,
            // Se for variável, usa o valor do input (se > 1 cria estrutura, senão undefined/null)
            // Se for fixa, undefined/null
            installments: (!currentIsFixed && installments > 1) 
                ? { current: initialData.installments?.current || 1, total: installments } 
                : undefined
          };

          console.log('Enviando updatePayload:', updatePayload);

          await onUpdateDespesa(updatePayload);
        } else {
          await onAddDespesa(title, Number(amount), type, category, status, date, finalPaymentDate, installments, observation, currentIsFixed);
        }
        
        handleClose();
    } catch (error: any) {
        console.error("Erro ao salvar despesa:", error);
        alert(`Ocorreu um erro ao salvar: ${error.message || 'Erro desconhecido'}`);
    } finally {
        setIsSaving(false);
    }
  };

  const handleClose = () => {
    setTitle('');
    setAmount('');
    setType('expense');
    setCategory('');
    setStatus('pending');
    setDate(getCurrentLocalDateString());
    setInstallments(1);
    setObservation('');
    setIsFixed(false);
    setAnalysisError('');
    onClose();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    setAnalysisError('');

    // Simulação de análise de imagem (OCR)
    // Em um app real, enviaria para uma API de OCR
    setTimeout(() => {
        setIsAnalyzing(false);
        // Simula dados extraídos
        setTitle('Compra Detectada');
        setAmount('150.00');
        setDate(getCurrentLocalDateString());
        setAnalysisError('Nota: Dados extraídos automaticamente. Verifique antes de salvar.');
    }, 1500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100">
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            {initialData ? <FileText size={24} /> : <PlusCircle size={24} />}
            {initialData 
              ? (type === 'expense' ? 'Editar Despesa' : type === 'investment' ? 'Editar Investimento' : 'Editar Receita') 
              : (type === 'expense' ? 'Nova Despesa' : type === 'investment' ? 'Novo Investimento' : 'Nova Receita')}
          </h2>
          <button onClick={handleClose} className="text-white/80 hover:text-white transition-colors p-1 rounded-full hover:bg-white/20">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 max-h-[85vh] overflow-y-auto custom-scrollbar">
          
          {/* Botão de Scan (apenas para nova despesa) */}
          {!initialData && type === 'expense' && (
            <div className="mb-6">
                <input 
                    type="file" 
                    accept="image/*" 
                    capture="environment"
                    className="hidden" 
                    ref={fileInputRef}
                    onChange={handleFileChange}
                />
                <button 
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-3 border-2 border-dashed border-purple-300 rounded-xl text-purple-600 font-medium hover:bg-purple-50 transition-colors flex items-center justify-center gap-2"
                    disabled={isAnalyzing}
                >
                    {isAnalyzing ? <Loader2 size={20} className="animate-spin" /> : <Camera size={20} />}
                    {isAnalyzing ? 'Analisando cupom...' : 'Escanear Nota Fiscal / Cupom'}
                </button>
                {analysisError && (
                    <p className="text-xs text-amber-600 mt-2 flex items-center gap-1 bg-amber-50 p-2 rounded">
                        <AlertCircle size={12} /> {analysisError}
                    </p>
                )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* Seletor de Tipo (Receita / Despesa) */}
            {!forceType && (
                <div className="flex bg-gray-100 p-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setType('income')}
                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                      type === 'income' 
                        ? 'bg-white text-green-600 shadow-sm' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Receita
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('expense')}
                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                      type === 'expense' 
                        ? 'bg-white text-red-600 shadow-sm' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Despesa
                  </button>
                </div>
            )}

            {/* Título (Movido para o topo) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all bg-gray-50 focus:bg-white"
                placeholder="Ex: Supermercado, Aluguel..."
                required
              />
            </div>

            {/* Status de Pagamento (Movido para baixo do Título) */}
            <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">
                    {type === 'investment' ? 'Tipo:' : 'Pagamento:'}
                 </label>
                 {type === 'investment' ? (
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        <button
                            type="button"
                            onClick={() => setStatus('in')}
                            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-1 ${
                            status === 'in' 
                                ? 'bg-blue-100 text-blue-700 shadow-sm border border-blue-200' 
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            <CheckCircle size={16} /> Entrada
                        </button>
                        <button
                            type="button"
                            onClick={() => setStatus('out')}
                            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-1 ${
                            status === 'out' 
                                ? 'bg-orange-100 text-orange-700 shadow-sm border border-orange-200' 
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            <Clock size={16} /> Saída
                        </button>
                    </div>
                 ) : type === 'expense' ? (
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                      <button
                        type="button"
                        onClick={() => setStatus('paid')}
                        className={`flex-1 py-2 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-1 ${
                          status === 'paid' 
                            ? 'bg-green-100 text-green-700 shadow-sm border border-green-200' 
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        <CheckCircle size={16} /> Pago
                      </button>
                      <button
                        type="button"
                        onClick={() => setStatus('pending')}
                        className={`flex-1 py-2 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-1 ${
                          status === 'pending' 
                            ? 'bg-yellow-100 text-yellow-700 shadow-sm border border-yellow-200' 
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        <Clock size={16} /> Não Pago
                      </button>
                    </div>
                 ) : (
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        <button
                            type="button"
                            onClick={() => setStatus('paid')}
                            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-1 ${
                            status === 'paid' 
                                ? 'bg-green-100 text-green-700 shadow-sm border border-green-200' 
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            <CheckCircle size={16} /> Recebido
                        </button>
                        <button
                            type="button"
                            onClick={() => setStatus('pending')}
                            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-1 ${
                            status === 'pending' 
                                ? 'bg-yellow-100 text-yellow-700 shadow-sm border border-yellow-200' 
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            <Clock size={16} /> Pendente
                        </button>
                    </div>
                 )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Valor (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all bg-gray-50 focus:bg-white font-mono text-lg"
                  placeholder="0,00"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {type === 'expense' ? 'Vencimento' : 'Data Prevista'}
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all bg-gray-50 focus:bg-white"
                  required
                />
              </div>
            </div>

            {/* Seletor de Tipo de Despesa/Receita (Fixa/Variável) */}
            <div className={initialData ? 'opacity-70' : ''}>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                    Recorrência
                    {initialData && <span className="text-xs font-normal text-amber-600">(Não editável)</span>}
                </label>
                <div className="flex gap-2 bg-gray-100 p-1 rounded">
                    <button
                    type="button"
                    disabled={!!initialData}
                    onClick={() => {
                        setIsFixed(false);
                    }}
                    className={`flex-1 py-2 text-sm font-medium rounded transition-colors flex items-center justify-center gap-1 ${
                        !isFixed 
                        ? 'bg-purple-100 text-purple-700 border border-purple-200' 
                        : 'text-gray-500 hover:bg-gray-200'
                    } ${initialData ? 'cursor-not-allowed' : ''}`}
                    >
                    <Calendar size={16} /> Variável
                    </button>
                    <button
                    type="button"
                    disabled={!!initialData}
                    onClick={() => {
                        setIsFixed(true);
                        setInstallments(1); // Força 1 parcela se for fixa
                    }}
                    className={`flex-1 py-2 text-sm font-medium rounded transition-colors flex items-center justify-center gap-1 ${
                        isFixed 
                        ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' 
                        : 'text-gray-500 hover:bg-gray-200'
                    } ${initialData ? 'cursor-not-allowed' : ''}`}
                    >
                    <Repeat size={16} /> Fixa
                    </button>
                </div>
                {isFixed && (
                    <p className="text-xs text-indigo-600 mt-1 bg-indigo-50 p-2 rounded border border-indigo-100">
                        <Repeat size={12} className="inline mr-1"/>
                        O sistema lançará automaticamente uma cópia desta {type === 'expense' ? 'despesa' : type === 'investment' ? 'investimento' : 'receita'} a cada mês (20 dias após o vencimento).
                    </p>
                )}
            </div>

            {/* Parcelas - Disponível para nova despesa OU edição de despesa variável */}
            {type === 'expense' && !isFixed && (
               <div className={isFixed ? 'opacity-50 pointer-events-none' : ''}>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                     <Layers size={14} /> Parcelas {initialData && <span className="text-xs font-normal text-amber-600">(Editar parcelas não gera novos registros)</span>}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={installments}
                    onChange={(e) => setInstallments(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 outline-none"
                    disabled={isFixed}
                  />
               </div>
            )}
            
            {type === 'expense' && status === 'paid' && (
              <div className="animate-fade-in bg-green-50 p-3 rounded-md border border-green-100">
                <label className="block text-sm font-medium text-green-800 mb-1">
                  Data do Pagamento
                </label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full p-2 border border-green-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all bg-white"
                  required={status === 'paid'}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none bg-white"
                required
              >
                <option value="" disabled>Selecione uma categoria</option>
                {availableCategories.map((cat) => (
                  <option key={cat.id} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                <FileText size={14} /> Observação
              </label>
              <textarea
                value={observation}
                onChange={(e) => setObservation(e.target.value)}
                placeholder="Detalhes adicionais..."
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 outline-none h-20 resize-none text-sm"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded transition-colors mt-4 shadow-md"
            >
              {initialData ? 'Atualizar' : 'Salvar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

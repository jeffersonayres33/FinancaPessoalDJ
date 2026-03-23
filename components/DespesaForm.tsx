import React, { useState, useEffect, useRef } from 'react';
import { PlusCircle, X, CheckCircle, Clock, Layers, Camera, Loader2, FileText, AlertCircle, Repeat, Calendar, Settings } from 'lucide-react';
import { TransactionType, TransactionStatus, Despesa, Category } from '../types';
import { getCurrentLocalDateString, formatCurrency } from '../utils';
import { extractReceiptData } from '../services/geminiService';

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
  const [analysisSuccess, setAnalysisSuccess] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

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

    try {
      const compressImage = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
              const canvas = document.createElement('canvas');
              const MAX_WIDTH = 2048;
              const MAX_HEIGHT = 2048;
              let width = img.width;
              let height = img.height;

              if (width > height) {
                if (width > MAX_WIDTH) {
                  height *= MAX_WIDTH / width;
                  width = MAX_WIDTH;
                }
              } else {
                if (height > MAX_HEIGHT) {
                  width *= MAX_HEIGHT / height;
                  height = MAX_HEIGHT;
                }
              }
              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              ctx?.drawImage(img, 0, 0, width, height);
              resolve(canvas.toDataURL('image/jpeg', 0.95));
            };
            img.onerror = (error) => reject(error);
          };
          reader.onerror = (error) => reject(error);
        });
      };

      const base64String = await compressImage(file);
      
      try {
        const data = await extractReceiptData(base64String);
        if (data) {
          setTitle(data.title || '');
          setAmount(data.amount ? data.amount.toString() : '');
          if (data.date) setDate(data.date);
          if (data.observation) setObservation(data.observation);
          setAnalysisError('Concluído: Dados extraídos automaticamente. Verifique antes de salvar.');
          setAnalysisSuccess(true);
        } else {
          setAnalysisError('Não foi possível extrair os dados da imagem.');
          setAnalysisSuccess(false);
        }
      } catch (error: any) {
        console.error("Erro na extração:", error);
        setAnalysisError(`Erro ao analisar a imagem: ${error.message || 'Tente novamente.'}`);
        setAnalysisSuccess(false);
      } finally {
        setIsAnalyzing(false);
        if (cameraInputRef.current) cameraInputRef.current.value = '';
        if (galleryInputRef.current) galleryInputRef.current.value = '';
      }
    } catch (error) {
      console.error("Erro ao processar arquivo:", error);
      setAnalysisError('Erro ao processar a imagem localmente.');
      setIsAnalyzing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100 relative">
        {isAnalyzing && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm">
            <Settings size={48} className="text-white animate-spin mb-4" />
            <p className="text-white text-lg font-medium animate-pulse">Carregando... aguarde!</p>
          </div>
        )}
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
                <div className="flex gap-3">
                  <input 
                      type="file" 
                      accept="image/*" 
                      capture="environment"
                      className="hidden" 
                      ref={cameraInputRef}
                      onChange={handleFileChange}
                  />
                  <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      ref={galleryInputRef}
                      onChange={handleFileChange}
                  />
                  <button 
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="flex-1 py-3 border-2 border-dashed border-purple-300 rounded-xl text-purple-600 font-medium hover:bg-purple-50 transition-colors flex flex-col items-center justify-center gap-1"
                      disabled={isAnalyzing}
                  >
                      {isAnalyzing ? <Loader2 size={20} className="animate-spin" /> : <Camera size={20} />}
                      <span className="text-sm">Tirar Foto</span>
                  </button>
                  <button 
                      type="button"
                      onClick={() => galleryInputRef.current?.click()}
                      className="flex-1 py-3 border-2 border-dashed border-indigo-300 rounded-xl text-indigo-600 font-medium hover:bg-indigo-50 transition-colors flex flex-col items-center justify-center gap-1"
                      disabled={isAnalyzing}
                  >
                      {isAnalyzing ? <Loader2 size={20} className="animate-spin" /> : <Layers size={20} />}
                      <span className="text-sm">Galeria</span>
                  </button>
                </div>
                {analysisError && (
                    <p className={`text-xs mt-2 flex items-center gap-1 p-2 rounded ${analysisSuccess ? 'text-green-700 bg-green-50' : 'text-amber-600 bg-amber-50'}`}>
                        {analysisSuccess ? <CheckCircle size={12} /> : <AlertCircle size={12} />} {analysisError}
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
                  {installments > 1 && amount && !isNaN(parseFloat(amount)) && (
                    <p className="text-xs text-gray-500 mt-1">
                      Valor de cada parcela: <span className="font-semibold">{formatCurrency(parseFloat(amount) / installments)}</span>
                    </p>
                  )}
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

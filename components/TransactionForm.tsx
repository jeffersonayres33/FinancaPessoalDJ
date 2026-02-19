import React, { useState, useEffect, useRef } from 'react';
import { PlusCircle, X, CheckCircle, Clock, Layers, Camera, Loader2, FileText } from 'lucide-react';
import { TransactionType, TransactionStatus, Category, Transaction } from '../types';
import { extractReceiptData } from '../services/geminiService';

interface TransactionFormProps {
  onAddTransaction: (title: string, amount: number, type: TransactionType, category: string, status: TransactionStatus, date: string, paymentDate?: string, installments?: number, observation?: string) => void;
  onUpdateTransaction?: (transaction: Transaction) => void;
  initialData?: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  forceType?: TransactionType; // Nova prop opcional
}

export const TransactionForm: React.FC<TransactionFormProps> = ({ 
  onAddTransaction, 
  onUpdateTransaction,
  initialData, 
  isOpen, 
  onClose, 
  categories,
  forceType
}) => {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [type, setType] = useState<TransactionType>('expense');
  const [status, setStatus] = useState<TransactionStatus>('pending');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [installments, setInstallments] = useState(1);
  const [observation, setObservation] = useState('');
  
  // Image Capture State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load initial data when editing
  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setAmount(initialData.amount.toString());
      setType(initialData.type);
      setCategory(initialData.category);
      setStatus(initialData.status);
      setDate(initialData.date.split('T')[0]);
      if (initialData.paymentDate) {
        setPaymentDate(initialData.paymentDate.split('T')[0]);
      } else {
        setPaymentDate(new Date().toISOString().split('T')[0]);
      }
      setInstallments(1);
      setObservation(initialData.observation || '');
    } else {
      // Reset defaults for new transaction
      setTitle('');
      setAmount('');
      // Se forceType existir, usa ele, senão padrão 'expense'
      setType(forceType || 'expense');
      setStatus('pending');
      setDate(new Date().toISOString().split('T')[0]);
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setInstallments(1);
      setObservation('');
    }
  }, [initialData, isOpen, forceType]);

  // Filter categories based on type
  const availableCategories = categories.filter(c => c.type === 'both' || c.type === type);

  // Set default category
  useEffect(() => {
    if (availableCategories.length > 0) {
      const currentCategoryIsValid = availableCategories.some(c => c.name === category);
      if (!category || !currentCategoryIsValid) {
         if (!initialData || (initialData && initialData.type !== type)) {
            setCategory(availableCategories[0].name);
         }
      }
    } else {
      setCategory('');
    }
  }, [type, categories, initialData]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        try {
          const data = await extractReceiptData(base64String);
          if (data) {
            setTitle(data.title || '');
            setAmount(data.amount?.toString() || '');
            if (data.date) setDate(data.date);
            setObservation(data.observation || '');
            // Se forceType estiver definido, mantém ele, senão assume expense para recibos
            setType(forceType || 'expense'); 
          }
        } catch (error) {
          alert('Não foi possível ler os dados do recibo. Tente novamente com uma imagem mais clara.');
        } finally {
          setIsAnalyzing(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error(error);
      setIsAnalyzing(false);
    }
    
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !amount || !category) return;

    // Use selected payment date if status is paid and type is expense, otherwise ignore
    const finalPaymentDate = (type === 'expense' && status === 'paid') ? paymentDate : undefined;

    if (initialData && onUpdateTransaction) {
      onUpdateTransaction({
        ...initialData,
        title,
        amount: Number(amount),
        type,
        category,
        status,
        date,
        paymentDate: finalPaymentDate,
        observation
      });
    } else {
      onAddTransaction(title, Number(amount), type, category, status, date, finalPaymentDate, installments, observation);
    }
    
    handleClose();
  };

  const handleClose = () => {
    setTitle('');
    setAmount('');
    setType(forceType || 'expense');
    setStatus('pending');
    setDate(new Date().toISOString().split('T')[0]);
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setInstallments(1);
    setObservation('');
    setIsAnalyzing(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden animate-fade-in-up max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b bg-gray-50 sticky top-0 bg-white z-10">
          <h2 className="text-xl font-bold text-gray-800">
            {initialData ? 'Editar Transação' : (forceType === 'expense' ? 'Nova Despesa' : 'Nova Transação')}
          </h2>
          <button onClick={handleClose} className="text-gray-500 hover:text-gray-700 transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          
          {/* Receipt Capture Button */}
          {!initialData && (
            <div className="mb-4">
              <input 
                type="file" 
                accept="image/*" 
                capture="environment"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileChange}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isAnalyzing}
                className="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium py-3 rounded border border-indigo-200 border-dashed flex items-center justify-center gap-2 transition-colors"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 size={20} className="animate-spin" /> Processando Imagem...
                  </>
                ) : (
                  <>
                    <Camera size={20} /> Capturar Recibo / NF
                  </>
                )}
              </button>
              <p className="text-xs text-gray-500 mt-1 text-center">
                A IA preencherá os dados automaticamente, exceto a categoria.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
              <input
                type="text"
                placeholder="Ex: Aluguel, Salário, Compra TV"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                   {installments > 1 ? 'Valor Total (R$)' : 'Valor (R$)'}
                </label>
                <input
                  type="number"
                  placeholder="0,00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                  required
                  min="0"
                  step="0.01"
                />
                {installments > 1 && amount && (
                   <p className="text-xs text-gray-500 mt-1">
                      ~ {Number((Number(amount) / installments).toFixed(2))} por mês
                   </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                   {type === 'expense' ? 'Vencimento (1ª)' : 'Data'}
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Oculta o seletor de Tipo se forceType estiver presente */}
              {!forceType ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                  <div className="flex gap-2 bg-gray-100 p-1 rounded">
                    <button
                      type="button"
                      onClick={() => setType('income')}
                      disabled={!!initialData}
                      className={`flex-1 py-2 text-sm font-medium rounded transition-colors flex items-center justify-center gap-1 ${
                        type === 'income' 
                          ? 'bg-green-100 text-green-700 border border-green-200' 
                          : 'text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      <PlusCircle size={16} /> Entrada
                    </button>
                    <button
                      type="button"
                      onClick={() => setType('expense')}
                      disabled={!!initialData}
                      className={`flex-1 py-2 text-sm font-medium rounded transition-colors flex items-center justify-center gap-1 ${
                        type === 'expense' 
                          ? 'bg-red-100 text-red-700 border border-red-200' 
                          : 'text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      <PlusCircle size={16} className="rotate-45" /> Saída
                    </button>
                  </div>
                </div>
              ) : (
                /* Layout adjustment when type is hidden: Make Status span full width or keep grid layout? 
                   Lets keep grid layout but render an empty div or move status to fill if needed.
                   Actually, let's keep the layout consistent by just putting Status in the second slot and letting the first slot be empty or spanned.
                   Better: Make Status span full width if Type is hidden, OR just render nothing in Type slot.
                */
               <div className="hidden"></div> 
              )}

              <div className={forceType ? "col-span-2" : ""}>
                 <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                 <div className="flex gap-2 bg-gray-100 p-1 rounded">
                  <button
                    type="button"
                    onClick={() => setStatus('paid')}
                    className={`flex-1 py-2 text-sm font-medium rounded transition-colors flex items-center justify-center gap-1 ${
                      status === 'paid' 
                        ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                        : 'text-gray-500 hover:bg-gray-200'
                    }`}
                    title="Pago / Recebido"
                  >
                    <CheckCircle size={16} /> Pago
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatus('pending')}
                    className={`flex-1 py-2 text-sm font-medium rounded transition-colors flex items-center justify-center gap-1 ${
                      status === 'pending' 
                        ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' 
                        : 'text-gray-500 hover:bg-gray-200'
                    }`}
                    title="Não Pago"
                  >
                    <Clock size={16} /> Não Pago
                  </button>
                 </div>
              </div>
            </div>

            {/* Installments Input - Only for new Expenses */}
            {!initialData && type === 'expense' && (
               <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                     <Layers size={14} /> Parcelas
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={installments}
                    onChange={(e) => setInstallments(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 outline-none"
                  />
               </div>
            )}

            {/* Conditional Payment Date Field */}
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
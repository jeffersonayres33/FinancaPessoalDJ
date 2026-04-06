import React, { useState, useEffect } from 'react';
import { X, CheckCircle, Clock, Calendar, FileText, Edit2 } from 'lucide-react';
import { TransactionStatus, Category, Despesa } from '../types';
import { getCurrentLocalDateString } from '../utils';

interface BulkEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: Partial<Despesa>) => void;
  categories: Category[];
  type: 'expense' | 'income' | 'investment';
  selectedCount: number;
}

export const BulkEditModal: React.FC<BulkEditModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  categories,
  type,
  selectedCount
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState<TransactionStatus | ''>('');
  const [date, setDate] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  
  // Track which fields the user wants to update
  const [updateFields, setUpdateFields] = useState({
    title: false,
    category: false,
    status: false,
    date: false,
    paymentDate: false
  });

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setCategory('');
      setStatus('');
      setDate('');
      setPaymentDate(getCurrentLocalDateString());
      setUpdateFields({
        title: false,
        category: false,
        status: false,
        date: false,
        paymentDate: false
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    const data: Partial<Despesa> = {};
    if (updateFields.title && title) data.title = title;
    if (updateFields.category && category) data.category = category;
    if (updateFields.status && status) data.status = status as TransactionStatus;
    if (updateFields.date && date) data.date = date;
    if (updateFields.paymentDate && paymentDate && status === 'paid') data.paymentDate = paymentDate;

    onConfirm(data);
    onClose();
  };

  const availableCategories = categories.filter(c => c.type === type || c.type === 'both');

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100">
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Edit2 size={24} />
            Edição em Massa ({selectedCount})
          </h2>
          <button onClick={onClose} className="text-white/80 hover:text-white transition-colors p-1 rounded-full hover:bg-white/20">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <p className="text-sm text-gray-500 mb-4">
            Selecione os campos que deseja alterar para todos os {selectedCount} itens selecionados.
          </p>

          {/* Título */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input 
                type="checkbox" 
                id="update-title"
                checked={updateFields.title}
                onChange={(e) => setUpdateFields(prev => ({ ...prev, title: e.target.checked }))}
                className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
              />
              <label htmlFor="update-title" className="text-sm font-medium text-gray-700 cursor-pointer">Alterar Título</label>
            </div>
            {updateFields.title && (
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm"
                placeholder="Novo título para todos..."
              />
            )}
          </div>

          {/* Categoria */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input 
                type="checkbox" 
                id="update-category"
                checked={updateFields.category}
                onChange={(e) => setUpdateFields(prev => ({ ...prev, category: e.target.checked }))}
                className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
              />
              <label htmlFor="update-category" className="text-sm font-medium text-gray-700 cursor-pointer">Alterar Categoria</label>
            </div>
            {updateFields.category && (
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm bg-white"
              >
                <option value="">Selecione uma categoria</option>
                {availableCategories.map((cat) => (
                  <option key={cat.id} value={cat.name}>{cat.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* Status */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input 
                type="checkbox" 
                id="update-status"
                checked={updateFields.status}
                onChange={(e) => setUpdateFields(prev => ({ ...prev, status: e.target.checked }))}
                className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
              />
              <label htmlFor="update-status" className="text-sm font-medium text-gray-700 cursor-pointer">Alterar Status de Pagamento</label>
            </div>
            {updateFields.status && (
              <div className="flex bg-gray-100 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setStatus('paid')}
                  className={`flex-1 py-2 text-xs font-medium rounded-md transition-all flex items-center justify-center gap-1 ${
                    status === 'paid' 
                      ? 'bg-green-100 text-green-700 shadow-sm border border-green-200' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <CheckCircle size={14} /> {type === 'income' ? 'Recebido' : 'Pago'}
                </button>
                <button
                  type="button"
                  onClick={() => setStatus('pending')}
                  className={`flex-1 py-2 text-xs font-medium rounded-md transition-all flex items-center justify-center gap-1 ${
                    status === 'pending' 
                      ? 'bg-yellow-100 text-yellow-700 shadow-sm border border-yellow-200' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Clock size={14} /> Pendente
                </button>
              </div>
            )}
          </div>

          {/* Data de Pagamento (se status for pago) */}
          {updateFields.status && status === 'paid' && (
            <div className="space-y-2 animate-fade-in pl-6 border-l-2 border-green-200">
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="update-payment-date"
                  checked={updateFields.paymentDate}
                  onChange={(e) => setUpdateFields(prev => ({ ...prev, paymentDate: e.target.checked }))}
                  className="w-4 h-4 text-green-600 rounded border-gray-300 focus:ring-green-500"
                />
                <label htmlFor="update-payment-date" className="text-sm font-medium text-green-700 cursor-pointer">Alterar Data de Pagamento</label>
              </div>
              {updateFields.paymentDate && (
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full p-2 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm bg-green-50"
                />
              )}
            </div>
          )}

          {/* Vencimento / Data Prevista */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input 
                type="checkbox" 
                id="update-date"
                checked={updateFields.date}
                onChange={(e) => setUpdateFields(prev => ({ ...prev, date: e.target.checked }))}
                className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
              />
              <label htmlFor="update-date" className="text-sm font-medium text-gray-700 cursor-pointer">
                Alterar {type === 'expense' ? 'Vencimento' : 'Data Prevista'}
              </label>
            </div>
            {updateFields.date && (
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm"
              />
            )}
          </div>

          <div className="pt-4 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              disabled={!Object.values(updateFields).some(v => v)}
              className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-bold disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
            >
              Aplicar Alterações
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

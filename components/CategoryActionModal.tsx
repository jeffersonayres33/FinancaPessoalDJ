import React, { useState, useMemo } from 'react';
import { X, AlertTriangle, RefreshCw, Trash2, EyeOff, Check, Calendar, ArrowRight } from 'lucide-react';
import { Category, Despesa } from '../types';
import { formatCurrency } from '../utils';

export interface CategoryActionData {
  mode: 'delete' | 'rename' | 'inactivate' | 'activate';
  deleteOption?: 'inactivate' | 'migrate' | 'delete_all';
  targetCategoryName?: string;
  renameOption?: 'all' | 'future';
  newName?: string;
  effectMonth?: number;
  effectYear?: number;
  inactivateOption?: 'all' | 'immediate' | 'future';
}

interface CategoryActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: Category | null;
  mode: 'delete' | 'rename' | 'inactivate' | 'activate' | null;
  categories: Category[];
  transactions: Despesa[];
  pendingNewName?: string;
  onConfirm: (data: CategoryActionData) => Promise<void> | void;
}

export const CategoryActionModal: React.FC<CategoryActionModalProps> = ({
  isOpen,
  onClose,
  category,
  mode,
  categories,
  transactions,
  pendingNewName = '',
  onConfirm
}) => {
  if (!isOpen || !category || !mode) return null;

  // Count how many transactions use this category name
  const linkedTransactions = useMemo(() => {
    return transactions.filter(t => t.category === category.name);
  }, [transactions, category.name]);

  const hasTransactions = linkedTransactions.length > 0;

  // State for delete
  const [deleteOption, setDeleteOption] = useState<'inactivate' | 'migrate' | 'delete_all'>(
    hasTransactions ? 'inactivate' : 'delete_all'
  );
  const [targetCategoryName, setTargetCategoryName] = useState<string>('');

  // State for rename
  const [renameOption, setRenameOption] = useState<'all' | 'future'>('all');
  const [newName, setNewName] = useState<string>(pendingNewName || category.name);
  const [effectMonth, setEffectMonth] = useState<number>(new Date().getMonth());
  const [effectYear, setEffectYear] = useState<number>(new Date().getFullYear());

  // State for inactivate
  const [inactivateOption, setInactivateOption] = useState<'all' | 'immediate' | 'future'>('all');

  // Available target categories of the same type for migration (excluding the current one)
  const availableMigrationCategories = useMemo(() => {
    return categories.filter(c => 
      c.id !== category.id && 
      c.isActive !== false && 
      (c.type === category.type || c.type === 'both' || category.type === 'both')
    );
  }, [categories, category]);

  // Set default target migration category name
  React.useEffect(() => {
    if (availableMigrationCategories.length > 0) {
      setTargetCategoryName(availableMigrationCategories[0].name);
    }
  }, [availableMigrationCategories]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (mode === 'delete') {
      if (deleteOption === 'migrate' && !targetCategoryName) {
        alert('Por favor, selecione uma categoria de destino.');
        return;
      }
      onConfirm({
        mode,
        deleteOption,
        targetCategoryName: deleteOption === 'migrate' ? targetCategoryName : undefined
      });
    } else if (mode === 'rename') {
      if (!newName.trim()) {
        alert('O novo nome não pode ser vazio.');
        return;
      }
      onConfirm({
        mode,
        renameOption,
        newName: newName.trim(),
        effectMonth,
        effectYear
      });
    } else if (mode === 'inactivate') {
      onConfirm({
        mode,
        inactivateOption,
        effectMonth,
        effectYear
      });
    } else {
      // Activate
      onConfirm({
        mode
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col border border-gray-100 animate-scale-in">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-xl">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            {mode === 'delete' && <Trash2 className="text-red-500 animate-pulse" size={22} />}
            {mode === 'rename' && <RefreshCw className="text-purple-500 animate-spin-slow" size={22} />}
            {mode === 'inactivate' && <EyeOff className="text-amber-500" size={22} />}
            {mode === 'activate' && <Check className="text-green-500" size={22} />}
            
            {mode === 'delete' && 'Excluir Categoria'}
            {mode === 'rename' && 'Renomear Categoria'}
            {mode === 'inactivate' && 'Inativar Categoria'}
            {mode === 'activate' && 'Ativar Categoria'}
          </h3>
          <button 
            onClick={onClose} 
            id="btn_close_cat_action"
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1.5 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* CATEGORY INFO */}
          <div className="bg-purple-50 border border-purple-100 p-4 rounded-lg flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg text-purple-700 bg-purple-100`}>
              {category.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="text-xs font-semibold text-purple-800 uppercase tracking-wider">Categoria Selecionada</div>
              <div className="font-bold text-gray-900 text-base">{category.name}</div>
            </div>
          </div>

          {/* DELETE MODE */}
          {mode === 'delete' && (
            <div className="space-y-4">
              {hasTransactions ? (
                <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded text-sm text-red-800">
                  <div className="flex items-center gap-2 font-bold mb-1">
                    <AlertTriangle size={18} />
                    Atenção: Transações Vinculadas
                  </div>
                  <p>
                    Esta categoria possui <strong>{linkedTransactions.length}</strong> transações vinculadas no sistema.
                    Como você deseja gerenciar esse histórico?
                  </p>
                </div>
              ) : (
                <p className="text-gray-600 text-sm">
                  Esta categoria não está sendo usada por nenhuma transação. Você pode excluí-la com segurança.
                </p>
              )}

              {hasTransactions && (
                <div className="space-y-3">
                  {/* Option 1: Inactivate */}
                  <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:border-amber-300 transition-colors bg-white shadow-sm">
                    <div className="pt-0.5">
                      <input 
                        type="radio" 
                        name="delete_opt" 
                        value="inactivate"
                        checked={deleteOption === 'inactivate'} 
                        onChange={() => setDeleteOption('inactivate')}
                        className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 text-sm">Inativar Categoria (Recomendado)</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        Mantém todo o histórico e gráficos intactos, mas a categoria não aparecerá mais para novos lançamentos.
                      </div>
                    </div>
                  </label>

                  {/* Option 2: Migrate */}
                  {availableMigrationCategories.length > 0 && (
                    <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:border-purple-300 transition-colors bg-white shadow-sm">
                      <div className="pt-0.5">
                        <input 
                          type="radio" 
                          name="delete_opt" 
                          value="migrate"
                          checked={deleteOption === 'migrate'} 
                          onChange={() => setDeleteOption('migrate')}
                          className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 focus:ring-purple-500"
                        />
                      </div>
                      <div className="w-full">
                        <div className="font-semibold text-gray-900 text-sm">Mover lançamentos para outra categoria</div>
                        <div className="text-xs text-gray-500 mt-0.5 mb-2">
                          Migra todos os lançamentos passados e futuros desta categoria para outra categoria ativa e exclui esta.
                        </div>
                        {deleteOption === 'migrate' && (
                          <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                            <select
                              value={targetCategoryName}
                              onChange={(e) => setTargetCategoryName(e.target.value)}
                              className="w-full p-2 border border-gray-300 rounded-md text-sm outline-none bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                            >
                              {availableMigrationCategories.map(c => (
                                <option key={c.id} value={c.name}>{c.name} ({c.type})</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    </label>
                  )}

                  {/* Option 3: Delete all */}
                  <label className="flex items-start gap-3 p-3 rounded-lg border border-red-100 cursor-pointer hover:border-red-300 transition-colors bg-white shadow-sm text-red-900">
                    <div className="pt-0.5">
                      <input 
                        type="radio" 
                        name="delete_opt" 
                        value="delete_all"
                        checked={deleteOption === 'delete_all'} 
                        onChange={() => setDeleteOption('delete_all')}
                        className="w-4 h-4 text-red-600 bg-gray-100 border-gray-300 focus:ring-red-500"
                      />
                    </div>
                    <div>
                      <div className="font-semibold text-red-700 text-sm">Excluir tudo (Categoria + Lançamentos)</div>
                      <div className="text-xs text-red-500 mt-0.5">
                        Deleta permanentemente esta categoria e TODAS as <strong>{linkedTransactions.length}</strong> transações associadas.
                      </div>
                    </div>
                  </label>
                </div>
              )}
            </div>
          )}

          {/* RENAME MODE */}
          {mode === 'rename' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wider">Novo Nome da Categoria</label>
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="Novo nome"
                  className="w-full p-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                  required
                />
              </div>

              {hasTransactions ? (
                <div className="space-y-3 pt-2">
                  <p className="text-sm text-gray-600 font-medium">Esta categoria possui lançamentos ativos. Como deseja tratar o histórico?</p>
                  
                  {/* Option 1: Rename everywhere */}
                  <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:border-purple-300 transition-colors bg-white shadow-sm">
                    <div className="pt-0.5">
                      <input 
                        type="radio" 
                        name="rename_opt" 
                        value="all"
                        checked={renameOption === 'all'} 
                        onChange={() => setRenameOption('all')}
                        className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 text-sm">Todas as datas (Passado, Presente e Futuro)</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        Renomeia a categoria atual e altera o nome em todos os lançamentos passados e futuros de forma imediata.
                      </div>
                    </div>
                  </label>

                  {/* Option 2: Rename forward (split) */}
                  <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:border-blue-300 transition-colors bg-white shadow-sm">
                    <div className="pt-0.5">
                      <input 
                        type="radio" 
                        name="rename_opt" 
                        value="future"
                        checked={renameOption === 'future'} 
                        onChange={() => setRenameOption('future')}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500"
                      />
                    </div>
                    <div className="w-full">
                      <div className="font-semibold text-gray-900 text-sm">Apenas do mês selecionado em diante</div>
                      <div className="text-xs text-gray-500 mt-0.5 mb-2">
                        Deixa o histórico do passado intacto com a categoria antiga "{category.name}" (que será inativada), e cria a nova categoria "{newName}" para lançamentos futuros.
                      </div>
                      
                      {renameOption === 'future' && (
                        <div className="flex gap-2 bg-gray-50 p-2.5 rounded-lg border border-gray-100 mt-2" onClick={(e) => e.stopPropagation()}>
                          <select 
                            value={effectMonth} 
                            onChange={(e) => setEffectMonth(Number(e.target.value))}
                            className="flex-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 text-sm bg-white"
                          >
                            <option value={0}>Janeiro</option>
                            <option value={1}>Fevereiro</option>
                            <option value={2}>Março</option>
                            <option value={3}>Abril</option>
                            <option value={4}>Maio</option>
                            <option value={5}>Junho</option>
                            <option value={6}>Julho</option>
                            <option value={7}>Agosto</option>
                            <option value={8}>Setembro</option>
                            <option value={9}>Outubro</option>
                            <option value={10}>Novembro</option>
                            <option value={11}>Dezembro</option>
                          </select>
                          <input 
                            type="number" 
                            value={effectYear} 
                            onChange={(e) => setEffectYear(Number(e.target.value))}
                            className="w-24 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 text-sm bg-white"
                          />
                        </div>
                      )}
                    </div>
                  </label>
                </div>
              ) : (
                <p className="text-xs text-gray-500 italic">Esta categoria não tem transações, então a alteração do nome será aplicada imediatamente.</p>
              )}
            </div>
          )}

          {/* INACTIVATE MODE */}
          {mode === 'inactivate' && (
            <div className="space-y-4">
              <p className="text-gray-600 text-sm leading-relaxed">
                Ao inativar a categoria <strong>{category.name}</strong>, como deseja aplicar esta alteração?
              </p>

              <div className="space-y-3">
                {/* Option 1: All time */}
                <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:border-amber-300 transition-colors bg-white shadow-sm">
                  <div className="pt-0.5">
                    <input 
                      type="radio" 
                      name="inactivate_opt" 
                      value="all"
                      checked={inactivateOption === 'all'} 
                      onChange={() => setInactivateOption('all')}
                      className="w-4 h-4 text-amber-600 bg-gray-100 border-gray-300 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 text-sm">Todas as datas (Passado, Presente e Futuro)</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      Inativa a categoria em todo o histórico. Ela não aparecerá no saldo por categoria de nenhum mês.
                    </div>
                  </div>
                </label>

                {/* Option 2: Immediate */}
                <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:border-amber-300 transition-colors bg-white shadow-sm">
                  <div className="pt-0.5">
                    <input 
                      type="radio" 
                      name="inactivate_opt" 
                      value="immediate"
                      checked={inactivateOption === 'immediate'} 
                      onChange={() => setInactivateOption('immediate')}
                      className="w-4 h-4 text-amber-600 bg-gray-100 border-gray-300 focus:ring-amber-500"
                    />
                  </div>
                  <div className="w-full">
                    <div className="font-semibold text-gray-900 text-sm">Efeito Imediato Mês Específico</div>
                    <div className="text-xs text-gray-500 mt-0.5 mb-2">
                      A categoria ficará inativa a partir do mês selecionado. Nos meses anteriores ela continuará ativa no saldo por categoria.
                    </div>
                  </div>
                </label>

                {/* Option 3: Future */}
                <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:border-blue-300 transition-colors bg-white shadow-sm">
                  <div className="pt-0.5">
                    <input 
                      type="radio" 
                      name="inactivate_opt" 
                      value="future"
                      checked={inactivateOption === 'future'} 
                      onChange={() => setInactivateOption('future')}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500"
                    />
                  </div>
                  <div className="w-full">
                    <div className="font-semibold text-gray-900 text-sm">Efeito Futuro A Partir do Mês Específico</div>
                    <div className="text-xs text-gray-500 mt-0.5 mb-2">
                      A categoria permanece ativa no mês selecionado e passa a ficar inativa a partir do mês seguinte.
                    </div>
                  </div>
                </label>
              </div>

              {(inactivateOption === 'immediate' || inactivateOption === 'future') && (
                <div className="flex gap-2 bg-gray-50 p-2.5 rounded-lg border border-gray-100 mt-2" onClick={(e) => e.stopPropagation()}>
                  <select 
                    value={effectMonth} 
                    onChange={(e) => setEffectMonth(Number(e.target.value))}
                    className="flex-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 text-sm bg-white"
                  >
                    <option value={0}>Janeiro</option>
                    <option value={1}>Fevereiro</option>
                    <option value={2}>Março</option>
                    <option value={3}>Abril</option>
                    <option value={4}>Maio</option>
                    <option value={5}>Junho</option>
                    <option value={6}>Julho</option>
                    <option value={7}>Agosto</option>
                    <option value={8}>Setembro</option>
                    <option value={9}>Outubro</option>
                    <option value={10}>Novembro</option>
                    <option value={11}>Dezembro</option>
                  </select>
                  <input 
                    type="number" 
                    value={effectYear} 
                    onChange={(e) => setEffectYear(Number(e.target.value))}
                    className="w-24 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 text-sm bg-white"
                  />
                </div>
              )}
            </div>
          )}

          {/* ACTIVATE MODE */}
          {mode === 'activate' && (
            <div className="space-y-4">
              <p className="text-gray-600 text-sm leading-relaxed">
                Deseja reativar a categoria <strong>{category.name}</strong>? Ela voltará a aparecer normalmente na seleção para novos lançamentos e orçamentos.
              </p>
            </div>
          )}

        </form>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 flex flex-col sm:flex-row justify-end gap-2 bg-gray-50 rounded-b-xl">
          <button 
            type="button"
            onClick={onClose} 
            className="w-full sm:w-auto px-4 py-2 font-medium text-gray-600 hover:bg-gray-200 bg-white border border-gray-300 rounded-lg transition-colors text-center text-sm"
          >
            Cancelar
          </button>
          <button 
            type="button"
            onClick={handleSubmit}
            className={`w-full sm:w-auto px-5 py-2 font-medium text-white rounded-lg transition-colors text-center text-sm flex items-center justify-center gap-1.5 ${
              mode === 'delete' ? 'bg-red-600 hover:bg-red-700' :
              mode === 'inactivate' ? 'bg-amber-600 hover:bg-amber-700' :
              mode === 'activate' ? 'bg-green-600 hover:bg-green-700' :
              'bg-purple-600 hover:bg-purple-700'
            }`}
          >
            {mode === 'delete' && <Trash2 size={16} />}
            Confirmar e Aplicar
          </button>
        </div>

      </div>
    </div>
  );
};

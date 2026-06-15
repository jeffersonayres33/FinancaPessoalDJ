import React, { useMemo } from 'react';
import { Despesa } from '../types';
import { Play, Pause, FastForward, Edit2, Trash2, Repeat } from 'lucide-react';
import { formatCurrency } from '../utils';

interface FutureLaunchesProps {
  despesas: Despesa[];
  onToggleActive: (trans: Despesa, isActive: boolean) => void;
  onEdit: (trans: Despesa) => void;
  onDelete: (trans: Despesa) => void;
  onAnticipate: (trans: Despesa) => void;
}

export const FutureLaunches: React.FC<FutureLaunchesProps> = ({ despesas, onToggleActive, onEdit, onDelete, onAnticipate }) => {
  // Extract the latest transaction for each fixed group
  const groupedLaunches = useMemo(() => {
    const fixedTransactions = despesas.filter(t => t.isFixed && (t.type === 'expense' || t.type === 'income' || t.type === 'investment'));
    
    const latestMap = new Map<string, Despesa>();
    for (const trans of fixedTransactions) {
      const key = `${trans.type}|${trans.title.toLowerCase().trim()}|${trans.category}`;
      const existing = latestMap.get(key);
      if (!existing || new Date(trans.date) > new Date(existing.date)) {
        latestMap.set(key, trans);
      }
    }
    
    return Array.from(latestMap.values());
  }, [despesas]);

  const expenses = groupedLaunches.filter(t => t.type === 'expense');
  const incomes = groupedLaunches.filter(t => t.type === 'income');
  const investments = groupedLaunches.filter(t => t.type === 'investment');

  const getNextDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00');
    d.setMonth(d.getMonth() + 1);
    // Ajuste para fim de mês
    if (d.getDate() !== new Date(dateStr + 'T12:00:00').getDate()) {
        d.setDate(0);
    }
    return d.toLocaleDateString('pt-BR');
  };

  const renderSection = (title: string, list: Despesa[]) => (
    <div className="bg-white p-6 rounded-lg shadow-sm">
      <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-100 pb-4 mb-4">{title} ({list.length})</h3>
      {list.length === 0 ? (
        <p className="text-gray-500 text-sm italic">Nenhum lançamento futuro encontrado.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map(t => {
            const isActive = t.installments?.current !== 0;
            return (
              <div key={t.id} className={`bg-white rounded-lg border flex flex-col shadow-sm transition-all hover:shadow-md ${isActive ? 'border-indigo-100' : 'border-gray-200 opacity-75'}`}>
                 <div className="p-4 flex-1">
                     <div className="flex justify-between items-start mb-2">
                        <div className="flex-1 pr-2">
                            <h4 className="font-semibold text-gray-800 truncate" title={t.title}>{t.title}</h4>
                            <div className="text-xs text-gray-500 mt-1">{t.category}</div>
                        </div>
                        <div className="text-right whitespace-nowrap">
                            <span className={`font-semibold ${t.type === 'expense' ? 'text-red-600' : t.type === 'income' ? 'text-green-600' : 'text-blue-600'}`}>
                                {t.type === 'expense' ? '-' : ''}{formatCurrency(t.amount)}
                            </span>
                        </div>
                     </div>
                     
                     <div className="mt-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1.5 mb-2">
                            <span className={`w-2.5 h-2.5 rounded-full ${isActive ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                            <span className="font-medium">{isActive ? 'Ativo' : 'Pausado'}</span>
                        </div>
                        <div className="text-xs text-gray-500 space-y-1">
                            <p>Última ocorrência: <strong>{new Date(t.date + 'T12:00:00').toLocaleDateString('pt-BR')}</strong></p>
                            {isActive && <p>Próximo lançamento sugerido para: <strong>{getNextDate(t.date)}</strong></p>}
                        </div>
                     </div>
                 </div>

                 <div className="bg-gray-50 p-3 border-t border-gray-100 flex items-center justify-between rounded-b-lg">
                    <div className="flex gap-2">
                        <button 
                            onClick={() => onToggleActive(t, !isActive)}
                            className={`p-1.5 rounded-md transition-colors ${isActive ? 'text-amber-600 hover:bg-amber-50' : 'text-green-600 hover:bg-green-50'}`}
                            title={isActive ? "Pausar recorrência" : "Ativar recorrência"}
                        >
                            {isActive ? <Pause size={18} /> : <Play size={18} />}
                        </button>
                        <button 
                            onClick={() => onEdit(t)}
                            className="p-1.5 rounded-md text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Editar modelo (Altera o último registro gerado)"
                        >
                            <Edit2 size={18} />
                        </button>
                        <button 
                            onClick={() => onDelete(t)}
                            className="p-1.5 rounded-md text-red-600 hover:bg-red-50 transition-colors"
                            title="Remover recorrência completamente"
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>
                    {isActive && (
                        <button 
                            onClick={() => onAnticipate(t)}
                            className="flex items-center gap-1.5 text-xs font-semibold text-indigo-700 bg-indigo-100 hover:bg-indigo-200 transition-colors px-3 py-1.5 rounded-md"
                            title="Antecipar e gerar a transação do próximo mês agora"
                        >
                            <FastForward size={14} /> Antecipar
                        </button>
                    )}
                 </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-lg shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Repeat className="text-indigo-600" size={24} /> Lançamentos Futuros
            <span className="text-sm font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
              {groupedLaunches.length} itens
            </span>
          </h2>
          <p className="text-gray-500 text-sm mt-1">
             Gerencie suas transações fixas configuradas para geração automática.
          </p>
        </div>
      </div>

       <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-lg shadow-sm">
          <p className="text-sm text-blue-800 leading-relaxed">
             O sistema analisa todos os registros de despesas, receitas ou investimentos fixos para projetar as próximas competências.
             Você pode pausar, editar os valores base ou forçar a antecipação de um lançamento do próximo mês.
          </p>
       </div>

       {renderSection('Receitas Fixas', incomes)}
       {renderSection('Despesas Fixas', expenses)}
       {renderSection('Investimentos Fixos', investments)}
    </div>
  );
};

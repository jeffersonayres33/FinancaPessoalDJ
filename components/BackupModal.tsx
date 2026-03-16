import React, { useState, useEffect } from 'react';
import { X, Download, CheckSquare, Square, ChevronDown, ChevronRight } from 'lucide-react';

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  onConfirm: (selections: Record<string, {
    expenses: boolean;
    incomes: boolean;
    investments: boolean;
    payables: boolean;
    categories: boolean;
  }>) => void;
}

export const BackupModal: React.FC<BackupModalProps> = ({ isOpen, onClose, user, onConfirm }) => {
  const [selections, setSelections] = useState<Record<string, {
    expenses: boolean;
    incomes: boolean;
    investments: boolean;
    payables: boolean;
    categories: boolean;
  }>>({});
  const [expandedUsers, setExpandedUsers] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (isOpen && user) {
      const initialSelections: Record<string, any> = {};
      const initialExpanded: Record<string, boolean> = {};
      
      const allUsers = [
        { id: user.dataContextId, name: user.name + ' (Você)' },
        ...(user.members || []).map((m: any) => ({
          id: m.data_context_id || m.dataContextId,
          name: m.name
        }))
      ];

      allUsers.forEach(u => {
        if (u.id) {
          initialSelections[u.id] = {
            expenses: true,
            incomes: true,
            investments: true,
            payables: true,
            categories: true
          };
          initialExpanded[u.id] = false;
        }
      });
      
      setSelections(initialSelections);
      setExpandedUsers(initialExpanded);
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  const allUsers = [
    { id: user.dataContextId, name: user.name + ' (Você)' },
    ...(user.members || []).map((m: any) => ({
      id: m.data_context_id || m.dataContextId,
      name: m.name
    }))
  ].filter(u => u.id);

  const handleToggleUser = (userId: string) => {
    const current = selections[userId];
    const allSelected = current.expenses && current.incomes && current.investments && current.payables && current.categories;
    
    setSelections(prev => ({
      ...prev,
      [userId]: {
        expenses: !allSelected,
        incomes: !allSelected,
        investments: !allSelected,
        payables: !allSelected,
        categories: !allSelected
      }
    }));
  };

  const handleToggleSection = (userId: string, section: keyof typeof selections[string]) => {
    setSelections(prev => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        [section]: !prev[userId][section]
      }
    }));
  };

  const toggleExpand = (userId: string) => {
    setExpandedUsers(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  const handleConfirm = () => {
    onConfirm(selections);
    onClose();
  };

  const isUserFullySelected = (userId: string) => {
    const s = selections[userId];
    return s && s.expenses && s.incomes && s.investments && s.payables && s.categories;
  };

  const isUserPartiallySelected = (userId: string) => {
    const s = selections[userId];
    if (!s) return false;
    const anySelected = s.expenses || s.incomes || s.investments || s.payables || s.categories;
    return anySelected && !isUserFullySelected(userId);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100 flex flex-col max-h-[90vh]">
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4 flex justify-between items-center shrink-0">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Download size={24} />
            Opções de Backup
          </h2>
          <button onClick={onClose} className="text-white/80 hover:text-white transition-colors p-1 rounded-full hover:bg-white/20">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
          <p className="text-gray-600 mb-6 text-sm">
            Selecione quais dados você deseja incluir no arquivo de backup. Você pode expandir cada usuário para escolher seções específicas.
          </p>

          <div className="space-y-4">
            {allUsers.map(u => (
              <div key={u.id} className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="bg-gray-50 p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => handleToggleUser(u.id)}
                      className="text-indigo-600 hover:text-indigo-800 transition-colors"
                    >
                      {isUserFullySelected(u.id) ? (
                        <CheckSquare size={20} />
                      ) : isUserPartiallySelected(u.id) ? (
                        <div className="relative w-5 h-5 flex items-center justify-center border-2 border-indigo-600 rounded bg-indigo-600">
                          <div className="w-2.5 h-0.5 bg-white rounded-full"></div>
                        </div>
                      ) : (
                        <Square size={20} className="text-gray-400" />
                      )}
                    </button>
                    <span className="font-medium text-gray-800">{u.name}</span>
                  </div>
                  <button 
                    onClick={() => toggleExpand(u.id)}
                    className="p-1 hover:bg-gray-200 rounded-full transition-colors text-gray-500"
                  >
                    {expandedUsers[u.id] ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                  </button>
                </div>

                {expandedUsers[u.id] && selections[u.id] && (
                  <div className="p-3 bg-white border-t border-gray-100 space-y-2 pl-10">
                    {[
                      { key: 'expenses', label: 'Despesas (Pagas)' },
                      { key: 'payables', label: 'A Pagar (Pendentes)' },
                      { key: 'incomes', label: 'Receitas' },
                      { key: 'investments', label: 'Investimentos' },
                      { key: 'categories', label: 'Categorias' }
                    ].map(section => (
                      <div key={section.key} className="flex items-center gap-3">
                        <button 
                          onClick={() => handleToggleSection(u.id, section.key as any)}
                          className="text-indigo-600 hover:text-indigo-800 transition-colors"
                        >
                          {selections[u.id][section.key as keyof typeof selections[string]] ? (
                            <CheckSquare size={18} />
                          ) : (
                            <Square size={18} className="text-gray-400" />
                          )}
                        </button>
                        <span className="text-sm text-gray-700">{section.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 border-t bg-gray-50 flex gap-3 shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-100 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
          >
            <Download size={18} />
            Baixar Backup
          </button>
        </div>
      </div>
    </div>
  );
};


import React, { useMemo } from 'react';
import { Category, Despesa } from '../types';
import { formatCurrency } from '../utils';
import { AlertTriangle } from 'lucide-react';

interface BalanceByCategoryProps {
  categories: Category[];
  expenses: Despesa[]; // Despesas já filtradas por mês/ano
}

export const BalanceByCategory: React.FC<BalanceByCategoryProps> = ({ categories, expenses }) => {
  const data = useMemo(() => {
    // Filtra apenas categorias de despesa ou ambas
    const relevantCategories = categories.filter(c => c.type === 'expense' || c.type === 'both');

    const report = relevantCategories.map(cat => {
      const budget = cat.budget || 0;
      
      // Soma gastos desta categoria no período filtrado
      const spent = expenses
        .filter(e => e.category === cat.name && e.type === 'expense')
        .reduce((sum, e) => sum + e.amount, 0);

      const balance = budget - spent;
      const percentage = budget > 0 ? (spent / budget) * 100 : (spent > 0 ? 100 : 0);

      return {
        id: cat.id,
        name: cat.name,
        budget,
        spent,
        balance,
        percentage
      };
    });

    // Ordena por maior percentual de uso do orçamento
    return report.sort((a, b) => b.percentage - a.percentage);
  }, [categories, expenses]);

  // Cálculos dos Totais Gerais com useMemo para evitar recálculos desnecessários
  const totals = useMemo(() => {
    return data.reduce((acc, curr) => ({
      budget: acc.budget + curr.budget,
      spent: acc.spent + curr.spent,
      balance: acc.balance + curr.balance
    }), { budget: 0, spent: 0, balance: 0 });
  }, [data]);

  const totalPercentage = totals.budget > 0 
    ? (totals.spent / totals.budget) * 100 
    : (totals.spent > 0 ? 100 : 0);

  if (data.length === 0) return null;

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-100 overflow-hidden flex flex-col h-full">
      <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-700">Saldo por Categoria</h3>
        <span className="text-xs text-gray-500">Orçamento vs Realizado (Mês Atual)</span>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 font-medium">Categoria</th>
              <th className="px-4 py-3 font-medium text-right">Orçamento</th>
              <th className="px-4 py-3 font-medium text-right">Gasto</th>
              <th className="px-4 py-3 font-medium text-center">Progresso</th>
              <th className="px-4 py-3 font-medium text-right">Saldo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-medium text-gray-800">{item.name}</td>
                <td className="px-4 py-3 text-right text-gray-600">
                  {item.budget > 0 ? formatCurrency(item.budget) : <span className="text-gray-400 italic">Não def.</span>}
                </td>
                <td className="px-4 py-3 text-right font-medium text-gray-800">
                  {formatCurrency(item.spent)}
                </td>
                <td className="px-4 py-3 w-1/4">
                   <div className="flex items-center gap-2">
                     <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div 
                          className={`h-2.5 rounded-full ${
                            item.percentage > 100 ? 'bg-red-600' : 
                            item.percentage > 85 ? 'bg-yellow-500' : 'bg-green-500'
                          }`} 
                          style={{ width: `${Math.min(item.percentage, 100)}%` }}
                        ></div>
                     </div>
                     <span className="text-xs font-medium w-10 text-right">{item.percentage.toFixed(0)}%</span>
                   </div>
                </td>
                <td className={`px-4 py-3 text-right font-bold ${item.balance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatCurrency(item.balance)}
                </td>
              </tr>
            ))}
          </tbody>
          {/* Rodapé com Totais */}
          <tfoot className="bg-gray-100 border-t-2 border-gray-200 font-bold">
            <tr>
              <td className="px-4 py-3 text-gray-900 uppercase tracking-wide">TOTAL</td>
              <td className="px-4 py-3 text-right text-gray-900">{formatCurrency(totals.budget)}</td>
              <td className="px-4 py-3 text-right text-gray-900">{formatCurrency(totals.spent)}</td>
              <td className="px-4 py-3">
                 <div className="flex items-center gap-2">
                   <div className="w-full bg-gray-300 rounded-full h-2.5">
                      <div 
                        className={`h-2.5 rounded-full ${
                          totalPercentage > 100 ? 'bg-red-700' : 
                          totalPercentage > 85 ? 'bg-yellow-600' : 'bg-green-600'
                        }`} 
                        style={{ width: `${Math.min(totalPercentage, 100)}%` }}
                      ></div>
                   </div>
                   <span className="text-xs font-bold w-10 text-right">{totalPercentage.toFixed(0)}%</span>
                 </div>
              </td>
              <td className={`px-4 py-3 text-right ${totals.balance < 0 ? 'text-red-700' : 'text-green-700'}`}>
                {formatCurrency(totals.balance)}
                {totals.balance < 0 && <AlertTriangle size={12} className="inline ml-1 mb-0.5" />}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      
      {data.length === 0 && (
         <div className="p-6 text-center text-gray-400">
            Nenhuma categoria de despesa cadastrada.
         </div>
      )}
    </div>
  );
};

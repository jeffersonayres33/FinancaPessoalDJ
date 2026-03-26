import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, AreaChart, Area, ComposedChart } from 'recharts';
import { Despesa } from '../types';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

// 1. Evolução de Aportes (Investimentos)
export const InvestmentEvolutionChart: React.FC<{ despesas: Despesa[], year: number }> = ({ despesas, year }) => {
  const data = useMemo(() => {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const monthlyTotals = new Array(12).fill(0);

    despesas.forEach(t => {
      const [y, m] = t.date.split('-').map(Number);
      if (t.type === 'investment' && t.status === 'paid' && (year === -1 || y === year)) {
        monthlyTotals[m - 1] += t.amount;
      }
    });

    return months.map((month, index) => ({
      name: month,
      total: monthlyTotals[index]
    })).filter(d => year !== -1 || d.total !== 0); // If all years, maybe just show months that have data or aggregate by year-month. For simplicity, if year === -1, we aggregate all years into the 12 months.
  }, [despesas, year]);

  return (
    <div className="bg-white p-6 rounded-lg shadow-md h-96 flex flex-col border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-700 mb-4">Evolução de Aportes (Investimentos)</h3>
      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} tickFormatter={(val) => `R$ ${val}`} />
            <RechartsTooltip formatter={(value: number) => formatCurrency(value)} cursor={{ fill: '#f9fafb' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
            <Bar dataKey="total" fill="#8B5CF6" radius={[4, 4, 0, 0]} name="Aportes" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// 2. Fluxo de Caixa Completo
export const CashFlowChart: React.FC<{ despesas: Despesa[], year: number }> = ({ despesas, year }) => {
  const data = useMemo(() => {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const monthlyData = Array.from({ length: 12 }, () => ({ Receitas: 0, Despesas: 0, Investimentos: 0 }));

    despesas.forEach(t => {
      const [y, m] = t.date.split('-').map(Number);
      if (t.status === 'paid' && (year === -1 || y === year)) {
        if (t.type === 'income') monthlyData[m - 1].Receitas += t.amount;
        if (t.type === 'expense') monthlyData[m - 1].Despesas += t.amount;
        if (t.type === 'investment' && t.amount > 0) monthlyData[m - 1].Investimentos += t.amount;
      }
    });

    return months.map((month, index) => ({
      name: month,
      ...monthlyData[index]
    }));
  }, [despesas, year]);

  return (
    <div className="bg-white p-6 rounded-lg shadow-md h-96 flex flex-col border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-700 mb-4">Fluxo de Caixa Completo</h3>
      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} tickFormatter={(val) => `R$ ${val}`} />
            <RechartsTooltip formatter={(value: number) => formatCurrency(value)} cursor={{ fill: '#f9fafb' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Bar dataKey="Receitas" fill="#10B981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Despesas" fill="#EF4444" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Investimentos" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// 3. Projeção de Saldo (Realizado vs Pendente)
export const BalanceProjectionChart: React.FC<{ despesas: Despesa[], month: number, year: number }> = ({ despesas, month, year }) => {
  const data = useMemo(() => {
    let realizedIncome = 0;
    let realizedExpense = 0;
    let pendingIncome = 0;
    let pendingExpense = 0;

    despesas.forEach(t => {
      const [y, m] = t.date.split('-').map(Number);
      const monthMatch = month === -1 || (m - 1) === month;
      const yearMatch = year === -1 || y === year;
      
      if (monthMatch && yearMatch) {
        if (t.type === 'income') {
          if (t.status === 'paid') realizedIncome += t.amount;
          else pendingIncome += t.amount;
        } else if (t.type === 'expense') {
          if (t.status === 'paid') realizedExpense += t.amount;
          else pendingExpense += t.amount;
        }
      }
    });

    const currentBalance = realizedIncome - realizedExpense;
    const projectedBalance = currentBalance + pendingIncome - pendingExpense;

    return [
      { name: 'Saldo Atual (Realizado)', valor: currentBalance, fill: currentBalance >= 0 ? '#3B82F6' : '#EF4444' },
      { name: 'A Receber (Pendente)', valor: pendingIncome, fill: '#10B981' },
      { name: 'A Pagar (Pendente)', valor: -pendingExpense, fill: '#F59E0B' },
      { name: 'Projeção Final', valor: projectedBalance, fill: projectedBalance >= 0 ? '#8B5CF6' : '#EF4444' }
    ];
  }, [despesas, month, year]);

  return (
    <div className="bg-white p-6 rounded-lg shadow-md h-96 flex flex-col border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-700 mb-4">Projeção de Saldo</h3>
      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 10, right: 30, left: 40, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
            <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} tickFormatter={(val) => `R$ ${val}`} />
            <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#374151', width: 120 }} width={140} />
            <RechartsTooltip formatter={(value: number) => formatCurrency(value)} cursor={{ fill: '#f9fafb' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
            <Bar dataKey="valor" radius={[0, 4, 4, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// 4. Top 10 Maiores Despesas
export const TopExpensesChart: React.FC<{ despesas: Despesa[], month: number, year: number }> = ({ despesas, month, year }) => {
  const data = useMemo(() => {
    const filtered = despesas.filter(t => {
      const [y, m] = t.date.split('-').map(Number);
      const monthMatch = month === -1 || (m - 1) === month;
      const yearMatch = year === -1 || y === year;
      return t.type === 'expense' && monthMatch && yearMatch;
    });

    // Agrupa por título para evitar transações duplicadas com mesmo nome, ou apenas lista as top 10 transações
    // Vamos listar as top 10 transações individuais
    const sorted = [...filtered].sort((a, b) => b.amount - a.amount).slice(0, 10);

    return sorted.map(t => ({
      name: t.title.length > 20 ? t.title.substring(0, 20) + '...' : t.title,
      valor: t.amount,
      categoria: t.category
    }));
  }, [despesas, month, year]);

  if (data.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md h-96 flex flex-col items-center justify-center border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-700 mb-2">Top 10 Maiores Despesas</h3>
        <p className="text-gray-400 text-sm text-center">Nenhuma despesa neste período.</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md h-96 flex flex-col border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-700 mb-4">Top 10 Maiores Despesas</h3>
      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
            <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} tickFormatter={(val) => `R$ ${val}`} />
            <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#374151' }} width={120} />
            <RechartsTooltip formatter={(value: number) => formatCurrency(value)} cursor={{ fill: '#f9fafb' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
            <Bar dataKey="valor" fill="#EF4444" radius={[0, 4, 4, 0]} name="Valor" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// 5. Destino do Dinheiro (Donut)
export const MoneyDestinationChart: React.FC<{ despesas: Despesa[], month: number, year: number }> = ({ despesas, month, year }) => {
  const data = useMemo(() => {
    let income = 0;
    let expense = 0;
    let investment = 0;

    despesas.forEach(t => {
      const [y, m] = t.date.split('-').map(Number);
      const monthMatch = month === -1 || (m - 1) === month;
      const yearMatch = year === -1 || y === year;
      
      if (t.status === 'paid' && monthMatch && yearMatch) {
        if (t.type === 'income') income += t.amount;
        if (t.type === 'expense') expense += t.amount;
        if (t.type === 'investment' && t.amount > 0) investment += t.amount;
      }
    });

    const freeBalance = Math.max(0, income - expense - investment);
    
    // Se não houver receita, não faz sentido mostrar o gráfico de destino
    if (income === 0) return [];

    return [
      { name: 'Despesas', value: expense, fill: '#EF4444' },
      { name: 'Investimentos', value: investment, fill: '#8B5CF6' },
      { name: 'Saldo Livre', value: freeBalance, fill: '#10B981' }
    ].filter(d => d.value > 0);
  }, [despesas, month, year]);

  if (data.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md h-96 flex flex-col items-center justify-center border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-700 mb-2">Destino do Dinheiro</h3>
        <p className="text-gray-400 text-sm text-center">Sem receitas pagas no período.</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md h-96 flex flex-col border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-700 mb-4">Destino do Dinheiro</h3>
      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={100}
              paddingAngle={5}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} stroke="none" />
              ))}
            </Pie>
            <RechartsTooltip 
              formatter={(value: number) => formatCurrency(value)}
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
            />
            <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ fontSize: '12px' }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

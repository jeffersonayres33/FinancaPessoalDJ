
import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Despesa } from '../types';

interface ChartsProps {
  despesas: Despesa[];
  type: 'income' | 'expense';
  title: string;
}

const COLORS_EXPENSE = ['#EF4444', '#F59E0B', '#3B82F6', '#8B5CF6', '#EC4899', '#6366F1', '#10B981', '#6B7280', '#9CA3AF', '#1F2937'];
const COLORS_INCOME = ['#10B981', '#059669', '#34D399', '#6EE7B7', '#064E3B', '#065F46', '#A7F3D0', '#D1FAE5'];

export const Charts: React.FC<ChartsProps> = ({ despesas, type, title }) => {
  const data = useMemo(() => {
    // Filtra pelo tipo (income ou expense)
    const filtered = despesas.filter(t => t.type === type);
    
    // Agrupa por categoria
    const categoryTotals = filtered.reduce((acc, curr) => {
      acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
      return acc;
    }, {} as Record<string, number>);

    return Object.keys(categoryTotals).map(cat => ({
      name: cat,
      value: categoryTotals[cat],
    })).sort((a, b) => b.value - a.value); // Ordena do maior para o menor
  }, [despesas, type]);

  const colors = type === 'income' ? COLORS_INCOME : COLORS_EXPENSE;

  if (data.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md h-80 flex flex-col items-center justify-center border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-700 mb-2">{title}</h3>
        <p className="text-gray-400 text-sm text-center">Nenhum dado neste período.</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md h-96 flex flex-col border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-700 mb-4">{title}</h3>
      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} stroke="none" />
              ))}
            </Pie>
            <RechartsTooltip 
              formatter={(value: number) => `R$ ${value.toFixed(2)}`}
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
            />
            <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ fontSize: '12px' }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

interface EvolutionChartProps {
  despesas: Despesa[];
  year: number;
}

export const EvolutionChart: React.FC<EvolutionChartProps> = ({ despesas, year }) => {
  const data = useMemo(() => {
    const months = [
      'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
      'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
    ];

    // Inicializa array com 0
    const monthlyTotals = new Array(12).fill(0);

    despesas.forEach(t => {
      const date = new Date(t.date);
      if (t.type === 'expense' && date.getFullYear() === year) {
        monthlyTotals[date.getMonth()] += t.amount;
      }
    });

    return months.map((month, index) => ({
      name: month,
      total: monthlyTotals[index]
    }));
  }, [despesas, year]);

  const hasData = data.some(d => d.total > 0);

  if (!hasData) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md h-96 flex flex-col items-center justify-center border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-700 mb-2">Evolução de Gastos ({year})</h3>
        <p className="text-gray-400 text-sm text-center">Nenhuma despesa registrada neste ano.</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md h-96 flex flex-col border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-700 mb-4">Evolução de Gastos ({year})</h3>
      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 12, fill: '#9CA3AF' }} 
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 12, fill: '#9CA3AF' }} 
              tickFormatter={(value) => `R$${value/1000}k`}
            />
            <RechartsTooltip 
              cursor={{ fill: '#F3F4F6' }}
              formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Gastos']}
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
            />
            <Bar 
              dataKey="total" 
              fill="#8B5CF6" 
              radius={[4, 4, 0, 0]} 
              barSize={30}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export const CategoryEvolutionChart: React.FC<EvolutionChartProps> = ({ despesas, year }) => {
  const { data, categories } = useMemo(() => {
    const months = [
      'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
      'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
    ];

    const uniqueCategories = new Set<string>();
    const monthData = months.map(m => ({ name: m } as any));

    despesas.forEach(t => {
      const date = new Date(t.date);
      if (t.type === 'expense' && date.getFullYear() === year) {
        const monthIndex = date.getMonth();
        const cat = t.category;
        uniqueCategories.add(cat);
        
        monthData[monthIndex][cat] = (monthData[monthIndex][cat] || 0) + t.amount;
      }
    });

    return { 
      data: monthData, 
      categories: Array.from(uniqueCategories) 
    };
  }, [despesas, year]);

  const hasData = categories.length > 0;

  if (!hasData) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md h-96 flex flex-col items-center justify-center border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-700 mb-2">Evolução por Categoria ({year})</h3>
        <p className="text-gray-400 text-sm text-center">Nenhum dado para exibir neste ano.</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md h-96 flex flex-col border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-700 mb-4">Evolução por Categoria ({year})</h3>
      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 20, right: 30, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9CA3AF' }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9CA3AF' }} />
            <RechartsTooltip 
              cursor={{ fill: '#F3F4F6' }}
              formatter={(value: number, name: string) => [`R$ ${value.toFixed(2)}`, name]}
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
            />
            <Legend wrapperStyle={{ paddingTop: '20px' }} />
            {categories.map((cat, index) => (
              <Bar 
                key={cat} 
                dataKey={cat} 
                stackId="a" 
                fill={COLORS_EXPENSE[index % COLORS_EXPENSE.length]} 
                barSize={30}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

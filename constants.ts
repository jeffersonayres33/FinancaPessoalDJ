
import { Category, Despesa } from './types';

export const INITIAL_CATEGORIES: Category[] = [
  { id: 'cat-1', name: 'Alimentação', type: 'expense' },
  { id: 'cat-2', name: 'Casa', type: 'expense' },
  { id: 'cat-3', name: 'Transporte', type: 'expense' },
  { id: 'cat-4', name: 'Lazer', type: 'expense' },
  { id: 'cat-5', name: 'Saúde', type: 'expense' },
  { id: 'cat-6', name: 'Trabalho', type: 'income' },
  { id: 'cat-7', name: 'Educação', type: 'expense' },
  { id: 'cat-8', name: 'Outros', type: 'both' }
];

export const INITIAL_DESPESAS: Despesa[] = [
  {
    id: '1',
    title: 'Salário Mensal',
    amount: 5000,
    type: 'income',
    category: 'Trabalho',
    date: new Date().toISOString(),
    status: 'paid'
  },
  {
    id: '2',
    title: 'Supermercado',
    amount: 450,
    type: 'expense',
    category: 'Alimentação',
    date: new Date().toISOString(),
    status: 'paid'
  },
  {
    id: '3',
    title: 'Aluguel',
    amount: 1200,
    type: 'expense',
    category: 'Casa',
    date: new Date().toISOString(),
    status: 'pending'
  }
];

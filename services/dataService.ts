
import { supabase } from './supabaseClient';
import { Despesa, Category } from '../types';
import { INITIAL_CATEGORIES } from '../constants';

export const dataService = {
  // --- CATEGORIAS ---
  fetchCategories: async (dataContextId: string): Promise<Category[]> => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('data_context_id', dataContextId);
    
    if (error) {
      console.error('Erro ao buscar categorias:', error);
      throw error; // Lança o erro para ser tratado no App.tsx
    }
    return data || [];
  },

  // Função para popular categorias iniciais se a conta for nova
  seedCategories: async (dataContextId: string): Promise<Category[]> => {
    const categoriesToInsert = INITIAL_CATEGORIES.map(cat => ({
        name: cat.name,
        type: cat.type,
        budget: 0,
        data_context_id: dataContextId
    }));

    const { data, error } = await supabase
        .from('categories')
        .insert(categoriesToInsert)
        .select();

    if (error) {
        console.error('Erro ao criar categorias iniciais:', error);
        throw error;
    }
    return data || [];
  },

  addCategory: async (category: Category, dataContextId: string): Promise<Category | null> => {
    // Remove o ID gerado no front para deixar o banco gerar (ou usa o do front se preferir manter consistência)
    // Aqui vamos respeitar o ID do front se ele for um UUID válido, mas geralmente no insert limpo é melhor passar sem ID ou com ID gerado.
    // Como seu script SQL tem 'default gen_random_uuid()', podemos omitir o ID se quisermos, mas o front já gera.
    const { data, error } = await supabase
      .from('categories')
      .insert({ ...category, data_context_id: dataContextId })
      .select()
      .single();
    
    if (error) {
      console.error(error);
      throw new Error('Erro ao salvar categoria');
    }
    return data;
  },

  updateCategory: async (category: Category): Promise<void> => {
    const { error } = await supabase
      .from('categories')
      .update({ name: category.name, type: category.type, budget: category.budget })
      .eq('id', category.id);
      
    if (error) throw error;
  },

  deleteCategory: async (id: string): Promise<void> => {
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) throw error;
  },

  // --- TRANSAÇÕES ---
  fetchTransactions: async (dataContextId: string): Promise<Despesa[]> => {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('data_context_id', dataContextId);

    if (error) {
      console.error('Erro ao buscar transações:', error);
      throw error;
    }
    
    return (data || []).map((t: any) => ({
      ...t,
      amount: Number(t.amount), // Garante que venha como número, pois Postgres pode retornar string para numeric
      paymentDate: t.payment_date,
      // installments já é objeto JSONB automático
    }));
  },

  addTransaction: async (despesa: Despesa, dataContextId: string): Promise<Despesa | null> => {
    const payload = {
        id: despesa.id,
        title: despesa.title,
        amount: despesa.amount,
        type: despesa.type,
        category: despesa.category,
        status: despesa.status,
        date: despesa.date,
        payment_date: despesa.paymentDate,
        observation: despesa.observation,
        installments: despesa.installments,
        data_context_id: dataContextId
    };

    const { data, error } = await supabase
      .from('transactions')
      .insert(payload)
      .select()
      .single();

    if (error) {
        console.error(error);
        throw new Error('Erro ao salvar transação');
    }
    
    return { 
        ...data, 
        amount: Number(data.amount),
        paymentDate: data.payment_date 
    };
  },

  updateTransaction: async (despesa: Despesa): Promise<void> => {
     const payload = {
        title: despesa.title,
        amount: despesa.amount,
        type: despesa.type,
        category: despesa.category,
        status: despesa.status,
        date: despesa.date,
        payment_date: despesa.paymentDate,
        observation: despesa.observation,
        installments: despesa.installments
    };

    const { error } = await supabase
      .from('transactions')
      .update(payload)
      .eq('id', despesa.id);
      
    if (error) throw error;
  },

  deleteTransaction: async (id: string): Promise<void> => {
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) throw error;
  },
  
  markAsPaid: async (ids: string[], paymentDate: string): Promise<void> => {
    const { error } = await supabase
        .from('transactions')
        .update({ status: 'paid', payment_date: paymentDate })
        .in('id', ids);
    if (error) throw error;
  }
};

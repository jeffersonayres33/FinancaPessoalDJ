
export type TransactionType = 'income' | 'expense';
export type TransactionStatus = 'paid' | 'pending';

export interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense' | 'both';
  budget?: number; // Orçamento mensal estipulado para esta categoria
}

export interface Despesa {
  id: string;
  title: string;
  amount: number;
  type: TransactionType;
  category: string;
  date: string;
  status: TransactionStatus;
  paymentDate?: string; // Data real do pagamento (para despesas pagas)
  createdAt?: string; // Data de criação do registro
  observation?: string; // Observações adicionais ou extraídas do recibo
  installments?: {
    current: number;
    total: number;
  };
}

export type Transaction = Despesa;

export interface SummaryData {
  income: number;
  expense: number;
  total: number;
  pending: number;
}

export interface AIAnalysisResult {
  summary: string;
  tips: string[];
  anomalies: string[];
}

export interface ReceiptData {
  title: string;
  amount: number;
  date: string;
  observation: string;
}

// Auth Types
export interface User {
  id: string;
  name: string;
  email: string;
  password?: string; // Em um app real, nunca armazene senhas em texto puro!
  parentId?: string; // Se pertencer a uma conta principal
  dataContextId: string; // ID usado para buscar os dados (pode ser o próprio ID ou do pai)
  members?: User[]; // Membros adicionados por este usuário
}

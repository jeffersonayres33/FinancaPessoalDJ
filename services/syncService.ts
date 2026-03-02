import { supabase } from './supabaseClient';
import { Despesa, Category } from '../types';
import { dataService } from './dataService';

const SYNC_QUEUE_KEY = 'finances_sync_queue';

export type SyncAction = 'ADD_TRANSACTION' | 'UPDATE_TRANSACTION' | 'DELETE_TRANSACTION' | 'ADD_CATEGORY' | 'UPDATE_CATEGORY' | 'DELETE_CATEGORY';

export interface SyncItem {
  id: string; // unique id for the queue item
  action: SyncAction;
  payload: any;
  dataContextId?: string;
  timestamp: number;
}

export const syncService = {
  getQueue: (): SyncItem[] => {
    try {
      const stored = localStorage.getItem(SYNC_QUEUE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  saveQueue: (queue: SyncItem[]) => {
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
  },

  addToQueue: (action: SyncAction, payload: any, dataContextId?: string) => {
    const queue = syncService.getQueue();
    queue.push({
      id: crypto.randomUUID(),
      action,
      payload,
      dataContextId,
      timestamp: Date.now()
    });
    syncService.saveQueue(queue);
    console.log(`[Offline] Ação ${action} adicionada à fila de sincronização.`);
  },

  removeFromQueue: (id: string) => {
    const queue = syncService.getQueue();
    syncService.saveQueue(queue.filter(item => item.id !== id));
  },

  clearQueue: () => {
    localStorage.removeItem(SYNC_QUEUE_KEY);
  },

  processQueue: async () => {
    if (!navigator.onLine) return;

    const queue = syncService.getQueue();
    if (queue.length === 0) return;

    console.log(`[Sync] Iniciando sincronização de ${queue.length} itens...`);
    
    // Processa sequencialmente para manter a ordem das operações
    for (const item of queue) {
      try {
        switch (item.action) {
          case 'ADD_TRANSACTION':
            await dataService.addTransaction(item.payload as Despesa, item.dataContextId!);
            break;
          case 'UPDATE_TRANSACTION':
            await dataService.updateTransaction(item.payload as Despesa);
            break;
          case 'DELETE_TRANSACTION':
            await dataService.deleteTransaction(item.payload as string);
            break;
          case 'ADD_CATEGORY':
            await dataService.addCategory(item.payload as Category, item.dataContextId!);
            break;
          case 'UPDATE_CATEGORY':
            await dataService.updateCategory(item.payload as Category);
            break;
          case 'DELETE_CATEGORY':
            await dataService.deleteCategory(item.payload as string);
            break;
        }
        // Se sucesso, remove da fila
        syncService.removeFromQueue(item.id);
      } catch (error) {
        console.error(`[Sync] Erro ao sincronizar item ${item.id} (${item.action}):`, error);
        // Se for erro de rede, para o processamento para tentar depois
        if (!navigator.onLine) break;
        // Se for erro do banco (ex: constraint), talvez seja melhor remover da fila para não travar,
        // mas por segurança vamos manter e o usuário pode limpar o cache se necessário.
        // Em um app real, teríamos uma UI para resolver conflitos.
      }
    }
    
    const remaining = syncService.getQueue().length;
    if (remaining === 0) {
      console.log('[Sync] Sincronização concluída com sucesso!');
    } else {
      console.log(`[Sync] Sincronização parcial. ${remaining} itens restantes.`);
    }
  }
};

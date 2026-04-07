import React from 'react';
import { Check, Star, Zap, Shield, Users, X } from 'lucide-react';
import { User } from '../types';

interface SubscriptionPaywallProps {
  user: User;
  onClose?: () => void;
  onSubscribe: (plan: 'monthly' | 'yearly') => void;
}

export const SubscriptionPaywall: React.FC<SubscriptionPaywallProps> = ({ user, onClose, onSubscribe }) => {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start sm:items-center justify-center p-2 sm:p-4 z-50 animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden relative my-8 sm:my-auto flex flex-col">
        
        {onClose && (
          <button 
            onClick={onClose} 
            className="absolute top-2 right-2 sm:top-4 sm:right-4 text-gray-400 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-full p-2 transition-colors z-10"
          >
            <X size={20} className="sm:w-6 sm:h-6" />
          </button>
        )}

        <div className="flex flex-col md:flex-row flex-1">
          {/* Lado Esquerdo - Benefícios */}
          <div className="bg-gradient-to-br from-indigo-900 to-purple-900 text-white p-6 sm:p-8 md:p-12 md:w-1/2 flex flex-col justify-center">
            <div className="inline-flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full text-xs sm:text-sm font-medium mb-4 sm:mb-6 w-fit">
              <Star size={14} className="text-yellow-400 fill-yellow-400 sm:w-4 sm:h-4" />
              Versão Premium
            </div>
            
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4 leading-tight">
              Desbloqueie todo o potencial das suas finanças.
            </h2>
            
            <p className="text-indigo-200 mb-6 sm:mb-8 text-sm sm:text-lg">
              Assine o Premium e tenha acesso a ferramentas exclusivas para gerenciar seu dinheiro como um profissional.
            </p>

            <div className="space-y-4 sm:space-y-6">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="bg-indigo-500/30 p-1.5 sm:p-2 rounded-lg mt-1 shrink-0">
                  <Shield size={16} className="text-indigo-300 sm:w-5 sm:h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-base sm:text-lg">Sem Anúncios</h4>
                  <p className="text-indigo-200 text-xs sm:text-sm">Navegue sem interrupções e com mais velocidade.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 sm:gap-4">
                <div className="bg-indigo-500/30 p-1.5 sm:p-2 rounded-lg mt-1 shrink-0">
                  <Zap size={16} className="text-indigo-300 sm:w-5 sm:h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-base sm:text-lg">Análise com Inteligência Artificial</h4>
                  <p className="text-indigo-200 text-xs sm:text-sm">Receba insights personalizados e dicas de economia geradas por IA.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 sm:gap-4">
                <div className="bg-indigo-500/30 p-1.5 sm:p-2 rounded-lg mt-1 shrink-0">
                  <Users size={16} className="text-indigo-300 sm:w-5 sm:h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-base sm:text-lg">Múltiplos Membros</h4>
                  <p className="text-indigo-200 text-xs sm:text-sm">Adicione dependentes e gerencie as finanças da família inteira.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Lado Direito - Planos */}
          <div className="p-6 sm:p-8 md:p-12 md:w-1/2 bg-gray-50 flex flex-col justify-center">
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1 sm:mb-2">Escolha seu plano</h3>
            <p className="text-gray-500 mb-6 sm:mb-8 text-sm sm:text-base">Cancele a qualquer momento.</p>

            <div className="space-y-4">
              {/* Plano Anual */}
              <div 
                onClick={() => onSubscribe('yearly')}
                className="relative border-2 border-purple-600 bg-purple-50 rounded-xl sm:rounded-2xl p-4 sm:p-6 cursor-pointer hover:shadow-lg transition-all transform hover:-translate-y-1"
              >
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-[10px] sm:text-xs font-bold px-2 sm:px-3 py-0.5 sm:py-1 rounded-full uppercase tracking-wider whitespace-nowrap">
                  Mais Popular - 20% OFF
                </div>
                <div className="flex justify-between items-center mb-1 sm:mb-2">
                  <h4 className="text-lg sm:text-xl font-bold text-gray-900">Anual</h4>
                  <div className="text-right">
                    <span className="text-xl sm:text-2xl font-black text-purple-700">R$ 99,90</span>
                    <span className="text-gray-500 text-xs sm:text-sm">/ano</span>
                  </div>
                </div>
                <p className="text-purple-800 text-xs sm:text-sm font-medium">Equivale a apenas R$ 8,32 por mês.</p>
              </div>

              {/* Plano Mensal */}
              <div 
                onClick={() => onSubscribe('monthly')}
                className="border-2 border-gray-200 bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 cursor-pointer hover:border-purple-300 hover:shadow-md transition-all"
              >
                <div className="flex justify-between items-center mb-1 sm:mb-2">
                  <h4 className="text-lg sm:text-xl font-bold text-gray-900">Mensal</h4>
                  <div className="text-right">
                    <span className="text-xl sm:text-2xl font-black text-gray-900">R$ 12,90</span>
                    <span className="text-gray-500 text-xs sm:text-sm">/mês</span>
                  </div>
                </div>
                <p className="text-gray-500 text-xs sm:text-sm">Cobrado mensalmente.</p>
              </div>
            </div>

            <div className="mt-6 sm:mt-8 text-center">
              <p className="text-[10px] sm:text-xs text-gray-400">
                Ao assinar, você concorda com nossos Termos de Serviço e Política de Privacidade.
                A assinatura será renovada automaticamente.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

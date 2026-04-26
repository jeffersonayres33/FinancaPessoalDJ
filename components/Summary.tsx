
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { LucideIcon, TrendingUp, TrendingDown, Wallet, HelpCircle, X } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  colorClass: string; // Ex: text-green-600
  bgClass: string; // Ex: bg-green-50
  borderClass?: string; // Ex: border-l-4 border-green-500
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, colorClass, bgClass, borderClass }) => {
  return (
    <div className={`bg-white p-6 rounded-lg shadow-md flex items-center justify-between h-full transition-transform hover:scale-105 ${borderClass || ''}`}>
      <div>
        <p className="text-gray-500 text-xs uppercase font-bold mb-1 tracking-wider">{title}</p>
        <strong className={`text-xl sm:text-2xl font-bold block ${colorClass}`}>
          {value}
        </strong>
      </div>
      <div className={`p-3 rounded-full ${bgClass}`}>
        <Icon className={`w-6 h-6 ${colorClass}`} />
      </div>
    </div>
  );
};

interface BalanceCardProps {
  title: string;
  currentBalance: number;
  previousBalance?: number | null;
  totalAvailable: number;
  icon: LucideIcon;
  formatCurrency: (value: number) => string;
}

export const BalanceCard: React.FC<BalanceCardProps> = ({ 
  title, 
  currentBalance, 
  previousBalance, 
  totalAvailable, 
  icon: Icon,
  formatCurrency
}) => {
  const currentTotal = previousBalance != null ? totalAvailable : currentBalance;
  
  const mainColorClass = currentTotal >= 0 ? "text-blue-600" : "text-red-600";
  const mainBgClass = currentTotal >= 0 ? "bg-blue-100" : "bg-red-100";
  const mainBorderClass = currentTotal >= 0 ? "border-l-4 border-blue-500" : "border-l-4 border-red-500";

  return (
    <div className={`bg-white p-5 rounded-lg shadow-md flex flex-col justify-between h-full transition-transform hover:scale-[1.02] ${mainBorderClass}`}>
      
      <div className="flex justify-between items-start mb-3">
        {previousBalance != null ? (
          <div className="flex w-full justify-between gap-2">
            <div>
              <p className="text-gray-500 text-[10px] sm:text-xs uppercase font-bold mb-1 tracking-wider leading-tight">Saldo do Mês</p>
              <strong className={`text-lg sm:text-xl font-bold block ${currentBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(currentBalance)}
              </strong>
            </div>
            <div className="text-right">
              <p className="text-gray-500 text-[10px] sm:text-xs uppercase font-bold mb-1 tracking-wider leading-tight">Mês Anterior</p>
              <strong className={`text-sm sm:text-base font-bold block ${previousBalance >= 0 ? 'text-blue-500' : 'text-red-500'}`}>
                {previousBalance > 0 ? '+' : ''}{formatCurrency(previousBalance)}
              </strong>
            </div>
          </div>
        ) : (
          <div className="flex w-full justify-between items-center">
             <div>
                <p className="text-gray-500 text-xs uppercase font-bold mb-1 tracking-wider">{title}</p>
                <strong className={`text-xl sm:text-2xl font-bold block ${mainColorClass}`}>
                  {formatCurrency(currentBalance)}
                </strong>
             </div>
             <div className={`p-3 rounded-full ${mainBgClass}`}>
                <Icon className={`w-6 h-6 ${mainColorClass}`} />
             </div>
          </div>
        )}
      </div>

      {previousBalance != null && (
        <div className="pt-2 border-t border-gray-100 flex justify-between items-end">
          <div>
            <p className="text-gray-800 text-xs sm:text-sm uppercase font-bold mb-0.5 tracking-wider">Saldo Disponível</p>
            <strong className={`text-xl sm:text-2xl font-bold block ${mainColorClass}`}>
              {formatCurrency(totalAvailable)}
            </strong>
          </div>
          <div className={`p-2 sm:p-3 rounded-full ${mainBgClass}`}>
            <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${mainColorClass}`} />
          </div>
        </div>
      )}
    </div>
  );
};

interface SplitStatCardProps {
  title: string;
  currentTitle: string;
  currentValue: number;
  previousBalanceTitle: string;
  previousBalanceValue?: number | null;
  totalTitle: string;
  totalValue: number;
  icon: LucideIcon;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  formatCurrency: (value: number) => string;
}

export const SplitStatCard: React.FC<SplitStatCardProps> = ({ 
  title, 
  currentTitle,
  currentValue, 
  previousBalanceTitle,
  previousBalanceValue, 
  totalTitle,
  totalValue, 
  icon: Icon,
  colorClass,
  bgClass,
  borderClass,
  formatCurrency
}) => {
  return (
    <div className={`bg-white p-5 rounded-lg shadow-md flex flex-col justify-between h-full transition-transform hover:scale-[1.02] ${borderClass}`}>
      
      <div className="flex justify-between items-start mb-3">
        {previousBalanceValue != null ? (
          <div className="flex w-full justify-between gap-2">
            <div>
              <p className="text-gray-500 text-[10px] sm:text-xs uppercase font-bold mb-1 tracking-wider leading-tight">{currentTitle}</p>
              <strong className={`text-lg sm:text-xl font-bold block ${colorClass}`}>
                {formatCurrency(currentValue)}
              </strong>
            </div>
            <div className="text-right">
              <p className="text-gray-500 text-[10px] sm:text-xs uppercase font-bold mb-1 tracking-wider leading-tight">{previousBalanceTitle}</p>
              <strong className={`text-sm sm:text-base font-bold block ${colorClass}`}>
                +{formatCurrency(previousBalanceValue)}
              </strong>
            </div>
          </div>
        ) : (
          <div className="flex w-full justify-between items-center">
             <div>
                <p className="text-gray-500 text-xs uppercase font-bold mb-1 tracking-wider">{title}</p>
                <strong className={`text-xl sm:text-2xl font-bold block ${colorClass}`}>
                  {formatCurrency(currentValue)}
                </strong>
             </div>
             <div className={`p-3 rounded-full ${bgClass}`}>
                <Icon className={`w-6 h-6 ${colorClass}`} />
             </div>
          </div>
        )}
      </div>

      {previousBalanceValue != null && (
        <div className="pt-2 border-t border-gray-100 flex justify-between items-end">
          <div>
            <p className="text-gray-800 text-xs sm:text-sm uppercase font-bold mb-0.5 tracking-wider">{totalTitle}</p>
            <strong className={`text-xl sm:text-2xl font-bold block ${colorClass}`}>
              {formatCurrency(totalValue)}
            </strong>
          </div>
          <div className={`p-2 sm:p-3 rounded-full ${bgClass}`}>
            <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${colorClass}`} />
          </div>
        </div>
      )}
    </div>
  );
};

// Mantemos o componente Summary original apenas para compatibilidade se algo ainda o usar, 
// mas o App.tsx vai usar o StatCard diretamente agora.
export const Summary: React.FC<any> = () => null;

const WidgetInfoModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: React.ReactNode;
}> = ({ isOpen, onClose, title, description }) => {
  if (!isOpen) return null;
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-fade-in" style={{ position: 'fixed' }}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col pt-0 animate-slide-up relative">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0 rounded-t-2xl">
          <h3 className="font-bold text-slate-800 text-base sm:text-lg flex items-center gap-2">
            <HelpCircle size={20} className="text-purple-500 shrink-0" />
            <span className="truncate">{title}</span>
          </h3>
          <button onClick={onClose} className="p-1.5 shrink-0 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-4 sm:p-6 text-slate-600 text-sm leading-relaxed overflow-y-auto">
          {description}
        </div>
      </div>
    </div>,
    document.body
  );
};

export const RevenueWidget: React.FC<{
  pending: number;
  received: number;
  previousBalance: number;
  formatCurrency: (val: number) => string;
}> = ({ pending, received, previousBalance, formatCurrency }) => {
  const [showInfo, setShowInfo] = useState(false);
  const previousToShow = Math.max(0, previousBalance);
  const total = pending + received + previousToShow;

  return (
    <>
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col h-full relative overflow-hidden group hover:shadow-md transition-transform hover:-translate-y-1 duration-300">
      <div className="px-5 py-3 flex items-center justify-between bg-emerald-500 text-white">
         <div className="flex items-center gap-3">
           <div className="p-2 bg-emerald-600 rounded-xl">
             <TrendingUp size={20} strokeWidth={2.5} />
           </div>
           <h2 className="font-bold text-lg sm:text-xl tracking-tight">Receitas</h2>
         </div>
         <button onClick={() => setShowInfo(true)} className="p-1.5 hover:bg-emerald-600 rounded-full transition-colors" title="Entender os cálculos">
           <HelpCircle size={18} />
         </button>
      </div>
      
      <div className="p-6 flex flex-col flex-grow">
        <div className="grid grid-cols-3 gap-3 flex-grow mb-4">
          <div>
            <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Pendente</p>
            <p className="text-xs sm:text-sm font-bold text-rose-500 truncate" title={formatCurrency(pending)}>{formatCurrency(pending)}</p>
          </div>
          <div>
            <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Recebido</p>
            <p className="text-xs sm:text-sm font-bold text-slate-700 truncate" title={formatCurrency(received)}>{formatCurrency(received)}</p>
          </div>
          <div>
            <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Mês Anterior</p>
            <p className="text-xs sm:text-sm font-bold text-slate-700 truncate" title={'+' + formatCurrency(previousToShow)}>
              {previousToShow > 0 ? '+' : ''}{formatCurrency(previousToShow)}
            </p>
          </div>
        </div>

        <div className="mt-auto pt-4 border-t border-slate-100">
          <p className="text-[10px] sm:text-[11px] font-bold text-emerald-600/70 uppercase tracking-widest mb-1">Total Geral</p>
          <p className="text-2xl sm:text-3xl font-extrabold text-emerald-600 tracking-tight truncate" title={formatCurrency(total)}>{formatCurrency(total)}</p>
        </div>
      </div>
    </div>
    
    <WidgetInfoModal 
      isOpen={showInfo} 
      onClose={() => setShowInfo(false)} 
      title="Como calculamos as Receitas?" 
      description={
        <div className="space-y-4">
          <p>Este painel mostra a soma de tudo que você ganhou e o que ainda tem para receber.</p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Pendente:</strong> Valores das receitas que estão previstas para este mês, mas que ainda não foram marcadas como recebidas.</li>
            <li><strong>Recebido:</strong> Todo o dinheiro das suas receitas que já caiu na sua conta (marcadas como recebidas).</li>
            <li><strong>Mês Anterior:</strong> Refere-se a qualquer saldo positivo que tenha sobrado do mês anterior. Trazemos para cá apenas se for positivo (dinheiro sobrando).</li>
            <li><strong>Total Geral:</strong> É a soma do valor Pendente, Recebido e do saldo do Mês Anterior. Representa todo o dinheiro destinado para receitas.</li>
          </ul>
        </div>
      } 
    />
    </>
  );
};

export const ExpenseWidget: React.FC<{
  unpaid: number;
  paid: number;
  previousBalance: number;
  formatCurrency: (val: number) => string;
}> = ({ unpaid, paid, previousBalance, formatCurrency }) => {
  const [showInfo, setShowInfo] = useState(false);
  const previousToShow = previousBalance < 0 ? Math.abs(previousBalance) : 0;
  const total = unpaid + paid + previousToShow;

  return (
    <>
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col h-full relative overflow-hidden group hover:shadow-md transition-transform hover:-translate-y-1 duration-300">
      <div className="px-5 py-3 flex items-center justify-between bg-rose-500 text-white">
         <div className="flex items-center gap-3">
           <div className="p-2 bg-rose-600 rounded-xl">
             <TrendingDown size={20} strokeWidth={2.5} />
           </div>
           <h2 className="font-bold text-lg sm:text-xl tracking-tight">Despesas</h2>
         </div>
         <button onClick={() => setShowInfo(true)} className="p-1.5 hover:bg-rose-600 rounded-full transition-colors" title="Entender os cálculos">
           <HelpCircle size={18} />
         </button>
      </div>

      <div className="p-6 flex flex-col flex-grow">
        <div className="grid grid-cols-3 gap-3 flex-grow mb-4">
          <div>
            <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Não Pago</p>
            <p className="text-xs sm:text-sm font-bold text-rose-500 truncate" title={formatCurrency(unpaid)}>{formatCurrency(unpaid)}</p>
          </div>
          <div>
            <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Pago</p>
            <p className="text-xs sm:text-sm font-bold text-slate-700 truncate" title={formatCurrency(paid)}>{formatCurrency(paid)}</p>
          </div>
          <div>
            <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Mês Anterior</p>
            <p className={`text-xs sm:text-sm font-bold truncate ${previousToShow > 0 ? 'text-rose-500' : 'text-slate-700'}`} title={'-' + formatCurrency(previousToShow)}>
              {previousToShow > 0 ? '-' : ''}{formatCurrency(previousToShow)}
            </p>
          </div>
        </div>

        <div className="mt-auto pt-4 border-t border-slate-100">
          <p className="text-[10px] sm:text-[11px] font-bold text-rose-600/70 uppercase tracking-widest mb-1">Total Geral</p>
          <p className="text-2xl sm:text-3xl font-extrabold text-rose-600 tracking-tight truncate" title={formatCurrency(total)}>{formatCurrency(total)}</p>
        </div>
      </div>
    </div>

    <WidgetInfoModal 
      isOpen={showInfo} 
      onClose={() => setShowInfo(false)} 
      title="Como calculamos as Despesas?" 
      description={
        <div className="space-y-4">
          <p>Este painel mostra a soma de tudo que você já pagou e o que ainda tem para pagar.</p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Não Pago:</strong> Valores de contas ou despesas que já estão cadastradas, mas que você ainda não marcou como pagas.</li>
            <li><strong>Pago:</strong> Total de despesas que você já quitou (marcadas como pagas).</li>
            <li><strong>Mês Anterior:</strong> Refere-se a qualquer saldo negativo que tenha ficado para trás do mês anterior. Consideramos aqui apenas os valores negativos (dívidas).</li>
            <li><strong>Total Geral:</strong> Corresponde ao somatório de despesas (Não Pago + Pago) e às despesas em aberto (negativas) herdadas do Mês Anterior. O Total Geral representa tudo que sairá do seu bolso.</li>
          </ul>
        </div>
      } 
    />
    </>
  );
};

export const BalanceWidget: React.FC<{
  saldoAtual: number;
  totalGeral: number;
  formatCurrency: (val: number) => string;
}> = ({ saldoAtual, totalGeral, formatCurrency }) => {
  const [showInfo, setShowInfo] = useState(false);
  return (
    <>
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col h-full relative overflow-hidden group hover:shadow-md transition-transform hover:-translate-y-1 duration-300">
      <div className="px-5 py-3 flex items-center justify-between bg-blue-500 text-white">
         <div className="flex items-center gap-3">
           <div className="p-2 bg-blue-600 rounded-xl">
             <Wallet size={20} strokeWidth={2.5} />
           </div>
           <h2 className="font-bold text-lg sm:text-xl tracking-tight">Saldo</h2>
         </div>
         <button onClick={() => setShowInfo(true)} className="p-1.5 hover:bg-blue-600 rounded-full transition-colors" title="Entender os cálculos">
           <HelpCircle size={18} />
         </button>
      </div>

      <div className="p-6 flex flex-col flex-grow">
        <div className="grid grid-cols-1 gap-4 flex-grow mb-4">
          <div>
            <p className="text-[10px] sm:text-[11px] font-bold text-slate-900 uppercase tracking-wider mb-1">Saldo Atual</p>
            <p className="text-xs sm:text-sm font-bold truncate text-slate-900" title={formatCurrency(saldoAtual)}>
              {formatCurrency(saldoAtual)}
            </p>
          </div>
        </div>

        <div className="mt-auto pt-4 border-t border-slate-100">
          <p className="text-[10px] sm:text-[11px] font-bold text-blue-600/80 uppercase tracking-widest mb-1">Total Geral</p>
          <p className="text-2xl sm:text-3xl font-extrabold tracking-tight truncate text-blue-600" title={formatCurrency(totalGeral)}>
            {formatCurrency(totalGeral)}
          </p>
        </div>
      </div>
    </div>

    <WidgetInfoModal 
      isOpen={showInfo} 
      onClose={() => setShowInfo(false)} 
      title="Como calculamos o Saldo?" 
      description={
        <div className="space-y-4">
          <p>Este painel mostra a diferença entre o que você tem de receitas e o que tem de despesas.</p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Saldo Atual:</strong> É a diferença entre tudo que já foi Recebido menos tudo que já foi Pago no mês atual, somado ao saldo final do mês anterior (seja ele positivo ou negativo). Mostra o dinheiro que você tem em caixa agora.</li>
            <li><strong>Total Geral:</strong> É a subtração simples do Total Geral do painel de Receitas menos o Total Geral do painel de Despesas. Representa sua projeção final de saldo quando todas as receitas pendentes e todas as despesas não pagas forem concluídas no mês.</li>
          </ul>
        </div>
      } 
    />
    </>
  );
};

export const InvestmentWidget: React.FC<{
  currentMonth: number;
  previousMonth: number;
  formatCurrency: (val: number) => string;
}> = ({ currentMonth, previousMonth, formatCurrency }) => {
  const [showInfo, setShowInfo] = useState(false);
  const total = currentMonth + previousMonth;

  return (
    <>
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col h-full relative overflow-hidden group hover:shadow-md transition-transform hover:-translate-y-1 duration-300">
      <div className="px-5 py-3 flex items-center justify-between bg-purple-500 text-white">
         <div className="flex items-center gap-3">
           <div className="p-2 bg-purple-600 rounded-xl">
             <Wallet size={20} strokeWidth={2.5} />
           </div>
           <h2 className="font-bold text-lg sm:text-xl tracking-tight">Investimentos</h2>
         </div>
         <button onClick={() => setShowInfo(true)} className="p-1.5 hover:bg-purple-600 rounded-full transition-colors" title="Entender os cálculos">
           <HelpCircle size={18} />
         </button>
      </div>

      <div className="p-6 flex flex-col flex-grow">
        <div className="grid grid-cols-2 gap-4 flex-grow mb-4">
          <div>
            <p className="text-[10px] sm:text-[11px] font-bold text-slate-900 uppercase tracking-wider mb-1">Mês Atual</p>
            <p className="text-xs sm:text-sm font-bold truncate text-slate-900" title={formatCurrency(currentMonth)}>
              {formatCurrency(currentMonth)}
            </p>
          </div>
          <div>
            <p className="text-[10px] sm:text-[11px] font-bold text-slate-900 uppercase tracking-wider mb-1">Mês Anterior</p>
            <p className="text-xs sm:text-sm font-bold truncate text-slate-900" title={formatCurrency(previousMonth)}>
              {formatCurrency(previousMonth)}
            </p>
          </div>
        </div>

        <div className="mt-auto pt-4 border-t border-slate-100">
          <p className="text-[10px] sm:text-[11px] font-bold text-purple-600/80 uppercase tracking-widest mb-1">Total Geral</p>
          <p className="text-2xl sm:text-3xl font-extrabold tracking-tight truncate text-purple-600" title={formatCurrency(total)}>
            {formatCurrency(total)}
          </p>
        </div>
      </div>
    </div>

    <WidgetInfoModal 
      isOpen={showInfo} 
      onClose={() => setShowInfo(false)} 
      title="Como calculamos os Investimentos?" 
      description={
        <div className="space-y-4">
          <p>Este painel consolida o dinheiro que você separou para investir.</p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Mês Atual:</strong> Valor investido apenas no mês que você está visualizando no painel.</li>
            <li><strong>Mês Anterior:</strong> Valor acumulado de investimentos dos meses anteriores.</li>
            <li><strong>Total Geral:</strong> A soma do valor que você já tinha investido antes com os investimentos realizados no mês atual.</li>
          </ul>
        </div>
      } 
    />
    </>
  );
};


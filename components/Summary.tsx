
import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown, Wallet } from 'lucide-react';

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

export const RevenueWidget: React.FC<{
  pending: number;
  received: number;
  previousBalance: number;
  formatCurrency: (val: number) => string;
}> = ({ pending, received, previousBalance, formatCurrency }) => {
  const previousToShow = Math.max(0, previousBalance);
  const total = pending + received + previousToShow;

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col h-full relative overflow-hidden group hover:shadow-md transition-transform hover:-translate-y-1 duration-300">
      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-emerald-500 opacity-80 group-hover:opacity-100 transition-opacity"></div>
      
      <div className="flex items-center gap-3 mb-6 ml-1">
         <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-600">
           <TrendingUp size={22} strokeWidth={2.5} />
         </div>
         <h2 className="font-bold text-slate-800 text-lg sm:text-xl tracking-tight">Receitas</h2>
      </div>

      <div className="grid grid-cols-3 gap-3 ml-1 flex-grow mb-3">
        <div>
          <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Pendente</p>
          <p className="text-xs sm:text-sm font-bold text-rose-500 truncate" title={formatCurrency(pending)}>{formatCurrency(pending)}</p>
        </div>
        <div>
          <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Recebido</p>
          <p className="text-xs sm:text-sm font-bold text-slate-700 truncate" title={formatCurrency(received)}>{formatCurrency(received)}</p>
        </div>
        <div>
          <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Anterior</p>
          <p className="text-xs sm:text-sm font-bold text-slate-700 truncate" title={'+' + formatCurrency(previousToShow)}>
            {previousToShow > 0 ? '+' : ''}{formatCurrency(previousToShow)}
          </p>
        </div>
      </div>

      <div className="mt-auto ml-1 pt-4 border-t border-slate-100">
        <p className="text-[10px] sm:text-[11px] font-bold text-emerald-600/70 uppercase tracking-widest mb-1">Total Geral</p>
        <p className="text-2xl sm:text-3xl font-extrabold text-emerald-600 tracking-tight truncate" title={formatCurrency(total)}>{formatCurrency(total)}</p>
      </div>
    </div>
  );
};

export const ExpenseWidget: React.FC<{
  unpaid: number;
  paid: number;
  previousBalance: number;
  formatCurrency: (val: number) => string;
}> = ({ unpaid, paid, previousBalance, formatCurrency }) => {
  const previousToShow = previousBalance < 0 ? Math.abs(previousBalance) : 0;
  const total = unpaid + paid;

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col h-full relative overflow-hidden group hover:shadow-md transition-transform hover:-translate-y-1 duration-300">
      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-rose-500 opacity-80 group-hover:opacity-100 transition-opacity"></div>
      
      <div className="flex items-center gap-3 mb-6 ml-1">
         <div className="p-2.5 bg-rose-50 rounded-xl text-rose-600">
           <TrendingDown size={22} strokeWidth={2.5} />
         </div>
         <h2 className="font-bold text-slate-800 text-lg sm:text-xl tracking-tight">Despesas</h2>
      </div>

      <div className="grid grid-cols-3 gap-3 ml-1 flex-grow mb-3">
        <div>
          <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Não Paga</p>
          <p className="text-xs sm:text-sm font-bold text-rose-500 truncate" title={formatCurrency(unpaid)}>{formatCurrency(unpaid)}</p>
        </div>
        <div>
          <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Paga</p>
          <p className="text-xs sm:text-sm font-bold text-slate-700 truncate" title={formatCurrency(paid)}>{formatCurrency(paid)}</p>
        </div>
        <div>
          <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Anterior</p>
          <p className="text-xs sm:text-sm font-bold text-slate-700 truncate" title={'-' + formatCurrency(previousToShow)}>
            {previousToShow > 0 ? '-' : ''}{formatCurrency(previousToShow)}
          </p>
        </div>
      </div>

      <div className="mt-auto ml-1 pt-4 border-t border-slate-100">
        <p className="text-[10px] sm:text-[11px] font-bold text-rose-600/70 uppercase tracking-widest mb-1">Total Geral</p>
        <p className="text-2xl sm:text-3xl font-extrabold text-rose-600 tracking-tight truncate" title={formatCurrency(total)}>{formatCurrency(total)}</p>
      </div>
    </div>
  );
};

export const BalanceWidget: React.FC<{
  saldoAtual: number;
  totalGeral: number;
  formatCurrency: (val: number) => string;
}> = ({ saldoAtual, totalGeral, formatCurrency }) => {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col h-full relative overflow-hidden group hover:shadow-md transition-transform hover:-translate-y-1 duration-300">
      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-500 opacity-80 group-hover:opacity-100 transition-opacity"></div>
      
      <div className="flex items-center gap-3 mb-6 ml-1">
         <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600">
           <Wallet size={22} strokeWidth={2.5} />
         </div>
         <h2 className="font-bold text-slate-800 text-lg sm:text-xl tracking-tight">Saldo</h2>
      </div>

      <div className="grid grid-cols-1 gap-4 ml-1 flex-grow mb-3">
        <div>
          <p className="text-[10px] sm:text-[11px] font-bold text-slate-900 uppercase tracking-wider mb-1">Saldo Atual</p>
          <p className="text-xs sm:text-sm font-bold truncate text-slate-900" title={formatCurrency(saldoAtual)}>
            {formatCurrency(saldoAtual)}
          </p>
        </div>
      </div>

      <div className="mt-auto ml-1 pt-4 border-t border-slate-100">
        <p className="text-[10px] sm:text-[11px] font-bold text-blue-600/80 uppercase tracking-widest mb-1">Total Geral</p>
        <p className="text-2xl sm:text-3xl font-extrabold tracking-tight truncate text-blue-600" title={formatCurrency(totalGeral)}>
          {formatCurrency(totalGeral)}
        </p>
      </div>
    </div>
  );
};

export const InvestmentWidget: React.FC<{
  currentMonth: number;
  previousMonth: number;
  formatCurrency: (val: number) => string;
}> = ({ currentMonth, previousMonth, formatCurrency }) => {
  const total = currentMonth + previousMonth;

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col h-full relative overflow-hidden group hover:shadow-md transition-transform hover:-translate-y-1 duration-300">
      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-purple-500 opacity-80 group-hover:opacity-100 transition-opacity"></div>
      
      <div className="flex items-center gap-3 mb-6 ml-1">
         <div className="p-2.5 bg-purple-50 rounded-xl text-purple-600">
           <Wallet size={22} strokeWidth={2.5} />
         </div>
         <h2 className="font-bold text-slate-800 text-lg sm:text-xl tracking-tight">Investimentos</h2>
      </div>

      <div className="grid grid-cols-2 gap-4 ml-1 flex-grow mb-3">
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

      <div className="mt-auto ml-1 pt-4 border-t border-slate-100">
        <p className="text-[10px] sm:text-[11px] font-bold text-purple-600/80 uppercase tracking-widest mb-1">Total Geral</p>
        <p className="text-2xl sm:text-3xl font-extrabold tracking-tight truncate text-purple-600" title={formatCurrency(total)}>
          {formatCurrency(total)}
        </p>
      </div>
    </div>
  );
};


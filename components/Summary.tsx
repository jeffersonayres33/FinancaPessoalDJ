
import React from 'react';
import { LucideIcon } from 'lucide-react';

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

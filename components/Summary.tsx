
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

// Mantemos o componente Summary original apenas para compatibilidade se algo ainda o usar, 
// mas o App.tsx vai usar o StatCard diretamente agora.
export const Summary: React.FC<any> = () => null;

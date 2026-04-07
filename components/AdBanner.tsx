import React from 'react';

interface AdBannerProps {
  format?: 'banner' | 'rectangle';
}

export const AdBanner: React.FC<AdBannerProps> = ({ format = 'banner' }) => {
  if (format === 'rectangle') {
    return (
      <div className="w-full max-w-sm mx-auto h-[250px] bg-gray-200 border border-gray-300 border-dashed rounded-lg flex flex-col items-center justify-center text-gray-400 my-4">
        <span className="text-sm font-medium uppercase tracking-widest mb-1">Publicidade</span>
        <span className="text-xs">Espaço reservado (300x250)</span>
      </div>
    );
  }

  return (
    <div className="w-full h-[50px] md:h-[90px] bg-gray-200 border-y border-gray-300 border-dashed flex flex-col items-center justify-center text-gray-400 mt-4 mb-2">
      <span className="text-xs font-medium uppercase tracking-widest">Publicidade</span>
      <span className="text-[10px]">Espaço reservado para Banner AdMob</span>
    </div>
  );
};

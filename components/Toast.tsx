import React, { useEffect } from 'react';
import { CheckCircle, AlertCircle, X } from 'lucide-react';

export interface ToastProps {
  message: string;
  type: 'success' | 'error';
  isVisible: boolean;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type, isVisible, onClose }) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000); // Auto close after 3s
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  return (
    <div className={`fixed top-4 right-4 z-[60] flex items-center p-4 mb-4 text-sm rounded-lg shadow-lg border animate-fade-in-left ${
      type === 'success' 
        ? 'text-green-800 border-green-300 bg-green-50' 
        : 'text-red-800 border-red-300 bg-red-50'
    }`} role="alert">
      {type === 'success' ? <CheckCircle className="flex-shrink-0 w-5 h-5 mr-2" /> : <AlertCircle className="flex-shrink-0 w-5 h-5 mr-2" />}
      <span className="font-medium mr-2">{message}</span>
      <button onClick={onClose} type="button" className={`ml-auto -mx-1.5 -my-1.5 rounded-lg focus:ring-2 p-1.5 inline-flex h-8 w-8 ${
         type === 'success' ? 'bg-green-50 text-green-500 hover:bg-green-200 focus:ring-green-400' : 'bg-red-50 text-red-500 hover:bg-red-200 focus:ring-red-400'
      }`}>
        <span className="sr-only">Fechar</span>
        <X size={16} />
      </button>
    </div>
  );
};
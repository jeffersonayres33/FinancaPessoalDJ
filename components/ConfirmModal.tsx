import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
  checkboxLabel?: string;
  isCheckboxChecked?: boolean;
  onCheckboxChange?: (checked: boolean) => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({ 
  isOpen, 
  title, 
  message, 
  onConfirm, 
  onCancel, 
  confirmText = "Confirmar", 
  cancelText = "Cancelar",
  isDanger = true,
  checkboxLabel,
  isCheckboxChecked,
  onCheckboxChange
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm overflow-hidden animate-fade-in-up">
        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            {isDanger && <AlertTriangle className="text-red-500" size={20} />}
            {title}
          </h3>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6">
          <p className="text-gray-600 mb-6 text-sm leading-relaxed">
            {message}
          </p>

          {checkboxLabel && onCheckboxChange && (
            <div className="mb-6 flex items-start gap-2 bg-yellow-50 p-3 rounded border border-yellow-100">
              <input 
                type="checkbox" 
                id="confirm-checkbox"
                checked={isCheckboxChecked}
                onChange={(e) => onCheckboxChange(e.target.checked)}
                className="mt-1 w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500 cursor-pointer"
              />
              <label htmlFor="confirm-checkbox" className="text-sm text-gray-700 cursor-pointer select-none font-medium">
                {checkboxLabel}
              </label>
            </div>
          )}
          
          <div className="flex gap-3">
            <button 
              onClick={onCancel}
              className="flex-1 py-2 px-4 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 font-medium transition-colors"
            >
              {cancelText}
            </button>
            <button 
              onClick={onConfirm}
              className={`flex-1 py-2 px-4 text-white rounded-md font-bold transition-colors shadow-sm ${
                isDanger ? 'bg-red-600 hover:bg-red-700' : 'bg-purple-600 hover:bg-purple-700'
              }`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
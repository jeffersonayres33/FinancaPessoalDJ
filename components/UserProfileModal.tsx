import React, { useState } from 'react';
import { X, Save, Lock, User as UserIcon, Mail, Palette } from 'lucide-react';
import { User } from '../types';
import { authService } from '../services/authService';

interface UserProfileModalProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
  onUpdateUser: (user: User) => void;
  showToast: (message: string, type: 'success' | 'error') => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ user, isOpen, onClose, onUpdateUser, showToast }) => {
  const [name, setName] = useState(user.name);
  const [themeColor, setThemeColor] = useState(user.themeColor || 'orange');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let updatedUser = { ...user };
      let hasChanges = false;

      // 1. Atualizar Nome (se mudou)
      if (name !== user.name) {
        if (!name.trim()) {
          showToast('O nome não pode ficar vazio.', 'error');
          setLoading(false);
          return;
        }
        await authService.updateUserName(user.id, name);
        updatedUser.name = name;
        hasChanges = true;
      }

      // 2. Atualizar Cor do Tema (se mudou)
      if (themeColor !== (user.themeColor || 'orange')) {
        await authService.updateUserThemeColor(user.id, themeColor);
        updatedUser.themeColor = themeColor as any;
        hasChanges = true;
      }

      if (hasChanges) {
        onUpdateUser(updatedUser);
        showToast('Perfil atualizado com sucesso!', 'success');
      }

      // 3. Atualizar Senha (se preencheu os campos e for a conta principal)
      if (!user.parentId && (currentPassword || newPassword || confirmPassword)) {
        if (!currentPassword || !newPassword || !confirmPassword) {
          showToast('Preencha todos os campos de senha para alterá-la.', 'error');
          setLoading(false);
          return;
        }
        if (newPassword !== confirmPassword) {
          showToast('A nova senha e a confirmação não coincidem.', 'error');
          setLoading(false);
          return;
        }
        
        // Tenta fazer login com a senha atual para validar
        const isValid = await authService.login(user.email, currentPassword);
        if (!isValid) {
          showToast('Senha atual incorreta.', 'error');
          setLoading(false);
          return;
        }

        await authService.updateUserPassword(user.id, newPassword);
        showToast('Senha atualizada com sucesso!', 'success');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }

      if (name === user.name && !currentPassword && !newPassword) {
         showToast('Nenhuma alteração foi feita.', 'success');
      }

      onClose();
    } catch (error: any) {
      showToast(error.message || 'Erro ao atualizar perfil.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-up">
        <div className="flex justify-between items-center p-5 border-b bg-gray-50">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <UserIcon size={20} className="text-purple-600" />
            Meu Perfil
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Email (Read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-mail (Não pode ser alterado)</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail size={16} className="text-gray-400" />
              </div>
              <input
                type="email"
                value={user.email}
                readOnly
                className="w-full pl-10 p-2.5 bg-gray-100 border border-gray-200 rounded-lg text-gray-500 cursor-not-allowed"
              />
            </div>
          </div>

          {/* Nome */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <UserIcon size={16} className="text-gray-400" />
              </div>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-10 p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                placeholder="Seu nome completo"
              />
            </div>
          </div>

          {/* Cor do Tema - Só mostra se for um membro (tem parentId) */}
          {!!user.parentId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                <Palette size={16} className="text-gray-500" />
                Cor do Perfil
              </label>
              <div className="flex gap-4">
                {[
                  { id: 'orange', class: 'bg-orange-500 ring-orange-200' },
                  { id: 'blue', class: 'bg-blue-500 ring-blue-200' },
                  { id: 'pink', class: 'bg-pink-500 ring-pink-200' },
                  { id: 'green', class: 'bg-green-500 ring-green-200' }
                ].map(color => (
                  <button
                    key={color.id}
                    type="button"
                    onClick={() => setThemeColor(color.id)}
                    className={`w-10 h-10 rounded-full ${color.class} transition-all ${themeColor === color.id ? 'ring-4 scale-110' : 'hover:scale-105'}`}
                    aria-label={`Selecionar cor ${color.id}`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Alterar Senha - Só mostra se for a conta principal */}
          {!user.parentId && (
            <>
              <hr className="border-gray-100" />
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  <Lock size={16} className="text-gray-500" />
                  Alterar Senha
                </h3>
                
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Senha Atual</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all text-sm"
                    placeholder="Digite sua senha atual"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Nova Senha</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all text-sm"
                      placeholder="Nova senha"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Confirmar Nova</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all text-sm"
                      placeholder="Repita a senha"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-600 text-white py-3 rounded-lg font-bold hover:bg-purple-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Save size={18} /> Salvar Alterações
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

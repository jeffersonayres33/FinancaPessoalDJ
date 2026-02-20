
import React, { useState } from 'react';
import { UserPlus, Users, Shield, Share2, LogIn, ArrowRight, Loader2 } from 'lucide-react';
import { User } from '../types';
import { authService } from '../services/authService';

interface MemberManagerProps {
  currentUser: User;
  onUpdateUser: (updatedUser: User) => void;
  onSwitchUser: (newUser: User) => void;
}

export const MemberManager: React.FC<MemberManagerProps> = ({ currentUser, onUpdateUser, onSwitchUser }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [shareData, setShareData] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const updatedUser = await authService.addMember(currentUser, name, email, password, shareData);
      onUpdateUser(updatedUser);
      setSuccess(`Membro ${name} adicionado com sucesso!`);
      setName('');
      setEmail('');
      setPassword('');
      setShareData(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchToMember = async (memberId: string) => {
    setLoading(true);
    try {
        const newUser = await authService.switchUser(memberId);
        if (newUser) {
            onSwitchUser(newUser);
        } else {
            setError("Erro ao trocar de usuário.");
        }
    } catch (e) {
        setError("Erro ao conectar.");
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-4xl mx-auto mt-6">
      <div className="flex items-center gap-3 border-b border-gray-100 pb-4 mb-6">
        <div className="bg-purple-100 p-2 rounded-full text-purple-600">
           <Users size={24} />
        </div>
        <div>
           <h2 className="text-xl font-bold text-gray-800">Gerenciar Membros</h2>
           <p className="text-sm text-gray-500">Adicione pessoas à sua conta ou crie contas isoladas.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Formulário de Adição */}
        <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
           <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
             <UserPlus size={18} /> Novo Membro
           </h3>
           
           <form onSubmit={handleAddMember} className="space-y-4">
             <div>
               <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome</label>
               <input
                 type="text"
                 value={name}
                 onChange={e => setName(e.target.value)}
                 className="w-full p-2 border rounded-md text-sm"
                 required
               />
             </div>
             <div>
               <label className="block text-xs font-bold text-gray-500 uppercase mb-1">E-mail de Login</label>
               <input
                 type="email"
                 value={email}
                 onChange={e => setEmail(e.target.value)}
                 className="w-full p-2 border rounded-md text-sm"
                 required
               />
             </div>
             <div>
               <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Senha Provisória</label>
               <input
                 type="password"
                 value={password}
                 onChange={e => setPassword(e.target.value)}
                 className="w-full p-2 border rounded-md text-sm"
                 required
               />
             </div>

             <div className="bg-white p-3 rounded border border-gray-200">
               <label className="flex items-start gap-3 cursor-pointer">
                 <input 
                   type="checkbox" 
                   checked={shareData} 
                   onChange={e => setShareData(e.target.checked)}
                   className="mt-1" 
                 />
                 <div>
                   <span className="block text-sm font-semibold text-gray-800 flex items-center gap-1">
                     <Share2 size={14} /> Compartilhar meus dados
                   </span>
                   <p className="text-xs text-gray-500 mt-1">
                     Se marcado, este usuário verá e editará suas transações. 
                     Se desmarcado, ele terá uma conta vazia e isolada.
                   </p>
                 </div>
               </label>
             </div>

             {error && <p className="text-red-500 text-sm">{error}</p>}
             {success && <p className="text-green-600 text-sm">{success}</p>}

             <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-purple-600 text-white py-2 rounded-md font-bold hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
             >
               {loading && <Loader2 size={16} className="animate-spin" />}
               Adicionar Membro
             </button>
           </form>
        </div>

        {/* Lista de Membros */}
        <div>
          <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
             <Shield size={18} /> Membros da Conta
          </h3>
          
          {(!currentUser.members || currentUser.members.length === 0) ? (
            <div className="text-center py-10 text-gray-400 border border-dashed border-gray-300 rounded-lg">
              <Users size={48} className="mx-auto mb-2 opacity-20" />
              <p>Você ainda não adicionou membros.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {currentUser.members.map(member => (
                <li key={member.id} className="bg-white p-4 rounded border border-gray-200 shadow-sm flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div>
                        <p className="font-bold text-gray-800">{member.name}</p>
                        <p className="text-xs text-gray-500">{member.email}</p>
                    </div>
                    {member.dataContextId === currentUser.dataContextId ? (
                         <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                           <Share2 size={10} /> Compartilhado
                         </span>
                      ) : (
                         <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                           <Shield size={10} /> Isolado
                         </span>
                      )}
                  </div>
                  
                  <div className="border-t border-gray-100 pt-3 flex justify-end">
                      <button 
                        onClick={() => handleSwitchToMember(member.id)}
                        disabled={loading}
                        className="flex items-center gap-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded transition-colors shadow-sm disabled:opacity-50"
                      >
                         <LogIn size={14} /> Acessar Perfil
                         <ArrowRight size={12} />
                      </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

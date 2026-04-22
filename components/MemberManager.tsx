
import React, { useState } from 'react';
import { UserPlus, Users, Shield, Share2, LogIn, ArrowRight, Loader2, Trash2, AlertTriangle, X } from 'lucide-react';
import { User } from '../types';
import { authService } from '../services/authService';

interface MemberManagerProps {
  currentUser: User;
  onUpdateUser: (updatedUser: User) => void;
  onSwitchUser: (newUser: User) => void;
  onOpenPaywall?: () => void;
}

export const MemberManager: React.FC<MemberManagerProps> = ({ currentUser, onUpdateUser, onSwitchUser, onOpenPaywall }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [shareData, setShareData] = useState(true);
  
  // States to handle forms
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Independent States to handle Member List feedback (switching/deleting)
  const [listError, setListError] = useState('');
  const [listSuccess, setListSuccess] = useState('');
  
  const [loading, setLoading] = useState(false);

  const [memberToDelete, setMemberToDelete] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentUser.plan !== 'premium' && onOpenPaywall) {
      onOpenPaywall();
      return;
    }
    setError('');
    setSuccess('');
    setListError('');
    setListSuccess('');
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
    setListError('');
    setListSuccess('');
    try {
        const newUser = await authService.switchUser(memberId);
        if (newUser) {
            onSwitchUser(newUser);
        } else {
            setListError("Erro ao trocar de usuário.");
        }
    } catch (e) {
        setListError("Erro ao conectar.");
    } finally {
        setLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!memberToDelete) return;

    setIsDeleting(true);
    setListError('');
    setListSuccess('');
    
    try {
      await authService.deleteMember(memberToDelete.id);
      
      // Update local state by removing the member
      const updatedMembers = (currentUser.members || []).filter(m => m.id !== memberToDelete.id);
      const updatedUser = { ...currentUser, members: updatedMembers };
      
      // Save locally
      localStorage.setItem('budget_planner_user', JSON.stringify(updatedUser)); // using CURRENT_USER_KEY manually
      onUpdateUser(updatedUser);
      
      setListSuccess(`Membro excluído definitivamente.`);
      setMemberToDelete(null);
    } catch (err: any) {
      const errMsg = err.message || '';
      if (errMsg.includes('Invalid token')) {
          setListError('Sua sessão expirou ou foi invalidada. Pressione a tecla F5 para recarregar ou faça o login novamente na conta principal.');
      } else {
          setListError(errMsg || "Erro ao excluir membro.");
      }
      setMemberToDelete(null);
    } finally {
      setIsDeleting(false);
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
        <div className="bg-gray-50 p-5 rounded-lg border border-gray-200 relative overflow-hidden">
          {currentUser.plan !== 'premium' && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center p-6 text-center">
              <div className="bg-yellow-100 p-4 rounded-full mb-4">
                <Users className="text-yellow-600 w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Recurso Premium</h3>
              <p className="text-gray-600 mb-4 text-sm">
                Assine o Premium para adicionar membros e gerenciar as finanças da sua família em conjunto.
              </p>
              <button 
                onClick={onOpenPaywall}
                className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-900 px-4 py-2 rounded-full font-bold shadow-md hover:shadow-lg transition-all text-sm"
              >
                Assinar Premium
              </button>
            </div>
          )}
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

          {listError && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded border border-red-100">{listError}</div>}
          {listSuccess && <div className="mb-4 p-3 bg-green-50 text-green-700 text-sm rounded border border-green-100">{listSuccess}</div>}
          
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
                  
                  <div className="border-t border-gray-100 pt-3 flex items-center justify-between gap-3">
                      <button 
                        type="button"
                        onClick={() => setMemberToDelete(member)}
                        disabled={loading || isDeleting}
                        className="flex-1 flex items-center justify-center gap-2 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded transition-colors shadow-sm disabled:opacity-50"
                      >
                         <Trash2 size={14} /> Excluir
                      </button>
                      <button 
                        onClick={() => handleSwitchToMember(member.id)}
                        disabled={loading || isDeleting}
                        className="flex-1 flex items-center justify-center gap-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded transition-colors shadow-sm disabled:opacity-50"
                      >
                         <LogIn size={14} /> Acessar Perfil
                      </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {memberToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60">
           <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-fade-in-up">
              <div className="bg-red-50 p-4 flex items-center justify-between border-b border-red-100">
                 <div className="flex items-center gap-2 text-red-800 font-bold">
                    <AlertTriangle size={20} />
                    <span>Excluir Membro Definitivamente</span>
                 </div>
                 <button onClick={() => setMemberToDelete(null)} disabled={isDeleting} className="text-gray-400 hover:text-gray-600">
                    <X size={20} />
                 </button>
              </div>
              <div className="p-6">
                 <p className="text-gray-800 mb-4">
                   Tem certeza que deseja excluir o membro <strong>{memberToDelete.name}</strong>?
                 </p>
                 <div className="bg-red-50 p-3 rounded-lg border border-red-200 text-sm text-red-800 mb-6 flex items-start gap-2 shadow-sm">
                   <AlertTriangle className="flex-shrink-0 mt-0.5 text-red-600" size={18} />
                   <div>
                     <strong>Advertência:</strong> Ao excluir este membro, <u>todas</u> as suas informações (transações, categorias, análises) serão perdidas <strong>definitivamente e não poderão ser recuperadas</strong>. Se não usou a Ferramenta de Migração para salvá-las, você as perderá para sempre.
                   </div>
                 </div>
                 
                 <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                   <button 
                      onClick={() => setMemberToDelete(null)}
                      disabled={isDeleting}
                      className="w-full sm:flex-1 py-2.5 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-colors border border-gray-200 shadow-sm text-sm sm:text-base"
                   >
                     Cancelar
                   </button>
                   <button 
                      onClick={handleConfirmDelete}
                      disabled={isDeleting}
                      className="w-full sm:flex-1 py-2.5 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors shadow-sm flex items-center justify-center gap-2 text-sm sm:text-base"
                   >
                     {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                     Confirmar Exclusão
                   </button>
                 </div>
              </div>
           </div>
        </div>
      )}

    </div>
  );
};


import React, { useState } from 'react';
import { Wallet, Mail, Lock, User as UserIcon, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import { authService } from '../services/authService';
import { User } from '../types';

interface AuthScreenProps {
  onLoginSuccess: (user: User) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isLogin) {
        const user = await authService.login(email, password);
        if (user) {
          onLoginSuccess(user);
        } else {
          setError('Login falhou. Verifique suas credenciais.');
        }
      } else {
        if (!name || !email || !password) {
          setError('Preencha todos os campos.');
          setIsLoading(false);
          return;
        }
        if (password.length < 6) {
           setError('A senha deve ter no mínimo 6 caracteres.');
           setIsLoading(false);
           return;
        }
        const user = await authService.register(name, email, password);
        onLoginSuccess(user);
      }
    } catch (err: any) {
      console.error("Auth Error:", err);
      
      // Extração robusta da mensagem de erro
      let msg = '';
      if (typeof err === 'string') {
          msg = err;
      } else if (err instanceof Error) {
          msg = err.message;
      } else if (err && typeof err === 'object') {
          msg = err.message || err.error_description || JSON.stringify(err);
      } else {
          msg = 'Ocorreu um erro desconhecido.';
      }

      const lowerMsg = msg.toLowerCase();
      
      // Tratamento de mensagens específicas do Supabase Auth
      if (lowerMsg.includes("invalid login") || lowerMsg.includes("invalid_grant") || lowerMsg.includes("invalid credentials")) {
          setError("E-mail ou senha incorretos.");
      } else if (lowerMsg.includes("already registered") || lowerMsg.includes("user already exists")) {
          setError("Este e-mail já está cadastrado. Tente fazer login.");
      } else if (lowerMsg.includes("rate limit") || lowerMsg.includes("too many requests") || lowerMsg.includes("email rate limit exceeded")) {
          setError("Muitas tentativas. Por favor, aguarde alguns minutos antes de tentar novamente.");
      } else if (lowerMsg.includes("security purposes")) {
           setError("Bloqueado por segurança. Aguarde um momento.");
      } else if (lowerMsg.includes("perfil de usuário não encontrado")) {
           setError("Usuário autenticado, mas perfil não encontrado. Contate o suporte.");
      } else {
          setError(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-800 to-indigo-950 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-fade-in-up">
        {/* Header */}
        <div className="bg-gray-50 p-8 text-center border-b border-gray-100 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-indigo-500"></div>
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-100 text-purple-600 mb-4 shadow-sm">
            <Wallet size={32} />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Finanças Pessoais</h1>
          <p className="text-gray-500 text-sm mt-1 flex items-center justify-center gap-1">
             <ShieldCheck size={14} className="text-green-500" /> Ambiente Seguro
          </p>
        </div>

        {/* Form */}
        <div className="p-8">
          <h2 className="text-xl font-semibold text-gray-700 mb-6 text-center">
            {isLogin ? 'Acessar sua conta' : 'Criar nova conta'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="relative group">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-purple-600 transition-colors" size={18} />
                <input
                  type="text"
                  placeholder="Seu Nome Completo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all bg-gray-50 focus:bg-white"
                  required={!isLogin}
                />
              </div>
            )}

            <div className="relative group">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-purple-600 transition-colors" size={18} />
              <input
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all bg-gray-50 focus:bg-white"
                required
              />
            </div>

            <div className="relative group">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-purple-600 transition-colors" size={18} />
              <input
                type="password"
                placeholder="Sua senha (mín 6 caracteres)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all bg-gray-50 focus:bg-white"
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg flex items-center gap-2 border border-red-100 animate-fade-in">
                <AlertCircle size={16} className="flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-lg transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed transform active:scale-95"
            >
              {isLoading ? (
                  <span className="flex items-center gap-2">Carregando...</span>
              ) : (
                  <>
                    {isLogin ? 'Entrar' : 'Cadastrar'} 
                    <ArrowRight size={18} />
                  </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center pt-6 border-t border-gray-100">
            <p className="text-sm text-gray-600">
              {isLogin ? 'Não tem uma conta?' : 'Já possui cadastro?'}
              <button
                onClick={() => { setIsLogin(!isLogin); setError(''); }}
                className="ml-2 text-purple-600 font-bold hover:text-purple-800 transition-colors focus:outline-none"
              >
                {isLogin ? 'Criar conta grátis' : 'Fazer Login'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

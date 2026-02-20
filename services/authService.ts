
import { v4 as uuidv4 } from 'uuid';
import { User } from '../types';
import { supabase } from './supabaseClient';

const CURRENT_USER_KEY = 'finances_current_user';

export const authService = {
  // Login usando Supabase Auth
  login: async (email: string, pass: string): Promise<User | null> => {
    // 1. Autentica no Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password: pass,
    });

    if (authError || !authData.user) {
      if (authError?.message.includes('rate limit')) {
        throw new Error('Muitas tentativas de login. Aguarde alguns minutos e tente novamente.');
      }
      throw new Error(authError?.message || 'Erro ao fazer login');
    }

    // 2. Busca o perfil na tabela app_users (agora protegida por RLS)
    let { data: profile, error: profileError } = await supabase
      .from('app_users')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    // SE O PERFIL NÃO EXISTIR (mas o Auth existir), TENTA CRIAR AGORA
    // Isso corrige o problema de "Perfil não encontrado" se o registro falhou no passo 2
    if (!profile) {
        console.warn("Perfil de usuário não encontrado. Tentando criar agora...");
        
        const userName = authData.user.user_metadata?.name || email.split('@')[0];
        const userId = authData.user.id;
        
        const newUserPayload = {
            id: userId,
            name: userName,
            email: email,
            password: '***', 
            data_context_id: userId,
        };

        const { data: newProfile, error: createError } = await supabase
            .from('app_users')
            .insert(newUserPayload)
            .select()
            .single();
            
        if (createError) {
            console.error("Falha ao criar perfil de recuperação:", createError);
            await supabase.auth.signOut();
            throw new Error('Perfil de usuário não encontrado e não foi possível criá-lo: ' + createError.message);
        }
        
        profile = newProfile;
    }

    // 3. Buscar membros (Filhos/Dependentes)
    // O RLS vai garantir que só retornem os membros deste usuário
    const { data: members } = await supabase
      .from('app_users')
      .select('*')
      .eq('parent_id', profile.id);

    const user: User = {
      ...profile,
      dataContextId: profile.data_context_id,
      parentId: profile.parent_id,
      members: members || []
    };

    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    return user;
  },

  // Registro usando Supabase Auth
  register: async (name: string, email: string, pass: string): Promise<User> => {
    // 1. Cria usuário no Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password: pass,
      options: {
        data: { name } // Salva nome nos metadados também
      }
    });

    if (authError) {
        if (authError.message.includes('rate limit')) {
            throw new Error('Muitas tentativas de registro. Aguarde alguns minutos.');
        }
        throw new Error(authError.message || 'Erro ao registrar usuário');
    }
    
    if (!authData.user) {
        throw new Error('Erro desconhecido ao registrar.');
    }

    // Se o registro exigir confirmação de email, o session pode ser null
    if (!authData.session) {
        // Não podemos criar o perfil se não temos sessão (RLS bloqueia).
        // O usuário terá que confirmar o email e fazer login.
        // O login cuidará de criar o perfil se ele não existir.
        console.log("Registro iniciado, mas requer confirmação de email.");
        throw new Error('Registro iniciado! Verifique seu email para confirmar a conta antes de fazer login.');
    }

    // 2. Cria o perfil na tabela app_users
    // Importante: O ID deve ser igual ao auth.uid() para o RLS funcionar no 'main' user
    const userId = authData.user.id;
    const newUserPayload = {
      id: userId, // Vínculo com Auth
      name,
      email,
      password: '***', // Não salvamos a senha real aqui mais, o Supabase Auth cuida disso
      data_context_id: userId, // Contexto próprio
    };

    const { data: profile, error: dbError } = await supabase
      .from('app_users')
      .insert(newUserPayload)
      .select()
      .single();

    if (dbError) {
      // Se der erro de RLS aqui, pode ser que o trigger já tenha criado (se existisse)
      // ou alguma outra condição de corrida.
      // Vamos tentar fazer login direto para ver se recupera.
      console.warn("Erro ao criar perfil no registro (pode ser RLS ou duplicado):", dbError);
      
      // Tenta recuperar o perfil se ele já existir
      const { data: existingProfile } = await supabase
        .from('app_users')
        .select('*')
        .eq('id', userId)
        .single();
        
      if (existingProfile) {
          const user = { ...existingProfile, dataContextId: existingProfile.data_context_id, members: [] };
          localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
          return user;
      }
      
      // Se não existe e não conseguiu criar, falha.
      await supabase.auth.signOut();
      throw new Error('Erro ao criar perfil no banco de dados: ' + dbError.message);
    }

    const user = { ...profile, dataContextId: profile.data_context_id, members: [] };
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    return user;
  },

  // Adicionar Membro (Cria apenas um perfil secundário gerenciado pelo pai)
  // Nota: Membros criados assim NÃO têm login próprio no Supabase Auth (são "perfis gerenciados").
  // Para terem login, precisariam de invite via email, o que é mais complexo.
  addMember: async (adminUser: User, name: string, email: string, pass: string, shareData: boolean): Promise<User> => {
    const newMemberId = uuidv4();
    
    // Inserimos na tabela app_users. 
    // A política RLS permitirá isso pois parent_id será o ID do usuário logado.
    const newMemberPayload = {
      id: newMemberId,
      name,
      email,
      password: 'managed_profile', // Placeholder
      parent_id: adminUser.id,
      data_context_id: shareData ? adminUser.dataContextId : newMemberId
    };

    const { error } = await supabase.from('app_users').insert(newMemberPayload);
    if (error) throw new Error(error.message);

    // Retorna o admin atualizado
    const { data: members } = await supabase
        .from('app_users')
        .select('*')
        .eq('parent_id', adminUser.id);
    
    const updatedAdmin = { 
        ...adminUser,
        members: members || [] 
    };

    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(updatedAdmin));
    return updatedAdmin;
  },

  // Trocar para a conta de outro usuário (Context Switching)
  switchUser: async (targetUserId: string): Promise<User | null> => {
    // Busca perfil alvo
    const { data, error } = await supabase
      .from('app_users')
      .select('*')
      .eq('id', targetUserId)
      .single();

    if (error || !data) return null;

    // Busca membros do alvo (se houver)
    const { data: members } = await supabase.from('app_users').select('*').eq('parent_id', data.id);

    const user: User = {
      ...data,
      dataContextId: data.data_context_id,
      parentId: data.parent_id,
      members: members || []
    };

    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    return user;
  },

  logout: async () => {
    await supabase.auth.signOut();
    localStorage.removeItem(CURRENT_USER_KEY);
  },

  getCurrentUser: (): User | null => {
    const stored = localStorage.getItem(CURRENT_USER_KEY);
    return stored ? JSON.parse(stored) : null;
  },
  
  // Função para verificar sessão ativa no startup
  checkSession: async (): Promise<User | null> => {
    const { data } = await supabase.auth.getSession();
    if (data.session?.user) {
        // Se tem sessão válida no Supabase, tenta recuperar do local ou refetch
        return authService.getCurrentUser();
    }
    return null;
  }
};

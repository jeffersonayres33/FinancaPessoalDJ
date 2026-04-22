
import { v4 as uuidv4 } from 'uuid';
import { User } from '../types';
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from './supabaseClient';
import { createClient } from '@supabase/supabase-js';

const CURRENT_USER_KEY = 'finances_current_user';

export const authService = {
  // Helpers
  ensureMemberInheritsPlan: async (user: User, profileData: any): Promise<void> => {
    if (!user.parentId) return;
    
    let inheritedPlan = 'free';
    let inheritedEndDate: string | null = null;
    let success = false;

    // 1. Tenta buscar direto (se for admin masquerading, RLS permite)
    const { data: parentData, error: rlsError } = await supabase
        .from('app_users')
        .select('plan, subscription_end_date')
        .eq('id', user.parentId)
        .single();
    
    if (parentData) {
        inheritedPlan = parentData.plan || 'free';
        inheritedEndDate = parentData.subscription_end_date;
        success = true;
    } else {
        // 2. Se falhar (RLS bloqueou acesso do filho ao pai), busca via API (Bypass RLS)
        try {
            const tokenResponse = await supabase.auth.getSession();
            const token = tokenResponse.data.session?.access_token;
            if (token) {
                const res = await fetch('/api/users/parent-plan', {
                  headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                   const serverData = await res.json();
                   if (serverData && serverData.plan !== undefined && serverData.plan !== null) {
                       inheritedPlan = serverData.plan || 'free';
                       inheritedEndDate = serverData.subscriptionEndDate || null;
                       success = true;
                   }
                }
            }
        } catch (e) {
            console.warn("Falha ao buscar plano do pai via API", e);
        }
    }

    if (success) {
        user.plan = inheritedPlan;
        user.subscriptionEndDate = inheritedEndDate;

        if (profileData.plan !== inheritedPlan || profileData.subscription_end_date !== inheritedEndDate) {
            // Sincroniza o perfil do membro com o status do pai no banco
            await supabase.from('app_users').update({
                plan: inheritedPlan,
                subscription_end_date: inheritedEndDate
            }).eq('id', user.id);
        }
    }
  },

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
      if (authError?.message === 'Failed to fetch') {
        throw new Error('Erro de conexão (Failed to fetch). O banco de dados pode estar inativo/pausado ou há problemas na sua rede/bloqueador de anúncios.');
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
        
        const userName = authData.user.user_metadata?.name || (email || '').split('@')[0];
        const userId = authData.user.id;
        
        // Verifica se o cadastro público está habilitado
        const isPublic = await authService.isPublicRegistrationEnabled();
        
        // Se não for público, verifica se o usuário foi pré-cadastrado (convite)
        // Como o perfil não existe, não foi pré-cadastrado na tabela app_users.
        // Se o Auth existe mas o perfil não, e o cadastro público está OFF,
        // significa que alguém criou o Auth (talvez via API direta) mas não tinha permissão de criar perfil?
        // Ou o pré-cadastro falhou.
        // Vamos permitir a criação APENAS se for público.
        if (!isPublic) {
             await supabase.auth.signOut();
             throw new Error('O cadastro de novos usuários está desabilitado pelo administrador.');
        }

        const newUserPayload = {
            id: userId,
            name: userName,
            email: email,
            password: '***', 
            data_context_id: userId,
            role: 'user' // Default role
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

    // Se o usuário principal for premium, os membros herdam o status
    const effectivePlan = profile.plan || 'free';
    const effectiveExpiry = profile.subscription_end_date;

    const mappedMembers = (members || []).map(m => ({
      ...m,
      dataContextId: m.data_context_id,
      parentId: m.parent_id,
      role: m.role || 'user',
      themeColor: m.theme_color,
      financialMonthStartDay: m.financial_month_start_day,
      plan: effectivePlan,
      subscriptionEndDate: effectiveExpiry
    }));

    // Sincroniza plano do pai para os filhos no banco de dados se necessário (RLS permite que o pai atualize filhos)
    if (!profile.parent_id && members && members.length > 0) {
        const needsSync = members.some(m => m.plan !== effectivePlan || m.subscription_end_date !== effectiveExpiry);
        if (needsSync) {
            await supabase.from('app_users').update({
                plan: effectivePlan,
                subscription_end_date: effectiveExpiry
            }).eq('parent_id', profile.id);
        }
    }

    const user: User = {
      ...profile,
      dataContextId: profile.data_context_id,
      parentId: profile.parent_id,
      members: mappedMembers,
      role: profile.role || 'user',
      themeColor: profile.theme_color,
      financialMonthStartDay: profile.financial_month_start_day,
      plan: effectivePlan,
      subscriptionEndDate: effectiveExpiry
    };

    // Se for um membro logando, garante que o plano seja identico ao do pai (seja Premium ou Free)
    await authService.ensureMemberInheritsPlan(user, profile);

    localStorage.setItem('budget_planner_session_uid', authData.user.id);
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    return user;
  },

  // Registro usando Supabase Auth
  register: async (name: string, email: string, pass: string): Promise<User> => {
    // 0. Verifica se o cadastro público está habilitado
    // Nota: O pré-cadastro (convite) é tratado de outra forma (o usuário já existe em app_users).
    // Se o usuário já existe em app_users (pré-cadastro), ele deve usar o fluxo de "Ativar Conta" (que é basicamente um Login/Recuperar Senha ou um Registro que vincula).
    // Se ele tentar registrar com o mesmo email, o Supabase Auth vai reclamar ou vincular.
    
    const isPublic = await authService.isPublicRegistrationEnabled();
    
    // Verifica se já existe um pré-cadastro para este email na tabela app_users
    // (Isso requer uma query que pode falhar se RLS não permitir ver outros users.
    // Mas se for convite, o RLS deve permitir? Não, RLS bloqueia.
    // Solução: Tentar criar. Se falhar, falhou.)
    
    // Se não for público, só permitimos se for um "convite" (pré-cadastro).
    // Como saber se é convite sem poder consultar a tabela?
    // O Supabase Auth permite signUp. O problema é criar o perfil depois.
    
    if (!isPublic) {
        // Tenta verificar se é um convite (pré-cadastro)
        // Se o admin criou o perfil, ele existe em app_users.
        // O usuário ainda não tem Auth.
        // Ao criar o Auth, o ID do Auth será NOVO e diferente do ID do pré-cadastro (que foi gerado aleatoriamente ou é um placeholder).
        // ISSO É UM PROBLEMA. O ID do Auth tem que bater com o ID do app_users.
        // Solução para Convite: O Admin cria o Auth? Não pode (senha).
        // Solução: O Admin cria o app_users com um ID temporário? Não, o ID é PK.
        // O Admin cria o app_users. O usuário faz SignUp. O ID do Auth é gerado.
        // O sistema deve ATUALIZAR o registro do app_users para trocar o ID antigo pelo novo ID do Auth?
        // Ou buscar pelo email e atualizar o ID?
        // RLS permite UPDATE se o email bater? Não, RLS é por ID.
        
        // Abordagem Simplificada para Convite:
        // O Admin NÃO cria o registro em app_users.
        // O Admin adiciona o email numa tabela `allowed_emails` (ou `invites`).
        // O RLS de `app_users` permite INSERT se o email estiver em `allowed_emails`.
        // Como não temos tabela `invites` ainda, vamos assumir que se `public_registration` for false,
        // NINGUÉM pode se registrar sozinho. O Admin tem que habilitar temporariamente.
        // O usuário pediu: "Root poderá cadastrar outros usuários".
        // O Root vai preencher um formulário. O sistema vai criar o usuário.
        // Como? Usando uma Edge Function seria o ideal.
        // Sem Edge Function: O Root habilita public_registration -> Cria o usuário (via signUp, o que desloga o Root) -> Loga de volta -> Desabilita.
        // Isso é ruim de UX.
        
        // Vamos bloquear o registro direto se não for público.
        throw new Error('O cadastro de novos usuários está restrito a convidados. Entre em contato com o administrador.');
    }

    // 1. Cria usuário no Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password: pass,
      options: {
        data: { name }, // Salva nome nos metadados também
        emailRedirectTo: window.location.origin
      }
    });

    if (authError) {
        if (authError.message.includes('rate limit')) {
            throw new Error('Muitas tentativas de registro. Aguarde alguns minutos.');
        }
        if (authError.message === 'Failed to fetch') {
            throw new Error('Erro de conexão (Failed to fetch). O banco de dados pode estar inativo/pausado ou há problemas na sua rede/bloqueador de anúncios.');
        }
        throw new Error(authError.message || 'Erro ao registrar usuário');
    }
    
    if (!authData.user) {
        throw new Error('Erro desconhecido ao registrar.');
    }

    // Se o registro exigir confirmação de email, o session pode ser null
    if (!authData.session) {
        console.log("Registro iniciado, mas requer confirmação de email.");
        throw new Error('Registro iniciado! Verifique seu email para confirmar a conta antes de fazer login.');
    }

    // 2. Cria o perfil na tabela app_users
    const userId = authData.user.id;
    const newUserPayload = {
      id: userId, // Vínculo com Auth
      name,
      email,
      password: '***', 
      data_context_id: userId,
      role: 'user' // Default
    };

    const { data: profile, error: dbError } = await supabase
      .from('app_users')
      .insert(newUserPayload)
      .select()
      .single();

    if (dbError) {
      console.warn("Erro ao criar perfil no registro:", dbError);
      
      // Tenta recuperar o perfil se ele já existir
      const { data: existingProfile } = await supabase
        .from('app_users')
        .select('*')
        .eq('id', userId)
        .single();
        
      if (existingProfile) {
          const user = { ...existingProfile, dataContextId: existingProfile.data_context_id, members: [], role: existingProfile.role || 'user' };
          localStorage.setItem('budget_planner_session_uid', userId);
          localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
          return user;
      }
      
      await supabase.auth.signOut();
      throw new Error('Erro ao criar perfil no banco de dados: ' + dbError.message);
    }

    const user = { ...profile, dataContextId: profile.data_context_id, members: [], role: profile.role || 'user' };
    localStorage.setItem('budget_planner_session_uid', userId);
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    return user;
  },

  // --- ADMIN FUNCTIONS ---
  
  // Verifica se o cadastro público está habilitado
  isPublicRegistrationEnabled: async (): Promise<boolean> => {
      const { data, error } = await supabase
          .from('app_settings')
          .select('value')
          .eq('key', 'public_registration')
          .single();
      
      if (error || !data) return false; // Default false (seguro)
      return data.value === true || data.value === 'true';
  },

  // Alterna o status do cadastro público (Apenas Admin)
  togglePublicRegistration: async (enabled: boolean): Promise<void> => {
      const { error } = await supabase
          .from('app_settings')
          .upsert({ key: 'public_registration', value: enabled });
      
      if (error) throw new Error('Erro ao atualizar configuração: ' + error.message);
  },

  // Verifica se a opção "Marcar como Pago" nas despesas está habilitada
  isExpenseMarkPaidEnabled: async (): Promise<boolean> => {
      const { data, error } = await supabase
          .from('app_settings')
          .select('value')
          .eq('key', 'expense_mark_paid_enabled')
          .single();
      
      if (error || !data) return false; // Default false
      return data.value === true || data.value === 'true';
  },

  // Alterna o status da opção "Marcar como Pago" nas despesas (Apenas Admin)
  toggleExpenseMarkPaid: async (enabled: boolean): Promise<void> => {
      const { error } = await supabase
          .from('app_settings')
          .upsert({ key: 'expense_mark_paid_enabled', value: enabled });
      
      if (error) throw new Error('Erro ao atualizar configuração: ' + error.message);
  },

  // Retorna todos os usuários (Apenas Admin)
  getAllUsers: async (): Promise<User[]> => {
      const { data, error } = await supabase
          .from('app_users')
          .select('*')
          .order('created_at', { ascending: false });
      
      if (error) throw new Error('Erro ao buscar usuários: ' + error.message);
      
      return (data || []).map(u => ({
          ...u,
          dataContextId: u.data_context_id,
          parentId: u.parent_id,
          role: u.role || 'user',
          financialMonthStartDay: u.financial_month_start_day,
          plan: u.plan || 'free',
          subscriptionEndDate: u.subscription_end_date
      }));
  },

  // Admin cria um pré-cadastro (Convite)
  // Nota: Isso cria apenas o registro em app_users. O usuário ainda precisa criar o Auth.
  // O Auth ID não vai bater. Isso é um problema arquitetural do Supabase sem Edge Functions.
  // Solução Alternativa: O Admin cria um "Código de Convite" (tabela invites).
  // O usuário usa esse código no registro.
  // Vamos simplificar: O Admin habilita o cadastro público temporariamente.
  
  // Adicionar Membro (Cria o Auth e o perfil gerenciado pelo pai)
  addMember: async (adminUser: User, name: string, email: string, pass: string, shareData: boolean): Promise<User> => {
    // 1. Instanciar um cliente Supabase secundário em memória para não deslogar o admin
    const tempClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
        }
    });

    // 2. Realizar o signUp do membro
    const { data: signUpData, error: signUpError } = await tempClient.auth.signUp({
        email,
        password: pass,
        options: {
            data: { name: name }
        }
    });

    if (signUpError) {
        throw new Error('Erro ao criar login do membro: ' + signUpError.message);
    }
    
    // O Supabase retorna o usuário criado. Se já existir, ele pode retornar erro ou mock (identities = []),
    // mas se for sucesso, pegamos o ID gerado.
    if (!signUpData.user) {
         throw new Error('Não foi possível obter o ID do membro gerado.');
    }
    
    // Garantir que a sessão temporária seja encerrada para evitar conflitos
    await tempClient.auth.signOut().catch(() => {});

    const newMemberId = signUpData.user.id;
    
    // 3. Inserimos na tabela app_users do Banco usando a conta Primária (Admin logado)
    // A política RLS permitirá isso pois parent_id será o ID do usuário logado.
    const newMemberPayload = {
      id: newMemberId,
      name,
      email,
      password: '***', // O login verdadeiro está protegido no Supabase Auth
      parent_id: adminUser.id,
      data_context_id: shareData ? adminUser.dataContextId : newMemberId
    };

    const { error } = await supabase.from('app_users').insert(newMemberPayload);
    if (error) throw new Error('Erro ao salvar o perfil do membro: ' + error.message);

    // Retorna o admin atualizado
    const { data: members } = await supabase
        .from('app_users')
        .select('*')
        .eq('parent_id', adminUser.id);
    
    // Se o admin for premium, os membros herdam o status
    const effectivePlan = adminUser.plan || 'free';
    const effectiveExpiry = adminUser.subscriptionEndDate;

    const mappedMembers = (members || []).map(m => ({
      ...m,
      dataContextId: m.data_context_id,
      parentId: m.parent_id,
      role: m.role || 'user',
      themeColor: m.theme_color,
      financialMonthStartDay: m.financial_month_start_day,
      plan: effectivePlan,
      subscriptionEndDate: effectiveExpiry
    }));

    const updatedAdmin = { 
        ...adminUser,
        members: mappedMembers 
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

    // Se o usuário alvo for premium, os membros herdam o status
    const effectivePlan = data.plan || 'free';
    const effectiveExpiry = data.subscription_end_date;

    const mappedMembers = (members || []).map(m => ({
      ...m,
      dataContextId: m.data_context_id,
      parentId: m.parent_id,
      role: m.role || 'user',
      themeColor: m.theme_color,
      financialMonthStartDay: m.financial_month_start_day,
      plan: effectivePlan,
      subscriptionEndDate: effectiveExpiry
    }));

    const user: User = {
      ...data,
      dataContextId: data.data_context_id,
      parentId: data.parent_id,
      members: mappedMembers,
      themeColor: data.theme_color,
      financialMonthStartDay: data.financial_month_start_day,
      plan: effectivePlan,
      subscriptionEndDate: effectiveExpiry
    };

    // Se for um membro, garante que o plano seja identico ao do pai (seja Premium ou Free)
    await authService.ensureMemberInheritsPlan(user, data);

    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    return user;
  },

  logout: async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn("Erro ao fazer logout no Supabase (provavelmente já deslogado):", e);
    }
    localStorage.removeItem(CURRENT_USER_KEY);
    // Remove explicitly any supabase auth tokens to prevent refresh token loops
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('sb-') || key.includes('supabase.auth.token')) {
        localStorage.removeItem(key);
      }
    });
  },

  getCurrentUser: (): User | null => {
    try {
      const stored = localStorage.getItem(CURRENT_USER_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      console.error("Erro ao recuperar usuário do localStorage:", e);
      localStorage.removeItem(CURRENT_USER_KEY);
      return null;
    }
  },

  isMasquerading: (): boolean => {
    try {
      const storedUser = authService.getCurrentUser();
      const sessionUid = localStorage.getItem('budget_planner_session_uid');
      if (storedUser && sessionUid) {
          return sessionUid !== storedUser.id;
      }
      return false;
    } catch {
      return false;
    }
  },
  
  // Função para verificar sessão ativa no startup
  checkSession: async (): Promise<User | null> => {
    try {
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        const lowerMsg = error.message.toLowerCase();
        if (lowerMsg.includes("failed to fetch") || lowerMsg.includes("lock broken")) {
           console.warn("Sessão Supabase: Operação silenciosa (offline ou lock)", error.message);
           return authService.getCurrentUser();
        }
        
        console.warn("Erro na sessão Supabase:", error.message);
        // Se o token for inválido, forçamos o logout para limpar o estado
        if (lowerMsg.includes("refresh token") || lowerMsg.includes("invalid claim") || lowerMsg.includes("not found") || lowerMsg.includes("jwt")) {
           await authService.logout().catch(() => {});
        }
        return null;
      }

      const sessionUser = data.session?.user;
      if (sessionUser) {
          // If online and we have a session, let's seamlessly sync the latest profile to capture plan updates/inheritance
          const storedUser = authService.getCurrentUser();
          if (storedUser && navigator.onLine) {
             const { data: profile } = await supabase.from('app_users').select('*').eq('id', sessionUser.id).single();
             if (profile) {
                 const { data: members } = await supabase.from('app_users').select('*').eq('parent_id', profile.id);
                 
                 let effectivePlan = profile.plan || 'free';
                 let effectiveExpiry = profile.subscription_end_date;

                 const mappedMembers = (members || []).map(m => ({
                   ...m,
                   dataContextId: m.data_context_id,
                   parentId: m.parent_id,
                   role: m.role || 'user',
                   themeColor: m.theme_color,
                   financialMonthStartDay: m.financial_month_start_day,
                   plan: effectivePlan,
                   subscriptionEndDate: effectiveExpiry
                 }));

                 // Sincroniza plano do pai para os filhos no banco de dados se necessário (RLS permite que o pai atualize filhos)
                 if (!profile.parent_id && members && members.length > 0) {
                     const needsSync = members.some(m => m.plan !== effectivePlan || m.subscription_end_date !== effectiveExpiry);
                     if (needsSync) {
                         // Roda em background
                         supabase.from('app_users').update({
                             plan: effectivePlan,
                             subscription_end_date: effectiveExpiry
                         }).eq('parent_id', profile.id).then();
                     }
                 }

                 const refreshedUser: User = {
                   ...profile,
                   dataContextId: profile.data_context_id,
                   parentId: profile.parent_id,
                   members: mappedMembers,
                   role: profile.role || 'user',
                   themeColor: profile.theme_color,
                   financialMonthStartDay: profile.financial_month_start_day,
                   plan: effectivePlan,
                   subscriptionEndDate: effectiveExpiry
                 };

                 // Se for um membro, garante que o plano seja identico ao do pai (seja Premium ou Free)
                 // Substitui a chamada direta in-line anterior que falhava com RLS pelo helper isolado
                 await authService.ensureMemberInheritsPlan(refreshedUser, profile);
                 // We keep 'masquerade' properties if they were stored from switchUser.
                 // Wait! If they masqueraded, storedUser.id !== sessionUser.id
                 // If that happens, we shouldn't overwrite the masqueraded user!
                 if (storedUser.id === sessionUser.id) {
                     localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(refreshedUser));
                     return refreshedUser;
                 } else {
                     // They are currently masquerading as someone else, just return the stored user.
                     return storedUser;
                 }
             }
          }
          return authService.getCurrentUser();
      }
      return null;
    } catch (err: any) {
      const errMsg = err?.message?.toLowerCase() || "";
      if (errMsg.includes("failed to fetch") || errMsg.includes("lock broken")) {
         console.warn("Sessão Supabase: Operação silenciosa (offline ou lock)", err.message);
         return authService.getCurrentUser();
      }

      console.error("Erro inesperado ao verificar sessão:", err);
      if (errMsg.includes("refresh token") || errMsg.includes("invalid claim") || errMsg.includes("not found") || errMsg.includes("jwt")) {
         await authService.logout().catch(() => {});
      }
      return null;
    }
  },

  updateUserName: async (userId: string, newName: string): Promise<void> => {
    // Atualiza na tabela app_users
    const { error: dbError } = await supabase
      .from('app_users')
      .update({ name: newName })
      .eq('id', userId);

    if (dbError) throw new Error('Erro ao atualizar nome no banco de dados: ' + dbError.message);

    // Atualiza nos metadados do Supabase Auth
    const { error: authError } = await supabase.auth.updateUser({
      data: { name: newName }
    });

    if (authError) throw new Error('Erro ao atualizar nome na autenticação: ' + authError.message);

    // Atualiza no localStorage
    const currentUser = authService.getCurrentUser();
    if (currentUser && currentUser.id === userId) {
      currentUser.name = newName;
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(currentUser));
    }
  },

  updateUserThemeColor: async (userId: string, themeColor: string): Promise<void> => {
    const { error: dbError } = await supabase
      .from('app_users')
      .update({ theme_color: themeColor })
      .eq('id', userId);

    if (dbError) throw new Error('Erro ao atualizar cor do tema: ' + dbError.message);

    // Atualiza no localStorage
    const currentUser = authService.getCurrentUser();
    if (currentUser) {
      if (currentUser.id === userId) {
        currentUser.themeColor = themeColor as any;
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(currentUser));
      } else if (currentUser.members) {
        const memberIndex = currentUser.members.findIndex(m => m.id === userId);
        if (memberIndex !== -1) {
          currentUser.members[memberIndex].themeColor = themeColor as any;
          localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(currentUser));
        }
      }
    }
  },

  updateUserFinancialMonthStartDay: async (userId: string, startDay: number): Promise<void> => {
    const { error: dbError } = await supabase
      .from('app_users')
      .update({ financial_month_start_day: startDay })
      .eq('id', userId);

    if (dbError) throw new Error('Erro ao atualizar dia de início do mês financeiro: ' + dbError.message);

    // Atualiza no localStorage
    const currentUser = authService.getCurrentUser();
    if (currentUser) {
      if (currentUser.id === userId) {
        currentUser.financialMonthStartDay = startDay;
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(currentUser));
      } else if (currentUser.members) {
        const memberIndex = currentUser.members.findIndex(m => m.id === userId);
        if (memberIndex !== -1) {
          currentUser.members[memberIndex].financialMonthStartDay = startDay;
          localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(currentUser));
        }
      }
    }
  },

  updateUserPassword: async (userId: string, newPassword: string): Promise<void> => {
    // Apenas atualiza a senha no Supabase Auth.
    // O Supabase Auth já sabe qual é o usuário logado através da sessão atual.
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) throw new Error('Erro ao atualizar senha: ' + error.message);
  },

  resetPassword: async (email: string): Promise<void> => {
    // Removemos redirectTo para evitar que URLs não autorizadas de containers efêmeros (AI Studio)
    // façam a API de email droppar o request silenciosamente na borda do provedor de email.
    // Usaremos a URL principal cadastrada no painel deles como âncora.
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw new Error('Erro ao enviar email de redefinição: ' + error.message);
  },

  adminResetUserPassword: async (userId: string, newPassword: string): Promise<void> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Sessão expirada. Faça login novamente.');

    const response = await fetch('/api/admin/reset-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ userId, newPassword })
    });

    if (!response.ok) {
      let errorMessage = 'Erro ao redefinir senha do usuário.';
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch (e) {
        // Se não for JSON, logamos o status e usamos a mensagem padrão
        console.error(`Erro na API (${response.status}): Resposta não é um JSON válido.`);
      }
      throw new Error(errorMessage);
    }
  },

  adminMigrateData: async (sourceId: string, targetId: string): Promise<void> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Sessão expirada. Faça login novamente.');

    const response = await fetch('/api/admin/migrate-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ sourceId, targetId })
    });

    if (!response.ok) {
      let errorMessage = 'Erro ao transferir dados.';
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch (e) {
        console.error(`Erro na API (${response.status}): Resposta não é um JSON válido.`);
      }
      throw new Error(errorMessage);
    }
  },

  deleteMember: async (memberId: string): Promise<void> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Sessão expirada. Faça login novamente.');

    const response = await fetch(`/api/members/${memberId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      }
    });

    if (!response.ok) {
      let errorMessage = 'Erro ao excluir membro.';
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch (e) {
        console.error(`Erro na API (${response.status}): Resposta não é um JSON válido.`);
      }
      throw new Error(errorMessage);
    }
  }
};

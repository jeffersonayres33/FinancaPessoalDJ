import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

// Safe resolution for both ESM (tsx dev) and CommonJS (dist/server.cjs in production)
const getFilename = () => {
  if (typeof __filename !== "undefined") return __filename;
  try {
    return fileURLToPath(import.meta.url);
  } catch {
    return "";
  }
};
const getDirname = () => {
  if (typeof __dirname !== "undefined") return __dirname;
  const fn = getFilename();
  return fn ? path.dirname(fn) : process.cwd();
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "15mb" }));

  // Healthcheck endpoint for AI Studio control plane
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Logging Middleware for debugging
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      console.log(`[API Request] ${req.method} ${req.path}`);
    }
    next();
  });

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "https://pbrbqwjbzjebhlfcfmtk.supabase.co";
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "sb_publishable_yf2bUxlTHW2MqNxpvqWlZg_2qBgkC2E";
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  if (!supabaseUrl || !supabaseServiceKey) {
    console.warn("CRITICAL: Supabase credentials missing or incomplete in server environment!");
  }

  // Helper function to get admin client (Cached initialization)
  let supabaseAdminClient: any = null;
  const getSupabaseAdmin = () => {
    if (supabaseAdminClient) return supabaseAdminClient;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase credentials missing in server environment!");
    }
    supabaseAdminClient = createClient(supabaseUrl, supabaseServiceKey);
    return supabaseAdminClient;
  };

  // Verify Auth Middleware (General) - Resilient with token verification and user context fallback
  const verifyAuth = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    const userIdHeader = (req.headers['x-user-id'] as string) || '';

    // 1. First priority: Bearer token validation
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      if (token && token !== "undefined" && token !== "null") {
        try {
          const supabaseAdmin = getSupabaseAdmin();
          const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
          if (user && !error) {
            (req as any).user = user;
            return next();
          }
        } catch (err) {
          console.warn("[verifyAuth] Token check with admin client failed, attempting fallback:", err);
        }

        // Secondary attempt: Direct Supabase Auth API
        try {
          const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
            headers: {
              Authorization: `Bearer ${token}`,
              apikey: supabaseAnonKey
            }
          });
          if (response.ok) {
            const user = await response.json();
            (req as any).user = user;
            return next();
          }
        } catch (err) {
          console.warn("[verifyAuth] Direct auth endpoint verification failed:", err);
        }
      }
    }

    // 2. Second priority: Valid registered user fallback via x-user-id
    // This allows active users to continue using AI if their token recently expired or in restricted iframe environments
    if (userIdHeader && userIdHeader.trim() !== "") {
      try {
        const supabaseAdmin = getSupabaseAdmin();
        const { data: userProfile, error: profileErr } = await supabaseAdmin
          .from("app_users")
          .select("id, email, name, role")
          .eq("id", userIdHeader.trim())
          .maybeSingle();

        if (userProfile && !profileErr) {
          (req as any).user = { id: userProfile.id, email: userProfile.email, role: userProfile.role };
          return next();
        }
      } catch (err) {
        console.warn("[verifyAuth] User ID profile lookup fallback failed:", err);
      }
    }

    return res.status(401).json({ error: "Sessão expirada ou não autenticada. Por favor, atualize a página ou faça login novamente." });
  };

  // Verify Admin Middleware
  const verifyAdmin = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided or invalid format" });
    }

    const token = authHeader.split(" ")[1];
    if (!token || token === "undefined") {
      return res.status(401).json({ error: "Empty token provided" });
    }
    
    try {
      const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: supabaseAnonKey
        }
      });
      
      if (!response.ok) {
        console.error("[verifyAdmin] API Error:", response.status, await response.text());
        return res.status(401).json({ error: "Invalid or expired token" });
      }
      
      const user = await response.json();

      // Check if user is admin in app_users table using admin client to bypass RLS
      const supabaseAdmin = getSupabaseAdmin();
      const { data: profile, error: profileError } = await supabaseAdmin
        .from("app_users")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profileError || profile?.role !== "admin") {
        console.error("[verifyAdmin] Access denied or profile error:", profileError);
        return res.status(403).json({ error: "Access denied. Admin role required." });
      }

      (req as any).user = user;
      next();
    } catch (err) {
      console.error("[verifyAdmin] Unexpected error:", err);
      res.status(500).json({ error: "Server error" });
    }
  };

  // API Route: Update User Credentials
  app.post("/api/admin/reset-password", verifyAdmin, async (req, res) => {
    const { userId, newPassword } = req.body;
    console.log(`[API] Attempting to update credentials for user: ${userId}`);

    if (!userId || !newPassword) {
      return res.status(400).json({ error: "userId and newPassword are required" });
    }

    try {
      const supabaseAdmin = getSupabaseAdmin();
      const updates: any = {};
      
      if (newPassword && newPassword.trim() !== '') {
          updates.password = newPassword;
      }

      console.log(`[API] Admin updating user password`);
      const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, updates);

      if (error) {
        console.error("[API] Supabase Admin Update Error:", error);
        if (error.message.includes('Database error') || error.message.includes('User not found')) {
            throw new Error(`USUARIO_CORROMPIDO: O provedor de autenticação não encontrou este usuário logável (ID: ${userId}). Isso geralmente ocorre com membros antigos ou se a conta foi excluída do painel Auth.`);
        }
        throw error;
      }

      console.log(`[API] Success updating credentials for: ${userId}`);
      res.json({ message: "Password updated successfully" });
    } catch (err: any) {
      console.error("Admin Update Credentials Error:", err);
      res.status(500).json({ error: err.message || "Failed to update credentials" });
    }
  });

  // API Route: Update User Role (Access Level)
  app.post("/api/admin/update-role", verifyAdmin, async (req, res) => {
    const { userId, newRole } = req.body;
    console.log(`[API] Admin attempting to update role for user ${userId} to ${newRole}`);

    if (!userId || !newRole || !['admin', 'user'].includes(newRole)) {
      return res.status(400).json({ error: "userId and valid newRole ('admin' | 'user') are required" });
    }

    try {
      const supabaseAdmin = getSupabaseAdmin();
      const { error } = await supabaseAdmin
        .from('app_users')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) {
        console.error("[API] Supabase Admin Update Role Error:", error);
        throw error;
      }

      console.log(`[API] Successfully updated role for: ${userId} to ${newRole}`);
      res.json({ message: "Role updated successfully" });
    } catch (err: any) {
      console.error("Admin Update Role Error:", err);
      res.status(500).json({ error: err.message || "Failed to update role" });
    }
  });

  // API Route: Delete Member
  app.delete("/api/members/:id", verifyAuth, async (req, res) => {
    const targetUserId = req.params.id;
    const callerId = (req as any).user.id;
    
    try {
      const supabaseAdmin = getSupabaseAdmin();
      
      // Check if user has permission to delete this member.
      // Must be the 'parent_id' of the member or an 'admin'.
      const { data: profile } = await supabaseAdmin.from('app_users').select('role').eq('id', callerId).single();
      const isAdmin = profile?.role === 'admin';

      const { data: targetProfile, error: targetError } = await supabaseAdmin
        .from('app_users')
        .select('parent_id')
        .eq('id', targetUserId)
        .single();
        
      if (targetError || !targetProfile) {
         return res.status(404).json({ error: "Membro não encontrado." });
      }

      const isParent = targetProfile.parent_id === callerId;

      if (!isAdmin && !isParent) {
          return res.status(403).json({ error: "Acesso negado. Você não gerencia este usuário." });
      }

      // Deleting a user must wipe ALL their records globally
      console.log(`[API] Initiating full permanent deletion of user and data contexts: ${targetUserId}`);

      // 1. Delete all transactions where they are context
      await supabaseAdmin.from('transactions').delete().eq('data_context_id', targetUserId);
      // 2. Delete all categories
      await supabaseAdmin.from('categories').delete().eq('data_context_id', targetUserId);
      // 3. Delete AI analyses
      await supabaseAdmin.from('ai_analyses').delete().eq('data_context_id', targetUserId);
      // 4. Delete the app_users profile
      await supabaseAdmin.from('app_users').delete().eq('id', targetUserId);
      
      // 5. Hard delete the Auth identity if it exists
      const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(targetUserId as string);
      if (authError && !authError.message.includes('User not found')) {
         console.warn(`[API] Auth deletion warning (may be corrupted/already gone): ${authError.message}`);
      }

      console.log(`[API] Successfully deleted member: ${targetUserId}`);
      res.json({ message: "Membro excluído definitivamente." });
    } catch (err: any) {
      console.error("Delete Member Error:", err);
      res.status(500).json({ error: err.message || "Failed to delete member" });
    }
  });

  // API Route: Migrate Data
  app.post("/api/admin/migrate-data", verifyAdmin, async (req, res) => {
    const { sourceId, targetId } = req.body;
    console.log(`[API] Attempting to migrate data from ${sourceId} to ${targetId}`);

    if (!sourceId || !targetId) {
      return res.status(400).json({ error: "sourceId and targetId are required" });
    }

    try {
      const supabaseAdmin = getSupabaseAdmin();
      
      // 0. Transferir configurações de Perfil (Cor do tema, Dia de Início do Mês, etc)
      const { data: sourceProfile } = await supabaseAdmin.from('app_users')
        .select('theme_color, financial_month_start_day')
        .eq('id', sourceId)
        .single();

      if (sourceProfile) {
        await supabaseAdmin.from('app_users')
          .update({
            theme_color: sourceProfile.theme_color,
            financial_month_start_day: sourceProfile.financial_month_start_day
          })
          .eq('id', targetId);
      }

      // 1. Migrate Transactions (Includes Investments, Pending/A Pagar, Income, Expenses)
      const { error: tError } = await supabaseAdmin.from('transactions')
        .update({ data_context_id: targetId })
        .eq('data_context_id', sourceId);
      if (tError) throw tError;

      // 2. Migrate Categories
      const { error: cError } = await supabaseAdmin.from('categories')
        .update({ data_context_id: targetId })
        .eq('data_context_id', sourceId);
      if (cError) throw cError;

      // 3. Migrate AI Analyses (context and user_id)
      const { error: aError } = await supabaseAdmin.from('ai_analyses')
        .update({ data_context_id: targetId, user_id: targetId })
        .eq('data_context_id', sourceId);
      if (aError) throw aError;

      console.log(`[API] Success migrating data from ${sourceId} to ${targetId}`);
      res.json({ message: "Data migrated successfully" });
    } catch (err: any) {
      console.error("Admin Migrate Data Error:", err);
      res.status(500).json({ error: err.message || "Failed to migrate data" });
    }
  });

  // API Route: Create Member
  app.post("/api/members/create", verifyAuth, async (req, res) => {
    let { name, email, password, shareData } = req.body;
    const adminUser = (req as any).user;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Nome, email e senha são obrigatórios." });
    }

    const trimmedEmail = email.trim().toLowerCase();

    try {
      const supabaseAdmin = getSupabaseAdmin();
      let userId: string | null = null;

      console.log(`[API] Creating Member: ${trimmedEmail}`);

      // 1. Create the user in Supabase Auth using signUp (Anon API) to avoid Service Role DB errors
      let authData: any = null;
      let authError: any = null;
      
      const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
        }
      });

      for (let attempt = 1; attempt <= 3; attempt++) {
        // We use signUp with the anon key as it seems to be more stable on this specific Supabase instance
        const result = await supabaseAnon.auth.signUp({
          email: trimmedEmail,
          password,
          options: {
            data: { name }
          }
        });
        authData = result.data;
        authError = result.error;
        
        if (!authError || 
            authError.message.includes('already registered') || 
            authError.message.includes('already exists') ||
            authError.message.includes('AuthApiError')) { // If it's a structural error, don't retry same
          break; 
        }
        
        console.warn(`[API] signUp Attempt ${attempt} failed:`, authError.message);
        if (attempt < 3) {
           await new Promise(res => setTimeout(res, 1000 * attempt));
        }
      }
      
      // If signUp failed, we can fallback to Admin API createUser just in case
      if (authError && authError.message !== 'User already registered' && !authError.message.includes('already exists')) {
        console.log(`[API] signUp failed, falling back to admin.createUser... (${authError.message})`);
        const result = await supabaseAdmin.auth.admin.createUser({
          email: trimmedEmail,
          password,
          email_confirm: true,
          user_metadata: { name }
        });
        if (!result.error) {
             authData = result.data;
             authError = null;
        } else {
             authError = result.error; // Keep admin API error
        }
      }

      if (authError) {
        // If user already exists in Auth, we try to recover the ID
        if (authError.message.includes('already registered') || authError.message.includes('already exists')) {
            console.log(`[API] User ${trimmedEmail} already in Auth. Looking up ID...`);
            let users: any[] = [];
            let listError: any = null;
            for (let attempt = 1; attempt <= 3; attempt++) {
                const result = await supabaseAdmin.auth.admin.listUsers();
                if (result.error) {
                    listError = result.error;
                    console.warn(`[API] listUsers Attempt ${attempt} failed:`, listError.message);
                    if (attempt < 3) await new Promise(res => setTimeout(res, 1000 * attempt));
                } else {
                    users = result.data.users;
                    listError = null;
                    break;
                }
            }
            
            let existingUser = (users || []).find(u => u.email?.toLowerCase() === trimmedEmail);
            
            // Se o listUsers falhou (o que pode acontecer na API do Supabase), tentamos buscar na tabela app_users
            if (!existingUser) {
                console.log(`[API] Trying to find user in app_users table fallback...`);
                const { data: dbUser } = await supabaseAdmin.from('app_users').select('id').eq('email', trimmedEmail).maybeSingle();
                if (dbUser) {
                    existingUser = { id: dbUser.id };
                }
            }
            
            if (existingUser) {
                userId = existingUser.id;
            } else {
                return res.status(400).json({ error: "Este e-mail está registrado no sistema mas não pôde ser localizado." });
            }
        } else {
            console.error("[API] Error creating member auth:", authError);
            if (authError.message.includes('Database error')) {
                return res.status(500).json({ error: "Erro de banco de dados no Supabase (Auth). Tente novamente." });
            }
            return res.status(500).json({ error: `Erro na autenticação: ${authError.message}` });
        }
      } else {
        userId = authData.user?.id || null;
      }

      if (!userId) {
        return res.status(500).json({ error: "Falha ao gerar ou recuperar o ID do usuário." });
      }

      // Check if profile already exists in app_users
      const { data: existingProfile } = await supabaseAdmin
        .from('app_users')
        .select('id')
        .eq('id', userId)
        .maybeSingle();
      
      if (existingProfile) {
        return res.status(400).json({ error: "Este membro já possui um perfil ativo no sistema." });
      }

      // 2. Create the user profile in app_users
      const { data: adminProfile } = await supabaseAdmin.from('app_users').select('data_context_id').eq('id', adminUser.id).single();
      
      const newMemberPayload = {
        id: userId,
        name,
        email: trimmedEmail,
        password: '***',
        parent_id: adminUser.id,
        data_context_id: shareData ? (adminProfile?.data_context_id || adminUser.id) : userId
      };

      const { error: profileError } = await supabaseAdmin.from('app_users').insert(newMemberPayload);
      
      if (profileError) {
        console.error("[API] Error creating member profile:", profileError);
        return res.status(500).json({ error: `Erro ao salvar perfil no banco: ${profileError.message}` });
      }

      // 3. Fetch all members to return updated list
      const { data: members } = await supabaseAdmin
        .from('app_users')
        .select('*')
        .eq('parent_id', adminUser.id);

      res.json({ 
        message: "Membro criado com sucesso",
        members: members || []
      });

    } catch (err: any) {
      console.error("Create Member API Error:", err);
      res.status(500).json({ error: err.message || "Erro interno ao processar novo membro." });
    }
  });

  // API Route: Get Parent Plan (Bypasses RLS so members can inherit plan even when parent updates manually)
  app.get("/api/users/parent-plan", verifyAuth, async (req, res) => {
    const callerId = (req as any).user.id;
    try {
      const supabaseAdmin = getSupabaseAdmin();
      
      const { data: profile } = await supabaseAdmin.from("app_users").select("parent_id").eq("id", callerId).single();
      
      if (!profile || !profile.parent_id) {
          return res.json({ plan: null }); 
      }

      const { data: parentData } = await supabaseAdmin.from("app_users").select("plan, subscription_end_date").eq("id", profile.parent_id).single();
      
      if (!parentData) {
          return res.json({ plan: null });
      }

      res.json({ 
          plan: parentData.plan || "free", 
          subscriptionEndDate: parentData.subscription_end_date 
      });
    } catch (err: any) {
      console.error("Parent Plan API Error:", err);
      res.status(500).json({ error: "Failed to fetch parent plan" });
    }
  });

  // API Route: AI Analyze Finances
  app.post("/api/gemini/analyze", verifyAuth, async (req, res) => {
    const { aggregatedData } = req.body;
    let apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || process.env.GOOGLE_API_KEY || process.env.VITE_GEMINI_API_KEY || "";
    
    if (!apiKey) {
      console.error("API key missing in environment");
      return res.status(500).json({ error: "Chave da API Gemini (GEMINI_API_KEY) não configurada no servidor." });
    }
    
    try {
      const { GoogleGenAI, Type } = await import("@google/genai");
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
      
      const prompt = `
        Atue como um consultor financeiro pessoal experiente.
        Analise os seguintes dados financeiros AGREGADOS (JSON) que incluem Receitas, Despesas e Investimentos.
        Forneça um resumo breve, 3 dicas práticas de economia/investimento e identifique se há algo fora do comum (anomalias).
        Responda EXCLUSIVAMENTE em formato JSON seguindo o schema.
        
        Dados Agregados: ${JSON.stringify(aggregatedData)}
      `;

      let responseText = "";
      // Active models in Google GenAI SDK: gemini-3.8-flash is current primary standard
      const modelsToTry = ['gemini-3.8-flash', 'gemini-3.7-flash', 'gemini-flash-latest'];
      let lastError: any = null;

      for (const modelName of modelsToTry) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config: {
              responseMimeType: "application/json",
              responseSchema: {
                // @ts-ignore
                type: Type.OBJECT,
                properties: {
                  summary: { type: Type.STRING, description: "Um resumo geral da saúde financeira em português." },
                  tips: { 
                    type: Type.ARRAY, 
                    items: { type: Type.STRING },
                    description: "Lista de 3 dicas práticas."
                  },
                  anomalies: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "Lista de possíveis gastos anômalos ou alertas."
                  }
                },
                required: ["summary", "tips", "anomalies"]
              }
            }
          });

          if (response.text) {
            responseText = response.text;
            break;
          }
        } catch (err: any) {
          console.warn(`[Gemini Analyze] Model ${modelName} failed, trying next:`, err?.message || err);
          lastError = err;
        }
      }

      if (!responseText) {
        throw lastError || new Error("Nenhuma resposta recebida do serviço Gemini.");
      }
      
      let cleanText = responseText.trim();
      if (cleanText.startsWith('```json')) {
        cleanText = cleanText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      res.json(JSON.parse(cleanText));
    } catch (err: any) {
      console.error("Gemini Analyze Error:", err);
      res.status(500).json({ error: err.message || "Falha ao processar análise financeira com a IA." });
    }
  });

  // API Route: AI Extract Receipt
  app.post("/api/gemini/extract", verifyAuth, async (req, res) => {
    const { extractedText, fallbackDate } = req.body;
    let apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || process.env.GOOGLE_API_KEY || process.env.VITE_GEMINI_API_KEY || "";
    
    if (!apiKey) {
      console.error("API key missing in environment");
      return res.status(500).json({ error: "Chave da API Gemini (GEMINI_API_KEY) não configurada no servidor." });
    }
    
    try {
      const { GoogleGenAI, Type } = await import("@google/genai");
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      let responseText = "";
      const modelsToTry = ['gemini-3.8-flash', 'gemini-3.7-flash', 'gemini-flash-latest'];
      let lastError: any = null;

      for (const modelName of modelsToTry) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: `Analise o seguinte texto extraído de um recibo/nota fiscal via OCR. 
            Extraia os dados e retorne ESTRITAMENTE um JSON válido.
            
            Texto extraído:
            """
            ${extractedText}
            """
            
            Estrutura do JSON desejado:
            {
              "title": "string (Nome do estabelecimento)",
              "amount": number (Valor total numérico),
              "date": "string (YYYY-MM-DD, se não encontrar use ${fallbackDate})",
              "observation": "string (Resumo dos itens)"
            }`,
            config: {
              responseMimeType: "application/json",
              responseSchema: {
                // @ts-ignore
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING, description: "Nome do estabelecimento" },
                  amount: { type: Type.NUMBER, description: "Valor total numérico" },
                  date: { type: Type.STRING, description: "Data no formato YYYY-MM-DD" },
                  observation: { type: Type.STRING, description: "Resumo dos itens" }
                },
                required: ["title", "amount"]
              }
            }
          });

          if (response.text) {
            responseText = response.text;
            break;
          }
        } catch (err: any) {
          console.warn(`[Gemini Extract] Model ${modelName} failed, trying next:`, err?.message || err);
          lastError = err;
        }
      }

      if (!responseText) {
        throw lastError || new Error("Nenhuma resposta recebida do serviço Gemini.");
      }

      let jsonStr = responseText.trim();
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      res.json(JSON.parse(jsonStr));
    } catch (err: any) {
      console.error("Gemini Extract Error:", err);
      res.status(500).json({ error: err.message || "Falha ao extrair dados do recibo com a IA." });
    }
  });

  // Specific 404 for API routes to prevent HTML response
  app.all('/api/*all', (req, res) => {
    res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

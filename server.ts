import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

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

  const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || "";
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  if (!supabaseUrl || !supabaseServiceKey) {
    console.warn("CRITICAL: Supabase credentials missing in server environment!");
  }

  // Helper function to get admin client (Lazy initialization)
  const getSupabaseAdmin = () => {
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase credentials missing in server environment!");
    }
    return createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  };

  // Verify Admin Middleware
  const verifyAdmin = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      console.error("[Auth] No token provided");
      return res.status(401).json({ error: "No token provided" });
    }

    if (!supabaseUrl || !supabaseAnonKey) {
       console.error("[Auth] Supabase URL or Anon Key missing");
       return res.status(500).json({ error: "Server configuration error" });
    }

    const token = authHeader.split(" ")[1];
    const client = createClient(supabaseUrl, supabaseAnonKey);
    
    try {
      const { data: { user }, error } = await client.auth.getUser(token);
      if (error || !user) {
        console.error("[Auth] Invalid token", error);
        return res.status(401).json({ error: "Invalid token" });
      }

      // Check if user is admin in app_users table using admin client to bypass RLS
      const supabaseAdmin = getSupabaseAdmin();
      const { data: profile, error: profileError } = await supabaseAdmin
        .from("app_users")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profileError || profile?.role !== "admin") {
        console.error("[Auth] Access denied or profile error", profileError);
        return res.status(403).json({ error: "Access denied. Admin role required." });
      }

      next();
    } catch (err) {
      console.error("[Auth] Server error in middleware", err);
      res.status(500).json({ error: "Server error" });
    }
  };

  // API Route: Reset User Password
  app.post("/api/admin/reset-password", verifyAdmin, async (req, res) => {
    const { userId, newPassword } = req.body;
    console.log(`[API] Attempting to reset password for user: ${userId}`);

    if (!userId || !newPassword) {
      return res.status(400).json({ error: "userId and newPassword are required" });
    }

    try {
      const supabaseAdmin = getSupabaseAdmin();
      const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: newPassword
      });

      if (error) {
        if (error.message.includes('Database error') || error.message.includes('User not found')) {
            throw new Error(`USUARIO_CORROMPIDO: O provedor de autenticação não encontrou este usuário logável (ID: ${userId}). Isso geralmente ocorre com membros antigos ou se a conta foi excluída do painel Auth.`);
        }
        throw error;
      }

      console.log(`[API] Success resetting password for: ${userId}`);
      res.json({ message: "Password updated successfully" });
    } catch (err: any) {
      console.error("Admin Reset Password Error:", err);
      res.status(500).json({ error: err.message || "Failed to update password" });
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

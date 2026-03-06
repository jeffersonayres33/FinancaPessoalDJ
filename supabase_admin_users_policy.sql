-- Permitir que Admins visualizem TODOS os usuários
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.app_users;

CREATE POLICY "Admins can view all profiles"
  ON public.app_users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.app_users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

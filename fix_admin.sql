-- Este script debe ejecutarse en el Editor SQL del panel de Supabase
-- Ya que inserciones a user_roles están bloqueadas por RLS para anónimos.

-- 1. Buscamos el ID del usuario
DO $$
DECLARE
    u_id UUID;
BEGIN
    SELECT id INTO u_id FROM auth.users WHERE email = 'sebastian689@gmail.com';
    
    -- 2. Aseguramos que sea admin
    IF u_id IS NOT NULL THEN
        INSERT INTO public.user_roles (user_id, role)
        VALUES (u_id, 'admin')
        ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
END $$;

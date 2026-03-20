-- Ejecuta este script UNA ÚNICA VEZ en el SQL Editor de tu Supabase.
-- Este script crea una función segura que permite al CMS crear usuarios y asignarles
-- rol de administrador automáticamente, saltándose la restricción de "Signups disabled".

CREATE OR REPLACE FUNCTION public.create_admin_from_cms(
  admin_email text,
  admin_password text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  new_user_id uuid;
BEGIN
  -- Verificar si el usuario ya existe en Supabase Auth
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = admin_email) THEN
    RETURN 'Error: El correo electrónico ya está en uso.';
  END IF;

  -- Generar UUID nuevo y seguro
  new_user_id := gen_random_uuid();

  -- 1. Insertar forzosamente en auth.users (Bypass de restricción pública)
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    new_user_id,
    'authenticated',
    'authenticated',
    admin_email,
    extensions.crypt(admin_password, extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

  -- 2. Insertar identidad obligatoria en Supabase para permitir que inicie sesión
  INSERT INTO auth.identities (
    id,
    user_id,
    provider_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    new_user_id,
    new_user_id::text,
    format('{"sub":"%s","email":"%s"}', new_user_id::text, admin_email)::jsonb,
    'email',
    now(),
    now(),
    now()
  );

  -- 3. Asignar rol de administrador en nuestra tabla user_roles automáticamente
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new_user_id, 'admin');

  RETURN 'SUCCESS';
END;
$$;

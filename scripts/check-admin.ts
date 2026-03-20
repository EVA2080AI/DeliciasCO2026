import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://sqshrqbopwmxkfkvmmtd.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxc2hycWJvcHdteGtma3ZtbXRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1MjAyNzQsImV4cCI6MjA4OTA5NjI3NH0.WmSmt-FA_bFGjWUCF9Uf_Idr41Ur_I8wQdIFazcxPvA'
const supabase = createClient(supabaseUrl, supabaseKey)

async function check() {
  console.log('Attempting to sign up admin@delicias.com / 123456...')
  const { data, error } = await supabase.auth.signUp({
    email: 'admin@delicias.com',
    password: '123456'
  })
  console.log('Sign up result:', data?.user?.email ? 'Success' : 'No user')
  if (error) console.log('Sign up error:', error)
}
check()

import { createClient } from '@/lib/supabase/client';

export async function signOut() {
  const { error } = await createClient().auth.signOut();
  if (error) throw error;
  document.cookie = 'innov8it_auth_user=; path=/; max-age=0; SameSite=Lax';
  localStorage.removeItem('innov8it_current_user');
  sessionStorage.removeItem('innov8it_auto_synced');
  window.location.replace('/login');
}

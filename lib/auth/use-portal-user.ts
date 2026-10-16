'use client';

import { useEffect, useState } from 'react';
import { getCurrentUser } from '@/app/(auth)/actions';
import { createClient } from '@/lib/supabase/client';
import type { AuthUser } from '@/types/auth';

/** UI identity comes from a verified session and the server-managed profile. */
export function usePortalUser() {
  const [user, setUser] = useState<AuthUser | null>(null);
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const loadUser = async () => {
      try {
        const current = await getCurrentUser();
        if (active) setUser(current);
      } catch {
        if (active) setUser(null);
      }
    };
    void loadUser();
    const { data: { subscription } } = createClient().auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        window.location.replace('/login');
        return;
      }
      // Avoid awaiting Supabase calls inside its auth-state lock.
      clearTimeout(timer);
      timer = setTimeout(() => { void loadUser(); }, 0);
    });
    return () => {
      active = false;
      clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, []);
  return user;
}

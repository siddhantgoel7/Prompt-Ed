'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { signOut } from '@/lib/supabase/auth';

import { User } from '@supabase/supabase-js';

export function useAccount() {
  const router = useRouter();
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [loggingOut, setLoggingOut] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);

  React.useEffect(() => {
    async function loadUser() {
      const supabase = createClient();
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error || !user) {
        router.push('/login_instructor');
        return;
      }

      setUser(user);
      setLoading(false);
    }

    loadUser();
  }, [router]);

  const handleLogout = async () => {
    setLoggingOut(true);
    const { error } = await signOut();
    if (error) {
      setError(error.message);
      setLoggingOut(false);
      return;
    }
    router.push('/');
    router.refresh();
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    setError(null);

    try {
      const response = await fetch('/api/user/delete', {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete account');
      }

      // Deletion successful, redirect (user will be logged out by API route too but better safe)
      router.push('/');
      router.refresh();
    } catch (err: unknown) {
      console.error('Delete account error:', err);
      const message = err instanceof Error ? err.message : 'Failed to delete account';
      setError(message);
      setDeleting(false);
    }
  };

  return {
    user,
    loading,
    loggingOut,
    deleting,
    error,
    showDeleteConfirm,
    setShowDeleteConfirm,
    handleLogout,
    handleDeleteAccount,
  };
}

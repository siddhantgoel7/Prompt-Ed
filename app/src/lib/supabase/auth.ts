'use client';

import { createClient } from './client';

export async function signUpWithEmail(email: string, password: string, fullName: string) {
  const supabase = createClient();
  
  // Replace with sign up logic here
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  });

  return { data, error };
}

export async function signInWithEmail(email: string, password: string) {
  const supabase = createClient();
  
  // Replace with sign in logic here
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  return { data, error };
}

export async function signInWithGoogle() {
  const supabase = createClient();
  
  // Replace with OAuth logic here
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/api/auth/callback`, // ← Changed to API route
    },
  });

  return { data, error };
}

export async function signOut() {
  const supabase = createClient();
  
  // Replace with sign out logic here
  const { error } = await supabase.auth.signOut();

  return { error };
}
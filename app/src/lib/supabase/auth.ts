// Client-side Supabase auth helpers for email/password and Google OAuth flows.
// All functions run in the browser and use the browser Supabase client.
'use client';

import { createClient } from './client';

/** Registers a new instructor account and sends a confirmation email. */
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

/** Signs in an existing instructor with email and password. */
export async function signInWithEmail(email: string, password: string) {
  const supabase = createClient();
  
  // Replace with sign in logic here
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  return { data, error };
}

/** Initiates Google OAuth sign-in and redirects to the auth callback route. */
export async function signInWithGoogle() {
  const supabase = createClient();
  
  // Replace with OAuth logic here
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${globalThis.window.location.origin}/api/auth/callback`, // ← Changed to API route
    },
  });

  return { data, error };
}

/** Signs the current user out and clears the session. */
export async function signOut() {
  const supabase = createClient();
  
  // Replace with sign out logic here
  const { error } = await supabase.auth.signOut();

  return { error };
}
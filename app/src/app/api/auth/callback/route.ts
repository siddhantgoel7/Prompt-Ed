import { createClient } from '@/lib/supabase/server'; // ← Changed from client to server
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const origin = requestUrl.origin;

  if (code) {
    const supabase = await createClient(); // ← Add await
    
    // Replace with code exchange logic here
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (error) {
      console.error('OAuth error:', error);
      return NextResponse.redirect(`${origin}/create_instructor?error=${error.message}`);
    }
  }

  // Replace with redirect logic here
  return NextResponse.redirect(`${origin}/instructor_dashboard`);
}


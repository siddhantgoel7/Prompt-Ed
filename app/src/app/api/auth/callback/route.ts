import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const origin = requestUrl.origin;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('OAuth error:', error);
      return NextResponse.redirect(`${origin}/create_instructor?error=${encodeURIComponent(error.message)}`);
    }

    const { data: { user } } = await supabase.auth.getUser();

    if (!user?.email?.endsWith('@ualberta.ca')) {
      const userId = user?.id;

      await supabase.auth.signOut();

      if (userId) {
        const adminClient = createAdminClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
        await adminClient.auth.admin.deleteUser(userId);
      }

      return NextResponse.redirect(
        `${origin}/create_instructor?error=${encodeURIComponent('You must use a UAlberta email address (@ualberta.ca)')}`
      );
    }
  }

  return NextResponse.redirect(`${origin}/instructor_dashboard`);
}
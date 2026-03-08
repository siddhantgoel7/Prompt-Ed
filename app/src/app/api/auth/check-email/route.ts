// API route for checking whether an email address already has an account.
// Uses the Supabase service-role key to access the admin user list.
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * POST /api/auth/check-email
 * Returns { exists: boolean } indicating whether the given email already has an account.
 */
export async function POST(request: NextRequest) {
  const { email } = await request.json();

  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await adminClient.auth.admin.listUsers();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const existingUser = data.users.find(u => u.email === email);

  return NextResponse.json({ exists: !!existingUser });
}
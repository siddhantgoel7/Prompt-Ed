import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function DELETE() {
  try {
    const supabase = await createClient();

    // 1. Verify user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.id;
    const adminSupabase = await createAdminClient();

    // 2. Storage Cleanup (Manual — not handled by DB cascades)
    // Find all storage paths for files belonging to this user's courses
    const { data: storagePaths } = await adminSupabase
      .from('lesson_files')
      .select('storage_path, lessons!inner(course_id, courses!inner(instructor_id))')
      .eq('lessons.courses.instructor_id', userId);

    if (storagePaths && storagePaths.length > 0) {
      const paths = storagePaths.map(f => f.storage_path).filter(Boolean);
      if (paths.length > 0) {
        await adminSupabase.storage.from('lesson-files').remove(paths);
      }
    }

    // 3. Delete the Auth User
    // This triggers the DB cascade (defined in our migrations) to clean up 
    // all tables (courses, lessons, chunks, transcripts, responses, etc.)
    const { error: deleteAuthError } = await adminSupabase.auth.admin.deleteUser(userId);
    if (deleteAuthError) {
      console.error('Error deleting auth user:', deleteAuthError);
      return NextResponse.json({ error: 'Failed to delete account from auth' }, { status: 500 });
    }

    // 4. Final Cleanup (Sign out on server clears session cookies)
    await supabase.auth.signOut();

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Delete account error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

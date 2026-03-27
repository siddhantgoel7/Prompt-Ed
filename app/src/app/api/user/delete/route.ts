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

    // 2. Delete user's data
    // Delete instructor preferences
    await adminSupabase
      .from('instructor_ai_preferences')
      .delete()
      .eq('user_id', userId);

    // 2. Collect and delete all files from storage for this user's courses
    // Get all storage paths for files in lessons belonging to this user's courses
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

    // 3. Delete user's data (cascading cleanup)
    // First, list courses to delete their lessons (and related data)
    const { data: courses } = await adminSupabase
      .from('courses')
      .select('id')
      .eq('instructor_id', userId);

    if (courses && courses.length > 0) {
      const courseIds = courses.map(c => c.id);
      
      // Delete lessons (which should delete their children if DB cascade is set, but let's be thorough)
      // Get lesson IDs for these courses
      const { data: lessons } = await adminSupabase
        .from('lessons')
        .select('id')
        .in('course_id', courseIds);
      
      if (lessons && lessons.length > 0) {
        const lessonIds = lessons.map(l => l.id);
        
        // Delete responses for all discussions in these lessons
        const { data: discussions } = await adminSupabase
          .from('discussions')
          .select('id')
          .in('lesson_id', lessonIds);
        
        if (discussions && discussions.length > 0) {
          const discIds = discussions.map(d => d.id);
          await adminSupabase.from('responses').delete().in('discussion_id', discIds);
          await adminSupabase.from('discussions').delete().in('id', discIds);
        }

        // Delete other dependent data for all lessons at once
        await adminSupabase.from('general_questions').delete().in('lesson_id', lessonIds);
        await adminSupabase.from('lesson_chunks').delete().in('lesson_id', lessonIds);
        await adminSupabase.from('lesson_files').delete().in('lesson_id', lessonIds);
        await adminSupabase.from('lessons').delete().in('id', lessonIds);
      }
      
      // Delete courses
      await adminSupabase
        .from('courses')
        .delete()
        .in('id', courseIds);
    }

    // 4. Delete the auth user
    const { error: deleteAuthError } = await adminSupabase.auth.admin.deleteUser(userId);
    if (deleteAuthError) {
      console.error('Error deleting auth user:', deleteAuthError);
      return NextResponse.json({ error: 'Failed to delete account from auth' }, { status: 500 });
    }

    // 4. Sign out on the server (clears cookies)
    await supabase.auth.signOut();

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Delete account error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const TEST_PIN = '123456';

export default async function globalSetup() {
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  // 1. Ensure the lesson exists and is active
  let { data: lesson, error } = await supabase
    .from('lessons')
    .select('id, course_id, status, pin_code')
    .eq('pin_code', TEST_PIN)
    .single();

  if (error || !lesson) {
    console.log(`[global-setup] Test lesson ${TEST_PIN} not found. Seeding now...`);
    const { data: users } = await supabase.auth.admin.listUsers();
    
    if (!users || !users.users || users.users.length === 0) {
        console.warn('[global-setup] Cannot seed lesson automatically: No Auth users found. Tests may fail.');
        return;
    }
    const instructorId = users.users[0].id;

    // Grab or create a generic course
    let { data: course } = await supabase.from('courses').select('id').limit(1).single();
    if (!course) {
        const res = await supabase.from('courses').insert([{ title: 'Automated Test Course', instructor_id: instructorId }]).select('id').single();
        course = res.data;
    }

    if (course) {
        const res = await supabase.from('lessons').insert([{ 
            title: '__playwright_test_lesson__', 
            course_id: course.id, 
            pin_code: TEST_PIN,
            status: 'active' 
        }]).select('id, status, pin_code').single();
        lesson = res.data;
    }
  }

  if (lesson) {
    if (lesson.status !== 'active') {
      await supabase.from('lessons').update({ status: 'active', ended_at: null }).eq('id', lesson.id);
      console.log(`[global-setup] Reactivated test lesson (PIN=${TEST_PIN}).`);
    } else {
      console.log(`[global-setup] Test lesson (PIN=${TEST_PIN}) found and active.`);
    }

    // 2. Ensure the active MC discussion exists
    await supabase.from('discussions').update({ status: 'closed' }).eq('lesson_id', lesson.id).eq('status', 'active');
    
    await supabase.from('discussions').insert({
        lesson_id: lesson.id,
        prompt_text: 'What is Playwright testing?',
        prompt_type: 'multiple_choice',
        status: 'active',
        mc_options: [
            { label: 'A', text: 'Browser testing' },
            { label: 'B', text: 'A text editor' },
            { label: 'C', text: 'Some choice C' },
            { label: 'D', text: 'Some choice D' }
        ],
        correct_option: 'A',
        feedback_enabled: true
    });
    console.log(`[global-setup] Seeded active MC discussion successfully.`);
  }
}

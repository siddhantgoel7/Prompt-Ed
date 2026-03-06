import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: course } = await supabase.from('courses').insert({
    id: 'test-course-123',
    title: 'Test Course for UI Tests',
    instructor_id: 'test-instructor',
    date_created: new Date().toISOString()
  }).select().single();

  if (!course) {
    await supabase.from('courses').select('id').eq('id', 'test-course-123').single();
  }

  const { data: lesson } = await supabase.from('lessons').insert({
    id: 'test-lesson-123',
    title: 'Test Lesson for Playwright',
    course_id: 'test-course-123',
    status: 'active',
    pin_code: '123456',
    created_at: new Date().toISOString()
  }).select().single();

  if (!lesson) {
    await supabase.from('lessons').select('id').eq('id', 'test-lesson-123').single();
  }
}
main();

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: lesson, error: lessonError } = await supabase
    .from('lessons')
    .select('id')
    .eq('pin_code', '123456')
    .limit(1)
    .single();

  if (!lesson) {
    console.error("Test lesson 123456 not found. Please seed it first.", lessonError);
    return;
  }

  // Deactivate any existing active discussions
  await supabase
    .from('discussions')
    .update({ status: 'closed' })
    .eq('lesson_id', lesson.id)
    .eq('status', 'active');

  // Insert a new MC discussion
  const { data, error } = await supabase
    .from('discussions')
    .insert({
      lesson_id: lesson.id,
      prompt_text: 'What is Playwright testing?',
      prompt_type: 'multiple_choice',
      status: 'active',
      mc_options: [
        { label: 'A', text: 'Browser testing' },
        { label: 'B', text: 'A text editor' }
      ],
      correct_option: 'A',
      feedback_enabled: true
    })
    .select();

  if (error) console.error(error);
  else console.log("Created active MC discussion:", data[0]?.id);
}
main();

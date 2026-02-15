/**
 * Playwright global setup — verifies that a test lesson with PIN 123456 exists.
 *
 * The test lesson must be seeded manually via SQL in the Supabase dashboard.
 * See the SQL script in the project README or ask the team for the seed query.
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const TEST_PIN = '123456';

export default async function globalSetup() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const { data: lesson, error } = await supabase
    .from('lessons')
    .select('id, status, pin_code')
    .eq('pin_code', TEST_PIN)
    .single();

  if (error || !lesson) {
    console.warn(
      `[global-setup] WARNING: No lesson found with PIN ${TEST_PIN}.`,
      'Student join/submit tests will fail.',
      'Seed the test lesson via SQL in the Supabase dashboard.',
    );
    return;
  }

  if (lesson.status !== 'active') {
    console.warn(
      `[global-setup] WARNING: Test lesson (PIN=${TEST_PIN}) has status "${lesson.status}" — expected "active".`,
      'Some tests may fail.',
    );
    return;
  }

  console.log(`[global-setup] Test lesson (PIN=${TEST_PIN}) found and active.`);
}

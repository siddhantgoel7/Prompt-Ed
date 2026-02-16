/**
 * Playwright global teardown — cleans up responses created during test runs.
 * The test lesson itself is kept (manually seeded) so it persists across runs.
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const TEST_PIN = '123456';

export default async function globalTeardown() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Find the test lesson
  const { data: lesson } = await supabase
    .from('lessons')
    .select('id')
    .eq('pin_code', TEST_PIN)
    .single();

  if (!lesson) return;

  // Clean up any responses created by tests (discussions and lesson stay)
  const { data: discussions } = await supabase
    .from('discussions')
    .select('id')
    .eq('lesson_id', lesson.id);

  if (discussions) {
    for (const d of discussions) {
      await supabase.from('responses').delete().eq('discussion_id', d.id);
    }
  }

  console.log('[global-teardown] Cleaned up test responses.');
}

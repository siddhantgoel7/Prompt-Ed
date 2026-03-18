import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { SessionDisplayView } from '@/components/instructor/session/SessionDisplayView';

export default async function SessionDisplayPage(props: {
  params: Promise<{ lessonId: string }>;
}) {
  const { lessonId } = await props.params;
  const supabase = await createClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    redirect('/');
  }

  const { data: lesson, error: lessonError } = await supabase
    .from('lessons')
    .select('id, title, pin_code, course_id')
    .eq('id', lessonId)
    .single();

  if (lessonError || !lesson) {
    notFound();
  }

  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('instructor_id')
    .eq('id', (lesson as { course_id: string }).course_id)
    .single();

  if (courseError || !course) {
    notFound();
  }

  if ((course as { instructor_id: string }).instructor_id !== user.id) {
    redirect('/');
  }

  return (
    <SessionDisplayView
      lessonId={(lesson as { id: string }).id}
      title={(lesson as { title: string }).title}
      pinCode={(lesson as { pin_code: string | null }).pin_code}
    />
  );
}

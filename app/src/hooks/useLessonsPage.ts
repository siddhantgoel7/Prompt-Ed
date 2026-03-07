'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

import { createClient } from '@/lib/supabase/client';

import type { Course } from '@/types/course';
import type { Lesson, CreateLessonInput } from '@/types/lesson';
import { createLesson, deleteLesson, getOwnedCourse, listLessons } from '@/lib/api/lessonApi';

type ModalState =
  | { type: 'none' }
  | { type: 'create' }
  | { type: 'delete'; lesson: Lesson };

export function useLessonsPage(courseId: string) {
  const router = useRouter();

  const [loading, setLoading] = React.useState(true);
  const [course, setCourse] = React.useState<Course | null>(null);
  const [lessons, setLessons] = React.useState<Lesson[]>([]);

  const [modal, setModal] = React.useState<ModalState>({ type: 'none' });
  const [form, setForm] = React.useState<CreateLessonInput>({ title: '' });

  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;

    async function run() {
      const supabase = createClient();
      const { data, error: userError } = await supabase.auth.getUser();

      const user = data?.user;
      if (cancelled) return;

      if (userError || !user) {
        router.push('/');
        return;
      }

      const { data: courseData, error: courseError } = await getOwnedCourse(courseId, user.id);

      if (cancelled) return;

      if (courseError || !courseData) {
        console.error('Error fetching course:', courseError);
        router.push('/');
        return;
      }

      setCourse(courseData);

      const { data: lessonsData, error: lessonsError } = await listLessons(courseId);
      if (lessonsError) {
        console.error('Error fetching lessons:', lessonsError);
      } else {
        setLessons((lessonsData as Lesson[]) || []);
      }

      setLoading(false);
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [courseId, router]);

  const back = React.useCallback(() => {
    router.push('/');
  }, [router]);

  const openCreate = React.useCallback(() => {
    setError(null);
    setForm({ title: '' });
    setModal({ type: 'create' });
  }, []);

  const openDelete = React.useCallback((lesson: Lesson) => {
    setError(null);
    setModal({ type: 'delete', lesson });
  }, []);

  const closeModal = React.useCallback(() => {
    setModal({ type: 'none' });
    setError(null);
    setForm({ title: '' });
  }, []);

  const onChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ title: e.target.value });
  }, []);

  const accessLesson = React.useCallback(
    (lessonId: string) => {
      router.push(`/session/${lessonId}`);
    },
    [router]
  );

  const submitCreate = React.useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      if (!form.title.trim()) {
        setError('Lesson title is required');
        return;
      }

      setSaving(true);
      const { data, error } = await createLesson(courseId, form);

      if (error) {
        console.error('Error adding lesson:', error);
        setError('Failed to add lesson. Please try again.');
        setSaving(false);
        return;
      }

      if (data?.[0]) {
        setLessons((prev) => [data[0] as Lesson, ...prev]);
      }

      setSaving(false);
      closeModal();
    },
    [courseId, form, closeModal]
  );

  const confirmDelete = React.useCallback(async () => {
    if (modal.type !== 'delete') return;

    setDeleting(true);
    const { error } = await deleteLesson(modal.lesson.id);

    if (error) {
      console.error('Error deleting lesson:', error);
      setDeleting(false);
      return;
    }

    setLessons((prev) => prev.filter((l) => l.id !== modal.lesson.id));
    setDeleting(false);
    closeModal();
  }, [modal, closeModal]);

  return {
    loading,
    course,
    lessons,
    modal,
    form,
    error,
    saving,
    deleting,
    back,
    openCreate,
    openDelete,
    closeModal,
    onChange,
    accessLesson,
    submitCreate,
    confirmDelete,
  };
}

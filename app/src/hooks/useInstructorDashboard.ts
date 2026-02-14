'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

import { signOut } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/client';

import type { Course, CreateCourseInput } from '@/types/course';
import {
  listInstructorCourses,
  createCourse,
  updateCourse,
  deleteCourseCascade,
} from '@/services/courseService';

type ModalState =
  | { type: 'none' }
  | { type: 'add' }
  | { type: 'edit'; course: Course }
  | { type: 'delete'; course: Course };

export function useInstructorDashboard() {
  const router = useRouter();

  const [loadingUser, setLoadingUser] = React.useState(true);
  const [userId, setUserId] = React.useState<string>('');

  const [courses, setCourses] = React.useState<Course[]>([]);
  const [modal, setModal] = React.useState<ModalState>({ type: 'none' });

  const [form, setForm] = React.useState<CreateCourseInput>({ title: '', image_url: '' });

  const [error, setError] = React.useState<string | null>(null);
  const [loggingOut, setLoggingOut] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  const refreshCourses = React.useCallback(async (instructorId: string) => {
    const { data, error } = await listInstructorCourses(instructorId);

    if (error) {
      console.error('Error fetching courses:', error);
      setError('Failed to load courses. Please refresh.');
      return;
    }

    setCourses((data as Course[]) || []);
  }, []);

  React.useEffect(() => {
    let cancelled = false;

    async function init() {
      const supabase = createClient();
      const { data, error } = await supabase.auth.getUser();

      if (cancelled) return;

      const user = data?.user;
      if (error || !user) {
        router.push('/');
        return;
      }

      setUserId(user.id);
      setLoadingUser(false);

      await refreshCourses(user.id);
    }

    init();

    return () => {
      cancelled = true;
    };
  }, [router, refreshCourses]);

  const openAdd = React.useCallback(() => {
    setError(null);
    setForm({ title: '', image_url: '' });
    setModal({ type: 'add' });
  }, []);

  const openEdit = React.useCallback((course: Course) => {
    setError(null);
    setForm({ title: course.title, image_url: course.image_url || '' });
    setModal({ type: 'edit', course });
  }, []);

  const openDelete = React.useCallback((course: Course) => {
    setError(null);
    setModal({ type: 'delete', course });
  }, []);

  const closeModal = React.useCallback(() => {
    setModal({ type: 'none' });
    setError(null);
    setForm({ title: '', image_url: '' });
  }, []);

  const onFormChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }, []);

  const validate = React.useCallback((): string | null => {
    if (!form.title.trim()) return 'Course title is required';
    return null;
  }, [form.title]);

  const logout = React.useCallback(async () => {
    setLoggingOut(true);

    const { error } = await signOut();
    if (error) {
      console.error('Sign out error:', error);
      setLoggingOut(false);
      return;
    }

    router.push('/');
    router.refresh();
  }, [router]);

  const accessCourse = React.useCallback(
    (courseId: string) => {
      router.push(`/lessons_page/${courseId}`);
    },
    [router]
  );

  const submitAdd = React.useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      const validationError = validate();
      if (validationError) {
        setError(validationError);
        return;
      }

      setSaving(true);
      const { data, error } = await createCourse(userId, form);

      if (error) {
        console.error('Error adding course:', error);
        setError('Failed to add course. Please try again.');
        setSaving(false);
        return;
      }

      if (data?.[0]) setCourses((prev) => [data[0] as Course, ...prev]);

      setSaving(false);
      closeModal();
    },
    [form, userId, validate, closeModal]
  );

  const submitEdit = React.useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (modal.type !== 'edit') return;

      setError(null);

      const validationError = validate();
      if (validationError) {
        setError(validationError);
        return;
      }

      setSaving(true);
      const { data, error } = await updateCourse(modal.course.id, form);

      if (error) {
        console.error('Error updating course:', error);
        setError('Failed to update course. Please try again.');
        setSaving(false);
        return;
      }

      if (data?.[0]) {
        const updated = data[0] as Course;
        setCourses((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      }

      setSaving(false);
      closeModal();
    },
    [modal, form, validate, closeModal]
  );

  const confirmDelete = React.useCallback(async () => {
    if (modal.type !== 'delete') return;

    setDeleting(true);
    setError(null);

    const { lessonsResult, courseResult } = await deleteCourseCascade(modal.course.id);

    if (lessonsResult.error) console.error('Error deleting lessons:', lessonsResult.error);

    if (courseResult.error) {
      console.error('Error deleting course:', courseResult.error);
      setError('Failed to delete course. Please try again.');
      setDeleting(false);
      return;
    }

    setCourses((prev) => prev.filter((c) => c.id !== modal.course.id));
    setDeleting(false);
    closeModal();
  }, [modal, closeModal]);

  return {
    loadingUser,
    courses,
    modal,
    form,
    error,
    loggingOut,
    saving,
    deleting,
    openAdd,
    openEdit,
    openDelete,
    closeModal,
    onFormChange,
    logout,
    accessCourse,
    submitAdd,
    submitEdit,
    confirmDelete,
  };
}

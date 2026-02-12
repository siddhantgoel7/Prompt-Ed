// app/lessons_page/[courseId]/page.tsx
'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Lesson, CreateLessonInput } from '@/types/lesson';
import type { Course } from '@/types/course';

export default function LessonsPage({ 
  params 
}: { 
  params: Promise<{ courseId: string }> 
}) {
  const { courseId } = use(params);
  const router = useRouter();
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [lessonToDelete, setLessonToDelete] = useState<string | null>(null);
  const [newLesson, setNewLesson] = useState<CreateLessonInput>({
    title: '',
  });
  const [addingLesson, setAddingLesson] = useState(false);
  const [deletingLesson, setDeletingLesson] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        router.push('/');
        return;
      }

      // Fetch course details
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .eq('instructor_id', user.id)
        .single();

      if (courseError || !courseData) {
        console.error('Error fetching course:', courseError);
        router.push('/');
        return;
      }

      setCourse(courseData);

      // Fetch lessons for this course
      const { data: lessonsData, error: lessonsError } = await supabase
        .from('lessons')
        .select('*')
        .eq('course_id', courseId)
        .order('date_created', { ascending: false });

      if (lessonsError) {
        console.error('Error fetching lessons:', lessonsError);
      } else {
        setLessons(lessonsData || []);
      }

      setLoading(false);
    };

    fetchData();
  }, [courseId, router]);

  const handleBack = () => {
    router.push('/');
  };

  const handleCreateLesson = () => {
    setShowAddModal(true);
    setError(null);
    setNewLesson({ title: '' });
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setError(null);
    setNewLesson({ title: '' });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewLesson({ title: e.target.value });
  };

  const handleSubmitLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setAddingLesson(true);

    // Validation
    if (!newLesson.title.trim()) {
      setError('Lesson title is required');
      setAddingLesson(false);
      return;
    }

    const supabase = createClient();

    // Insert lesson to Supabase
    const { data, error } = await supabase
      .from('lessons')
      .insert([
        {
          title: newLesson.title,
          course_id: courseId,
        },
      ])
      .select();

    if (error) {
      console.error('Error adding lesson:', error);
      setError('Failed to add lesson. Please try again.');
      setAddingLesson(false);
      return;
    }

    // Update lessons list
    if (data) {
      setLessons(prev => [data[0], ...prev]);
    }

    setAddingLesson(false);
    handleCloseModal();
  };

  const handleOpenDeleteModal = (lessonId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the card click
    setLessonToDelete(lessonId);
    setShowDeleteModal(true);
  };

  const handleCloseDeleteModal = () => {
    setShowDeleteModal(false);
    setLessonToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!lessonToDelete) return;

    setDeletingLesson(true);
    const supabase = createClient();

    // Delete lesson from Supabase
    const { error } = await supabase
      .from('lessons')
      .delete()
      .eq('id', lessonToDelete);

    if (error) {
      console.error('Error deleting lesson:', error);
      setDeletingLesson(false);
      return;
    }

    // Update lessons list
    setLessons(prev => prev.filter(lesson => lesson.id !== lessonToDelete));

    setDeletingLesson(false);
    handleCloseDeleteModal();
  };

// Update the handleAccessLesson function in app/lessons_page/[courseId]/page.tsx

const handleAccessLesson = (lessonId: string) => {
  router.push(`/session/${lessonId}`);
};
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Course not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">PMCOL Teaching Tool</h1>
        <button
          onClick={handleBack}
          className="px-6 py-2 bg-black text-white rounded-full font-semibold hover:bg-gray-800"
        >
          Back
        </button>
      </header>

      {/* Main Content */}
      <main className="px-8 py-12">
        {/* Course Title */}
        <h2 className="text-3xl font-bold mb-8">{course.title}</h2>

        {/* Lessons Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Create New Lesson Card */}
          <div
            onClick={handleCreateLesson}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex flex-col items-center justify-center cursor-pointer hover:shadow-md transition-shadow h-32"
          >
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-2">
              <svg
                className="w-6 h-6 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-center">Start a New Lesson</h3>
          </div>

          {/* Existing Lessons */}
          {lessons.map((lesson) => (
            <div
              key={lesson.id}
              onClick={() => handleAccessLesson(lesson.id)}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex flex-col cursor-pointer hover:shadow-md transition-shadow h-32 relative group"
            >
              {/* Delete Button - top right corner */}
              <button
                onClick={(e) => handleOpenDeleteModal(lesson.id, e)}
                className="absolute top-2 right-2 bg-white text-gray-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors opacity-0 group-hover:opacity-100 z-10"
                title="Delete lesson"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>

              {/* Lesson Info */}
              <div className="flex-1 flex flex-col justify-center">
                <h3 className="text-lg font-bold mb-1">{lesson.title}</h3>
                <p className="text-xs text-gray-500">
                  Date: {new Date(lesson.date_created).toLocaleDateString('en-US', {
                    day: '2-digit',
                    month: '2-digit',
                    year: '2-digit'
                  })}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {lessons.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-500">
            No lessons yet. Click &quot;Start a New Lesson&quot; to create your first lesson!
          </div>
        )}
      </main>

      {/* Add Lesson Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold mb-6">Start a New Lesson</h2>
            
            <form onSubmit={handleSubmitLesson} className="space-y-4">
              {/* Lesson Title */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Lesson Title
                </label>
                <input
                  type="text"
                  name="title"
                  value={newLesson.title}
                  onChange={handleInputChange}
                  placeholder="e.g., Intro to Pharmacology"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                  {error}
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={addingLesson}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingLesson}
                  className="flex-1 px-4 py-2 bg-black text-white rounded-lg font-semibold hover:bg-gray-800 disabled:opacity-50"
                >
                  {addingLesson ? 'Creating...' : 'Create Lesson'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold mb-4">Delete Lesson?</h2>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this lesson? This action cannot be undone and all associated data will be permanently removed.
            </p>
            
            <div className="flex gap-4">
              <button
                type="button"
                onClick={handleCloseDeleteModal}
                disabled={deletingLesson}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deletingLesson}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50"
              >
                {deletingLesson ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
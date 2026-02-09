'use client';

import { useRouter } from 'next/navigation';
import { signOut } from '@/lib/supabase/auth';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Course, CreateCourseInput } from '@/types/course';

export default function Dashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [, setUserName] = useState<string>('');
  const [userId, setUserId] = useState<string>('');
  const [loadingUser, setLoadingUser] = useState(true);
  const [courses, setCourses] = useState<Course[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState<string | null>(null);
  const [courseToEdit, setCourseToEdit] = useState<Course | null>(null);
  const [newCourse, setNewCourse] = useState<CreateCourseInput>({
    title: '',
    image_url: '',
  });
  const [addingCourse, setAddingCourse] = useState(false);
  const [editingCourse, setEditingCourse] = useState(false);
  const [deletingCourse, setDeletingCourse] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch courses from Supabase
  const fetchCourses = async (instructorId: string) => {
    const supabase = createClient();
    
    // Replace with fetch courses query logic here
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('instructor_id', instructorId)
      .order('date_created', { ascending: false });

    if (error) {
      console.error('Error fetching courses:', error);
      return;
    }

    setCourses(data || []);
  };

  // Replace with fetch user data and auth check logic here
  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient();
      
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error || !user) {
        // User not logged in, redirect to home
        router.push('/');
        return;
      }
      
      // Get name from user metadata (set during signup)
      const fullName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
      setUserName(fullName);
      setUserId(user.id);
      setLoadingUser(false);

      // Replace with fetch courses from Supabase logic here
      fetchCourses(user.id);
    };

    fetchUser();
  }, [router]);

  

  // Handle log out
  const handleLogOut = async () => {
    setLoading(true);
    
    // Replace with sign out logic here
    const { error } = await signOut();
    
    if (error) {
      console.error('Sign out error:', error);
      setLoading(false);
      return;
    }
    
    // Replace with redirect logic here
    router.push('/');
    router.refresh(); // Clear any cached data
  };

  // Handle open add course modal
  const handleAddCourse = () => {
    setShowAddModal(true);
    setError(null);
    setNewCourse({ title: '', image_url: '' });
  };

  // Handle close add modal
  const handleCloseModal = () => {
    setShowAddModal(false);
    setError(null);
    setNewCourse({ title: '', image_url: '' });
  };

  // Handle open edit modal
  const handleOpenEditModal = (course: Course) => {
    setCourseToEdit(course);
    setNewCourse({
      title: course.title,
      image_url: course.image_url || '',
    });
    setShowEditModal(true);
    setError(null);
  };

  // Handle close edit modal
  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setCourseToEdit(null);
    setNewCourse({ title: '', image_url: '' });
    setError(null);
  };

  // Handle input change in modal
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewCourse(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle submit new course
  const handleSubmitCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setAddingCourse(true);

    // Replace with validation logic here
    if (!newCourse.title.trim()) {
      setError('Course title is required');
      setAddingCourse(false);
      return;
    }

    const supabase = createClient();

    // Replace with insert course to Supabase logic here
    const { data, error } = await supabase
      .from('courses')
      .insert([
        {
          title: newCourse.title,
          image_url: newCourse.image_url || null,
          instructor_id: userId,
        },
      ])
      .select();

    if (error) {
      console.error('Error adding course:', error);
      setError('Failed to add course. Please try again.');
      setAddingCourse(false);
      return;
    }

    // Replace with update courses list logic here
    if (data) {
      setCourses(prev => [data[0], ...prev]);
    }

    setAddingCourse(false);
    handleCloseModal();
  };

  // Handle submit edit course
  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseToEdit) return;

    setError(null);
    setEditingCourse(true);

    // Replace with validation logic here
    if (!newCourse.title.trim()) {
      setError('Course title is required');
      setEditingCourse(false);
      return;
    }

    const supabase = createClient();

    // Replace with update course in Supabase logic here
    const { data, error } = await supabase
      .from('courses')
      .update({
        title: newCourse.title,
        image_url: newCourse.image_url || null,
      })
      .eq('id', courseToEdit.id)
      .select();

    if (error) {
      console.error('Error updating course:', error);
      setError('Failed to update course. Please try again.');
      setEditingCourse(false);
      return;
    }

    // Replace with update courses list logic here
    if (data) {
      setCourses(prev => 
        prev.map(course => 
          course.id === courseToEdit.id ? data[0] : course
        )
      );
    }

    setEditingCourse(false);
    handleCloseEditModal();
  };

  // Handle open delete confirmation modal
  const handleOpenDeleteModal = (courseId: string) => {
    setCourseToDelete(courseId);
    setShowDeleteModal(true);
  };

  // Handle close delete modal
  const handleCloseDeleteModal = () => {
    setShowDeleteModal(false);
    setCourseToDelete(null);
  };

  // Handle confirm delete course (with cascade to lessons)
  const handleConfirmDelete = async () => {
    if (!courseToDelete) return;

    setDeletingCourse(true);
    const supabase = createClient();

    // Replace with cascade delete logic here
    // Note: If you set up ON DELETE CASCADE in your database,
    // Supabase will automatically delete related lessons.
    // But we can also do it manually for safety:

    // Step 1: Delete all lessons for this course
    const { error: lessonsError } = await supabase
      .from('lessons')
      .delete()
      .eq('course_id', courseToDelete);

    if (lessonsError) {
      console.error('Error deleting lessons:', lessonsError);
      // Continue anyway - might not have lessons table yet
    }

    // Step 2: Delete the course
    const { error: courseError } = await supabase
      .from('courses')
      .delete()
      .eq('id', courseToDelete);

    if (courseError) {
      console.error('Error deleting course:', courseError);
      setError('Failed to delete course. Please try again.');
      setDeletingCourse(false);
      return;
    }

    // Replace with update courses list logic here
    setCourses(prev => prev.filter(course => course.id !== courseToDelete));

    setDeletingCourse(false);
    handleCloseDeleteModal();
  };

  // Handle access course
  const handleAccessCourse = (courseId: string) => {
    // Replace with access course logic here
    router.push(`/lessons_page/${courseId}`);
  };

  // Handle add image
  const handleAddImage = () => {
    // Replace with add image logic here
  };

  if (loadingUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">PMCOL Teaching Tool</h1>
        <button
          onClick={handleLogOut}
          disabled={loading}
          className="px-6 py-2 bg-black text-white rounded-full font-semibold hover:bg-gray-800 disabled:opacity-50"
        >
          {loading ? 'Logging out...' : 'Log-Out'}
        </button>
      </header>

      {/* Main Content */}
      <main className="px-8 py-12">
        {/* Courses Header */}
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold">Your Courses!</h2>
          <button
            onClick={handleAddCourse}
            className="px-6 py-2 bg-black text-white rounded-full font-semibold hover:bg-gray-800"
          >
            Add a course
          </button>
        </div>

        {/* Courses Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <div
              key={course.id}
              className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200 relative group"
            >
              {/* Action Buttons - appear on hover */}
              <div className="absolute top-4 right-4 z-10 flex gap-2">
                {/* Edit Button */}
                <button
                  onClick={() => handleOpenEditModal(course)}
                  className="bg-blue-600 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-700"
                  title="Edit course"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </button>

                {/* Delete Button */}
                <button
                  onClick={() => handleOpenDeleteModal(course.id)}
                  className="bg-red-600 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700"
                  title="Delete course"
                >
                  <svg
                    className="w-5 h-5"
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
              </div>

              {/* Course Image Placeholder */}
              <div className="bg-gray-300 h-48 flex items-center justify-center">
                <div className="bg-white p-4 rounded">
                  <svg
                    className="w-16 h-16 text-gray-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              </div>

              {/* Course Info */}
              <div className="p-6">
                <p className="text-sm text-gray-500 mb-2">
                  Date Created: {new Date(course.date_created).toLocaleDateString()}
                </p>
                <h3 className="text-xl font-semibold mb-4">{course.title}</h3>
                <button
                  onClick={() => handleAccessCourse(course.id)}
                  className="w-full py-2 bg-black text-white rounded-full font-semibold hover:bg-gray-800"
                >
                  Access
                </button>
              </div>
            </div>
          ))}

          {courses.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-500">
              No courses yet. Click &quot;Add a course&quot; to get started!
            </div>
          )}
        </div>
      </main>

      {/* Add Course Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold mb-6">Add a Course</h2>
            
            <form onSubmit={handleSubmitCourse} className="space-y-4">
              {/* Course Title */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Course Title
                </label>
                <input
                  type="text"
                  name="title"
                  value={newCourse.title}
                  onChange={handleInputChange}
                  placeholder="e.g., PMCOL 400 Lec A1"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              {/* Image URL (placeholder) */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Course Image
                </label>
                <button
                  type="button"
                  onClick={handleAddImage}
                  className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 text-gray-500 hover:text-gray-700"
                >
                  Click to add image
                </button>
                <p className="text-xs text-gray-500 mt-1">
                  Image upload coming soon
                </p>
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
                  disabled={addingCourse}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingCourse}
                  className="flex-1 px-4 py-2 bg-black text-white rounded-lg font-semibold hover:bg-gray-800 disabled:opacity-50"
                >
                  {addingCourse ? 'Adding...' : 'Add Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Course Modal */}
      {showEditModal && courseToEdit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold mb-6">Edit Course</h2>
            
            <form onSubmit={handleSubmitEdit} className="space-y-4">
              {/* Course Title */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Course Title
                </label>
                <input
                  type="text"
                  name="title"
                  value={newCourse.title}
                  onChange={handleInputChange}
                  placeholder="e.g., PMCOL 400 Lec A1"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              {/* Image URL (placeholder) */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Course Image
                </label>
                <button
                  type="button"
                  onClick={handleAddImage}
                  className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 text-gray-500 hover:text-gray-700"
                >
                  Click to change image
                </button>
                <p className="text-xs text-gray-500 mt-1">
                  Image upload coming soon
                </p>
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
                  onClick={handleCloseEditModal}
                  disabled={editingCourse}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editingCourse}
                  className="flex-1 px-4 py-2 bg-black text-white rounded-lg font-semibold hover:bg-gray-800 disabled:opacity-50"
                >
                  {editingCourse ? 'Saving...' : 'Save Changes'}
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
            <h2 className="text-2xl font-bold mb-4">Delete Course?</h2>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this course? This will also delete all lessons associated with this course. This action cannot be undone.
            </p>
            
            <div className="flex gap-4">
              <button
                type="button"
                onClick={handleCloseDeleteModal}
                disabled={deletingCourse}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deletingCourse}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50"
              >
                {deletingCourse ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
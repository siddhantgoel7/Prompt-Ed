'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signUpWithEmail, signInWithGoogle } from '@/lib/supabase/auth';
import type { SignUpFormData } from '@/types/instructor';

export default function CreateInstructor() {
  const router = useRouter();
  const [formData, setFormData] = useState<SignUpFormData>({
    fullName: '',
    email: '',
    password: '',
    agreeToTerms: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showEmailConfirmation, setShowEmailConfirmation] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  // Handle email/password sign up
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Replace with validation logic here
    if (!formData.agreeToTerms) {
      setError('You must agree to the Terms and Conditions');
      setLoading(false);
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      setLoading(false);
      return;
    }

    // Replace with sign up API call logic here
    const { error } = await signUpWithEmail(
      formData.email,
      formData.password,
      formData.fullName
    );

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // Replace with email confirmation notification logic here
    setUserEmail(formData.email);
    setShowEmailConfirmation(true);
    setLoading(false);
  };

  // Handle confirming email and navigating to login
  const handleGoToLogin = () => {
    router.push('/login_instructor');
  };

  // Handle Google OAuth sign up
  const handleGoogleSignUp = async () => {
    setError(null);
    setLoading(true);

    // Replace with Google OAuth logic here
    const { error } = await signInWithGoogle();

    if (error) {
      setError(error.message);
      setLoading(false);
    }
    
    // User will be redirected to Google, then back to /api/auth/callback
  };

  // Handle navigate to sign in
  const handleNavigateToSignIn = () => {
    // Replace with navigation logic here
    router.push('/login_instructor');
  };

  // If email confirmation notification is showing, display that instead
  if (showEmailConfirmation) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
        <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-lg text-center">
          {/* Success Icon */}
          <div className="mb-6 flex justify-center">
            <div className="bg-green-100 rounded-full p-4">
              <svg
                className="w-12 h-12 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76"
                />
              </svg>
            </div>
          </div>

          <h1 className="text-2xl font-bold mb-4">Check your email!</h1>
          <p className="text-gray-600 mb-2">
            We&apos;ve sent a confirmation link to:
          </p>
          <p className="font-semibold text-black mb-6">{userEmail}</p>
          <p className="text-gray-600 mb-8">
            Please click the link in the email to verify your account, then you can log in.
          </p>

          <button
            onClick={handleGoToLogin}
            className="w-full py-3 bg-black text-white rounded-full font-semibold hover:bg-gray-800"
          >
            Go to Login
          </button>

          <p className="text-sm text-gray-500 mt-4">
            Didn&apos;t receive the email? Check your spam folder.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
      <div className="w-full max-w-md bg-white p-8 rounded-lg">
        <h1 className="text-3xl font-bold mb-8">Create your account</h1>

        <form onSubmit={handleSignUp} className="space-y-6">
          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium mb-2">Full name</label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              placeholder="Enter your name"
              required
              className="w-full px-4 py-3 bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>

          {/* Email or Phone */}
          <div>
            <label className="block text-sm font-medium mb-2">E-mail or phone number</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Type your Ualberta e-mail or phone number"
              required
              className="w-full px-4 py-3 bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium mb-2">Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Type your password"
              required
              className="w-full px-4 py-3 bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
            />
            <p className="text-xs text-gray-500 mt-1">Must be 8 characters at least</p>
          </div>

          {/* Terms and Conditions */}
          <div className="flex items-start gap-2">
            <input
              type="checkbox"
              name="agreeToTerms"
              checked={formData.agreeToTerms}
              onChange={handleChange}
              className="mt-1"
            />
            <label className="text-sm text-gray-600">
              By creating an account means you agree to the{' '}
              <span className="font-semibold">Terms and Conditions</span>, and our{' '}
              <span className="font-semibold">Privacy Policy</span>
            </label>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          {/* Sign Up Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-black text-white rounded-full font-semibold hover:bg-gray-800 disabled:opacity-50"
          >
            {loading ? 'Signing up...' : 'Sign Up'}
          </button>
        </form>

        {/* Divider */}
        <div className="my-6 text-center text-sm text-gray-500">
          or do it via other accounts
        </div>

        {/* Google Sign In */}
        <button
          onClick={handleGoogleSignUp}
          disabled={loading}
          className="w-full py-3 border border-gray-300 rounded-lg flex items-center justify-center gap-2 hover:bg-gray-50 disabled:opacity-50"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continue with Google
        </button>

        {/* Sign In Link */}
        <div className="mt-6 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <button
            onClick={handleNavigateToSignIn}
            className="font-semibold text-black hover:underline"
          >
            Sign In
          </button>
        </div>
      </div>
    </div>
  );
}
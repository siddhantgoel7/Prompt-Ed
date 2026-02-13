'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function Home() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  


  // Replace with auth check logic here
  useEffect(() => {
    const checkUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // User is already logged in, redirect to dashboard
        router.push('/instructor_dashboard');
        return;
      }
      
      setCheckingAuth(false);
    };

    checkUser();
  }, [router]);

  // Handle input change
  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Replace with input handling logic here
    setCode(e.target.value);
    if (joinError) setJoinError(null);
  };

  // Handle join button click
  const handleJoin = async () => {
    setError(null);
    setJoining(true);

    // Validate PIN format (US 2.06)
    if (!/^\d{6}$/.test(code)) {
      setError('PIN must be 6 digits');
      setJoining(false);
      return;
    }

    const supabase = createClient();

    // Find lesson by PIN code
    const { data: lesson, error: lookupError } = await supabase
      .from('lessons')
      .select('id, status')
      .eq('pin_code', code)
      .eq('status', 'active')
      .single();

    if (lookupError || !lesson) {
      setError('Invalid PIN. Please try again'); // US 2.06 AT2
      setJoining(false);
      return;
    }

    if (lesson.status === 'ended') {
      setError('This lesson has ended'); // US 2.06 AT3
      setJoining(false);
      return;
    }

    // Redirect to student session
    router.push(`/student/${lesson.id}`);
  };

  // Handle sign up button click
  const handleSignUp = () => {
    router.push('/create_instructor');
  };

  // Handle log in button click
  const handleLogIn = () => {
    router.push('/login_instructor');
  };

  // Show loading while checking auth
  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="flex justify-between items-center p-6">
        <h1 className="text-xl font-semibold">PMCOL Teaching Tool</h1>
        <div className="flex gap-4">
          <button 
            onClick={handleSignUp}
            className="px-4 py-2 bg-black text-white rounded-lg font-semibold hover:bg-gray-800"
          >
            Sign Up
          </button>
          <button 
            onClick={handleLogIn}
            className="px-4 py-2 bg-black text-white rounded-lg font-semibold hover:bg-gray-800"
          >
            Log In
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4">
        <h2 className="text-2xl font-medium mb-6">Enter Code to Join Event</h2>
        
        <input
          type="text"
          value={code}
          onChange={handleCodeChange}
          placeholder="Enter code"
          className="w-full max-w-md px-4 py-3 border border-gray-300 rounded-lg bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />

        {error && (
          <p className="mt-2 text-red-600 text-sm">{error}</p>
        )}

        <button
          onClick={handleJoin}
          disabled={joining}
          className="mt-6 px-8 py-3 bg-black text-white rounded-lg font-semibold hover:bg-gray-800 disabled:opacity-50"
        >
          {joining ? 'Joining...' : 'Join'}
        </button>
        {joinError && <p className="mt-3 text-sm text-red-600">{joinError}</p>}
      </main>
    </div>
  );
}
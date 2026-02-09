// app/session/[lessonId]/page.tsx
'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useMemo } from "react";
import type { Lesson } from '@/types/lesson';

export default function SessionPage({ 
  params 
}: { 
  params: Promise<{ lessonId: string }> 
}) {
  const { lessonId } = use(params);
  const router = useRouter();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAnswer, setSelectedAnswer] = useState<string>('The World Wide Web Consortium');
  const [barHeights] = useState(() =>
    Array.from({ length: 40 }, () => Math.random() * 100)
  );
  useEffect(() => {
    const fetchLesson = async () => {
      const supabase = createClient();
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        router.push('/');
        return;
      }

      // Fetch lesson details
      const { data: lessonData, error: lessonError } = await supabase
        .from('lessons')
        .select('*, courses!inner(instructor_id)')
        .eq('id', lessonId)
        .single();

      if (lessonError || !lessonData) {
        console.error('Error fetching lesson:', lessonError);
        router.push('/');
        return;
      }

      // Check if user owns this lesson's course
      if (lessonData.courses.instructor_id !== user.id) {
        router.push('/');
        return;
      }

      setLesson(lessonData);
      setLoading(false);
    };

    fetchLesson();
  }, [lessonId, router]);

  const handleEnd = () => {
    if (lesson) {
      router.push(`/lessons_page/${lesson.course_id}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Lesson not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-300 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">{lesson.title}</h1>
        
        <div className="flex items-center gap-4">
          {/* QR Code and Join Code */}
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gray-200 border border-gray-300 flex items-center justify-center text-xs">
              QR
            </div>
            <span className="font-semibold">Join Code: 124567</span>
          </div>
          
          {/* Action Buttons */}
          <button className="px-6 py-2 bg-black text-white rounded-full font-semibold hover:bg-gray-800">
            Display
          </button>
          <button 
            onClick={handleEnd}
            className="px-6 py-2 bg-red-600 text-white rounded-full font-semibold hover:bg-red-700"
          >
            End
          </button>
          <button className="px-6 py-2 bg-black text-white rounded-full font-semibold hover:bg-gray-800">
            Settings
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Left Sidebar - Files */}
        <div className="w-64 border-r border-gray-300 p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <span className="font-semibold">Files Uploaded</span>
            </div>
            <button className="p-1 hover:bg-gray-100 rounded">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
          
          <div className="space-y-2">
            <div className="text-sm text-gray-700 hover:bg-gray-100 p-2 rounded cursor-pointer">
              lec.pdf
            </div>
            <div className="text-sm text-gray-700 hover:bg-gray-100 p-2 rounded cursor-pointer">
              drugs.pdf
            </div>
          </div>

          {/* Analytics Section */}
          <div className="mt-8">
            <h3 className="font-bold mb-4">Analytics and Responses</h3>
            
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold">Answers</h4>
                <button className="text-gray-500 hover:text-gray-700">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                  </svg>
                </button>
              </div>
              
              {/* Donut Chart Placeholder */}
              <div className="flex items-center justify-center mb-4">
                <div className="relative w-32 h-32 rounded-full border-8 border-gray-200 flex items-center justify-center">
                  <span className="text-sm font-semibold">Ques</span>
                </div>
              </div>
              
              <div className="flex justify-center gap-4 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                  <span>option</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-orange-400 rounded-full"></div>
                  <span>option</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-purple-400 rounded-full"></div>
                  <span>option</span>
                </div>
              </div>
              
              <button className="w-full mt-4 px-4 py-2 bg-black text-white rounded-full text-sm font-semibold hover:bg-gray-800">
                View In-detail
              </button>
            </div>
          </div>
        </div>

        {/* Center Content Area */}
        <div className="flex-1 flex flex-col">
          {/* Prompt Display */}
          <div className="p-6">
            <div className="flex justify-end mb-2">
              <span className="text-xs text-gray-400">text from speech</span>
            </div>
            <div className="bg-gray-100 rounded-lg p-6 relative">
              <p className="text-gray-700 mb-4">
                Lorem ipsum dolor sit amet, consectetur adipisim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo conseq
              </p>
              <button className="absolute bottom-4 right-4 px-4 py-1.5 bg-gray-400 text-white rounded-full text-sm hover:bg-gray-500">
                Edit
              </button>
            </div>
          </div>

          {/* Prompts Generated Label */}
          <div className="px-6">
            <p className="text-xs text-gray-400 text-center mb-4">prompts generated</p>
          </div>

          {/* Generated Prompts */}
          <div className="px-6 grid grid-cols-2 gap-4 mb-6">
            {/* Prompt Card 1 - In Use */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 relative">
              <div className="mb-4">
                <p className="font-semibold mb-2">Who is making the standards?</p>
                <p className="text-sm text-gray-600">The www</p>
                <p className="text-sm text-gray-600">Microsoft</p>
                <p className="text-sm text-gray-600">Mozilla</p>
              </div>
              <button className="absolute bottom-4 right-4 px-4 py-1.5 bg-black text-white rounded-full text-sm hover:bg-gray-800">
                In-Use
              </button>
            </div>

            {/* Prompt Card 2 */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 relative">
              <p className="text-sm text-gray-700">
                Lorem ipsum dolor sit amet, consectetur adipisim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo conseq
              </p>
              <button className="absolute bottom-4 right-4 px-4 py-1.5 bg-white border border-gray-300 rounded-full text-sm hover:bg-gray-50">
                Use
              </button>
            </div>

            {/* Prompt Card 3 */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 relative">
              <p className="text-sm text-gray-700">
                Lorem ipsum dolor sit amet, consectetur adipisim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo conseq
              </p>
              <button className="absolute bottom-4 right-4 px-4 py-1.5 bg-white border border-gray-300 rounded-full text-sm hover:bg-gray-50">
                Use
              </button>
            </div>
          </div>

          {/* Voice Input Section */}
          <div className="px-6 pb-6">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <input
                type="text"
                placeholder="Space to type multiple prompts"
                className="w-full mb-4 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              />
              
              <div className="flex items-center gap-4">
                {/* Microphone Button */}
                <button className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center hover:bg-red-200">
                  <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                  </svg>
                </button>

                {/* Waveform Visualization THIS HAS BEEN CHANGED BY NIKITA*/}
                <div className="flex-1 flex items-center gap-0.5 h-12">
                  {barHeights.map((height, i) => (
                    <div
                      key={i}
                      className="flex-1 bg-gray-300 rounded-full"
                      style={{ height: `${height}%` }}
                    />
                  ))}
                </div>


                {/* Play Button */}
                <button className="w-12 h-12 bg-white border border-gray-300 rounded-lg flex items-center justify-center hover:bg-gray-50">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar - Question & Timer */}
        <div className="w-80 border-l border-gray-300 p-6">
          <div className="mb-6">
            <h3 className="font-bold mb-4">Question Selected:</h3>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-3">
              <p className="font-semibold mb-3">Who is making the standards?</p>
              
              <div className="space-y-2">
                <div className="bg-blue-600 text-white px-3 py-2 rounded text-sm">
                  The World Wide Web Consortium
                </div>
                <div className="bg-white border border-gray-300 px-3 py-2 rounded text-sm">
                  Microsoft
                </div>
                <div className="bg-white border border-gray-300 px-3 py-2 rounded text-sm">
                  Mozilla
                </div>
              </div>
            </div>

            <div className="flex gap-2 mb-4">
              <button className="flex-1 px-4 py-2 bg-white border border-gray-300 rounded-full text-sm hover:bg-gray-50">
                Single response
              </button>
              <button className="flex-1 px-4 py-2 bg-white border border-gray-300 rounded-full text-sm hover:bg-gray-50">
                Multiple response
              </button>
            </div>

            <button className="w-full mb-2 px-4 py-2 bg-black text-white rounded-full font-semibold hover:bg-gray-800">
              Start Discussion
            </button>
            <button className="w-full mb-2 px-4 py-2 bg-black text-white rounded-full font-semibold hover:bg-gray-800">
              Close Discussion
            </button>
            <button className="w-full px-4 py-2 bg-black text-white rounded-full font-semibold hover:bg-gray-800">
              Edit
            </button>
          </div>

          {/* Timer */}
          <div>
            <h3 className="font-bold mb-4">Timer</h3>
            <div className="bg-purple-100 rounded-lg p-6 mb-4">
              <div className="text-center mb-4">
                <span className="text-6xl font-bold">07</span>
                <span className="text-4xl font-bold mx-2">:</span>
                <span className="text-6xl font-bold">00</span>
              </div>
            </div>
            
            <div className="flex gap-2">
              <button className="flex-1 px-4 py-2 bg-black text-white rounded-full font-semibold hover:bg-gray-800">
                Reset
              </button>
              <button className="flex-1 px-4 py-2 bg-black text-white rounded-full font-semibold hover:bg-gray-800">
                Start
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
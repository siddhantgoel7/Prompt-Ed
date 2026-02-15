## Interface Interactions and Module Communication

This section provides detailed documentation of how all interfaces (APIs, modules, components, hooks, and services) interact with each other to deliver the complete functionality of the PMCOL Teaching Tool. Every interface is mapped to specific Sprint 2 user stories to ensure all planned functionalities are fully represented.

---

### System Architecture Overview

The application follows a **layered architecture** with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────────┐
│                        PRESENTATION LAYER                        │
│  React Components (Pages, UI Components, Forms)                 │
│  - Renders UI                                                    │
│  - Handles user interactions                                     │
│  - Delegates business logic to hooks                             │
└─────────────────────────────────────────────────────────────────┘
                             ↕
┌─────────────────────────────────────────────────────────────────┐
│                        STATE MANAGEMENT LAYER                    │
│  Custom Hooks (useSessionPage, useInstructorDashboard, etc.)    │
│  - Manages component state                                       │
│  - Orchestrates service calls                                    │
│  - Handles side effects (real-time, routing)                     │
└─────────────────────────────────────────────────────────────────┘
                             ↕
┌─────────────────────────────────────────────────────────────────┐
│                        SERVICE LAYER                             │
│  Service Modules (courseService, lessonService, etc.)           │
│  - Encapsulates business logic                                   │
│  - Makes database calls via Supabase client                      │
│  - Returns typed responses                                       │
└─────────────────────────────────────────────────────────────────┘
                             ↕
┌─────────────────────────────────────────────────────────────────┐
│                        DATA ACCESS LAYER                         │
│  Supabase Clients (client.ts, server.ts, auth.ts)              │
│  - Communicates with Supabase backend                            │
│  - Handles authentication                                        │
│  - Manages database connections                                  │
└─────────────────────────────────────────────────────────────────┘
                             ↕
┌─────────────────────────────────────────────────────────────────┐
│                     REAL-TIME COMMUNICATION LAYER                │
│  Real-time Hooks (useRealtime, useSocket)                       │
│  - Manages WebSocket connections                                 │
│  - Broadcasts events                                             │
│  - Listens for real-time updates                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### Interface Categories

#### 1. Page Components (Routing Layer)
**Location**: `app/*/page.tsx`

**Purpose**: Entry points for each route, handle Next.js routing, perform server-side data fetching

**Interfaces**:
- `/page.tsx` → Home page (student PIN entry)
- `/create_instructor/page.tsx` → Instructor signup
- `/login_instructor/page.tsx` → Instructor login
- `/instructor_dashboard/page.tsx` → Instructor course list
- `/lessons_page/[courseId]/page.tsx` → Lessons list for a course
- `/session/[lessonId]/page.tsx` → Lesson session view
- `/session/[lessonId]/discussion/[discussionId]/page.tsx` → Discussion detail view
- `/student/[lessonId]/page.tsx` → Student session view

**User Stories Covered**: All US (routing foundation)

---

#### 2. Feature Components (Business Logic Layer)
**Location**: `components/instructor/`, `components/student/`, `components/auth/`, `components/shared/`

**Purpose**: Implement specific features, manage local state, interact with hooks

**Key Interfaces**:
- **Authentication Components**
- **Instructor Components**
- **Student Components**
- **Shared Components**

---

#### 3. Custom Hooks (State Management)
**Location**: `hooks/`

**Purpose**: Encapsulate state management, side effects, and business logic

**Key Interfaces**:
- `useInstructorDashboard` - Course management
- `useLessonsPage` - Lesson management
- `useSessionPage` - Lesson session lifecycle
- `useStudentSession` - Student session interaction
- `useHomeJoin` - Student PIN entry
- `useRealtime` - Real-time communication
- `useSocket` - WebSocket connection

---

#### 4. Service Modules (Data Layer)
**Location**: `services/`

**Purpose**: Abstract database operations, provide clean API for data access

**Key Interfaces**:
- `courseService` - Course CRUD
- `lessonService` - Lesson CRUD
- `discussionService` - Discussion management
- `responseService` - Response submission

---

#### 5. Type Definitions (Type Safety)
**Location**: `types/`

**Purpose**: Ensure type safety across all layers

**Key Interfaces**:
- `instructor.ts` - Instructor types
- `course.ts` - Course types
- `lesson.ts` - Lesson types
- `discussion.ts` - Discussion types
- `response.ts` - Response types

---

### Detailed Interface Interactions

---

## 1. Authentication Flow

### Components Involved
```
AuthShell (UI Container)
    ├─> SignUpForm (Signup UI)
    ├─> LoginForm (Login UI)
    ├─> OAuthButton (OAuth UI)
    └─> EmailConfirmation (Confirmation UI)
         
         ↓ calls
         
lib/supabase/auth.ts (Auth Logic)
    ├─> signUpWithEmail()
    ├─> signInWithEmail()
    ├─> signInWithGoogle()
    └─> signOut()
    
         ↓ uses
         
lib/supabase/client.ts (Client Connection)
    └─> createClient()
    
         ↓ communicates with
         
Supabase Auth Backend
```

### Interaction Flow Diagram

**US 1.01 - Create Account Flow**
```
┌──────────────┐      ┌─────────────┐      ┌──────────────┐      ┌──────────┐
│ User enters  │──────>│ SignUpForm  │──────>│   auth.ts    │──────>│ Supabase │
│ credentials  │      │ (validates) │      │ signUpWith   │      │   Auth   │
└──────────────┘      └─────────────┘      │   Email()    │      └──────────┘
                              │             └──────────────┘            │
                              │                                         │
                              ↓                                         ↓
                      ┌─────────────┐                           ┌──────────┐
                      │   Email     │<──────────────────────────│  Sends   │
                      │Confirmation │                           │   Email  │
                      │  Component  │                           └──────────┘
                      └─────────────┘
                              │
                              ↓
                      ┌─────────────┐
                      │   Redirect  │
                      │ to Login    │
                      └─────────────┘
```

**US 1.02 - Login via SSO Flow**
```
┌──────────────┐      ┌─────────────┐      ┌──────────────┐
│ User clicks  │──────>│ LoginForm/  │──────>│   auth.ts    │
│ "Sign in"    │      │ OAuthButton │      │ signInWith   │
└──────────────┘      └─────────────┘      │   Google()   │
                                            └──────────────┘
                                                    │
                                                    ↓
                                            ┌──────────────┐
                                            │   Redirect   │
                                            │ to Google    │
                                            │    OAuth     │
                                            └──────────────┘
                                                    │
                                                    ↓
                                            ┌──────────────┐
                                            │ /api/auth/   │
                                            │  callback    │
                                            │ (validates   │
                                            │   domain)    │
                                            └──────────────┘
                                                    │
                            ┌───────────────────────┴───────────────────┐
                            ↓                                           ↓
                    ┌──────────────┐                            ┌──────────────┐
                    │  @ualberta   │                            │  Not UAlberta│
                    │    Valid     │                            │    Invalid   │
                    │   Redirect   │                            │  Sign Out +  │
                    │ to Dashboard │                            │    Error     │
                    └──────────────┘                            └──────────────┘
```

### Code Example: Authentication Component Interaction

```typescript
// 1. SignUpForm Component (Presentation)
export function SignUpForm() {
  const [formData, setFormData] = useState<SignUpFormData>({...});
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation (US 1.01 - AT1)
    if (!formData.agreeToTerms) {
      setError('You must agree to the Terms and Conditions');
      return;
    }
    
    // Call auth service (US 1.01 - AT2)
    const { error } = await signUpWithEmail(
      formData.email,
      formData.password,
      formData.fullName
    );
    
    if (error) {
      setError(error.message);
      return;
    }
    
    // Show confirmation (US 1.01 - AT3)
    setConfirmedEmail(formData.email);
  };
}

// 2. Auth Service (Business Logic)
export async function signUpWithEmail(
  email: string,
  password: string,
  fullName: string
) {
  const supabase = createClient();
  
  // US 1.01 - AT4: Create account with metadata
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName }
    },
  });
  
  return { data, error };
}

// 3. Supabase Client (Data Access)
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

---

## 2. Instructor Dashboard Flow

### Components Involved
```
InstructorDashboard (Main View)
    ├─> InstructorDashboardHeader (Header UI)
    ├─> CoursesSection (Course List)
    │   ├─> CourseCard (Individual Course)
    │   └─> CourseDialog (Create/Edit Modal)
    └─> ConfirmDeleteDialog (Delete Confirmation)
    
         ↓ uses
         
hooks/useInstructorDashboard.ts (State Management)
    ├─> Manages courses state
    ├─> Handles create/delete actions
    └─> Manages dialog state
    
         ↓ calls
         
services/courseService.ts (Data Operations)
    ├─> listInstructorCourses()
    ├─> createCourse()
    ├─> updateCourse()
    └─> deleteCourseCascade()
    
         ↓ uses
         
lib/supabase/client.ts
    └─> Executes database queries
```

### Interaction Flow Diagram

**US 1.49 - Add Course Flow**
```
┌───────────────┐     ┌──────────────────┐     ┌──────────────────┐
│ User clicks   │────>│ InstructorDash   │────>│ useInstructor    │
│ "Add Course"  │     │ board            │     │ Dashboard        │
└───────────────┘     │ (renders dialog) │     │ .openCreate      │
                      └──────────────────┘     │ Dialog()         │
                                               └──────────────────┘
                                                       │
                                                       ↓
                                               ┌──────────────────┐
                                               │ CourseDialog     │
                                               │ appears          │
                                               │ (US 1.49 - AT1)  │
                                               └──────────────────┘
                                                       │
                      ┌────────────────────────────────┘
                      ↓
┌───────────────┐     ┌──────────────────┐     ┌──────────────────┐
│ User enters   │────>│ CourseDialog     │────>│ useInstructor    │
│ title, image  │     │ (form submit)    │     │ Dashboard        │
│ and submits   │     └──────────────────┘     │ .handleCreate    │
└───────────────┘                              │ Course()         │
                                               └──────────────────┘
                                                       │
                                                       ↓
                                               ┌──────────────────┐
                                               │ courseService    │
                                               │ .createCourse()  │
                                               └──────────────────┘
                                                       │
                                                       ↓
                                               ┌──────────────────┐
                                               │ Supabase insert  │
                                               │ (US 1.49 - AT2)  │
                                               └──────────────────┘
                                                       │
                      ┌────────────────────────────────┘
                      ↓
              ┌──────────────────┐
              │ Update courses   │
              │ state            │
              │ (appears in list)│
              │ (US 1.49 - AT2)  │
              └──────────────────┘
                      │
                      ↓
              ┌──────────────────┐
              │ Close dialog     │
              │ Show success     │
              └──────────────────┘
```

**US 1.50 - Delete Course Flow**
```
┌───────────────┐     ┌──────────────────┐     ┌──────────────────┐
│ User clicks   │────>│ CourseCard       │────>│ useInstructor    │
│ delete icon   │     │ (calls handler)  │     │ Dashboard        │
└───────────────┘     └──────────────────┘     │ .openDelete      │
                                               │ Dialog()         │
                                               └──────────────────┘
                                                       │
                                                       ↓
                                               ┌──────────────────┐
                                               │ ConfirmDelete    │
                                               │ Dialog shows     │
                                               │ WARNING about    │
                                               │ cascade delete   │
                                               │ (US 1.50 - AT1)  │
                                               └──────────────────┘
                                                       │
                      ┌────────────────────────────────┘
                      ↓
┌───────────────┐     ┌──────────────────┐     ┌──────────────────┐
│ User confirms │────>│ ConfirmDelete    │────>│ useInstructor    │
│ deletion      │     │ Dialog           │     │ Dashboard        │
└───────────────┘     │ (clicks confirm) │     │ .confirmDelete() │
                      └──────────────────┘     └──────────────────┘
                                                       │
                                                       ↓
                                               ┌──────────────────┐
                                               │ courseService    │
                                               │ .deleteCourse    │
                                               │ Cascade()        │
                                               └──────────────────┘
                                                       │
                                                       ↓
                                               ┌──────────────────┐
                                               │ 1. Delete lessons│
                                               │    (cascade)     │
                                               │ 2. Delete course │
                                               │ (US 1.50 - AT2,3)│
                                               └──────────────────┘
                                                       │
                      ┌────────────────────────────────┘
                      ↓
              ┌──────────────────┐
              │ Remove from      │
              │ courses state    │
              │ Update UI        │
              └──────────────────┘
```

### Code Example: Dashboard Component Interaction

```typescript
// 1. InstructorDashboard Component (Presentation)
export function InstructorDashboard() {
  const {
    courses,
    loading,
    handleCreateCourse,
    openDeleteDialog,
    // ... other state
  } = useInstructorDashboard();
  
  return (
    <div>
      <InstructorDashboardHeader onAddCourse={openCreateDialog} />
      <CoursesSection 
        courses={courses}
        onDeleteCourse={openDeleteDialog}
      />
      {/* Dialogs */}
    </div>
  );
}

// 2. useInstructorDashboard Hook (State Management)
export function useInstructorDashboard() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseToDelete, setCourseToDelete] = useState<string | null>(null);
  
  // Load courses on mount (US 1.04 - AT1)
  useEffect(() => {
    async function fetchCourses() {
      const user = await supabase.auth.getUser();
      const { data } = await courseService.listInstructorCourses(user.data.user!.id);
      setCourses(data || []);
    }
    fetchCourses();
  }, []);
  
  // US 1.49 - Create course
  const handleCreateCourse = async (input: CreateCourseInput) => {
    const user = await supabase.auth.getUser();
    const { data, error } = await courseService.createCourse(
      user.data.user!.id,
      input
    );
    
    if (!error && data) {
      setCourses(prev => [...prev, ...data]); // Update state
      closeCreateDialog();
    }
  };
  
  // US 1.50 - Delete course
  const confirmDelete = async () => {
    if (!courseToDelete) return;
    
    const { courseResult } = await courseService.deleteCourseCascade(
      courseToDelete
    );
    
    if (!courseResult.error) {
      setCourses(prev => prev.filter(c => c.id !== courseToDelete));
      closeDeleteDialog();
    }
  };
  
  return {
    courses,
    handleCreateCourse,
    openDeleteDialog: (id: string) => setCourseToDelete(id),
    confirmDelete,
    // ...
  };
}

// 3. courseService (Data Layer)
export async function createCourse(
  instructorId: string,
  input: CreateCourseInput
) {
  const supabase = createClient();
  
  // US 1.49 - AT2: Insert and return course
  return supabase
    .from('courses')
    .insert([{
      instructor_id: instructorId,
      title: input.title.trim(),
      image_url: input.image_url?.trim() || null,
    }])
    .select();
}

export async function deleteCourseCascade(courseId: string) {
  const supabase = createClient();
  
  // US 1.50 - AT2, AT3: Cascade delete lessons, then course
  const lessonsResult = await supabase
    .from('lessons')
    .delete()
    .eq('course_id', courseId);
    
  const courseResult = await supabase
    .from('courses')
    .delete()
    .eq('id', courseId);
  
  return { lessonsResult, courseResult };
}
```

---

## 3. Lesson Session Flow

### Components Involved
```
SessionPage (Main Container)
    ├─> SessionActiveView (Active State)
    │   ├─> SessionHeaderActive (Header)
    │   ├─> JoinCodeOverlay (PIN Display)
    │   ├─> ActiveSidebar (Discussion List)
    │   ├─> ActiveCenter (Current Discussion)
    │   └─> ActiveRightPanel (Responses)
    ├─> SessionEndedView (Ended State)
    │   ├─> SessionHeaderEnded
    │   └─> Past data view
    ├─> SessionLoading (Loading State)
    └─> SessionNotFound (Error State)
    
         ↓ uses
         
hooks/useSessionPage.ts (State Management)
    ├─> Manages lesson lifecycle
    ├─> Handles start/end lesson
    └─> Manages discussions
    
         ↓ calls
         
services/lessonService.ts
services/discussionService.ts
    
         ↓ broadcasts via
         
lib/realtime/useRealtime.ts (Real-time)
```

### Interaction Flow Diagram

**US 1.06 - Start Lesson Flow**
```
┌───────────────┐     ┌──────────────────┐     ┌──────────────────┐
│ Instructor    │────>│ SessionActive    │────>│ useSessionPage   │
│ clicks        │     │ View             │     │ .startLesson()   │
│ "Start"       │     │ (button)         │     └──────────────────┘
└───────────────┘     └──────────────────┘              │
                                                         ↓
                                                ┌──────────────────┐
                                                │ Update lesson    │
                                                │ status = 'active'│
                                                │ started_at = NOW │
                                                │ (US 1.06 - AT3)  │
                                                └──────────────────┘
                                                         │
                                                         ↓
                                                ┌──────────────────┐
                                                │ JoinCodeOverlay  │
                                                │ displays PIN     │
                                                │ (US 1.06 - AT1)  │
                                                │ (US 1.31 - AT1)  │
                                                └──────────────────┘
                                                         │
                                                         ↓
                                                ┌──────────────────┐
                                                │ Generate QR code │
                                                │ (US 1.06 - AT2)  │
                                                └──────────────────┘
                                                         │
                                                         ↓
                                                ┌──────────────────┐
                                                │ PIN visible      │
                                                │ to students      │
                                                │ (US 1.06 - AT4)  │
                                                └──────────────────┘
```

**US 1.28 - Start Discussion Flow**
```
┌───────────────┐     ┌──────────────────┐     ┌──────────────────┐
│ Instructor    │────>│ ActiveSidebar    │────>│ useSessionPage   │
│ clicks        │     │ (discussion list)│     │ .startDiscussion │
│ "Start" on    │     └──────────────────┘     │ ()               │
│ discussion    │                              └──────────────────┘
└───────────────┘                                       │
                                                        ↓
                                               ┌──────────────────┐
                                               │ discussionService│
                                               │ .publish()       │
                                               │ status='active'  │
                                               │ (US 1.28 - AT1)  │
                                               └──────────────────┘
                                                        │
                                                        ↓
                                               ┌──────────────────┐
                                               │ useRealtime      │
                                               │ .channel.send()  │
                                               │ event:           │
                                               │ 'discussion-     │
                                               │  started'        │
                                               └──────────────────┘
                                                        │
                      ┌─────────────────────────────────┴─────────────┐
                      ↓                                               ↓
              ┌──────────────────┐                           ┌──────────────────┐
              │ Instructor UI    │                           │ All Students     │
              │ updates          │                           │ receive prompt   │
              │ (US 1.27 - AT2)  │                           │ (US 1.27 - AT1)  │
              └──────────────────┘                           │ (US 2.09 - AT1,2)│
                                                             └──────────────────┘
```

**US 1.34 - Real-time Responses Flow**
```
┌───────────────┐     ┌──────────────────┐     ┌──────────────────┐
│ Student       │────>│ StudentResponse  │────>│ responseService  │
│ submits       │     │ Form             │     │ .submit()        │
│ response      │     │ (US 2.07)        │     └──────────────────┘
└───────────────┘     └──────────────────┘              │
                                                         ↓
                                                ┌──────────────────┐
                                                │ Insert into      │
                                                │ responses table  │
                                                │ (US 2.07 - AT1)  │
                                                └──────────────────┘
                                                         │
                                                         ↓
                                                ┌──────────────────┐
                                                │ useRealtime      │
                                                │ .channel.send()  │
                                                │ event:           │
                                                │ 'response:new'   │
                                                └──────────────────┘
                                                         │
                      ┌──────────────────────────────────┘
                      ↓
              ┌──────────────────┐
              │ Instructor's     │
              │ ActiveRightPanel │
              │ receives event   │
              │ (US 1.34 - AT1)  │
              └──────────────────┘
                      │
                      ↓
              ┌──────────────────┐
              │ Add response to  │
              │ responses array  │
              │ NO manual refresh│
              │ (US 1.34 - AT1)  │
              └──────────────────┘
                      │
                      ↓
              ┌──────────────────┐
              │ Response appears │
              │ in real-time     │
              │ (US 1.34 - AT2)  │
              └──────────────────┘
```

**US 1.09 - End Lesson Flow**
```
┌───────────────┐     ┌──────────────────┐     ┌──────────────────┐
│ Instructor    │────>│ SessionActive    │────>│ useSessionPage   │
│ clicks        │     │ View             │     │ .endLesson()     │
│ "End Lesson"  │     │ (button)         │     └──────────────────┘
└───────────────┘     └──────────────────┘              │
                                                         ↓
                                                ┌──────────────────┐
                                                │ Update lesson    │
                                                │ status = 'ended' │
                                                │ ended_at = NOW   │
                                                │ (US 1.09 - AT1)  │
                                                └──────────────────┘
                                                         │
                                                         ↓
                                                ┌──────────────────┐
                                                │ Close all active │
                                                │ discussions      │
                                                │ (US 1.09 - AT4)  │
                                                └──────────────────┘
                                                         │
                                                         ↓
                                                ┌──────────────────┐
                                                │ useRealtime      │
                                                │ .channel.send()  │
                                                │ event:           │
                                                │ 'lesson-ended'   │
                                                └──────────────────┘
                                                         │
                      ┌──────────────────────────────────┴─────────────┐
                      ↓                                                ↓
              ┌──────────────────┐                            ┌──────────────────┐
              │ Show confirmation│                            │ Students kicked  │
              │ to instructor    │                            │ from session     │
              │ (US 1.09 - AT5)  │                            │ (US 1.09 - AT2,3)│
              └──────────────────┘                            └──────────────────┘
                      │
                      ↓
              ┌──────────────────┐
              │ Render           │
              │ SessionEndedView │
              │ (past data only) │
              └──────────────────┘
```

### Code Example: Session Component Interaction

```typescript
// 1. SessionPage Component (Main Container)
export function SessionPage({ lessonId }: { lessonId: string }) {
  const vm = useSessionPage(lessonId);
  
  if (vm.loading) return <SessionLoading />;
  if (vm.notFound) return <SessionNotFound />;
  
  // Route to appropriate view based on lesson status
  if (vm.lesson.status === 'ended') {
    return <SessionEndedView vm={vm} />;
  }
  
  return <SessionActiveView vm={vm} />;
}

// 2. useSessionPage Hook (State Management)
export function useSessionPage(lessonId: string) {
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [activeDiscussionId, setActiveDiscussionId] = useState<string | null>(null);
  
  // Setup real-time communication (US 1.34, US 1.27)
  const { channel, isConnected } = useRealtime(lessonId, 'instructor');
  
  // US 1.06 - Start lesson
  const startLesson = async () => {
    const { data } = await supabase
      .from('lessons')
      .update({
        status: 'active',
        started_at: new Date().toISOString(),
      })
      .eq('id', lessonId)
      .select()
      .single();
    
    if (data) {
      setLesson(data);
    }
  };
  
  // US 1.28 - Start discussion
  const startDiscussion = async (discussionId: string) => {
    const updated = await discussionService.publish(discussionId);
    
    // Broadcast to students (US 1.27 - AT2)
    channel?.send({
      type: 'broadcast',
      event: 'discussion-started',
      payload: {
        discussionId: updated.id,
        prompt: updated.prompt_text,
      },
    });
    
    setActiveDiscussionId(discussionId);
  };
  
  // US 1.09 - End lesson
  const endLesson = async () => {
    // Close all active discussions (US 1.09 - AT4)
    await Promise.all(
      discussions
        .filter(d => d.status === 'active')
        .map(d => discussionService.close(d.id))
    );
    
    // Update lesson status (US 1.09 - AT1)
    const { data } = await supabase
      .from('lessons')
      .update({
        status: 'ended',
        ended_at: new Date().toISOString(),
      })
      .eq('id', lessonId)
      .select()
      .single();
    
    // Broadcast to students (US 1.09 - AT2, AT3)
    channel?.send({
      type: 'broadcast',
      event: 'lesson-ended',
      payload: { lessonId, endedAt: data.ended_at },
    });
    
    if (data) {
      setLesson(data);
    }
  };
  
  return {
    lesson,
    discussions,
    startLesson,
    startDiscussion,
    endLesson,
    channel,
    isConnected,
  };
}

// 3. SessionActiveView Component (Presentation)
export function SessionActiveView({ vm }: { vm: SessionViewModel }) {
  return (
    <div className="session-layout">
      <SessionHeaderActive 
        lesson={vm.lesson}
        onEndLesson={vm.endLesson}
      />
      
      {/* US 1.31 - Display PIN */}
      <JoinCodeOverlay pinCode={vm.lesson.pin_code} />
      
      {/* US 1.25 - Multiple discussions */}
      <ActiveSidebar 
        discussions={vm.discussions}
        onStartDiscussion={vm.startDiscussion}
      />
      
      {/* US 1.27 - Display prompt */}
      <ActiveCenter 
        currentDiscussion={vm.activeDiscussion}
      />
      
      {/* US 1.34 - Real-time responses */}
      <ActiveRightPanel 
        responses={vm.responses}
        isConnected={vm.isConnected}
      />
    </div>
  );
}
```

---

## 4. Student Session Flow

### Components Involved
```
HomeJoin (PIN Entry)
    ↓ navigates to
StudentSessionPage (Main View)
    ├─> StudentSessionShell (Layout)
    ├─> StudentPromptCard (Prompt Display)
    ├─> StudentResponseForm (Response Input)
    ├─> StudentStatusAlert (Status Messages)
    └─> StudentWaitingCard (Waiting State)
    
         ↓ uses
         
hooks/useStudentSession.ts (State Management)
hooks/useHomeJoin.ts (PIN Validation)
    
         ↓ calls
         
services/responseService.ts
    
         ↓ listens via
         
lib/realtime/useRealtime.ts
```

### Interaction Flow Diagram

**US 2.06 - Join via PIN Flow**
```
┌───────────────┐     ┌──────────────────┐     ┌──────────────────┐
│ Student       │────>│ HomeJoin         │────>│ useHomeJoin      │
│ enters PIN    │     │ Component        │     │ .join()          │
└───────────────┘     │ (validates)      │     └──────────────────┘
                      └──────────────────┘              │
                                                         ↓
                                                ┌──────────────────┐
                                                │ Query lessons    │
                                                │ table for PIN    │
                                                │ AND status=      │
                                                │ 'active'         │
                                                │ (US 2.06 - AT1)  │
                                                └──────────────────┘
                                                         │
                      ┌──────────────────────────────────┴─────────────┐
                      ↓                                                ↓
              ┌──────────────────┐                            ┌──────────────────┐
              │ PIN valid        │                            │ PIN invalid      │
              │ Lesson active    │                            │ OR lesson ended  │
              │ (US 2.06 - AT4)  │                            │ (US 2.06 - AT2)  │
              └──────────────────┘                            │ (US 2.03 - AT3,4)│
                      │                                       └──────────────────┘
                      ↓                                                │
              ┌──────────────────┐                                    ↓
              │ Navigate to      │                            ┌──────────────────┐
              │ /student/        │                            │ Show error       │
              │ [lessonId]       │                            │ message          │
              └──────────────────┘                            │ Stay on home     │
                                                              └──────────────────┘
```

**US 2.09 - Receive Prompt Flow**
```
┌───────────────┐     ┌──────────────────┐     ┌──────────────────┐
│ StudentSession│────>│ useStudentSession│────>│ useRealtime      │
│ Page loads    │     │ subscribes to    │     │ .channel         │
│               │     │ lesson channel   │     │ .on('discussion- │
└───────────────┘     └──────────────────┘     │  started')       │
                                               └──────────────────┘
                                                         │
                                                         ↓
                                                ┌──────────────────┐
                                                │ Instructor starts│
                                                │ discussion       │
                                                │ (broadcasts)     │
                                                └──────────────────┘
                                                         │
                                                         ↓
                                                ┌──────────────────┐
                                                │ Student receives │
                                                │ broadcast event  │
                                                │ (US 2.09 - AT2)  │
                                                └──────────────────┘
                                                         │
                                                         ↓
                                                ┌──────────────────┐
                                                │ Update state:    │
                                                │ currentDiscussion│
                                                │ promptText       │
                                                └──────────────────┘
                                                         │
                                                         ↓
                                                ┌──────────────────┐
                                                │ StudentPromptCard│
                                                │ renders prompt   │
                                                │ (US 2.09 - AT1)  │
                                                │ (US 2.09 - AT3)  │
                                                └──────────────────┘
```

**US 2.07 - Submit Response Flow**
```
┌───────────────┐     ┌──────────────────┐     ┌──────────────────┐
│ Student types │────>│ StudentResponse  │────>│ useStudentSession│
│ response and  │     │ Form             │     │ .handleSubmit()  │
│ clicks submit │     │ (validates)      │     └──────────────────┘
└───────────────┘     └──────────────────┘              │
                                                         ↓
                                                ┌──────────────────┐
                                                │ Validate:        │
                                                │ - Not blank      │
                                                │   (US 2.07 - AT2)│
                                                │ - Discussion     │
                                                │   is active      │
                                                │   (US 2.07 - AT3)│
                                                └──────────────────┘
                                                         │
                      ┌──────────────────────────────────┴────────────────┐
                      ↓                                                   ↓
              ┌──────────────────┐                              ┌──────────────────┐
              │ Validation passes│                              │ Validation fails │
              └──────────────────┘                              │ Show error       │
                      │                                         └──────────────────┘
                      ↓
              ┌──────────────────┐
              │ responseService  │
              │ .submit()        │
              │ (US 2.07 - AT1)  │
              └──────────────────┘
                      │
                      ↓
              ┌──────────────────┐
              │ Insert into      │
              │ responses table  │
              │ (anonymous)      │
              │ (US 2.03 - AT2)  │
              └──────────────────┘
                      │
                      ↓
              ┌──────────────────┐
              │ Broadcast via    │
              │ realtime channel │
              │ to instructor    │
              └──────────────────┘
                      │
                      ↓
              ┌──────────────────┐
              │ Show confirmation│
              │ (US 2.07 - AT4)  │
              │ Clear form       │
              └──────────────────┘
```

### Code Example: Student Component Interaction

```typescript
// 1. HomeJoin Component (PIN Entry)
export function HomeJoin() {
  const { 
    code, 
    onChangeCode, 
    join, 
    error, 
    pinOk 
  } = useHomeJoin();
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Join a session</CardTitle>
      </CardHeader>
      <CardContent>
        {error && <Alert variant="destructive">{error}</Alert>}
        
        {/* US 2.06 - AT1: Input PIN */}
        <Input
          value={code}
          onChange={(e) => onChangeCode(e.target.value)}
          placeholder="123456"
        />
        
        {/* US 2.06 - AT4: Join button */}
        <Button onClick={join} disabled={!pinOk}>
          Join
        </Button>
      </CardContent>
    </Card>
  );
}

// 2. useHomeJoin Hook (PIN Validation)
export function useHomeJoin() {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  
  const pinOk = code.length === 6;
  
  const join = async () => {
    setError(null);
    
    // US 2.06 - AT3: Validate non-empty
    if (!pinOk) {
      setError('Enter exactly 6 digits');
      return;
    }
    
    // US 2.06 - AT1: Query for active lesson with PIN
    const { data: lesson, error: queryError } = await supabase
      .from('lessons')
      .select('*')
      .eq('pin_code', code.toUpperCase())
      .eq('status', 'active') // US 2.03 - AT4
      .single();
    
    if (queryError || !lesson) {
      // US 2.06 - AT2: Invalid PIN
      setError('Invalid PIN or lesson is not active');
      return;
    }
    
    // US 2.06 - AT4: Navigate to session
    router.push(`/student/${lesson.id}`);
  };
  
  return {
    code,
    onChangeCode: setCode,
    join,
    error,
    pinOk,
  };
}

// 3. StudentSessionPage Component
export function StudentSessionPage({ lessonId }: { lessonId: string }) {
  const {
    currentDiscussion,
    promptText,
    responseText,
    setResponseText,
    handleSubmit,
    submitting,
    submitted,
  } = useStudentSession(lessonId);
  
  // US 2.09 - AT1: Display prompt when available
  if (!currentDiscussion) {
    return <StudentWaitingCard />;
  }
  
  return (
    <StudentSessionShell>
      {/* US 2.09 - AT1, AT3: Show prompt */}
      <StudentPromptCard prompt={promptText} />
      
      {/* US 2.07: Response form */}
      <StudentResponseForm
        value={responseText}
        onChange={setResponseText}
        onSubmit={handleSubmit}
        submitting={submitting}
        submitted={submitted}
      />
    </StudentSessionShell>
  );
}

// 4. useStudentSession Hook
export function useStudentSession(lessonId: string) {
  const [currentDiscussion, setCurrentDiscussion] = useState<Discussion | null>(null);
  const [promptText, setPromptText] = useState('');
  const [responseText, setResponseText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  // US 2.09 - AT2: Subscribe to real-time updates
  const { channel, isConnected } = useRealtime(lessonId, 'student');
  
  useEffect(() => {
    if (!channel || !isConnected) return;
    
    // US 2.09 - AT2: Listen for discussion start
    channel.on('broadcast', { event: 'discussion-started' }, (payload) => {
      setCurrentDiscussion(payload.payload.discussion);
      setPromptText(payload.payload.prompt);
    });
    
    // US 1.28 - AT3, US 2.07 - AT3: Listen for discussion close
    channel.on('broadcast', { event: 'discussion-closed' }, () => {
      setCurrentDiscussion(null);
    });
  }, [channel, isConnected]);
  
  // US 2.07 - Submit response
  const handleSubmit = async () => {
    // US 2.07 - AT2: Validate non-blank
    if (!responseText.trim()) {
      alert('Response cannot be blank');
      return;
    }
    
    // US 2.07 - AT3: Check discussion is active
    if (!currentDiscussion || currentDiscussion.status !== 'active') {
      alert('This discussion is closed');
      return;
    }
    
    setSubmitting(true);
    
    try {
      // US 2.07 - AT1: Submit response
      const response = await responseService.submit({
        discussion_id: currentDiscussion.id,
        response_text: responseText.trim(),
      });
      
      // Broadcast to instructor (US 1.34 - AT1)
      channel?.send({
        type: 'broadcast',
        event: 'response:new',
        payload: { response },
      });
      
      // US 2.07 - AT4: Show confirmation
      setSubmitted(true);
      setResponseText('');
      
      setTimeout(() => setSubmitted(false), 2000);
      
    } catch (error) {
      alert('Failed to submit response');
    } finally {
      setSubmitting(false);
    }
  };
  
  return {
    currentDiscussion,
    promptText,
    responseText,
    setResponseText,
    handleSubmit,
    submitting,
    submitted,
  };
}
```

---

## 5. Real-time Communication Architecture

### Components Involved
```
lib/realtime/useRealtime.ts (Supabase Realtime)
    ├─> Creates lesson-scoped channels
    ├─> Manages subscriptions
    └─> Handles broadcasts
    
lib/socket/useSocket.ts (WebSocket alternative)
    └─> Fallback/backup communication

Broadcast Events:
    ├─> 'discussion-started' (US 1.27, US 2.09)
    ├─> 'discussion-closed' (US 1.28)
    ├─> 'response:new' (US 1.34)
    └─> 'lesson-ended' (US 1.09)
```

### Real-time Channel Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Supabase Realtime Server                      │
│                                                                   │
│  Channel: "lesson:abc123"                                        │
│  ├─> Subscribed: Instructor (1 connection)                       │
│  └─> Subscribed: Students (N connections)                        │
└─────────────────────────────────────────────────────────────────┘
                             │
         ┌───────────────────┴───────────────────┐
         │                                       │
         ↓                                       ↓
┌─────────────────────┐              ┌─────────────────────┐
│   Instructor Client │              │   Student Clients   │
│   (Publisher)       │              │   (Subscribers)     │
├─────────────────────┤              ├─────────────────────┤
│ useRealtime Hook    │              │ useRealtime Hook    │
│ - channel.send()    │              │ - channel.on()      │
│   broadcasts events │              │   listens for events│
│                     │              │                     │
│ Events Published:   │              │ Events Received:    │
│ • discussion-started│─────────────>│ • discussion-started│
│ • discussion-closed │─────────────>│ • discussion-closed │
│ • lesson-ended      │─────────────>│ • lesson-ended      │
│                     │              │                     │
│ Events Received:    │              │ Events Published:   │
│ • response:new      │<─────────────│ • response:new      │
└─────────────────────┘              └─────────────────────┘
```

### Real-time Event Flow

**Event: discussion-started**
```
Instructor clicks "Start Discussion"
    │
    ↓
discussionService.publish(discussionId)
    │
    ↓
Update discussion status = 'active'
    │
    ↓
channel.send({
  type: 'broadcast',
  event: 'discussion-started',
  payload: {
    discussionId: string,
    prompt: string,
    promptType: PromptType
  }
})
    │
    ↓
Supabase Realtime Server
    │
    ├──────────────────────────────────────┐
    ↓                                      ↓
Instructor receives                   All Students receive
(UI update - AT2)                     (Show prompt - AT1)
    │                                      │
    ↓                                      ↓
ActiveCenter shows                    StudentPromptCard
current discussion                    renders prompt
```

**Event: response:new**
```
Student submits response
    │
    ↓
responseService.submit(input)
    │
    ↓
Insert into responses table
    │
    ↓
channel.send({
  type: 'broadcast',
  event: 'response:new',
  payload: {
    response: Response
  }
})
    │
    ↓
Supabase Realtime Server
    │
    ↓
Instructor receives
    │
    ↓
ActiveRightPanel.responses.push(newResponse)
    │
    ↓
Response appears without refresh (US 1.34 - AT1)
```

### Code Example: Real-time Integration

```typescript
// 1. useRealtime Hook (Real-time Infrastructure)
export function useRealtime(
  lessonId: string,
  role: 'instructor' | 'student'
) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const supabaseRef = useRef(createClient());
  
  useEffect(() => {
    if (!lessonId) return;
    
    const supabase = supabaseRef.current;
    
    // Create lesson-scoped channel
    const channel = supabase.channel(`lesson:${lessonId}`, {
      config: {
        broadcast: { ack: true }, // Wait for acknowledgment
      },
    });
    
    // Subscribe to channel
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log(`${role} subscribed to lesson ${lessonId}`);
        setIsConnected(true);
        channelRef.current = channel;
      }
    });
    
    // Cleanup on unmount
    return () => {
      channel.unsubscribe();
      channelRef.current = null;
      setIsConnected(false);
    };
  }, [lessonId, role]);
  
  return {
    channel: channelRef.current,
    isConnected,
  };
}

// 2. Instructor: Broadcasting events
export function useSessionPage(lessonId: string) {
  const { channel } = useRealtime(lessonId, 'instructor');
  
  // US 1.28, US 1.27 - Start discussion
  const startDiscussion = async (discussionId: string) => {
    const discussion = await discussionService.publish(discussionId);
    
    // Broadcast to all students
    channel?.send({
      type: 'broadcast',
      event: 'discussion-started',
      payload: {
        discussionId: discussion.id,
        prompt: discussion.prompt_text,
        promptType: discussion.prompt_type,
      },
    });
  };
  
  return { startDiscussion };
}

// 3. Student: Listening for events
export function useStudentSession(lessonId: string) {
  const [promptText, setPromptText] = useState('');
  const { channel, isConnected } = useRealtime(lessonId, 'student');
  
  useEffect(() => {
    if (!channel || !isConnected) return;
    
    // US 2.09 - Listen for discussion start
    channel.on('broadcast', { event: 'discussion-started' }, (payload) => {
      setPromptText(payload.payload.prompt);
    });
    
    return () => {
      channel.unsubscribe();
    };
  }, [channel, isConnected]);
  
  return { promptText };
}

// 4. Instructor: Listening for responses (US 1.34)
export function DiscussionPage({ discussionId }: DiscussionPageProps) {
  const [responses, setResponses] = useState<Response[]>([]);
  const { channel, isConnected } = useRealtime(lessonId, 'instructor');
  
  useEffect(() => {
    if (!channel || !isConnected) return;
    
    // US 1.34 - AT1, AT2: Real-time response updates
    channel.on('broadcast', { event: 'response:new' }, (payload) => {
      const newResponse = payload.payload?.response;
      
      if (newResponse && newResponse.discussion_id === discussionId) {
        // Add to top of list (US 1.34 - AT2)
        setResponses((prev) => [newResponse, ...prev]);
      }
    });
  }, [channel, isConnected, discussionId]);
  
  return (
    <div>
      {responses.map((resp) => (
        <div key={resp.id}>{resp.response_text}</div>
      ))}
    </div>
  );
}
```

---

## 6. Data Flow Patterns

### Pattern 1: CRUD Operations (Course/Lesson Management)

```
User Action (Component)
    │
    ↓
Custom Hook (State Management)
    │ - Manages loading state
    │ - Handles errors
    │ - Updates local state
    ↓
Service Module (Business Logic)
    │ - Validates input
    │ - Calls Supabase client
    │ - Returns typed response
    ↓
Supabase Client (Data Access)
    │ - Executes SQL query
    │ - Applies RLS policies
    │ - Returns data
    ↓
Database (Persistence)
    │ - Stores/retrieves data
    │ - Enforces constraints
    │ - Manages transactions
    ↓
Response flows back up the chain
    │
    ↓
Component updates UI
```

### Pattern 2: Real-time Broadcasts (Discussion/Response)

```
Instructor Action (Component)
    │
    ↓
Custom Hook (State Management)
    │ - Updates database
    │ - Broadcasts event
    ↓
useRealtime Hook (Communication)
    │ - channel.send()
    │ - Publishes to channel
    ↓
Supabase Realtime Server
    │ - Distributes to subscribers
    ├──────────────┬──────────────┐
    ↓              ↓              ↓
Student Client  Student Client  ...
    │              │
    ↓              ↓
useRealtime Hook receives event
    │              │
    ↓              ↓
Custom Hook updates state
    │              │
    ↓              ↓
Component updates UI
```

### Pattern 3: Anonymous Access (Student PIN Entry)

```
Student enters PIN (HomeJoin)
    │
    ↓
useHomeJoin Hook
    │ - Validates PIN format
    │
    ↓
Query lessons table
    │ - Filter by pin_code
    │ - Filter by status='active'
    │ - No authentication required (US 2.03)
    ↓
    ├─> PIN Valid & Lesson Active
    │       │
    │       ↓
    │   Navigate to /student/[lessonId]
    │       │
    │       ↓
    │   StudentSessionPage loads
    │       │
    │       ↓
    │   Subscribe to realtime channel
    │       │
    │       ↓
    │   Receive broadcasts
    │       │
    │       ↓
    │   Submit responses (anonymous)
    │
    └─> PIN Invalid or Lesson Not Active
            │
            ↓
        Show error message
        Stay on home page
```

---

## 7. Security and Authorization Flow

### RLS Policy Enforcement

```
Client Request
    │
    ↓
Supabase Client
    │ - Includes auth token (if authenticated)
    │ - OR anonymous (for students)
    ↓
Supabase Database
    │ - Applies RLS policies
    │ - Checks auth.uid()
    │
    ├─> Authenticated Instructor
    │       │
    │       ↓
    │   Check: auth.uid() = instructor_id
    │       │
    │       ├─> Match: Allow operation
    │       └─> No match: Deny operation (US 1.04 - AT2)
    │
    └─> Anonymous Student
            │
            ↓
        Check: status = 'active'
            │
            ├─> Active: Allow read/write
            └─> Not active: Deny access
```

### Authorization Check Examples

```typescript
// US 1.04 - AT2: Instructor cannot access others' resources
// RLS Policy automatically enforces this
const { data: courses } = await supabase
  .from('courses')
  .select('*');
// Returns only courses where instructor_id = auth.uid()

// US 2.03 - AT1, AT2: Anonymous student access
// No authentication required, PIN is the authorization
const { data: lesson } = await supabase
  .from('lessons')
  .select('*')
  .eq('pin_code', userEnteredPIN)
  .eq('status', 'active')
  .single();
// Returns lesson if PIN valid and active
```

---

## 8. Complete User Flow Examples

### Example 1: Instructor Creates and Runs a Lesson

```
1. Instructor logs in (US 1.02)
   LoginForm → auth.signInWithEmail() → Supabase Auth → Dashboard
   
2. Instructor navigates to course (US 1.04)
   Dashboard → CourseCard.onClick → router.push(/lessons_page/[courseId])
   
3. Instructor creates lesson (US 1.05)
   LessonsPage → useL essonsPage.handleCreateLesson() 
   → lessonService.createLesson() → Supabase insert → Lesson created (AT2, AT4)
   
4. Instructor starts lesson (US 1.06)
   SessionPage → useSessionPage.startLesson() 
   → Update status='active' → PIN displayed (AT1, AT3, AT4)
   
5. Instructor creates discussion (US 1.21)
   ActiveSidebar → useSessionPage.handleCreateDiscussion()
   → discussionService.create() → Supabase insert (AT1, AT2)
   
6. Instructor starts discussion (US 1.28)
   ActiveSidebar → useSessionPage.startDiscussion()
   → discussionService.publish() 
   → channel.send('discussion-started') → Students notified (AT1, US 1.27 - AT2)
   
7. Students submit responses (US 2.07)
   StudentSessionPage → useStudentSession.handleSubmit()
   → responseService.submit() → channel.send('response:new')
   → Instructor sees responses in real-time (US 1.34 - AT1)
   
8. Instructor ends lesson (US 1.09)
   SessionActiveView → useSessionPage.endLesson()
   → Update status='ended' → Close discussions (AT4)
   → channel.send('lesson-ended') → Students disconnected (AT2, AT3, AT5)
```

### Example 2: Student Joins and Participates

```
1. Student visits home page
   / → HomeJoin component loads
   
2. Student enters PIN (US 2.06)
   HomeJoin → useHomeJoin.onChangeCode() → Validate format (AT3)
   
3. Student clicks Join (US 2.06)
   HomeJoin → useHomeJoin.join()
   → Query lessons by PIN & status='active' (AT1)
   → Navigate to /student/[lessonId] (AT4)
   
4. Student waits for discussion (US 2.09)
   StudentSessionPage → useStudentSession subscribes to channel
   → Shows StudentWaitingCard
   
5. Discussion starts (US 1.27, US 2.09)
   Instructor broadcasts 'discussion-started'
   → useStudentSession receives event (AT2)
   → StudentPromptCard displays prompt (AT1, AT3)
   
6. Student types response (US 2.07)
   StudentResponseForm → useStudentSession.setResponseText()
   → Validates non-blank (AT2)
   
7. Student submits response (US 2.07)
   StudentResponseForm → useStudentSession.handleSubmit()
   → responseService.submit() (AT1)
   → channel.send('response:new')
   → Show confirmation (AT4)
   
8. Lesson ends (US 1.09)
   Instructor broadcasts 'lesson-ended'
   → useStudentSession receives event
   → Show "Thank you" message (AT3)
   → Student leaves session (AT2)
```

---

## 9. Error Handling and Edge Cases

### Network Disconnection

```
Student loses connection during session
    │
    ↓
useRealtime.isConnected = false
    │
    ↓
StudentStatusAlert shows "Reconnecting..."
    │
    ↓
    ├─> Connection restored
    │       │
    │       ↓
    │   Re-subscribe to channel
    │       │
    │       ↓
    │   Fetch latest discussion state (US 1.34 - AT3)
    │       │
    │       ↓
    │   Resume normal operation
    │
    └─> Connection not restored after 30s
            │
            ↓
        Show error message
        Suggest refresh
```

### Invalid PIN Entry

```
Student enters invalid PIN (US 2.06 - AT2)
    │
    ↓
useHomeJoin.join()
    │
    ↓
Query lessons table
    │
    ↓
No results found
    │
    ↓
setError('Invalid PIN or lesson is not active')
    │
    ↓
HomeJoin displays Alert
    │
    ↓
Student remains on home page
    │
    ↓
Can try again with different PIN
```

### Closed Discussion Submission

```
Student attempts to submit to closed discussion (US 2.07 - AT3)
    │
    ↓
useStudentSession.handleSubmit()
    │
    ↓
Check: currentDiscussion.status === 'active'
    │
    ↓
Status is 'closed'
    │
    ↓
alert('This discussion is closed')
    │
    ↓
Submission blocked
    │
    ↓
Form remains disabled (US 1.28 - AT3)
```

---

## 10. Module Dependency Graph

```
┌─────────────────────────────────────────────────────────────────┐
│                        Component Layer                           │
│  Page Components → Feature Components → UI Components           │
└─────────────────────────────────────────────────────────────────┘
                             │
                             ↓ uses
┌─────────────────────────────────────────────────────────────────┐
│                          Hook Layer                              │
│  Custom Hooks (useSessionPage, useInstructorDashboard, etc.)    │
└─────────────────────────────────────────────────────────────────┘
                             │
                    ┌────────┴────────┐
                    ↓                 ↓
┌────────────────────────┐   ┌────────────────────────┐
│    Service Layer       │   │   Real-time Layer      │
│  courseService         │   │   useRealtime          │
│  lessonService         │   │   useSocket            │
│  discussionService     │   └────────────────────────┘
│  responseService       │            │
└────────────────────────┘            │
                │                     │
                └─────────┬───────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Data Access Layer                             │
│  Supabase Clients (client.ts, server.ts, auth.ts)              │
└─────────────────────────────────────────────────────────────────┘
                             │
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                     Supabase Backend                             │
│  Auth, Database, Realtime                                        │
└─────────────────────────────────────────────────────────────────┘
```

### Key Dependencies

**Component Dependencies:**
- All components depend on UI components (shadcn/ui)
- Page components depend on feature components
- Feature components depend on custom hooks

**Hook Dependencies:**
- Custom hooks depend on service modules
- Custom hooks depend on useRealtime/useSocket
- Custom hooks depend on Supabase clients

**Service Dependencies:**
- All services depend on Supabase client
- All services depend on type definitions
- Services are independent of each other

**Type Dependencies:**
- All layers depend on type definitions
- Types have no dependencies (pure TypeScript)

---

## Summary

This document has provided comprehensive documentation of how all interfaces in the PMCOL Teaching Tool interact with each other:

1. **Layered Architecture**: Clear separation between presentation, state management, business logic, and data access
2. **Component Interactions**: Detailed diagrams showing how components call hooks, which call services
3. **Real-time Communication**: Complete flow of how events are broadcast and received
4. **Data Flow Patterns**: Three main patterns (CRUD, Real-time, Anonymous access)
5. **Security Enforcement**: How RLS policies protect data at the database level
6. **Complete User Flows**: End-to-end examples of instructor and student journeys
7. **Error Handling**: How the system handles network issues, invalid inputs, and edge cases
8. **Module Dependencies**: Clear dependency graph showing what depends on what

Every interface has been mapped to specific Sprint 2 user stories with acceptance test references, ensuring that all planned functionalities can be explained and developed based on this design documentation.

**All Sprint 2 User Stories Covered:**
- Authentication: US 1.01, 1.02, 1.03
- Lesson Management: US 1.04, 1.05, 1.06, 1.08, 1.09
- Course Management: US 1.49, 1.50
- Discussions: US 1.21, 1.25, 1.27, 1.28
- Real-time: US 1.31, 1.34, 1.37
- File Upload: US 1.16 (future)
- Responsive Design: US 2.01, 2.02
- Student Access: US 2.03, 2.06, 2.07, 2.09

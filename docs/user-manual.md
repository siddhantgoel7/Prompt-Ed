# User Manual

This manual covers everything you need to use the PMCOL Teaching Tool. It is organized by the tasks you will actually perform — not by screen or menu names.

The tool has two types of users:

- **Instructors** — university instructors or teaching assistants who create courses, upload lecture materials, generate discussion prompts, and run live classroom sessions.
- **Students** — students who join a session using a PIN and respond to discussion prompts anonymously.

No installation is required for either role. Everything runs in a web browser.

---

## Table of Contents

**Instructor Tasks**

1. [Creating an Account](#1-creating-an-account)
2. [Signing In](#2-signing-in)
3. [Creating a Course](#3-creating-a-course)
4. [Creating a Lesson](#4-creating-a-lesson)
5. [Uploading Lecture Materials](#5-uploading-lecture-materials)
6. [Recording Live Audio for Transcription](#6-recording-live-audio-for-transcription)
7. [Generating AI Discussion Prompts](#7-generating-ai-discussion-prompts)
8. [Customizing AI Prompt Settings](#8-customizing-ai-prompt-settings)
9. [Starting a Live Session](#9-starting-a-live-session)
10. [Running a Live Session](#10-running-a-live-session)
11. [Exporting Student Responses](#11-exporting-student-responses)
12. [Managing Courses and Lessons](#12-managing-courses-and-lessons)

**Student Tasks**

13. [Joining a Session](#13-joining-a-session)
14. [Answering a Discussion Prompt](#14-answering-a-discussion-prompt)

---

## Instructor Tasks

---

### 1. Creating an Account

You must use your University of Alberta email address (`@ualberta.ca`). Personal email addresses are not accepted.

**Steps:**

1. Go to the application in your browser.
2. On the landing page, click **Get Started** or **Sign Up**.
3. Click **Continue with Google**.
4. When prompted by Google, select or enter your `@ualberta.ca` email address.
5. Grant the requested permissions.
6. You will be redirected to your instructor dashboard automatically.

> If you see an error saying *"You must use a UAlberta email address"*, sign in again using your `@ualberta.ca` Google account instead of a personal one.

---

### 2. Signing In

Once your account exists, signing in follows the same steps as creating an account. The system recognizes your account automatically.

**Steps:**

1. Go to the application in your browser.
2. Click **Sign In**.
3. Click **Continue with Google** and select your `@ualberta.ca` account.
4. You are taken directly to your instructor dashboard.

---

### 3. Creating a Course

A course is the top-level container for your lessons. Create one for each class or subject you teach.

**Steps:**

1. From the instructor dashboard, click **Create Course** (or the **+** button in the course list).
2. Enter a course name (e.g., *PMCOL 201 — Principles of Pharmacology*).
3. Click **Save** (or press Enter).
4. The new course appears in your dashboard.

You can create as many courses as you need.

---

### 4. Creating a Lesson

A lesson belongs to a course and represents a single class session or topic.

**Steps:**

1. Open a course from your dashboard by clicking its name.
2. Click **Create Lesson** (or the **+** button in the lesson list).
3. Enter a lesson title (e.g., *Week 3 — Beta-Blockers and Adrenergic Pharmacology*).
4. Click **Save**.
5. The lesson opens in the lesson editor.

---

### 5. Uploading Lecture Materials

Uploading your slides or notes gives the AI context about your lesson content, which makes the generated discussion prompts more relevant and accurate.

**Supported formats:** PDF and PowerPoint (PPTX). Maximum file size: 25 MB per file. Maximum 5 files per lesson.

**Steps:**

1. Open the lesson editor.
2. In the **Materials** or **Files** section, click **Upload File**.
3. Select a PDF or PPTX file from your computer.
4. The file uploads and shows a **Processing** status.
5. Wait until the status changes to **Ready** before generating prompts. This typically takes 30–90 seconds depending on file size.

> If a file shows **Failed**, the content could not be extracted. Try re-exporting the file as a standard PDF and uploading again.

The system automatically:
- Extracts text from all slides or pages
- Generates visual descriptions for image-heavy slides using AI
- Breaks content into searchable chunks for prompt generation

---

### 6. Recording Live Audio for Transcription

You can record a portion of your live lecture and have it transcribed. The transcript is added to the lesson's knowledge base so the AI can generate prompts based on what you just said in class.

**Steps:**

1. Open the lesson editor during or before your class.
2. Click **Record** (microphone icon) in the transcript section.
3. Speak clearly into your device's microphone.
4. Click **Stop** when done.
5. The recording is sent to the transcription service. The transcript appears in the text box within a few seconds.
6. Review the transcript for accuracy. You can edit it manually if needed.
7. Click **Save Transcript** to add it to the lesson context.

> Recordings are limited to 25 MB. For a typical lecture recording this is approximately 25–30 minutes at standard quality.

---

### 7. Generating AI Discussion Prompts

Once you have uploaded materials or recorded a transcript, you can generate discussion prompts for your class.

**Steps:**

1. Open the lesson editor.
2. In the **Generate Prompts** section, choose a **prompt type**:
   - **Multiple Choice** — students pick from 4 options; one is correct
   - **Short Answer** — students write a brief response (a few sentences)
   - **Long Answer** — students write a more detailed explanation
3. Optionally, paste or type a **transcript excerpt** in the text box if you want prompts based on what you just covered verbally.
4. Click **Generate**.
5. Several prompt candidates appear. Each shows the question and a brief rationale explaining why it is pedagogically useful.
6. Click the prompt you want to use, or click **Regenerate** to get new candidates.
7. For multiple choice prompts, the correct answer is highlighted in the editor. Students will not see which option is correct until you reveal it.
8. Click **Publish to Session** to make the prompt live for students.

> Generation typically takes 5–15 seconds. If the lesson has no uploaded materials or transcript, the AI will still generate prompts but they will be based on general pharmacology knowledge rather than your specific content.

---

### 8. Customizing AI Prompt Settings

You can adjust how the AI generates prompts to better match your teaching style and the level of your students.

**Steps:**

1. In the lesson editor, click **AI Settings** or the settings icon near the Generate button.
2. Adjust the following options:

| Setting | Options | Effect |
|---------|---------|--------|
| **Difficulty** | Beginner, Intermediate, Advanced | Controls complexity and assumed prior knowledge |
| **Style** | Socratic, Direct, Conceptual, Applied | Socratic prompts with guiding questions; Direct asks for factual recall; Conceptual asks for understanding; Applied asks for real-world scenarios |
| **Length** | Brief, Standard, Detailed | Controls expected depth of student responses |
| **Focus Areas** | Free text (e.g., *drug interactions, dosing*) | Steers the AI toward specific topics within the lesson content |

3. Click **Save Preferences**. These settings apply to all future generations until you change them.

---

### 9. Starting a Live Session

Starting a session makes your lesson active so students can join.

**Steps:**

1. From the lesson editor or the course dashboard, click **Start Session**.
2. A **6-digit PIN** and **QR code** are displayed.
3. Share the PIN with your students verbally, on the projector, or let them scan the QR code.
4. Students can join immediately — no account or app required.
5. The session dashboard opens showing the number of connected students and a live response feed.

---

### 10. Running a Live Session

Once the session is active, you control what students see in real time.

#### Publishing a prompt

1. In the session dashboard, click **Publish** next to any prompt in your prompt list.
2. The prompt appears on all connected students' screens simultaneously.
3. Student responses begin appearing in the response feed as they submit.

#### Setting a timer

1. Click the **Timer** icon on the published prompt.
2. Set a duration (e.g., 2 minutes).
3. The countdown is visible to both you and all students.
4. When the timer expires, response submission is automatically closed.

#### Viewing and flagging responses

- Responses appear in real time in the feed as students submit them.
- Click the **Flag** icon on any response to highlight it for class discussion.
- Flagged responses are visually marked so you can return to them.

#### Revealing the correct answer (Multiple Choice)

1. After the response period, click **Reveal Answer**.
2. The correct option is highlighted on all student screens.
3. Students see whether their selection was correct.

#### Ending the session

1. Click **End Session** in the session controls.
2. The session closes. Students see a "Session ended" message.
3. All responses are saved and available for export.

---

### 11. Exporting Student Responses

After a session you can download all student responses for review or grading.

**Steps:**

1. From the course dashboard or lesson editor, open the completed lesson.
2. Click **Export Responses** or the download icon.
3. A CSV file is downloaded to your computer.
4. Open it in Excel, Google Sheets, or any spreadsheet application.

The CSV includes: prompt text, prompt type, each anonymized student response, and submission timestamp.

> Responses are anonymous — no student names or identifiers are stored.

---

### 12. Managing Courses and Lessons

#### Renaming a course or lesson

1. Click the pencil/edit icon next to the course or lesson name.
2. Type the new name.
3. Click **Save** or press Enter.

#### Deleting a lesson

1. Open the course containing the lesson.
2. Click the **Delete** (trash) icon next to the lesson.
3. Confirm the deletion. This action cannot be undone.

#### Deleting a course

1. From the instructor dashboard, click the **Delete** icon next to the course.
2. Confirm the deletion. All lessons and materials within the course are permanently removed.

#### Removing an uploaded file

1. Open the lesson editor.
2. In the **Materials** section, click the **Delete** icon next to the file.
3. Confirm the deletion. The file and all its extracted content are removed from the lesson's knowledge base.

---

## Student Tasks

---

### 13. Joining a Session

No account, app download, or registration is required. Students join anonymously using only the PIN provided by their instructor.

**Steps:**

1. Open a web browser on your phone, tablet, or laptop.
2. Go to the application URL provided by your instructor (or scan the QR code displayed in class).
3. On the join page, enter the **6-digit PIN** shown on the projector or given verbally.
4. Click **Join**.
5. You are taken directly to the student session page. Your responses are anonymous.

> If the PIN does not work, check that you entered it correctly. PINs are case-insensitive and digits only. Ask your instructor if the session is still active.

---

### 14. Answering a Discussion Prompt

When your instructor publishes a prompt, it appears automatically on your screen — you do not need to refresh.

#### Short answer or long answer

1. Read the question displayed on your screen.
2. Type your response in the text box provided.
3. Click **Submit**.
4. A confirmation message appears. You cannot edit your response after submitting.

#### Multiple choice

1. Read the question and the four answer options (A, B, C, D).
2. Click the option you believe is correct.
3. Click **Submit**.
4. If your instructor has revealed the answer, your screen will indicate whether your selection was correct.

#### Timer

If your instructor has set a timer, a countdown is shown at the top of the prompt. Submit your response before the timer reaches zero — once it expires, the text box is locked.

#### Waiting for the next prompt

After submitting, your screen shows a waiting state. When your instructor publishes the next prompt, it appears automatically.

---

## Frequently Asked Questions

**Can students see each other's responses?**
No. Responses are only visible to the instructor in their session dashboard.

**Is my name attached to my response?**
No. Students join and respond completely anonymously. No personal information is collected from students.

**What happens if I lose my internet connection during a session?**
Reload the page and re-enter the PIN. Your previous responses are saved. If the session is still active you can continue participating.

**Can I use the same lesson across multiple class sessions?**
Yes. You can start a new session for the same lesson any number of times. Each session's responses are saved separately.

**Can I edit a prompt after publishing it?**
No. Once a prompt is published to students it cannot be edited. Unpublish it and publish a different prompt from your candidate list if needed.

**The AI-generated prompt is not relevant to my content — what should I try?**
Make sure your uploaded files have status **Ready** before generating. Try adding a transcript excerpt in the generation panel that reflects what you just covered. Adjusting the **Focus Areas** in AI Settings to name specific topics also improves relevance significantly.

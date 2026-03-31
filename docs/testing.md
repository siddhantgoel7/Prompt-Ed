# Testing

This document describes the comprehensive testing strategy for the PMCOL Teaching Tool, including acceptance tests, API tests, component tests, unit tests, and UI automation tests. All tests are mapped to user stories through a Requirements Traceability Matrix to ensure complete coverage of functional requirements.

---

## Table of Contents

1. [Testing Overview](#testing-overview)
2. [Test Structure](#test-structure)
3. [Requirements Traceability Matrix](#requirements-traceability-matrix)
4. [Test Types](#test-types)
5. [Running Tests](#running-tests)
6. [Test Coverage](#test-coverage)
7. [Static Code Analysis](#static-code-analysis)
8. [Stress Testing](#stress-testing)
9. [Writing New Tests](#writing-new-tests)

---

## Testing Overview

The PMCOL Teaching Tool employs a multi-layered testing strategy that ensures reliability, maintainability, and confidence in the codebase:

- **Acceptance Tests**: Validate user stories from the user's perspective
- **API Tests**: Verify backend endpoints and data operations
- **Component Tests**: Test React components in isolation
- **Unit Tests**: Validate individual functions and utilities
- **UI Tests**: End-to-end browser automation with Playwright

### Testing Philosophy

- **User Story-Driven**: Every test is labeled with its corresponding user story ID
- **Success and Failure Scenarios**: Tests cover both happy paths and edge cases
- **Traceability**: All tests are tracked in the Requirements Traceability Matrix
- **Confidence Over Coverage**: Tests focus on validating behavior rather than achieving arbitrary coverage metrics

---

## Test Structure

The test suite is organized by test type in the `app/tests/` directory:

```
app/tests/
├── acceptance/              # User story acceptance tests (React Testing Library)
│   ├── ai_features.acceptance.test.tsx
│   ├── anonymous_access.acceptance.test.tsx
│   ├── auth.acceptance.test.tsx
│   ├── auto_save.acceptance.test.tsx
│   ├── auto_save_interval_recovery.acceptance.test.tsx
│   ├── discussion_timer.acceptance.test.tsx
│   ├── instructor_dashboard.acceptance.test.tsx
│   ├── instructor_reconnect.acceptance.test.tsx
│   ├── instructor_session_active_view.test.tsx
│   ├── instructor_session_ended_view.test.tsx
│   ├── instructor_session_page.test.tsx
│   ├── lessons_page.acceptance.test.tsx
│   ├── mc_feedback.acceptance.test.tsx
│   ├── multiple_discussions.acceptance.test.tsx
│   ├── real_time_responses.acceptance.test.tsx
│   ├── student_session_page.test.tsx
│   └── student_submitted_view.test.tsx
├── api/                     # Backend API tests
│   ├── user/
│   │   └── delete/
│   │       └── route.test.ts
│   ├── ai_preferences.test.ts
│   ├── auth.test.ts
│   ├── courses.test.ts
│   ├── fetchFlaggedResponses.test.ts
│   ├── flagResponse.test.ts
│   ├── generalQuestions.test.ts
│   ├── lesson_scoping.test.ts
│   ├── mc_feedback.test.ts
│   ├── socket.test.ts
│   └── unflagResponse.test.ts
├── components/              # Component integration tests
│   ├── AIPreferencesDialog.test.tsx
│   ├── ActiveRightPanel.highlight.test.tsx
│   ├── ActiveRightPanel.test.tsx
│   ├── connectionStatus.test.tsx
│   ├── dashboard.test.tsx
│   ├── DiscussionAnalyticsModal.test.tsx
│   ├── DiscussionPage.highlight.test.tsx
│   ├── DiscussionTimer.test.tsx
│   ├── DiscussionTimerSection.test.tsx
│   ├── lessons_page.test.tsx
│   ├── ResponseCard.test.tsx
│   ├── session.test.tsx
│   ├── SessionDisplayView.test.tsx
│   ├── SessionEndedView.test.tsx
│   ├── SessionHeaderActive.test.tsx
│   ├── SessionHeaderEnded.test.tsx
│   ├── splitView.test.tsx
│   ├── StartDiscussionDialog.multipleResponses.test.tsx
│   ├── StartDiscussionDialog.test.tsx
│   ├── student_prompt_card.test.tsx
│   ├── StudentSessionPage.ended.test.tsx
│   ├── StudentSessionPage.multipleResponses.test.tsx
│   ├── StudentSessionPage.rejoin.test.tsx
│   └── StudentSessionShellLeave.test.tsx
├── fixtures/                # Test data fixtures
│   └── discussions.ts
├── ui/                      # End-to-end Playwright tests
│   ├── global-setup.ts
│   ├── global-teardown.ts
│   ├── instructor_ai_features.spec.ts
│   ├── instructor_ai_preferences.spec.ts
│   ├── instructor_dashboard.spec.ts
│   ├── instructor_highlight_hide.spec.ts
│   ├── instructor_login.spec.ts
│   ├── instructor_past_lessons.spec.ts
│   ├── instructor_reconnect_autosave.spec.ts
│   ├── instructor_timer.spec.ts
│   ├── student_anonymous_access.spec.ts
│   ├── student_join.spec.ts
│   ├── student_lesson_scoping.spec.ts
│   ├── student_mc_feedback.spec.ts
│   ├── student_multiple_responses.spec.ts
│   ├── student_responsive.spec.ts
│   ├── student_submit_response.spec.ts
│   └── student_timer.spec.ts
├── unit/                    # Unit tests for utilities and hooks
│   ├── ai/                  # AI pipeline unit tests
│   │   ├── discussionPrompt.test.ts
│   │   ├── embedChunks_extra.test.ts
│   │   ├── generalQuestionPrompt.test.ts
│   │   ├── generatePrompts.test.ts
│   │   ├── generatePrompts_extra.test.ts
│   │   ├── parsers.test.ts
│   │   ├── providers.test.ts
│   │   ├── providers_extra.test.ts
│   │   ├── retrieval_logic.test.ts
│   │   └── retrieveChunks.test.ts
│   ├── api/                 # API route unit tests
│   │   ├── aiApi.test.ts
│   │   ├── aiPreferences.test.ts
│   │   ├── api_routes_coverage.test.ts
│   │   ├── auth_callback.test.ts
│   │   ├── check_email.test.ts
│   │   ├── courseApi.test.ts
│   │   ├── courseApi_extra.test.ts
│   │   ├── filesApi.test.ts
│   │   ├── general_questions_route.test.ts
│   │   ├── generate_general_route.test.ts
│   │   ├── generate_route.test.ts
│   │   ├── lessonApi.test.ts
│   │   ├── lesson_file_route.test.tsx
│   │   ├── lesson_file_route_extra.test.ts
│   │   ├── lesson_files_list_extra.test.ts
│   │   ├── lesson_files_list_route.test.tsx
│   │   ├── transcript_route.test.tsx
│   │   ├── transcript_route_extra.test.ts
│   │   ├── upload_route_extra.test.ts
│   │   └── upload_route_sync.test.ts
│   ├── components/          # Component unit tests
│   │   ├── AccountPage.test.tsx
│   │   ├── ActiveCenter.test.tsx
│   │   ├── ActiveRightPanel.test.tsx
│   │   ├── ActiveSidebar.test.tsx
│   │   ├── AppLogoThemeToggle.test.tsx
│   │   ├── CandidateCard.test.tsx
│   │   ├── CourseCard.test.tsx
│   │   ├── DiscussionHistory.test.tsx
│   │   ├── DiscussionPage.test.tsx
│   │   ├── DisplayCodeState.test.tsx
│   │   ├── FilesTab.test.tsx
│   │   ├── GeneralQuestionsTab.test.tsx
│   │   ├── HamburgerMenu.test.tsx
│   │   ├── HomeJoin.test.tsx
│   │   ├── JoinCodeOverlay.test.tsx
│   │   ├── LessonCard.test.tsx
│   │   ├── MultipleChoiceEditor.test.tsx
│   │   ├── ResponseListTab.test.tsx
│   │   ├── SessionDisplayView.test.tsx
│   │   ├── SessionEndedView.test.tsx
│   │   ├── SignUpForm.test.tsx
│   │   ├── SplitView.test.tsx
│   │   ├── StartDiscussionDialog.test.tsx
│   │   ├── TimerTab.test.tsx
│   │   ├── UIComponents.test.tsx
│   │   ├── WordCloudPage.test.tsx
│   │   └── ui_basics.test.tsx
│   ├── hooks/               # Custom hook unit tests
│   │   ├── useAccount.test.ts
│   │   ├── useAudioRecorder.test.tsx
│   │   ├── useDebugSweep.test.tsx
│   │   ├── useHomeJoin.test.ts
│   │   ├── useInstructorDashboard.test.ts
│   │   ├── useInstructorDashboard.test.tsx
│   │   ├── useInstructorDashboard_errors.test.ts
│   │   ├── useLessonAI.test.ts
│   │   ├── useLessonDiscussions.test.ts
│   │   ├── useLessonDiscussions_timer.test.ts
│   │   ├── useLessonFiles.test.ts
│   │   ├── useLessonGeneralQuestions.test.ts
│   │   ├── useRealtime.test.ts
│   │   ├── useStudentSession.multipleResponses.test.ts
│   │   ├── useStudentSession.test.ts
│   │   ├── useStudentSession.test.tsx
│   │   └── useStudentSession_branches.test.ts
│   ├── lib/                 # Library utility unit tests
│   │   ├── auth_helpers.test.ts
│   │   ├── supabase_server.test.ts
│   │   └── utils.test.ts
│   ├── pages/               # Page component unit tests
│   │   ├── small_pages.test.tsx
│   │   └── word_cloud_page.test.tsx
│   ├── authHelpers.test.ts
│   ├── csv_utils.test.ts
│   ├── embeddingBlend.test.ts
│   ├── mc_feedback_logic.test.ts
│   ├── random_utils.test.ts
│   ├── supabase.test.ts
│   ├── useAIPreferences.test.ts
│   ├── useRealtime.test.ts
│   ├── useStudentSession.test.ts
│   └── validation.test.ts
├── jest.d.ts                # Jest TypeScript types
└── smoke.test.ts            # CI smoke test
```

---

## Requirements Traceability Matrix

This matrix maps user stories to their corresponding tests, ensuring complete coverage of all functional requirements. Each test type (Acceptance, UI, API, Unit) validates different aspects of the user story from various perspectives.

---

### Must Have Features (Sprint 2)

| User Story | Description | Acceptance Tests | UI Tests (Playwright) | API/Unit Tests | Coverage |
|------------|-------------|------------------|-----------------------|----------------|----------|
| **US 1.01** | Create instructor account | `auth.acceptance.test.tsx` (2.5) | `instructor_login.spec.ts` (20.1–20.5) | `auth.test.ts` (13.1, 13.2, 13.3)<br>`authHelpers.test.ts` (25.1, 25.2)<br>`validation.test.ts` (27.1–27.6) | **Complete**: Signup navigation, API auth, validation |
| **US 1.02** | Login via UAlberta SSO | `auth.acceptance.test.tsx` (2.1, 2.2, 2.3, 2.4) | `instructor_login.spec.ts` (20.6, 20.7, 20.8, 20.9) | `authHelpers.test.ts` (25.3, 25.4) | **Complete**: Email/password + OAuth flows + signup page validation |
| **US 1.03** | Logout securely | `instructor_dashboard.acceptance.test.tsx` (4.8) | `instructor_dashboard.spec.ts` (19.1) | `authHelpers.test.ts` (25.5)<br>`InstructorDashboardHeader.test.tsx` (71.1–71.6) | **Complete**: Dashboard integration + API |
| **US 1.04** | Private lesson viewing | `instructor_dashboard.acceptance.test.tsx` (4.9)<br>`instructor_session_page.test.tsx` (7.1)<br>`lessons_page.acceptance.test.tsx` (8.9) | `instructor_dashboard.spec.ts` (19.2)<br>`lessons_page.test.tsx` (16.1, 16.2, 16.3, 16.4) | — | **Complete**: Authorization checks across all pages |
| **US 1.05** | Create new lesson | `lessons_page.acceptance.test.tsx` (8.2, 8.3, 8.4, 8.8) | `instructor_dashboard.spec.ts` (19.2) | `lessons_page.test.tsx` (16.13–16.17) | **Complete**: Creation flow + validation + errors |
| **US 1.06** | Start lesson (PIN/QR) | `instructor_session_page.test.tsx` (7.2)<br>`instructor_session_active_view.test.tsx` (5.1)<br>`instructor_session_ended_view.test.tsx` (6.6) | — | — | **Complete**: Active state + PIN display tested; QR code generation not explicitly tested |
| **US 1.08** | Delete lesson | `lessons_page.acceptance.test.tsx` (8.5, 8.6, 8.7) | — | `lessons_page.test.tsx` (16.18–16.20) | **Complete**: Delete flow + confirmation |
| **US 1.09** | End lesson | `instructor_session_active_view.test.tsx` (5.4, 5.7)<br>`instructor_session_ended_view.test.tsx` (6.1, 6.3, 6.4)<br>`student_session_page.test.tsx` (12.3) | — | — | **Complete**: End flow + student notification |
| **US 1.10** | Auto-save lesson | `auto_save.acceptance.test.tsx` (3.1, 3.2, 3.3, 3.4) | — | — | **Complete**: Data persistence verification |
| **US 1.25** | Multiple discussions | `multiple_discussions.acceptance.test.tsx` (9.1, 9.2, 9.3, 9.4) | — | — | **Complete**: Sequential discussion flow |
| **US 1.27** | Display prompt | `instructor_session_active_view.test.tsx` (5.5)<br>`student_session_page.test.tsx` (12.1) | — | — | **Complete**: Prompt display covered implicitly via US 1.21/1.28 publish handler (test 5.5) and student prompt visibility (test 12.1); no explicit US 1.27 label in tests |
| **US 1.28** | Start/close discussions | `instructor_session_active_view.test.tsx` (5.5, 5.6) | — | `RestartDiscussionButton.test.tsx` (72.1–72.6) | **Complete**: Start/close handler calls verified; student-side closed state tested via student_session_page |
| **US 1.31** | Display PIN code | `instructor_session_active_view.test.tsx` (5.1, 5.2, 5.3)<br>`instructor_session_page.test.tsx` (7.2, 7.4) | — | — | **Complete**: PIN visibility + overlay |
| **US 1.34** | Real-time responses | `real_time_responses.acceptance.test.tsx` (10.1, 10.2, 10.3, 10.4)<br>`instructor_session_ended_view.test.tsx` (6.2) | — | `useRealtime.test.ts` (26.1–26.8) | **Complete**: Live updates + hook behavior |
| **US 1.49** | Add course | `instructor_dashboard.acceptance.test.tsx` (4.2, 4.3, 4.4) | `instructor_dashboard.spec.ts` (19.1) | `dashboard.test.tsx` (15.6)<br>`courses.test.ts` (14.1, 14.3, 14.4)<br>`validation.test.ts` (27.7, 27.8)<br>`CourseDialog.test.tsx` (73.1–73.8)<br>`CourseCard.test.tsx` (75.1–75.5) | **Complete**: Full CRUD + validation |
| **US 1.50** | Delete course | `instructor_dashboard.acceptance.test.tsx` (4.5, 4.6, 4.7) | — | `dashboard.test.tsx` (15.7)<br>`courses.test.ts` (14.5, 14.6) | **Complete**: Delete flow + errors |
| **US 2.01** | Desktop access | `lessons_page.acceptance.test.tsx` (8.1)<br>`instructor_dashboard.acceptance.test.tsx` (4.1) | `student_responsive.spec.ts` (23.1) | — | **Complete**: Desktop viewport validation |
| **US 2.02** | Mobile access | — | `student_responsive.spec.ts` (23.2, 23.3) | — | **Complete**: Viewport rendering + no horizontal overflow validated; touch interactions not tested |
| **US 2.03** | Anonymous access | `anonymous_access.acceptance.test.tsx` (1.1, 1.2, 1.3, 1.4) | `student_anonymous_access.spec.ts` (21.1, 21.2, 21.3) | — | **Complete**: No auth required + no PII |
| **US 2.06** | Join via PIN | `student_session_page.test.tsx` (12.4) | `student_join.spec.ts` (22.1–22.6) | `useRealtime.test.ts` (26.1–26.8) | **Complete**: Valid/invalid PIN + validation |
| **US 2.07** | Submit responses | `student_session_page.test.tsx` (12.2) | `student_submit_response.spec.ts` (24.1, 24.2, 24.3) | — | **Complete**: Submit flow + validation |
| **US 2.09** | View prompt | `student_session_page.test.tsx` (12.1) | `student_submit_response.spec.ts` (24.1) | — | **Complete**: Prompt visibility |

---

### Must Have Features (Sprint 3)

| User Story | Description | Acceptance Tests | UI Tests (Playwright) | API/Unit Tests | Coverage |
|------------|-------------|------------------|-----------------------|----------------|----------|
| **US 1.12** | Reconnect after connection loss | `instructor_reconnect.acceptance.test.tsx` (36.1, 36.2, 36.3) | `instructor_reconnect_autosave.spec.ts` (41.1) | `connectionStatus.test.tsx` (33.1–33.7)<br>`useRealtime.test.ts` (26.1–26.8) | **Complete**: Reconnect flow, session state preservation, response recovery |
| **US 1.13** | Auto-save at intervals | `auto_save_interval_recovery.acceptance.test.tsx` (35.1, 35.2) | `instructor_reconnect_autosave.spec.ts` (41.1) | — | **Complete**: Interval sync + reconnect-triggered recovery |
| **US 1.14** | View past lesson details | `instructor_session_ended_view.test.tsx` (6.2, 6.5)<br>`session.test.tsx` (17.13) | `instructor_past_lessons.spec.ts` (42.2) | — | **Complete**: Preserved discussions and responses accessible in ended view |
| **US 1.16** | Upload files | `ai_features.acceptance.test.tsx` (34.1, 34.2, 34.3) | `instructor_ai_features.spec.ts` (43.1) | `unit/ai/providers.test.ts` (38.1–38.20)<br>`unit/ai/parsers.test.ts` (37.1–37.22) | **Complete**: Upload button, file list, PDF/PPTX parsing, vision pipeline; error handling tested |
| **US 1.17** | STT transcript capture | `ai_features.acceptance.test.tsx` (34.4, 34.5) | `instructor_ai_features.spec.ts` (43.2) | — | **Complete**: Start/stop recording triggers tested; actual transcription output not unit tested |
| **US 1.18** | Trigger AI prompt generation | `ai_features.acceptance.test.tsx` (34.6, 34.7, 34.8, 34.9) | `instructor_ai_features.spec.ts` (43.3) | — | **Complete**: Generate call, loading indicator, warning on insufficient content, prompt list display |
| **US 1.19** | Review/select AI prompts | `ai_features.acceptance.test.tsx` (34.10, 34.11) | `instructor_ai_features.spec.ts` (43.3) | — | **Complete**: Prompt selection + publish flow |
| **US 1.23** | Multiple choice/short/long answer formats | `ai_features.acceptance.test.tsx` (34.12, 34.13) | `instructor_ai_features.spec.ts` (43.3) | `unit/ai/providers.test.ts` (38.13) | **Complete**: Prompt type selection, MC option generation, json_object mode |
| **US 1.24** | Regenerate AI prompts | `ai_features.acceptance.test.tsx` (34.14) | — | — | **Complete**: Regenerate button interaction tested |
| **US 1.26** | Only students in lesson see prompts | — | `student_lesson_scoping.spec.ts` (40.1) | — | **Complete**: Lesson-ID scoping verified in UI |
| **US 2.04** | See only current lesson prompts | — | `student_lesson_scoping.spec.ts` (40.1) | — | **Complete**: Covered jointly with US 1.26 via lesson scoping test |
| **US 2.08** | Select multiple choice options | `mc_feedback.acceptance.test.tsx` (29.18, 29.19, 29.20, 29.21, 29.22, 29.23) | `student_mc_feedback.spec.ts` (32.8, 32.9) | `student_prompt_card.test.tsx` (30.1–30.13)<br>`api/mc_feedback.test.ts` (31.3) | **Complete**: Option rendering, selection, validation, textarea population |
| **US 2.10** | See MC question feedback | `student_session_page.test.tsx` (12.10, 12.11, 12.12)<br>`mc_feedback.acceptance.test.tsx` (29.1–29.17, 29.24) | `student_mc_feedback.spec.ts` (32.1–32.10) | `unit/mc_feedback_logic.test.ts` (28.1–28.20)<br>`api/mc_feedback.test.ts` (31.1, 31.2, 31.4–31.11) | **Complete**: Correct/incorrect feedback, green/red styling, feedback_enabled flag, correct answer reveal, feedback suppression |

---

### Should Have Features (Sprint 3)

| User Story | Description | Acceptance Tests | UI Tests (Playwright) | API/Unit Tests | Coverage |
|------------|-------------|------------------|-----------------------|----------------|----------|
| **US 2.15** | See lesson/discussion status | `student_session_page.test.tsx` (12.5, 12.6, 12.7, 12.8, 12.9) | `student_lesson_scoping.spec.ts` (40.2) | — | **Complete**: Active/Ended badge rendering across all student view states |

---

### Must Have Features (Sprint 4)

| User Story | Description | Acceptance Tests | UI Tests (Playwright) | API/Unit Tests | Coverage |
|------------|-------------|------------------|-----------------------|----------------|----------|
| **US 1.22** | AI preferences / custom AI settings | — | `instructor_ai_preferences.spec.ts` (8 tests) | `api/ai_preferences.test.ts` (51.1–51.4)<br>`components/AIPreferencesDialog.test.tsx` (57.1–57.3)<br>`unit/useAIPreferences.test.ts` (53.1–53.4) | **Complete**: API CRUD, dialog UI, hook behavior |
| **US 1.29** | Set a time limit for a response window | `discussion_timer.acceptance.test.tsx` (69.13, 69.14) | `instructor_timer.spec.ts` (18 tests) | `components/DiscussionTimerSection.test.tsx` (67.1–67.22)<br>`components/StartDiscussionDialog.test.tsx` (66.1–66.14) | **Complete**: Start dialog, timer section UI, countdown, extend/edit, acceptance flow |
| **US 1.30** | Student can update/resubmit response | — | `student_multiple_responses.spec.ts` (4 tests) | `components/StartDiscussionDialog.multipleResponses.test.tsx` (12 tests)<br>`components/StudentSessionPage.multipleResponses.test.tsx` (14 tests)<br>`unit/hooks/useStudentSession.multipleResponses.test.ts` (11 tests) | **Complete**: Allow multiple responses toggle, student re-submit UI, hook logic for response limits and `canSubmitAnother` |
| **US 1.35** | Hide inappropriate responses | — | `instructor_highlight_hide.spec.ts` (14 tests) | `api/fetchFlaggedResponses.test.ts` (48.1–48.4)<br>`api/flagResponse.test.ts` (50.1–50.4)<br>`api/unflagResponse.test.ts` (49.1–49.4)<br>`components/ResponseCard.test.tsx` (62.3, 62.7–62.10)<br>`components/ActiveRightPanel.highlight.test.tsx` (58.1–58.16)<br>`components/DiscussionPage.highlight.test.tsx` (59.1–59.26) | **Complete**: Flag/unflag API, card red styling, Unflag button, panel hide/show logic |
| **US 1.36** | Highlight a specific response | — | `instructor_highlight_hide.spec.ts` (14 tests) | `components/ResponseCard.test.tsx` (62.1, 62.2, 62.4–62.6)<br>`components/ActiveRightPanel.highlight.test.tsx` (58.1–58.16)<br>`components/DiscussionPage.highlight.test.tsx` (59.1–59.26) | **Complete**: Yellow emphasis, larger text, z-index elevation, toggle behavior |
| **US 1.37** | View responses to a discussion in detail | — | — | `components/splitView.test.tsx` (64.9–64.12) | **Complete**: Response fetch, display, loading state, empty state in split-view panes |
| **US 1.39** | Split view for comparing discussions | — | — | `components/splitView.test.tsx` (64.1–64.16)<br>`components/SessionEndedView.test.tsx` (54.1–54.15)<br>`components/ActiveRightPanel.test.tsx` (61.1–61.10)<br>`components/DiscussionAnalyticsModal.test.tsx` (60.1–60.15) | **Complete**: Dual-pane layout, independent selection, back navigation, live responses |
| **US 1.40** | Discussion analytics | — | — | `components/ActiveRightPanel.test.tsx` (61.1–61.10)<br>`components/DiscussionAnalyticsModal.test.tsx` (60.1–60.15)<br>`components/SessionEndedView.test.tsx` (54.1–54.15) | **Complete**: Analytics modal, response counts, ended-view data display |
| **US 1.41** | Export responses as a file | — | — | `unit/csv_utils.test.ts` (70.1–70.10) | **Complete**: CSV escaping and timestamp formatting utilities |
| **US 1.42** | Export AI-generated prompts and responses | — | — | `unit/csv_utils.test.ts` (70.1–70.10) | **Complete**: Shared CSV utilities validated; full export handler covered via 1.41 shared logic |
| **US 1.43** | Export appropriate lesson statistics | — | — | `unit/csv_utils.test.ts` (70.11–70.16) | **Complete**: Timestamp formatting for stat exports |
| **US 2.11** | See how much time a prompt has left | `discussion_timer.acceptance.test.tsx` (69.1–69.12, 69.15–69.16) | `student_timer.spec.ts` (20 tests) | `components/DiscussionTimer.test.tsx` (68.1–68.10) | **Complete**: Circular countdown, MM:SS format, expiry state, aria labels, real-time updates |
| **US 2.12** | Student sees session-ended state | — | — | `components/StudentSessionPage.ended.test.tsx` (6 tests) | **Complete**: Ended alert, custom/default message, badge rendering |
| **US 2.13** | Student can leave session | — | — | `components/StudentSessionShellLeave.test.tsx` (4 tests) | **Complete**: Leave flow interaction tested |
| **US 2.14** | Student can rejoin session | — | — | `components/StudentSessionPage.rejoin.test.tsx` (7 tests)<br>`unit/useStudentSession.test.ts` (52.1–52.3) | **Complete**: Session restoration from storage, remount persistence |

---

### Should Have / Could Have Features (Sprint 4)

| User Story | Description | Acceptance Tests | UI Tests (Playwright) | API/Unit Tests | Coverage |
|------------|-------------|------------------|-----------------------|----------------|----------|
| **US 2.10** *(extended)* | MC feedback in submitted view | `acceptance/student_submitted_view.test.tsx` (65.1–65.24) | — | — | **Extended**: Post-submission feedback UI with timer-gate, timed/no-timer scenarios, short/long answer submitted state |

---

### Must Have Features (Sprint 5)

| User Story | Description | Acceptance Tests | UI Tests (Playwright) | API/Unit Tests | Coverage |
|------------|-------------|------------------|-----------------------|----------------|----------|
| **US 1.51** | General questions AI feature | — | — | `api/generalQuestions.test.ts` (10 tests)<br>`unit/ai/generalQuestionPrompt.test.ts` (13 tests)<br>`unit/api/general_questions_route.test.ts` (8 tests)<br>`unit/api/generate_general_route.test.ts` (10 tests)<br>`unit/components/GeneralQuestionsTab.test.tsx` (19 tests)<br>`unit/hooks/useLessonGeneralQuestions.test.ts` (8 tests) | **Complete**: Data layer CRUD, API routes (401/403/404/success), prompt builder with Bloom's difficulty levels, component UI (empty/upload-prompt/generation/error states), hook lifecycle |

---

### Cumulative Test Coverage Summary (Sprints 1–5)

- **Total User Stories Tested**: 53 (22 Sprint 2 + 15 Sprint 3 + 15 Sprint 4 + 1 Sprint 5)
- **Acceptance Tests**: 17 files, 148 test cases
- **Component Tests**: 27 files, 219 test cases
- **UI Tests (Playwright)**: 17 spec files, 104 test cases
- **API Tests**: 11 files, 43 test cases
- **Unit Tests**: 89 files, 643 test cases
- **Smoke Tests**: 1 file, 1 test case
- **Total Test Cases**: 1,147 (across 159 files)

---

### Test Count by File

#### Acceptance Tests (148 tests)

| Test File | User Stories | Tests |
|-----------|-------------|-------|
| `ai_features.acceptance.test.tsx` | US 1.16, 1.17, 1.18, 1.19, 1.23, 1.24 | 14 |
| `anonymous_access.acceptance.test.tsx` | US 2.03 | 4 |
| `auth.acceptance.test.tsx` | US 1.01, 1.02 | 5 |
| `auto_save.acceptance.test.tsx` | US 1.10 | 4 |
| `auto_save_interval_recovery.acceptance.test.tsx` | US 1.13 | 2 |
| `discussion_timer.acceptance.test.tsx` | US 1.29, 2.11 | 16 |
| `instructor_dashboard.acceptance.test.tsx` | US 1.03, 1.04, 1.49, 1.50, 2.01 | 9 |
| `instructor_reconnect.acceptance.test.tsx` | US 1.12 | 3 |
| `instructor_session_active_view.test.tsx` | US 1.06, 1.09, 1.12, 1.28, 1.31 | 12 |
| `instructor_session_ended_view.test.tsx` | US 1.06, 1.09, 1.14, 1.34 | 9 |
| `instructor_session_page.test.tsx` | US 1.04, 1.06, 1.09, 1.31 | 4 |
| `lessons_page.acceptance.test.tsx` | US 1.04, 1.05, 1.08, 2.01 | 9 |
| `mc_feedback.acceptance.test.tsx` | US 2.08, 2.10 | 24 |
| `multiple_discussions.acceptance.test.tsx` | US 1.25 | 4 |
| `real_time_responses.acceptance.test.tsx` | US 1.34 | 4 |
| `student_session_page.test.tsx` | US 1.09, 2.03, 2.06, 2.07, 2.09, 2.10, 2.15 | 12 |
| `student_submitted_view.test.tsx` | US 2.08, 2.10 | 24 |

#### Component Tests (219 tests)

| Test File | User Stories | Tests |
|-----------|-------------|-------|
| `AIPreferencesDialog.test.tsx` | US 1.22 | 3 |
| `ActiveRightPanel.highlight.test.tsx` | US 1.35, 1.36 | 16 |
| `ActiveRightPanel.test.tsx` | US 1.39, 1.40 | 10 |
| `connectionStatus.test.tsx` | US 1.12 | 7 |
| `dashboard.test.tsx` | US 1.03, 1.49, 1.50 | 7 |
| `DiscussionAnalyticsModal.test.tsx` | US 1.39, 1.40 | 15 |
| `DiscussionPage.highlight.test.tsx` | US 1.35, 1.36 | 26 |
| `DiscussionTimer.test.tsx` | US 2.11 | 10 |
| `DiscussionTimerSection.test.tsx` | US 1.29 | 22 |
| `lessons_page.test.tsx` | US 1.04, 1.05, 1.08 | 20 |
| `ResponseCard.test.tsx` | US 1.35, 1.36 | 10 |
| `session.test.tsx` | US 1.04, 1.06, 1.09, 1.14, 1.25, 1.34, 1.41 | 13 |
| `SessionDisplayView.test.tsx` | US 1.06, 1.31 | 1 |
| `SessionEndedView.test.tsx` | US 1.39, 1.40 | 15 |
| `SessionHeaderActive.test.tsx` | US 1.06, 1.31 | 1 |
| `SessionHeaderEnded.test.tsx` | US 1.09, 1.14 | 2 |
| `splitView.test.tsx` | US 1.25, 1.34, 1.37, 1.39 | 16 |
| `StartDiscussionDialog.multipleResponses.test.tsx` | US 1.30 | 12 |
| `StartDiscussionDialog.test.tsx` | US 1.29 | 14 |
| `student_prompt_card.test.tsx` | US 2.08, 2.10 | 13 |
| `StudentSessionPage.ended.test.tsx` | US 2.12 | 6 |
| `StudentSessionPage.multipleResponses.test.tsx` | US 1.30 | 14 |
| `StudentSessionPage.rejoin.test.tsx` | US 2.14 | 7 |
| `StudentSessionShellLeave.test.tsx` | US 2.13 | 4 |
| `InstructorDashboardHeader.test.tsx` | US 1.03 | 6 |
| `RestartDiscussionButton.test.tsx` | US 1.28 | 6 |
| `CourseDialog.test.tsx` | US 1.49 | 8 |
| `ThemeProvider.test.tsx` | Layout | 1 |
| `CourseCard.test.tsx` | US 1.49 | 5 |

#### UI Tests — Playwright (104 tests)

| Test File | User Stories | Tests |
|-----------|-------------|-------|
| `instructor_ai_features.spec.ts` | US 1.16, 1.17, 1.18, 1.19, 1.23 | 3 |
| `instructor_ai_preferences.spec.ts` | US 1.22 | 8 |
| `instructor_dashboard.spec.ts` | US 1.03, 1.04, 1.05, 1.49 | 2 |
| `instructor_highlight_hide.spec.ts` | US 1.35, 1.36 | 14 |
| `instructor_login.spec.ts` | US 1.01, 1.02 | 9 |
| `instructor_past_lessons.spec.ts` | US 1.04, 1.14 | 2 |
| `instructor_reconnect_autosave.spec.ts` | US 1.12, 1.13 | 1 |
| `instructor_timer.spec.ts` | US 1.29 | 18 |
| `student_anonymous_access.spec.ts` | US 2.03 | 3 |
| `student_join.spec.ts` | US 2.06 | 6 |
| `student_lesson_scoping.spec.ts` | US 1.26, 2.04, 2.15 | 2 |
| `student_mc_feedback.spec.ts` | US 2.08, 2.10 | 10 |
| `student_multiple_responses.spec.ts` | US 1.30 | 4 |
| `student_responsive.spec.ts` | US 2.01, 2.02 | 3 |
| `student_submit_response.spec.ts` | US 2.07, 2.09 | 3 |
| `student_timer.spec.ts` | US 2.11 | 20 |

#### API Tests (43 tests)

| Test File | User Stories | Tests |
|-----------|-------------|-------|
| `ai_preferences.test.ts` | US 1.22 | 4 |
| `auth.test.ts` | US 1.01 | 3 |
| `courses.test.ts` | US 1.49, 1.50 | 6 |
| `fetchFlaggedResponses.test.ts` | US 1.35 | 4 |
| `flagResponse.test.ts` | US 1.35 | 4 |
| `generalQuestions.test.ts` | US 1.51 | 10 |
| `lesson_scoping.test.ts` | US 1.26, 2.04 | 3 |
| `mc_feedback.test.ts` | US 2.08, 2.10 | 11 |
| `socket.test.ts` | Infrastructure | 1 |
| `unflagResponse.test.ts` | US 1.35 | 4 |
| `user/delete/route.test.ts` | Infrastructure | 4 |

#### Unit Tests (643 tests)

**Top-level unit tests:**

| Test File | User Stories | Tests |
|-----------|-------------|-------|
| `unit/authHelpers.test.ts` | US 1.01, 1.02, 1.03 | 5 |
| `unit/csv_utils.test.ts` | US 1.41, 1.42, 1.43 | 16 |
| `unit/embeddingBlend.test.ts` | US 1.18 | 7 |
| `unit/mc_feedback_logic.test.ts` | US 2.10 | 20 |
| `unit/random_utils.test.ts` | Infrastructure | 7 |
| `unit/supabase.test.ts` | Infrastructure | 4 |
| `unit/useAIPreferences.test.ts` | US 1.22 | 4 |
| `unit/useRealtime.test.ts` | US 1.12, 1.34, 2.06 | 8 |
| `unit/useStudentSession.test.ts` | US 2.14 | 3 |
| `unit/validation.test.ts` | US 1.01, 1.49 | 8 |

**unit/ai/ — AI pipeline tests:**

| Test File | User Stories | Tests |
|-----------|-------------|-------|
| `unit/ai/discussionPrompt.test.ts` | US 1.18, 1.22 | 8 |
| `unit/ai/embedChunks_extra.test.ts` | US 1.16 | 3 |
| `unit/ai/generalQuestionPrompt.test.ts` | US 1.51 | 13 |
| `unit/ai/generatePrompts.test.ts` | US 1.18 | 5 |
| `unit/ai/generatePrompts_extra.test.ts` | US 1.18 | 5 |
| `unit/ai/parsers.test.ts` | US 1.16 | 22 |
| `unit/ai/providers.test.ts` | US 1.16, 1.23 | 20 |
| `unit/ai/providers_extra.test.ts` | US 1.16 | 3 |
| `unit/ai/retrieval_logic.test.ts` | US 1.16 | 7 |
| `unit/ai/retrieveChunks.test.ts` | US 1.16 | 6 |

**unit/api/ — API route unit tests:**

| Test File | User Stories | Tests |
|-----------|-------------|-------|
| `unit/api/aiApi.test.ts` | US 1.18, 1.51 | 13 |
| `unit/api/aiPreferences.test.ts` | US 1.22 | 6 |
| `unit/api/api_routes_coverage.test.ts` | Infrastructure | 4 |
| `unit/api/auth_callback.test.ts` | US 1.01, 1.02 | 4 |
| `unit/api/check_email.test.ts` | US 1.01 | 3 |
| `unit/api/courseApi.test.ts` | US 1.49, 1.50 | 4 |
| `unit/api/courseApi_extra.test.ts` | US 1.49, 1.50 | 3 |
| `unit/api/filesApi.test.ts` | US 1.16 | 9 |
| `unit/api/general_questions_route.test.ts` | US 1.51 | 8 |
| `unit/api/generate_general_route.test.ts` | US 1.51 | 10 |
| `unit/api/generate_route.test.ts` | US 1.18 | 7 |
| `unit/api/lessonApi.test.ts` | US 1.05, 1.08 | 2 |
| `unit/api/lesson_file_route.test.tsx` | US 1.16 | 4 |
| `unit/api/lesson_file_route_extra.test.ts` | US 1.16 | 9 |
| `unit/api/lesson_files_list_extra.test.ts` | US 1.16 | 5 |
| `unit/api/lesson_files_list_route.test.tsx` | US 1.16 | 2 |
| `unit/api/transcript_route.test.tsx` | US 1.17 | 3 |
| `unit/api/transcript_route_extra.test.ts` | US 1.17 | 4 |
| `unit/api/upload_route_extra.test.ts` | US 1.16 | 7 |
| `unit/api/upload_route_sync.test.ts` | US 1.16 | 6 |

**unit/components/ — Component unit tests:**

| Test File | User Stories | Tests |
|-----------|-------------|-------|
| `unit/components/AccountPage.test.tsx` | US 1.03 | 5 |
| `unit/components/ActiveCenter.test.tsx` | US 1.18, 1.19 | 3 |
| `unit/components/ActiveRightPanel.test.tsx` | US 1.39, 1.40 | 4 |
| `unit/components/ActiveSidebar.test.tsx` | US 1.25, 1.34 | 6 |
| `unit/components/AppLogoThemeToggle.test.tsx` | Infrastructure | 13 |
| `unit/components/CandidateCard.test.tsx` | US 1.19, 1.23 | 15 |
| `unit/components/CourseCard.test.tsx` | US 1.49, 1.50 | 4 |
| `unit/components/DiscussionHistory.test.tsx` | US 1.14, 1.25 | 11 |
| `unit/components/DiscussionPage.test.tsx` | US 1.34, 1.35 | 4 |
| `unit/components/DisplayCodeState.test.tsx` | US 1.31 | 3 |
| `unit/components/FilesTab.test.tsx` | US 1.16 | 19 |
| `unit/components/GeneralQuestionsTab.test.tsx` | US 1.51 | 19 |
| `unit/components/HamburgerMenu.test.tsx` | Infrastructure | 14 |
| `unit/components/HomeJoin.test.tsx` | US 2.06 | 7 |
| `unit/components/JoinCodeOverlay.test.tsx` | US 1.31 | 4 |
| `unit/components/LessonCard.test.tsx` | US 1.05, 1.08 | 12 |
| `unit/components/MultipleChoiceEditor.test.tsx` | US 1.23, 2.08 | 10 |
| `unit/components/ResponseListTab.test.tsx` | US 1.34, 1.35 | 13 |
| `unit/components/SessionDisplayView.test.tsx` | US 1.06, 1.31 | 7 |
| `unit/components/SessionEndedView.test.tsx` | US 1.39, 1.40 | 6 |
| `unit/components/SignUpForm.test.tsx` | US 1.01 | 6 |
| `unit/components/SplitView.test.tsx` | US 1.37, 1.39 | 20 |
| `unit/components/StartDiscussionDialog.test.tsx` | US 1.29 | 7 |
| `unit/components/TimerTab.test.tsx` | US 1.29, 2.11 | 5 |
| `unit/components/UIComponents.test.tsx` | Infrastructure | 1 |
| `unit/components/WordCloudPage.test.tsx` | US 1.34 | 11 |
| `unit/components/ui_basics.test.tsx` | Infrastructure | 5 |

**unit/hooks/ — Custom hook unit tests:**

| Test File | User Stories | Tests |
|-----------|-------------|-------|
| `unit/hooks/useAccount.test.ts` | US 1.03 | 6 |
| `unit/hooks/useAudioRecorder.test.tsx` | US 1.17 | 8 |
| `unit/hooks/useDebugSweep.test.tsx` | Infrastructure | 3 |
| `unit/hooks/useHomeJoin.test.ts` | US 2.06 | 4 |
| `unit/hooks/useInstructorDashboard.test.ts` | US 1.03, 1.49, 1.50 | 7 |
| `unit/hooks/useInstructorDashboard.test.tsx` | US 1.03, 1.49, 1.50 | 4 |
| `unit/hooks/useInstructorDashboard_errors.test.ts` | US 1.03, 1.49, 1.50 | 11 |
| `unit/hooks/useLessonAI.test.ts` | US 1.18, 1.19 | 4 |
| `unit/hooks/useLessonDiscussions.test.ts` | US 1.25, 1.28, 1.34 | 8 |
| `unit/hooks/useLessonDiscussions_timer.test.ts` | US 1.29 | 2 |
| `unit/hooks/useLessonFiles.test.ts` | US 1.16 | 12 |
| `unit/hooks/useLessonGeneralQuestions.test.ts` | US 1.51 | 8 |
| `unit/hooks/useRealtime.test.ts` | US 1.12, 1.34, 2.06 | 9 |
| `unit/hooks/useStudentSession.multipleResponses.test.ts` | US 1.30 | 11 |
| `unit/hooks/useStudentSession.test.ts` | US 2.06, 2.14 | 5 |
| `unit/hooks/useStudentSession.test.tsx` | US 2.06, 2.14 | 5 |
| `unit/hooks/useStudentSession_branches.test.ts` | US 2.06, 2.14 | 9 |

**unit/lib/ — Library utility tests:**

| Test File | User Stories | Tests |
|-----------|-------------|-------|
| `unit/lib/auth_helpers.test.ts` | US 1.01, 1.02 | 1 |
| `unit/lib/supabase_server.test.ts` | Infrastructure | 2 |
| `unit/lib/utils.test.ts` | Infrastructure | 9 |

**unit/pages/ — Page component tests:**

| Test File | User Stories | Tests |
|-----------|-------------|-------|
| `unit/pages/small_pages.test.tsx` | US 1.01, 1.02 | 4 |
| `unit/pages/word_cloud_page.test.tsx` | US 1.34 | 5 |

---

### Success vs Failure Scenario Coverage (Cumulative)

| Category | Success | Failure | Total |
|----------|---------|---------|-------|
| Authentication (US 1.01, 1.02, 1.03) | 13 | 8 | 21 |
| Authorization (US 1.04) | 4 | 3 | 7 |
| Lesson Management (US 1.05, 1.06, 1.08, 1.09) | 16 | 6 | 22 |
| Auto-save / Reconnect (US 1.10, 1.12, 1.13) | 9 | 1 | 10 |
| Past Lesson View (US 1.14) | 2 | 0 | 2 |
| AI Pipeline (US 1.16, 1.17, 1.18, 1.19, 1.23, 1.24) | 38 | 6 | 44 |
| Discussions (US 1.25, 1.27, 1.28) | 6 | 1 | 7 |
| Lesson Scoping (US 1.26, 2.04) | 5 | 1 | 6 |
| AI Preferences (US 1.22) | 14 | 5 | 19 |
| Timer / Time Limit (US 1.29, 2.11) | 74 | 8 | 82 |
| Multiple Responses (US 1.30) | 35 | 6 | 41 |
| PIN Display (US 1.31) | 5 | 0 | 5 |
| Real-time (US 1.34) | 10 | 1 | 11 |
| Highlight / Hide Responses (US 1.35, 1.36) | 52 | 14 | 66 |
| Split View / Detail View (US 1.37, 1.39) | 28 | 3 | 31 |
| Analytics (US 1.40) | 20 | 5 | 25 |
| CSV Export (US 1.41, 1.42, 1.43) | 14 | 2 | 16 |
| Courses (US 1.49, 1.50) | 11 | 5 | 16 |
| Responsive Design (US 2.01, 2.02) | 5 | 0 | 5 |
| Student Access (US 2.03, 2.06, 2.07, 2.09) | 18 | 5 | 23 |
| MC Options (US 2.08) | 5 | 3 | 8 |
| MC Feedback (US 2.10) | 52 | 19 | 71 |
| Student Session State (US 2.12, 2.13, 2.14) | 15 | 2 | 17 |
| Status Indicators (US 2.15) | 6 | 0 | 6 |
| General Questions AI (US 1.51) | 52 | 16 | 68 |
| **TOTALS** | **515** | **120** | **635** |

---

### Coverage Depth by User Story (Cumulative)

**Well-Covered (8+ tests):**
US 1.01 (12), US 1.04 (7), US 1.05 (9), US 1.12 (13), US 1.16 (57), US 1.17 (10), US 1.18 (22), US 1.22 (29), US 1.29 (61), US 1.30 (41), US 1.34 (28), US 1.35 (79), US 1.36 (52), US 1.39 (51), US 1.40 (35), US 1.41 (16), US 1.49 (21), US 1.51 (68), US 2.06 (21), US 2.08 (29), US 2.10 (71), US 2.11 (46), US 2.14 (22)

**Adequately Covered (4–7 tests):**
US 1.02 (5), US 1.03 (26), US 1.08 (6), US 1.09 (4), US 1.10 (4), US 1.13 (4), US 1.14 (6), US 1.19 (7), US 1.23 (9), US 1.25 (5), US 1.31 (13), US 1.37 (24), US 1.50 (13), US 2.03 (7), US 2.07 (4), US 2.12 (6), US 2.15 (6)

**Minimally Covered (1–3 tests):**
US 1.06 (3), US 1.24 (2), US 1.26 (6), US 1.27 (1), US 1.28 (2), US 1.42 (2), US 1.43 (6), US 2.01 (3), US 2.02 (2), US 2.04 (5), US 2.09 (2), US 2.13 (4)

Even minimally covered stories have tests across multiple test types (acceptance + UI or unit), providing confidence through diverse validation rather than test count alone.

---

### Coverage Levels

| Coverage Type | Status |
|--------------|--------|
| **Success Scenarios** | All user stories have success path tests |
| **Failure Scenarios** | All user stories have failure/error tests |
| **User Story Labeling** | All tests labeled with `[US X.XX][ATY]` format |
| **UI Automation** | Critical flows automated with Playwright |
| **API Testing** | All backend API routes tested |
| **Cross-browser** | Chromium, Firefox, WebKit supported |

---

### Test Labeling Convention

All tests follow a consistent labeling format:

```typescript
it('[US X.XX][ATY] success/failure: test description', () => {
  // Test implementation
});
```

**Where:**
- `US X.XX` = User Story ID
- `ATY` = Acceptance Test number (AT1, AT2, etc.)
- `success/failure/state` = Test scenario type

**Example:**
```typescript
it('[US 1.02][AT1] success: email/password login redirects instructor to dashboard', async () => {
  // ...
});
```

---

## Test Types

### 1. Acceptance Tests (`tests/acceptance/`)

**Purpose**: Validate user stories from the user's perspective using React Testing Library.

**Technology**: Jest + React Testing Library

**Key Features**:
- Tests user-facing behavior
- Mocks external dependencies (Supabase, Next.js router)
- Tests both success and failure scenarios
- Validates UI state changes

**Example Test**:
```typescript
// [US 2.03] Anonymous access
it('[US 2.03][AT1] success: student joins without providing name, email, or ID', () => {
  useStudentSessionMock.mockReturnValue({
    lesson: { title: 'Lesson' },
    activeDiscussion: { status: 'active', prompt_text: 'What is X?' },
    // ... other state
  });

  render(<StudentSessionPage lessonId="lesson-1" />);

  expect(screen.getByText(/What is X\?/i)).toBeInTheDocument();
  expect(screen.queryByLabelText(/name/i)).not.toBeInTheDocument();
  expect(screen.queryByLabelText(/email/i)).not.toBeInTheDocument();
});
```

**Coverage**:
- 17 acceptance test files
- 148 individual test cases
- All Sprint 2, Sprint 3, and Sprint 4 user stories covered

---

### 2. API Tests (`tests/api/`)

**Purpose**: Verify backend endpoints and data operations.

**Technology**: Jest

**Key Features**:
- Tests Supabase client interactions
- Validates OAuth callback flow
- Tests CRUD operations on courses
- Tests MC question feedback API (correct/incorrect evaluation, safe row stripping)
- Verifies error handling

**Example Test**:
```typescript
it('[US 1.01][AT2] should exchange code for session successfully', async () => {
  const validCode = 'validcode';

  mockSupabase.auth.exchangeCodeForSession.mockResolvedValue({
    data: { session: { access_token: 'token' } },
    error: null,
  });

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(validCode);

  expect(error).toBeNull();
  expect(data.session).not.toBeNull();
});
```

**Coverage**:
- Auth callback tests (success, failure, edge cases)
- Course operations (fetch, create, delete)
- MC feedback operations (fetch, submit, evaluate, enable/disable)
- Socket.io placeholder endpoint

---

### 3. Component Tests (`tests/components/`)

**Purpose**: Test React components with more integration than unit tests but less than acceptance tests.

**Technology**: Jest + React Testing Library

**Key Features**:
- Tests component rendering
- Validates user interactions
- Tests state management
- Verifies navigation flows

**Example Test**:
```typescript
it('should display courses when loaded', async () => {
  const mockCourses = [
    { id: '1', title: 'PMCOL 400' },
    { id: '2', title: 'PMCOL 401' },
  ];

  mockSupabase.from.mockReturnValue({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({
          data: mockCourses,
          error: null,
        }),
      }),
    }),
  });

  render(<Dashboard />);

  await waitFor(() => {
    expect(screen.getByText('PMCOL 400')).toBeInTheDocument();
    expect(screen.getByText('PMCOL 401')).toBeInTheDocument();
  });
});
```

**Coverage**:
- Dashboard component (loading, rendering, CRUD operations)
- Lessons page (authentication, authorization, navigation)
- Session page (active view, ended view, state management)
- Connection status (connected/disconnected/reconnecting states)
- Split view (dual-pane discussion comparison, real-time updates)
- Student prompt card (MC option rendering, selection, security)
- Response card (highlight/flag styling, emphasis states)
- Discussion timer (circular countdown, MM:SS, expiry state)
- Timer section (edit/extend controls, no-time-limit mode)
- Start discussion dialog (timer configuration, confirm/cancel)
- Analytics modal and ended view (response counts, export)
- AI preferences dialog (settings UI)
- Student session states (ended view, leave, rejoin)

---

### 4. UI Tests (`tests/ui/`)

**Purpose**: End-to-end browser automation testing real user flows.

**Technology**: Playwright

**Key Features**:
- Tests complete user journeys
- Runs in real browsers (Chromium, Firefox, WebKit)
- Tests responsive design
- Validates cross-browser compatibility
- Uses global setup/teardown for test data

**Global Setup/Teardown**:

The UI tests use Playwright's global setup and teardown to manage test data:

```typescript
// global-setup.ts
// Automatically seeds a test lesson with PIN 123456 and an active MC discussion
export default async function globalSetup() {
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  
  let { data: lesson } = await supabase
    .from('lessons')
    .select('id, course_id, status, pin_code')
    .eq('pin_code', '123456')
    .single();
    
  // If not found, the script automatically re-seeds the lesson and discussions...
}
```
// global-teardown.ts
// Cleans up responses created during test runs
export default async function globalTeardown() {
  // Delete test responses but keep lesson for next run
  await supabase.from('responses').delete().eq('discussion_id', testDiscussionId);
}
```

**Coverage**:
- **16 spec files** (plus global setup/teardown) with **104 test cases**
- **All critical user flows** automated end-to-end
- **Cross-browser testing** on Chromium, Firefox, WebKit
- **Responsive design** validated on desktop and mobile viewports
- **Real-world scenarios** including success, failure, and edge cases

**Benefits**:
- Catches integration issues between frontend and backend
- Validates actual user experience in real browsers
- Tests JavaScript execution and DOM interactions
- Verifies responsive design on different screen sizes
- Provides confidence that deployed app works correctly

---

### 5. Unit Tests (`tests/unit/`)

**Purpose**: Test individual functions, utilities, and hooks in isolation.

**Technology**: Jest + React Testing Library (for hooks)

**Key Features**:
- Tests pure functions
- Validates utility logic
- Tests custom React hooks
- Fast execution time

**Test Files** (organized by subdirectory):

1. **`unit/ai/`** — AI pipeline: parsers (PDF/PPTX), providers (GPT-4o/Gemini/embeddings), prompt builders, embedding blend, retrieval, general question prompt
2. **`unit/api/`** — API route handlers: auth callback, course/lesson/file APIs, generate route, transcript route, upload route, general questions route, AI preferences
3. **`unit/components/`** — Component unit tests: instructor UI (CandidateCard, FilesTab, GeneralQuestionsTab, ActiveSidebar, etc.), student UI (HomeJoin, MultipleChoiceEditor, SplitView, etc.)
4. **`unit/hooks/`** — Custom hook unit tests: useInstructorDashboard, useLessonAI, useLessonDiscussions, useLessonFiles, useLessonGeneralQuestions, useStudentSession, useRealtime, useAudioRecorder, useHomeJoin, useAccount
5. **`unit/lib/`** — Library utilities: auth helpers, Supabase server client, `cn`/`formatTime` utilities
6. **`unit/pages/`** — Page component tests: login/signup pages, word cloud page
7. **Top-level unit** — authHelpers, validation, csv utils, mc_feedback_logic, embeddingBlend, random_utils, supabase, useAIPreferences, useRealtime, useStudentSession

**Coverage**:
- **89 unit test files** with **643 test cases**
- Full coverage of AI pipeline, all API routes, all custom hooks, and all major components

---

### 6. Fixtures (`tests/fixtures/`)

**Purpose**: Provide consistent test data across test files.

**`discussions.ts`** provides predefined mock objects and helper functions for discussion and response testing, including MC question fixtures, response fixtures, and generator helpers.

---

### 7. Smoke Test (`tests/smoke.test.ts`)

**Purpose**: Verify test infrastructure is working in CI/CD pipeline.

```typescript
describe("CI Smoke Test", () => {
  it("should confirm tests are running in GitHub Actions", () => {
    expect(1 + 1).toBe(2);
  });
});
```

---

## Running Tests

### Prerequisites

```bash
cd app
npm install
```

### Test Data Setup for UI Tests

The Playwright UI tests require a test lesson with PIN `123456` and an active discussion.

**Automated Setup Execution**:
You do not need to manually seed the database anymore. `tests/ui/global-setup.ts` will automatically verify if the 123456 test lesson exists with an active multiple-choice discussion. 

If it does not exist, the `global-setup.ts` script securely uses your `SUPABASE_SERVICE_ROLE_KEY` to recreate the course, lesson, and active discussion in the background right before the Playwright tests begin running.

- The test lesson remains active between test runs.
- `global-teardown.ts` cleans up test responses but keeps the lesson intact.

### Run All Tests

```bash
npm test
```

### Run Tests in Watch Mode

```bash
npm run test:watch
```

### Run Tests with Coverage

```bash
npm run test:coverage
```

### Run Acceptance Tests Only

```bash
npm test -- tests/acceptance
```

### Run API Tests Only

```bash
npm test -- tests/api
```

### Run Component Tests Only

```bash
npm test -- tests/components
```

### Run Unit Tests Only

```bash
npm test -- tests/unit
```

### Run UI Tests (Playwright)

**Prerequisites**:
```bash
npx playwright install --with-deps
```

**Run all UI tests (headless)**:
```bash
npm run test:ui
```

**Run UI tests with browser visible**:
```bash
npm run test:ui:headed
```

**Run UI tests in debug mode**:
```bash
npm run test:ui:debug
```

**Run specific UI test file**:
```bash
npx playwright test tests/ui/instructor_login.spec.ts
npx playwright test tests/ui/student_join.spec.ts
```

**Run UI tests in specific browser**:
```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

**View Playwright test report**:
```bash
npx playwright show-report
```

### Run Tests for Specific User Story

```bash
# Example: Find all tests for US 1.02 (Login via SSO)
npm test -- --testNamePattern="US 1.02"

# Example: Find all tests for US 2.10 (MC feedback)
npm test -- --testNamePattern="US 2.10"
```

### CI Pipeline Tests

In GitHub Actions, all test types run automatically:

```yaml
- name: Run Jest (Acceptance, API, Component, Unit)
  run: npm test

- name: Run Playwright (UI Tests)
  run: npm run test:ui
```

See `.github/workflows/ci.yml` for full CI configuration.

---

## Test Coverage

### Coverage Goals

While we don't mandate specific coverage percentages, we aim for:

- **Critical paths**: 100% coverage (auth, lesson lifecycle, data persistence)
- **User-facing features**: >90% coverage
- **Utility functions**: >80% coverage
- **UI components**: Behavior-focused (not coverage-focused)

### Current Coverage

To view current coverage:

```bash
npm run test:coverage
```

Then open `app/coverage/lcov-report/index.html` in your browser.

---

## Static Code Analysis

### Tool: SonarQube

[SonarQube](https://www.sonarsource.com/products/sonarqube/) is an open-source static code analysis platform that continuously inspects a codebase for bugs, vulnerabilities, security hotspots, code smells, duplications, and test coverage gaps — without executing the code. It parses source files, applies rule sets for the relevant languages, and produces a dashboard summarising quality across five dimensions: **Security**, **Reliability**, **Maintainability**, **Coverage**, and **Duplications**.

For this project, SonarQube Community Edition was used to analyse the TypeScript/React (Next.js) front-end and server-side API routes that make up the PMCOL Teaching Tool.

---

### Configuration

The scan is configured in [`sonar-project.properties`](../sonar-project.properties) at the repository root:

| Parameter | Value | Purpose |
|-----------|-------|---------|
| `sonar.projectKey` | `W26-DeptOfPharmocology` | Unique identifier in the SonarQube server |
| `sonar.sources` | `app/src` | Application source code only |
| `sonar.tests` | `app/tests` | Test directory (excluded from production metrics) |
| `sonar.test.inclusions` | `**/*.test.tsx`, `**/*.test.ts`, `**/*.spec.ts` | Files treated as test code |
| `sonar.exclusions` | `node_modules`, `.next`, `coverage`, `public`, `dist`, etc. | Dependencies and build artefacts are excluded |
| `sonar.javascript.lcov.reportPaths` | `app/coverage/lcov.info` | Coverage data from `npm run test:coverage` fed into SonarQube |
| `sonar.typescript.tsconfigPath` | `app/tsconfig.json` | TypeScript compiler settings used for accurate type-aware analysis |

The scan is triggered automatically by the GitHub Actions workflow defined in `.github/workflows/sonarqube.yml`, which runs on every push to `main` and on pull requests targeting `main` or any `sprint-*` branch. Before calling the scanner, the workflow runs `npm run test:coverage` so that SonarQube receives an up-to-date LCOV coverage report.

---

### What Was Analysed

SonarQube inspected all TypeScript and TSX files under `app/src/`, including:

- **API routes** — Next.js App Router server-side handlers (`/api/auth/callback`, `/api/lessons/[lessonId]/*`, `/api/user/ai-preferences`, etc.)
- **React components** — instructor dashboard, student session, prompt management, file upload, and shared UI components
- **Custom hooks** — real-time session management (`useRealtime`, `useSessionPage`), auth, and data-fetching hooks
- **Service layer** — `courseService`, `lessonService`, `discussionService`, `responseService`
- **AI pipeline** — file parsers (PDF/PPTX), embedding, RAG-based prompt generation, Whisper transcription handler
- **Utility and type files** — TypeScript interfaces, Supabase client factories, helper utilities

Test files themselves were excluded from the production quality metrics but their coverage data was fed into the coverage dimension.

---

### Results (Overall Code)

The analysis was run against the `doc` branch (commit `9b5f952`). Results reflect the state of the codebase as of that scan. The latest Jest coverage run (current codebase, 1,147 tests, **143/143 suites passing**) produced: **84.7% line coverage** — consistent with the prior sprint, reflecting the stable and well-tested state of the codebase.

| Dimension | Grade | Finding |
|-----------|-------|---------|
| **Security** | A | 0 open issues |
| **Reliability** | A | 0 open issues |
| **Maintainability** | A | 0 open issues |
| **Coverage** | — | **84.7%** on ~4 800 lines to cover |
| **Duplications** | — | **1.6%** on ~19 000 lines |
| **Security Hotspots** | E | **1** hotspot requiring review |
| **Accepted Issues** | — | 0 |

---

### Analysis of Findings

#### Security — Grade A (0 issues)
No security vulnerabilities were detected in the codebase. This reflects deliberate security practices throughout the project:
- All API routes verify session via the server-side Supabase client before processing requests.
- The OAuth callback (`/api/auth/callback`) enforces a strict `@ualberta.ca` domain check and immediately deletes and signs out any account that does not meet this requirement.
- Environment variables containing secrets (`SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`) are accessed only in server-side code and are never exposed to the client bundle.
- The `is_correct` flag for multiple-choice answers is stripped server-side before being broadcast to student clients.

#### Reliability — Grade A (0 issues)
No bugs were flagged. The codebase consistently handles error states returned from Supabase and OpenAI, returning appropriate HTTP status codes (`401`, `403`, `404`, `500`) rather than allowing unhandled exceptions to crash routes.

#### Maintainability — Grade A (0 issues)
No code smells were reported. The codebase is well-structured with a clear separation between UI components, service functions, API routes, and the AI pipeline. TypeScript strict typing throughout eliminates an entire class of runtime issues that SonarQube would otherwise flag as smells.

#### Coverage — 84.7%
SonarQube consumed the LCOV report produced by `npm run test:coverage`. **84.7% of the ~4 800 coverable lines are exercised by the Jest test suite**. The remaining uncovered lines are primarily:
- Background fire-and-forget processing paths inside the file upload and transcript routes (these are hard to test synchronously).
- Edge-case error branches in the AI pipeline that require mocking specific OpenAI failure modes.
- Some UI-only render paths covered by Playwright end-to-end tests, which produce separate coverage data not merged into the Jest LCOV report.

#### Duplications — 1.6%
Only 1.6% of the ~19 000 analysed lines are duplicated. The small amount of duplication that exists is deliberate: the ownership verification pattern (checking lesson → course → instructor chain) is intentionally repeated inline across API routes rather than extracted into a shared helper, because each route has slightly different error-handling requirements and premature abstraction was avoided per the project's coding principles.

#### Security Hotspot — 1 (Grade E)
SonarQube flagged **one security hotspot** for manual review. A hotspot is not a confirmed vulnerability — it is a pattern that requires a human to decide whether the context makes it safe.

**Location:** `app/src/lib/ai/parsers/pptxParser.ts`, line 44

**Flagged pattern:** `JSZip.loadAsync(buffer)`

**SonarQube message:** *"Make sure that expanding this archive file is safe here."*

SonarQube raises this because expanding a ZIP archive from an untrusted source can be exploited via a **zip bomb** (a maliciously crafted archive with an extreme compression ratio that expands to gigabytes of data, exhausting server memory) or **path traversal** (file entries with `../` paths that escape the intended directory).

**Assessment: Safe — mitigations are already in place.** Immediately after `JSZip.loadAsync(buffer)`, the code calls `validateZipIntegrity(zip)`, which enforces three hard limits before any entry is read:

| Guard | Limit | Protects Against |
|-------|-------|-----------------|
| `MAX_ENTRIES` | 10 000 entries | Zip files with excessive file count |
| `MAX_TOTAL_SIZE` | 150 MB uncompressed | Zip bomb memory exhaustion |
| `MAX_COMPRESSION_RATIO` | 100× | High-ratio decompression attacks |

If any limit is exceeded the function throws immediately, aborting extraction before any data is processed. Additionally, uploaded files are validated by magic-byte detection in the upload route before they ever reach the parser, so only legitimate PPTX files (which are ZIP-based by the OOXML standard) are passed to `parsePptx`. The hotspot was reviewed and marked as **acknowledged/safe**.

---

### How to Re-run the Scan Locally

```bash
# Step 1: Generate coverage data
cd app
npm run test:coverage
cd ..

# Step 2: Run the scanner (requires sonar-scanner CLI or npm package)
sonar-scanner \
  -Dsonar.host.url=http://localhost:9000 \
  -Dsonar.token=<your-token>
```

The `sonar-project.properties` file at the repo root provides all other settings automatically. See [`docs/run-local.md`](run-local.md) for environment setup prerequisites.

---

## Stress Testing

### Tool: Apache JMeter

[Apache JMeter](https://jmeter.apache.org/) is an open-source load testing tool used to simulate concurrent users making HTTP requests against a running application. It measures response times, throughput, error rates, and produces an APDEX (Application Performance Index) score — a standardized measure of user satisfaction with response times based on two thresholds:

- **Satisfied** (T): response time ≤ 500 ms
- **Tolerating** (F): response time > 500 ms and ≤ 1,500 ms
- **Frustrated**: response time > 1,500 ms or an error

An APDEX of 1.0 is perfect. Scores below 0.5 indicate a majority of users experienced frustrating response times.

All stress tests target the **student response screen** — the highest-traffic surface of the application, where all students are simultaneously active during a live session. The instructor dashboard was not stress tested as it is accessed by a single user per session and is not subject to concurrent load.

---

### Test Environments

| Environment | Description |
|-------------|-------------|
| **Localhost** | Next.js production build running on `localhost:3000` on a single local machine |
| **Vercel** | Production serverless deployment (no screenshot captured; results described below) |

All localhost tests were run on the same machine in the same session. Three JMeter runs were conducted on localhost; one was conducted against Vercel.

---

### Localhost Test Results

#### Run 1 — Baseline: 200 Users

| Parameter | Value |
|-----------|-------|
| Virtual users | 200 |
| Requests per user | 5 |
| Total samples | 1,000 |
| Test window | 1:25 AM – 1:26 AM (~1 min) |

| Metric | Value |
|--------|-------|
| **APDEX** | **1.000** |
| Pass rate | **100%** (0 failures) |
| Average response time | 41.20 ms |
| Median | 31 ms |
| Min / Max | 24 ms / 294 ms |
| 90th percentile | 63 ms |
| 95th percentile | 83 ms |
| 99th percentile | 222.92 ms |
| Throughput | 25.01 req/s |

**Result: PASS.** Under a realistic classroom load of 200 simultaneous students, the application responded perfectly. Every single request completed well within the 500 ms satisfaction threshold with no failures. This is the primary production use case — a typical lecture session — and performance is well within comfortable operating range.

---

#### Run 2 — High Load: 2,000 Users (40-second ramp)

| Parameter | Value |
|-----------|-------|
| Virtual users | 2,000 |
| Requests per user | 5 |
| Total samples | 10,000 |
| Ramp-up | 40 seconds |
| Test window | 1:17 AM – 1:21 AM (~4 min) |

| Metric | Value |
|--------|-------|
| **APDEX** | **0.112** |
| Pass rate | 92.13% (787 failures / **7.87% error rate**) |
| Average response time | 27,253.56 ms |
| Median | 2,282 ms |
| Min / Max | 420 ms / 141,825 ms |
| 90th percentile | 88,625.90 ms |
| 95th percentile | 133,922.55 ms |
| 99th percentile | 135,080.99 ms |
| Throughput | 37.04 req/s |

**Result: FAIL.** The server was saturated. Average response times exceeded 27 seconds and the 90th percentile surpassed 88 seconds, indicating severe request queuing. The APDEX of 0.112 reflects that the overwhelming majority of simulated users experienced frustrated response times.

---

#### Run 3 — High Load: 2,000 Users (30-second ramp)

| Parameter | Value |
|-----------|-------|
| Virtual users | 2,000 |
| Requests per user | 5 |
| Total samples | 10,000 |
| Ramp-up | 30 seconds |
| Test window | 1:43 AM – 1:47 AM (~4 min) |

| Metric | Value |
|--------|-------|
| **APDEX** | **0.090** |
| Pass rate | 89.71% (1,029 failures / **10.29% error rate**) |
| Average response time | 30,312.32 ms |
| Median | 2,403 ms |
| Min / Max | 476 ms / 143,725 ms |
| 90th percentile | 98,467.50 ms |
| 95th percentile | 134,138.00 ms |
| 99th percentile | 135,168.98 ms |
| Throughput | 34.97 req/s |

**Result: FAIL.** At 2,000 concurrent users the local Next.js server reached its failure threshold. Performance was consistent with Run 2 — the APDEX of 0.090 reflects near-total saturation. The response time distribution chart confirmed this: of 10,000 requests, the vast majority exceeded 1,500 ms, fewer than 1,750 fell in the 500–1,500 ms toleration band, and only a negligible number completed within 500 ms. Approximately 1,000 requests resulted in outright errors.

---

### Vercel (Production) Test Result

| Parameter | Value |
|-----------|-------|
| Virtual users | 10,000 |
| Requests per user | 4 |
| Duration | ~40 seconds |
| Total requests intended | 40,000 |
| Requests served before shutdown | **~19,160** |

**Result: FAIL.** Under a simulated load of 10,000 concurrent users, Vercel's serverless infrastructure began throttling and shut down the deployment after serving approximately 19,160 requests — less than half of the intended 40,000. Beyond this point, requests received HTTP 5xx responses from the platform. This is consistent with Vercel's serverless function concurrency limits being exceeded under a sustained extreme burst, causing the platform's circuit breaker to terminate execution to protect shared infrastructure.

---

### Summary

| Environment | Users | Total Samples | Error Rate | APDEX | Outcome |
|-------------|-------|--------------|------------|-------|---------|
| Localhost | 200 (30s ramp, 5 req) | 1,000 | 0.00% | 1.000 | **Pass** |
| Localhost | 2,000 (40s ramp, 5 req) | 10,000 | 7.87% | 0.112 | **Fail** |
| Localhost | 2,000 (30s ramp, 5 req) | 10,000 | 10.29% | 0.090 | **Fail** |
| Vercel (Production) | 10,000 | ~19,160 served | N/A | N/A | **Fail (platform shutdown)** |

---

### Analysis and Conclusions

The stress tests reveal a clear and expected scalability boundary. **Under realistic classroom conditions of up to 200 concurrent students, the system performs flawlessly** — perfect APDEX, zero errors, all responses under 300 ms. This covers the primary intended use case: a single instructor running one live session with an entire class active simultaneously.

**Failure begins at approximately 2,000 concurrent users on a single local Next.js process.** This is a hardware and single-process Node.js concurrency constraint — a single machine cannot efficiently serve thousands of simultaneous long-lived connections without a load balancer or multiple workers. On Vercel, the serverless platform's own concurrency ceiling becomes the limiting factor, cutting off execution at approximately 19,160 requests under a 10,000-user burst.

**These limits are not a concern for the intended deployment context.** The PMCOL Teaching Tool is designed for a single instructor running one session at a time with a typical university class of 20–200 students. The 200-user baseline test confirms the system handles this load perfectly. Scaling to thousands of simultaneous students in a single session is outside the intended scope.

Should future requirements call for larger deployments, appropriate approaches would include:
- Upgrading to a Vercel plan with higher serverless concurrency limits
- Moving to a dedicated server with horizontal scaling (containerized behind a load balancer)
- Further offloading session state to Supabase Realtime, which is already used for live synchronization and scales independently of the Next.js server

---

## Writing New Tests

### Best Practices

1. **Label with User Story ID**: Every test should reference its user story
   ```typescript
   it('[US 1.XX][AT1] success: description', () => { ... });
   ```

2. **Test Success and Failure Scenarios**:
   ```typescript
   // Success case
   it('[US 1.05][AT1] success: creates lesson with valid title', () => { ... });
   
   // Failure case
   it('[US 1.05][AT2] failure: shows error with empty title', () => { ... });
   ```

3. **Add `// Covers US X.XX` at the top of each new test file** to enable automatic RTM generation.

4. **Use Descriptive Test Names**: Test names should explain what is being tested and expected outcome.

5. **Arrange-Act-Assert Pattern**:
   ```typescript
   it('should do something', () => {
     // Arrange
     const mockData = { ... };
     // Act
     const result = performAction(mockData);
     // Assert
     expect(result).toBe(expected);
   });
   ```

6. **Keep Tests Independent**: Each test should run independently without relying on other tests.

7. **Mock External Dependencies**: Use Jest mocks for Supabase, Next.js router, etc.

8. **Update this RTM**: After adding tests, update the Requirements Traceability Matrix above.

---

## Test Quality Checklist

Before submitting a PR, ensure your tests:

- [ ] Are labeled with user story IDs (`[US X.XX]`)
- [ ] Have a `// Covers US X.XX` file-level comment
- [ ] Have a `// XX.Y` numbering comment before each `it()`
- [ ] Cover both success and failure scenarios
- [ ] Are added to the Requirements Traceability Matrix
- [ ] Run successfully in CI
- [ ] Follow naming conventions
- [ ] Use appropriate mocking
- [ ] Are independent and isolated

---

## Troubleshooting

### Tests Fail Locally But Pass in CI

- Ensure you have the latest dependencies: `npm ci`
- Clear Jest cache: `npx jest --clearCache`
- Check for environment-specific issues

### Playwright Tests Timeout

- Increase timeout in `playwright.config.ts`
- Ensure the app is running on the correct port
- Check for network issues
- **Verify test data is seeded** (see Test Data Setup section)

### Playwright Tests Fail with "Lesson Not Found"

1. Check `global-setup.ts` output for warnings
2. Run the SQL seed script in Supabase SQL Editor
3. Verify the lesson has `status = 'active'`
4. Ensure your `.env.local` has correct Supabase credentials

### Mock Not Working

- Ensure mock is defined before the import
- Clear module cache: `jest.resetModules()`
- Check mock path matches actual import path

### Playwright "Port Already in Use" Error

```bash
lsof -ti:3000 | xargs kill -9
```

---

## References

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

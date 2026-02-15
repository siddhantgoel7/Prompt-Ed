# Project Management

This document outlines the project plan and task allocation for all five sprints.  
The plan is based on the agreed story map, course milestones, and CMPUT 401 sprint expectations.

---

## Story Map

![Story Map](images/story-map.png)

The story map represents the full scope of the project across all five sprints, categorized using the MoSCoW prioritization method and aligned with the project milestones.

---

## Project Plan

---

## Sprint 1

**Due:** February 1, 2026

Sprint 1 focuses on planning, requirements, system design, and project setup.  
Most tasks in this sprint are documentation and infrastructure related.

### Tasks

| **Section**          | **Task**                         | **Assigned To**   |
| -------------------- | -------------------------------- | ----------------- |
| Project Requirements | Executive summary                | Team              |
| Project Requirements | Project glossary                 | Team              |
| Project Requirements | User stories drafting            | Kris, Sid, Nikita |
| Project Requirements | Acceptance criteria              | Kris              |
| Project Requirements | Product research & similar tools | Team              |
| Project Requirements | Technical resources              | Team              |
| Software Design      | Architecture diagram             | Kris              |
| Software Design      | UML class diagram                | Aldo, Shahbaz     |
| Software Design      | Sequence diagrams                | Nikita, Muaadh    |
| Software Design      | Low-fidelity UI wireframes       | Tommy, Siddhant   |
| Project Management   | Story map creation               | Aldo              |
| Project Management   | Sprint planning                  | Team              |
| Teamwork             | Team canvas                      | Team              |
| Teamwork             | Belbin roles                     | Team              |
| Documentation        | MkDocs setup & configuration     | Siddhant          |
| Documentation        | GitHub Pages deployment          | Siddhant          |
| Meetings             | Meeting minutes                  | Tommy             |

**Sprint 1 Notes**

- UI wireframes completed on **January 28**
- User stories fully completed on **January 28**
- UML and sequence diagrams finalized by **January 30–31**

---

## Sprint 2

**Due:** February 15, 2026

Sprint 2 delivers the **walking skeleton** of the system with core lesson and discussion functionality.

### User Stories

| **User Story** | **Description**                 | **Story Points** |
| -------------- | ------------------------------- | ---------------- |
| 1.01           | Create instructor account       | 3                |
| 1.03           | Logout securely                 | 2                |
| 1.05           | Create new lesson               | 3                |
| 1.06           | Start lesson (PIN/QR)           | 3                |
| 1.09           | End lesson                      | 3                |
| 1.10           | Auto-save lesson                | 5                |
| 1.25           | Multiple discussions per lesson | 3                |
| 1.27           | Display discussion prompt       | 1                |
| 1.28           | Start/close discussions         | 3                |
| 1.31           | Display PIN code                | 1                |
| 1.34           | Real-time responses             | 3                |
| 2.03           | Anonymous student access        | 1                |
| 2.06           | Join lesson via PIN             | 3                |
| 2.07           | Submit text responses           | 2                |

**Estimated Sprint Velocity:** ~30–35 points

### Tasks

| **Task**                        | **Related US** | **Assignee** | **Due Date** |
| ------------------------------- | -------------- | ------------ | ------------ |
| Backend project setup           | SETUP          | Team         | Feb 3        |
| Database schema setup           | SETUP          | Backend      | Feb 4        |
| Lesson creation API             | 1.05           | Backend      | Feb 6        |
| Lesson start/end logic          | 1.06, 1.09     | Backend      | Feb 7        |
| PIN/QR generation               | 1.06, 1.31     | Backend      | Feb 8        |
| Student join flow               | 2.06           | Frontend     | Feb 9        |
| Anonymous access handling       | 2.03           | Backend      | Feb 9        |
| Discussion lifecycle            | 1.25, 1.28     | Backend      | Feb 10       |
| Real-time responses (WebSocket) | 1.34           | Backend      | Feb 11       |
| Discussion UI                   | 1.27           | Frontend     | Feb 12       |
| End-to-end testing              | All            | Team         | Feb 14       |

---

## Sprint 3

**Due:** March 8, 2026

Sprint 3 delivers **AI integration** of the system with authentication upgrades, STT pipeline, and AI-powered prompt workflows.

### User Stories

| **User Story** | **Description**                           | **Story Points** |
| -------------- | ----------------------------------------- | ---------------- |
| 1.02           | Login via UAlberta SSO                    | 3                |
| 1.04           | Private lesson viewing                    | 3                |
| 1.12           | Reconnect after connection loss           | 5                |
| 1.13           | Auto-save at intervals                    | 5                |
| 1.14           | View past lesson details                  | 3                |
| 1.16           | Upload files                              | 5                |
| 1.17           | STT transcript capture                    | 5                |
| 1.18           | Trigger AI prompt generation              | 5                |
| 1.19           | Review/select AI prompts                  | 3                |
| 1.23           | Multiple choice/short/long answer formats | 3                |
| 1.24           | Regenerate AI prompts                     | 3                |
| 1.26           | Only students in lesson see prompts       | 2                |
| 2.04           | See only current lesson prompts           | 1                |
| 2.08           | Select multiple choice options            | 2                |
| 2.10           | See MC question feedback                  | 1                |

**Estimated Sprint Velocity:** ~48–52 points

### Tasks

| **Task**                                  | **Related US**   | **Assignee** | **Due Date** |
| ----------------------------------------- | ---------------- | ------------ | ------------ |
| UAlberta SSO integration                  | 1.02             | Nikita       | Mar 8        |
| Private lesson access control             | 1.04, 1.26       | Muaadh       | Mar 8        |
| Reconnection flow and session recovery    | 1.12             | Backend      | Mar 8        |
| Periodic auto-save implementation         | 1.13             | Backend      | Mar 8        |
| Past lesson details retrieval/UI          | 1.14             | Fullstack    | Mar 8        |
| File upload pipeline                      | 1.16             | Backend      | Mar 8        |
| STT capture pipeline                      | 1.17             | Backend      | Mar 8        |
| AI prompt generation service              | 1.18, 1.24       | Backend      | Mar 8        |
| Prompt review/selection UI                | 1.19             | Frontend     | Mar 8        |
| MCQ + short/long answer support           | 1.23, 2.08, 2.10 | Frontend     | Mar 8        |
| Lesson-isolation checks for student view  | 2.04, 1.26       | Backend      | Mar 8        |
| End-to-end testing for AI lesson workflow | All              | Team         | Mar 8        |

---

## Sprint 4

**Due:** March 22, 2026

Sprint 4 delivers **data export, session history, and engagement metrics** with stronger classroom flow controls.

### User Stories

| **User Story** | **Description**            | **Story Points** |
| -------------- | -------------------------- | ---------------- |
| 1.15           | Helpful error messages     | 2                |
| 1.20           | Edit AI prompts            | 3                |
| 1.22           | AI generation preferences  | 5                |
| 1.29           | Time limits for responses  | 3                |
| 1.32           | Display QR code            | 3                |
| 1.36           | Highlight response         | 1                |
| 1.39           | List format view           | 3                |
| 1.40           | Student response metrics   | 5                |
| 1.41           | Export responses           | 2                |
| 1.42           | Export prompts & responses | 2                |
| 1.43           | Export statistics          | 2                |
| 2.05           | Scan QR code               | 3                |
| 2.11           | Timer for prompts          | 1                |
| 2.12           | Lesson ended notification  | 1                |
| 2.13           | Leave lesson               | 3                |
| 2.14           | Rejoin lesson              | 3                |

**Estimated Sprint Velocity:** ~40–45 points

### Tasks

| **Task**                                | **Related US**   | **Assignee** | **Due Date** |
| --------------------------------------- | ---------------- | ------------ | ------------ |
| Error message standardization           | 1.15             | Fullstack    | Mar 22       |
| AI prompt editing UI + save flow        | 1.20             | Frontend     | Mar 22       |
| AI preference settings + persistence    | 1.22             | Fullstack    | Mar 22       |
| Response timer + time-limit enforcement | 1.29, 2.11       | Backend      | Mar 22       |
| QR display and scan flow improvements   | 1.32, 2.05       | Fullstack    | Mar 22       |
| Response highlight interactions         | 1.36             | Frontend     | Mar 22       |
| List-view response panel                | 1.39             | Frontend     | Mar 22       |
| Engagement metrics calculations         | 1.40             | Backend      | Mar 22       |
| Export responses (CSV/PDF/JSON)         | 1.41             | Backend      | Mar 22       |
| Export prompts + responses              | 1.42             | Backend      | Mar 22       |
| Export lesson statistics                | 1.43             | Backend      | Mar 22       |
| Leave/rejoin/ended-session stability    | 2.12, 2.13, 2.14 | Fullstack    | Mar 22       |
| End-to-end testing for export/metrics   | All              | Team         | Mar 22       |

---

## Sprint 5

**Due:** March 31, 2026

Sprint 5 delivers **polish and optional features**, leaving room to tie up loose ends and apply final touches.

### User Stories

| **User Story** | **Description**                  | **Story Points** |
| -------------- | -------------------------------- | ---------------- |
| 1.11           | Resume unfinished lesson         | 3                |
| 1.30           | Single/multiple responses config | 2                |
| 1.35           | Hide inappropriate responses     | 1                |
| 1.38           | Word cloud view                  | 5                |
| 1.44           | MC question metrics              | 3                |
| 2.15           | See lesson/discussion status     | 1                |
| 2.16           | Helpful error messages           | 1                |
| 2.17           | Confirmation message             | 1                |

**Estimated Sprint Velocity:** ~16–20 points

### Tasks

| **Task**                                   | **Related US** | **Assignee** | **Due Date** |
| ------------------------------------------ | -------------- | ------------ | ------------ |
| Resume unfinished lesson flow              | 1.11           | Fullstack    | Mar 31       |
| Single/multiple response configuration     | 1.30           | Backend      | Mar 31       |
| Inappropriate response moderation controls | 1.35           | Fullstack    | Mar 31       |
| Word cloud visualization                   | 1.38           | Frontend     | Mar 31       |
| Multiple-choice metrics dashboard          | 1.44           | Frontend     | Mar 31       |
| Lesson/discussion status indicators        | 2.15           | Frontend     | Mar 31       |
| Student-facing error messages refinement   | 2.16           | Fullstack    | Mar 31       |
| Submission confirmation UX polishing       | 2.17           | Frontend     | Mar 31       |
| Regression testing and release hardening   | All            | Team         | Mar 31       |

---

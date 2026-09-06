# myForm

A full-stack platform for creating surveys, polls, and quizzes. Build a form, publish it, and collect answers from other people.

Live demo: [https://my-form-full-stack-form-and-quiz-pl.vercel.app/](https://my-form-full-stack-form-and-quiz-pl.vercel.app/)

---

## Features

**Accounts & authentication**

- Register and log in
- JWT auth stored in an HTTP-only cookie
- Passwords hashed with bcrypt

**Creating forms**

- Create, edit, and delete forms
- Add questions and choices
- Three form types:

  - **Quiz** — multiple-choice questions with one correct answer; scored automatically on submit
  - **Survey** — free-text questions; results are listed per question
  - **Poll** — a single multiple-choice question; results are aggregated into vote counts

**Form lifecycle**

Every form moves through three statuses:

| Status | Meaning |
| --- | --- |
| `draft` | Newly created, only the owner can see/edit it |
| `open` | Published, anyone logged in can take it |
| `closed` | Locked, no more submissions |

**Answering & results**

- Take open forms and submit answers
- Quizzes are scored by the server instantly
- Owners see results: score distribution and leaderboard for quizzes, vote counts for polls, answers for surveys

**Permissions**

- Only the owner can edit/delete a form or view its results
- Only open forms accept answers

---

## How It Works

1. Sign up and log in.
2. Create a form (starts as a `draft`), add questions, and — for quizzes and polls — choices.
3. Open the form when it's ready.
4. People take the form; their answers are saved as a response.
5. If it's a quiz, the server compares their choices against the correct answers and stores a score.
6. The owner opens the results page to see how people responded.

---

## Tech Stack

- **Backend** — Node.js, Express, PostgreSQL, JWT, bcrypt
- **Frontend** — React, Vite, React Router

---

## Database Schema

```
users
 │
 ├── forms                 (creator_id → users.id)
 │     └── questions       (form_id → forms.id)
 │           └── choices   (question_id → questions.id)
 │
 └── responses             (form_id → forms.id, user_id → users.id)
       └── answers         (response_id → responses.id, question_id → questions.id)
```

Relationships use foreign keys with cascade deletes, so deleting a form cleans up its questions, choices, responses, and answers.

---

## API Reference

All routes live under `/api/`. Auth is cookie-based — after login, no token header is needed. Endpoints marked **owner** require the request to come from the form's creator.

### Authentication

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | — | Create an account |
| POST | `/api/auth/login` | — | Log in; sets the auth cookie |
| GET | `/api/auth/me` | ✅ | Get the current user |
| POST | `/api/auth/logout` | — | Clear the auth cookie |

### Forms

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| GET | `/api/forms` | — | List all forms |
| GET | `/api/forms/my` | ✅ | List the current user's forms (with status) |
| GET | `/api/forms/:id` | — | Fetch one form |
| POST | `/api/forms` | ✅ | Create a form |
| PUT/PATCH | `/api/forms/:id` | ✅ owner | Update a form |
| DELETE | `/api/forms/:id` | ✅ owner | Delete a form |
| POST | `/api/forms/:id/open` | ✅ owner | `draft` → `open` |
| POST | `/api/forms/:id/close` | ✅ owner | → `closed` |
| GET | `/api/forms/:id/questions` | — | Form with questions and choices |

### Questions & Choices

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| GET | `/api/questions/:id` | — | Fetch a question |
| POST | `/api/forms/:formId/questions` | ✅ owner | Add a question |
| PATCH | `/api/questions/:id` | ✅ owner | Update a question |
| DELETE | `/api/questions/:id` | ✅ owner | Delete a question |
| GET | `/api/choices/:questionId/choices` | — | List a question's choices |
| POST | `/api/choices/:questionId/choices` | ✅ owner | Add a choice |
| PATCH | `/api/choices/:id` | ✅ owner | Update a choice |
| DELETE | `/api/choices/:id` | ✅ owner | Delete a choice |

### Responses & Results

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| POST | `/api/forms/:id/start` | ✅ | Start a response (form must be open) |
| POST | `/api/forms/:id/submit` | ✅ | Submit answers; quizzes are scored |
| GET | `/api/forms/:id/results` | ✅ owner | View results |
| GET | `/api/forms/:id/leaderboard` | ✅ owner | Leaderboard (quizzes only) |

---

## Auth & Security

- Passwords are hashed with bcrypt and never stored in plain text.
- JWTs live in an HTTP-only, `SameSite=Lax` cookie, so they can't be read from JavaScript. Tokens expire after 1 hour.
- Every mutation checks ownership before doing anything.
- All queries use parameterized SQL statements.
- Foreign keys with cascading deletes keep related data consistent.

---

## Project Structure

```
myForm/
│
├── server/                 # Express REST API
│   ├── config/             # PostgreSQL connection
│   ├── middleware/         # JWT verification
│   ├── routes/             # auth, forms, questions, choices, responses
│   └── server.js           # App entry point
│
├── client/                 # React single-page app
│   ├── src/
│   │   ├── pages/          # Login, Register, Dashboard, FormBuilder,
│   │   │                   # FormResponder, FormResults
│   │   ├── utils/          # API helper
│   │   └── App.jsx         # Router + app shell
│   └── index.html
│
└── README.md
```

---

## Author

Youssef

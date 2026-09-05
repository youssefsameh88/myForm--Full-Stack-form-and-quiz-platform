myForm

A full-stack form and quiz platform where users can create, share, and answer different types of forms.

Features
User registration and login
JWT authentication using HTTP-only cookies
Password hashing with bcrypt
Create, edit, and delete forms
Create, edit, and delete questions and choices
Form types:
Quiz
Survey
Poll
Feedback
Form lifecycle:
Draft
Open
Closed
Users can start and submit forms
Automatic quiz scoring
Quiz leaderboards
Form response/results viewing
Ownership and authorization checks
PostgreSQL relational database
RESTful API
Tech Stack
Backend
Node.js
Express.js
PostgreSQL
pg
JWT
bcrypt
Frontend
React
Vite
React Router
Database Structure

The application uses PostgreSQL with the following main entities:

Users
  │
  ├── Forms
  │     └── Questions
  │           └── Choices
  │
  └── Responses
        └── Answers
Authentication & Security

Authentication is implemented using JSON Web Tokens stored in HTTP-only cookies.

Passwords are never stored directly. They are hashed using bcrypt.

The API also uses:

Authentication middleware
Ownership checks
Parameterized SQL queries
Input validation
Foreign-key constraints
Cascading deletes
Running Locally
1. Clone the repository
git clone <repository-url>
cd myForm
2. Install backend dependencies
cd server
npm install
3. Configure environment variables

Create a .env file inside the server directory:

DATABASE_URL=your_database_url
JWT_SECRET=your_secret
4. Start the backend
npm run dev

The backend runs on:

http://localhost:3000
5. Install frontend dependencies

Open another terminal:

cd client
npm install
6. Start the frontend
npm run dev

The frontend runs on:

http://localhost:5173
Project Structure
myForm/
│
├── client/
│   ├── src/
│   │   ├── pages/
│   │   ├── utils/
│   │   └── App.jsx
│   └── package.json
│
├── server/
│   ├── config/
│   ├── middleware/
│   ├── routes/
│   ├── server.js
│   └── package.json
│
├── .gitignore
└── README.md
API

The backend exposes REST API endpoints for:

Authentication
Forms
Questions
Choices
Responses
Results
Leaderboards

The API uses standard HTTP methods such as GET, POST, PATCH, and DELETE.

Future Improvements
Better form sharing
More question/answer types
Improved analytics
Timed quizzes
Better UI/UX
Production deployment
Author

Youssef
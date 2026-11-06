# InternConnect

InternConnect is a MERN stack web app where students find and apply for internships, build a resume and
connect with other students in a shared Public Space.

> **Status:** Milestones 1–2 are complete: project setup, and registration and login with email or phone
> (JWT in an httpOnly cookie, protected pages). The six feature modules are built in the next milestones.

## Modules

| # | Module | Status |
| - | ------ | ------ |
| 1 | Public Space and social engagement (friends, posts, likes, comments, shares) | Planned |
| 2 | Forgot password with OTP verification | Planned |
| 3 | Subscription-based internship applications (Razorpay Test Mode) | Planned |
| 4 | Premium Resume Builder with PDF generation (₹50 test payment) | Planned |
| 5 | Six languages, with OTP verification for French | Planned |
| 6 | Login activity tracking and device security | Planned |

## Tech stack

| Layer    | Technology                                   |
| -------- | -------------------------------------------- |
| Frontend | React 19, Vite, Tailwind CSS 4, React Router, Axios, Context API |
| Backend  | Node.js, Express 5, Mongoose, JWT (jsonwebtoken), bcryptjs, cookie-parser |
| Database | MongoDB Atlas                                |

## Authentication

- Students register with name, email, 10-digit Indian mobile number and password, and log in with **either** their
  email or their mobile number.
- Passwords are hashed with **bcryptjs** before they are saved; the hash is never sent back by the API.
- Emails are stored in lowercase, so `Asha@Example.com` and `asha@example.com` count as the same account.
- After registering or logging in, the server puts a **JWT** (valid for 7 days) in a cookie named `token`:
  `httpOnly` (page JavaScript cannot read it), `SameSite=Lax` (other websites cannot send it), and `Secure`
  (HTTPS only) when `NODE_ENV=production`. Logging out clears it with the same settings.
- Axios sends the cookie with every request (`withCredentials: true`), and CORS allows credentials from `CLIENT_URL`.
- In React, `AuthContext` asks `GET /api/auth/me` on page load, so a refresh keeps the student logged in.
  `ProtectedRoute` sends guests to the login page; `GuestRoute` sends logged-in users away from login and register.

| Field    | Rule |
| -------- | ---- |
| Name     | 2 to 50 characters |
| Email    | Valid email address, unique (case-insensitive) |
| Mobile   | 10 digits starting with 6, 7, 8 or 9, unique |
| Password | 8 to 64 characters (bcrypt only uses the first 72 bytes, so longer ones are refused) |

## Prerequisites

- Node.js 22 or newer and npm
- A MongoDB Atlas database (connection string)

## Getting started

```powershell
git clone https://github.com/ankitgpt9798/InternConnect_1.git
cd InternConnect_1

# Install the root, backend and frontend packages
npm run install:all

# Create the backend settings file and fill in the values (never commit it)
Copy-Item backend\.env.example backend\.env

# Start the API (http://localhost:5000) and the React app (http://localhost:5173) together
npm run dev
```

Open http://localhost:5173. The **System status** card shows `Online` and `connected` when the React app can reach
the API and the API can reach MongoDB. You can also open http://localhost:5000/api/health directly. Use
**Register** to create an account; you then land on your dashboard.

## Scripts (run from the project root)

| Command                | What it does                                   |
| ---------------------- | ---------------------------------------------- |
| `npm run install:all`  | Installs the root, backend and frontend packages |
| `npm run dev`          | Starts the backend and frontend together       |
| `npm run dev:backend`  | Starts only the API (restarts on file changes) |
| `npm run dev:frontend` | Starts only the React app                      |
| `npm run build`        | Production build of the React app (`frontend/dist`) |
| `npm run lint`         | Checks the frontend code with ESLint           |

## Environment variables

All settings live in `backend/.env`; `backend/.env.example` lists each one with a placeholder. `.env` files are
git-ignored and must never be committed.

| Variable | Purpose |
| -------- | ------- |
| `PORT`, `NODE_ENV` | API port (default 5000) and environment |
| `CLIENT_URL` | Address of the React app, allowed by CORS |
| `MONGODB_URI` | MongoDB Atlas connection string |
| `DNS_SERVERS` | Optional: DNS servers for networks where Node cannot resolve `mongodb+srv://` addresses |
| `JWT_SECRET` | Signs login tokens |
| `MAILTRAP_USER`, `MAILTRAP_PASS` | Mailtrap Email Testing sandbox for OTP and invoice emails |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Razorpay Test Mode keys |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Photo and video uploads |

## Project structure

```
InternConnect_1/
├── backend/                 Express REST API
│   ├── src/
│   │   ├── config/          MongoDB connection
│   │   ├── controllers/     Request handlers (auth, health)
│   │   ├── middleware/      auth.js (protect: logged-in users only), 404 and error handling
│   │   ├── models/          Mongoose models (User)
│   │   ├── routes/          API routes (mounted under /api)
│   │   ├── utils/           Login cookie (JWT) and input validation helpers
│   │   ├── app.js           Express app (middleware and routes)
│   │   └── server.js        Loads .env, connects to MongoDB, starts the server
│   └── .env.example
├── frontend/                React app (Vite)
│   ├── public/              Static files (favicon)
│   └── src/
│       ├── api/             Axios instance
│       ├── components/      Layout (navbar, footer), ui/ (button, form field, alert), route guards, AuthCard
│       ├── context/         AuthContext (logged-in user, login, register, logout)
│       ├── pages/           One component per page (home, login, register, dashboard, 404)
│       ├── utils/           Form validation and API error messages
│       ├── App.jsx          Routes
│       └── main.jsx         Entry point
└── package.json             Scripts that run both apps
```

## API

| Method | Route                | Login needed | Description |
| ------ | -------------------- | ------------ | ----------- |
| GET    | `/api/health`        | No  | API status and MongoDB connection state |
| POST   | `/api/auth/register` | No  | Body `{ name, email, phone, password }`. 201 with the user and the login cookie; 400 invalid fields; 409 email or phone already registered |
| POST   | `/api/auth/login`    | No  | Body `{ identifier, password }` (identifier = email or mobile number). 200 with the user and the login cookie; 401 wrong details |
| POST   | `/api/auth/logout`   | No  | Clears the login cookie |
| GET    | `/api/auth/me`       | Yes | The logged-in user; 401 when not logged in or the session has expired |

Errors are returned as `{ "message": "..." }`, plus `"errors": { "field": "..." }` for invalid form fields.

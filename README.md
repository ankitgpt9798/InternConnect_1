# InternConnect

InternConnect is a MERN stack web app where students find and apply for internships, build a resume and
connect with other students in a shared Public Space.

> **Status:** Milestone 1 (project setup) is complete: the Express API connects to MongoDB and the React app
> shows the API and database status. The six feature modules are built in the next milestones.

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
| Frontend | React 19, Vite, Tailwind CSS 4, React Router, Axios |
| Backend  | Node.js, Express 5, Mongoose                 |
| Database | MongoDB Atlas                                |

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
the API and the API can reach MongoDB. You can also open http://localhost:5000/api/health directly.

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
│   │   ├── controllers/     Request handlers
│   │   ├── middleware/      404 and error handling
│   │   ├── models/          Mongoose models
│   │   ├── routes/          API routes (mounted under /api)
│   │   ├── utils/           Helper functions
│   │   ├── app.js           Express app (middleware and routes)
│   │   └── server.js        Loads .env, connects to MongoDB, starts the server
│   └── .env.example
├── frontend/                React app (Vite)
│   ├── public/              Static files (favicon)
│   └── src/
│       ├── api/             Axios instance
│       ├── components/      Reusable components (layout: navbar, footer)
│       ├── pages/           One component per page
│       ├── App.jsx          Routes
│       └── main.jsx         Entry point
└── package.json             Scripts that run both apps
```

## API

| Method | Route         | Description |
| ------ | ------------- | ----------- |
| GET    | `/api/health` | API status and MongoDB connection state |

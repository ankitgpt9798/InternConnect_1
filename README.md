# InternConnect

InternConnect is a MERN stack web app where students find and apply for internships, build a resume and
connect with other students in a shared Public Space.

> **Status:** done so far: project setup; registration and login with email or phone (JWT in an httpOnly cookie,
> protected pages); Public Space posts with photo and video uploads, likes, comments, shares, saves and reports;
> friend requests and a friends list; a daily posting limit based on the number of friends; a friends feed,
> hashtags, mentions and notifications (Module 1 complete); forgot password with an OTP by email or mock SMS and a
> generated letters-only password (Module 2 complete); internship listings, applications with plan quotas and plans
> bought with Razorpay Test Mode within 5:00-11:45 AM IST, verified on the server, with emailed invoices (Module 3
> complete); the Resume Builder with saved drafts and a premium ATS-friendly PDF after an email code and a ₹50
> Razorpay payment (Module 4 complete); six languages (English, Spanish, Hindi, Portuguese, Chinese, French) with
> direct switching, email OTP verification required for French, persistent account language preferences and language
> change history (Module 5 complete). Module 6 follows.

## Modules

| # | Module | Status |
| - | ------ | ------ |
| 1 | Public Space and social engagement (friends, posts, likes, comments, shares) | Done |
| 2 | Forgot password with OTP verification | Done |
| 3 | Subscription-based internship applications (Razorpay Test Mode) | Done |
| 4 | Premium Resume Builder with PDF generation (₹50 test payment) | Done |
| 5 | Six languages, with OTP verification for French | Done |
| 6 | Login activity tracking and device security | Planned |

## Tech stack

| Layer    | Technology                                   |
| -------- | -------------------------------------------- |
| Frontend | React 19, Vite, Tailwind CSS 4, React Router, Axios, Context API, i18next, react-i18next |
| Backend  | Node.js, Express 5, Mongoose, JWT (jsonwebtoken), bcryptjs, cookie-parser, Multer, Cloudinary, Nodemailer, Razorpay, PDFKit |
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

## Forgot password

- **Forgot password?** on the login page asks for the email or mobile number and sends a 6-digit code to it.
  Codes work for 10 minutes, a new code can be requested after 60 seconds (it replaces the old one), and only a
  bcrypt hash of each code is stored (MongoDB deletes expired codes by itself).
- After 5 incorrect codes the code stops working and a new one is needed; a correct code works only once.
- With the right code the system generates a **new 12-letter password made only of upper- and lowercase letters**
  (no numbers or special characters), saves it hashed, shows it once on screen (with a Copy button) and sends it to the
  same email or phone. The old password stops working.
- A password can be reset **once per day** (calendar day in India time); after that the student sees
  "You can use this option only once per day."
- Emails go to the **Mailtrap** sandbox inbox (mailtrap.io), not to real addresses. **SMS is simulated:** no SMS
  provider is set up, so the text, including the code, is printed in the backend terminal.

## Internships and applications

There is no employer portal in the assignment, so the listings are sample data from fictional companies, loaded with
`npm run seed:internships`. Logged-in students can search open internships (by title, company, skill or city, and by
work mode), read the details and apply once per internship with a cover letter of 50 to 1000 characters. Closed
internships (deadline passed) leave the list. **My applications** lists every application.

### Plans and application quotas

| Plan   | Price            | Internship applications |
| ------ | ---------------- | ----------------------- |
| Free   | ₹0               | 1 a month               |
| Bronze | ₹100 for 30 days | 3                       |
| Silver | ₹300 for 30 days | 5                       |
| Gold   | ₹1,000 for 30 days | Unlimited             |

Every student starts on Free, whose applications are counted per calendar month (India time). A paid plan lasts
30 days from the payment and its applications are counted within that period (applications made before it do not
count). When a paid plan ends the student is back on Free. With no applications left, applying is refused with a
message to upgrade. The **Plans** page shows the plan in force, the applications used and left and when the count
restarts; the apply form shows the same.

### Buying a plan (Razorpay Test Mode)

1. On the **Plans** page the student chooses Bronze, Silver or Gold. The server creates a Razorpay order with the
   price from its own plan list (never from the browser). **Plan payments can only be started between 5:00 AM and
   11:45 AM IST** (server clock); outside that window the request is refused and the page says when it opens.
2. The student pays in **Razorpay Checkout** (Razorpay's own window), for example with Razorpay's test card or
   Netbanking → any bank → **Success**. No real money moves.
3. The server **verifies the payment**: it checks Razorpay's signature (HMAC-SHA256 with the key secret), fetches
   the payment from Razorpay to confirm the order, amount and status (capturing it if needed), and marks it paid only
   once. Only then does the plan start (30 days, replacing the current plan).
4. An **invoice** (number, plan, amount, payment and order IDs, dates) is emailed to the Mailtrap inbox, and the
   payment appears in the **Payment history** on the Plans page.

The backend refuses to start unless `RAZORPAY_KEY_ID` is a Test Mode key (`rzp_test_…`); the key secret never leaves
the server. For local testing outside the window, `PAYMENT_WINDOW_TEST_OPEN=true` in `backend/.env` opens it; the
backend prints a warning when it is on, and it is ignored when `NODE_ENV=production`.

## Resume Builder

Each student has one resume draft (`/resume`): personal details, a career summary, education, experience and
internships, projects (up to 5 of each), skills (up to 30) and certifications (up to 10). A new draft starts with the
name, email and phone of the account. Drafts can be saved while incomplete; values that are too long, badly
formatted links or emails, and too many entries are refused. A checklist shows what is still needed before a PDF can
be made: name, email, phone, a summary of at least 30 characters, at least one education entry (institution and
degree), at least one skill, a company and role for every experience and a name for every project. Because the PDF
uses built-in fonts, it also lists any section with characters other than English (Latin) letters, such as ₹, Hindi
or emoji.

### Premium resume PDF (₹50)

1. With a saved, ready draft the student clicks **Get my resume PDF – ₹50**. A 6-digit code is emailed to the
   **registered** address (Mailtrap): 10 minutes, 5 tries, 60 seconds between codes.
2. With the right code the server copies the resume as it is now and creates a **₹50 Razorpay order**. This is the only
   way to create a resume order, so the email code cannot be skipped. **There is no time window** for resume payments.
3. The student pays in Razorpay Checkout; the server verifies the payment exactly as for plans (signature and
   Razorpay's own record), then creates the PDF from the copy, **attaches it to the profile** (shown on the Dashboard)
   and emails the invoice.
4. The PDF uses one **ATS-friendly template**: a single column of real, selectable text (name, contact line, Summary,
   Education, Experience, Projects, Skills, Certifications) drawn with PDFKit. Downloading it again is free, and only
   its owner can download it. Editing the resume later does not change a paid PDF; a new PDF needs a new payment.

## Six languages and French verification

InternConnect is fully accessible in six languages: English (`en`, default), Spanish (`es`), Hindi (`hi`),
Portuguese (`pt`), Simplified Chinese (`zh`) and French (`fr`).

- **Language Selector:** A language menu is available in the navigation bar on desktop and mobile. Every language is
  shown in its native script (e.g. `हिन्दी`, `Português`, `中文（简体）`, `Français`).
- **Direct Switching:** English, Spanish, Hindi, Portuguese and Chinese can be switched directly at any time by students
  and guests. For guests, the choice is saved to browser storage (`localStorage`). For logged-in students, it is also
  saved to `user.preferredLanguage` in the database, keeping their preferred language active across sessions and devices.
- **French OTP Verification:** French is restricted and cannot be selected directly (direct API requests return HTTP 403).
  To switch to French:
  1. The student must be logged in. A 6-digit code is emailed to their registered address (Mailtrap Sandbox).
  2. The code is valid for 10 minutes, with up to 5 attempts and a 60-second cooldown between requests.
  3. Upon entering the correct code, the server verifies it, updates the student's `preferredLanguage` to French,
     and switches the interface.
- **On-Demand Bundle Loading:** English is bundled with the initial app load, while Spanish, Hindi, Portuguese,
  Chinese and French translation packages are dynamically loaded on demand, ensuring zero performance overhead.
  The `<html lang="...">` attribute is updated automatically to match each language.
- **Language Change Audit History:** Every interface language change is saved in the `LanguageChange` model
  (previous language, new language, verification method `none` or `email_otp`, masked email destination and timestamp).
  Students can review their complete change history in the **Language History** panel on the Dashboard.

## Public Space posting limit

The number of posts a student may publish per day depends on their number of friends:

| Friends | Posts per day |
| ------- | ------------- |
| 0 | Cannot post |
| 1 to 10 | The same as the number of friends (1 friend = 1 post, 2 friends = 2 posts … 10 friends = 10 posts) |
| More than 10 | Unlimited |

The day restarts at midnight India Standard Time (server clock). Deleting a post made today frees that post again.
The limit is checked before an upload is read, so a refused post never sends its file to Cloudinary.

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

# Load the 12 sample internship listings (fictional companies; safe to run again, it only refreshes deadlines)
npm run seed:internships

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
| `npm run seed:internships` | Adds the sample internship listings, or refreshes their deadlines |
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
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Razorpay Test Mode keys (only `rzp_test_` keys are accepted) |
| `PAYMENT_WINDOW_TEST_OPEN` | Optional, local testing only: `true` allows plan payments outside 5:00-11:45 AM IST (ignored in production) |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Photo and video uploads |

## Project structure

```
InternConnect_1/
├── backend/                 Express REST API
│   ├── src/
│   │   ├── config/          MongoDB connection
│   │   ├── controllers/     Request handlers (auth, password reset, posts, friends, notifications, internships,
│   │   │                    subscriptions, payments, resumes, health)
│   │   ├── middleware/      auth.js (logged-in users only), upload.js (photo/video files), 404 and error handling
│   │   ├── models/          Mongoose models (User, Post, FriendRequest, Notification, Otp, Internship, Application,
│   │   │                    Payment, Resume, GeneratedResume)
│   │   ├── seed/            Sample internship listings (npm run seed:internships)
│   │   ├── routes/          API routes (mounted under /api)
│   │   ├── utils/           Login cookie (JWT), input validation, Cloudinary uploads, hashtags, posting limit,
│   │   │                    IST dates, notifications, OTP codes, email (Mailtrap), mock SMS, masking,
│   │   │                    letters-only password generator, plans, application quotas, payment window,
│   │   │                    Razorpay (orders, signature check), completing a payment and the invoice email,
│   │   │                    resume content rules, resume PDF template
│   │   ├── app.js           Express app (middleware and routes)
│   │   └── server.js        Loads .env, connects to MongoDB, starts the server
│   └── .env.example
├── frontend/                React app (Vite)
│   ├── public/              Static files (favicon)
│   └── src/
│       ├── api/             Axios instance and API calls (posts, friends, notifications, password reset, internships,
│       │                    subscriptions, payments, resumes)
│       ├── components/      Layout, ui/ (button, form field, alert), posts/ (composer, post card), route guards
│       ├── context/         AuthContext (logged-in user, login, register, logout)
│       ├── pages/           One component per page (home, login, register, forgot password, dashboard, Public Space, post, hashtag,
│       │                    friends, notifications, internships, internship, my applications, plans, resume, 404)
│       ├── utils/           Form validation, API error messages, "time ago" dates, formatting, Razorpay Checkout
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
| POST   | `/api/auth/forgot-password` | No | Body `{ identifier }` (email or mobile number). Sends a 6-digit code by email (Mailtrap) or mock SMS. 404 unknown account; 429 "You can use this option only once per day." or "Please wait N seconds" (60 s between codes) |
| POST   | `/api/auth/reset-password` | No | Body `{ identifier, otp }`. With the right code: a new 12-letter password (upper- and lowercase letters only) is saved, returned once as `password` and sent to the same email or phone. 400 wrong (with `attemptsLeft`), expired or locked code |
| GET    | `/api/posts?page=1`  | Yes | Public Space posts, newest first, 10 per page (`hasMore` says if there is another page). `&feed=friends`: only your friends' posts and yours; `&tag=internship`: only posts with that hashtag |
| POST   | `/api/posts`         | Yes | Multipart form: `caption` (up to 1000 characters) and/or one `media` file, plus optional `mentions` (ids of your friends, up to 10). Photos JPEG/PNG/WebP/GIF up to 5 MB, videos MP4/WebM/MOV up to 30 MB, stored on Cloudinary. Up to 10 `#hashtags` are taken from the caption. 403 with no friends, 429 when today's limit is reached |
| GET    | `/api/posts/saved`   | Yes | Posts you saved, newest first (same paging) |
| GET    | `/api/posts/allowance` | Yes | Today's posting limit: `{ friendCount, dailyLimit, postsToday, remaining, resetsAt }` (`null` = unlimited) |
| GET    | `/api/posts/:id`     | Yes | One post |
| DELETE | `/api/posts/:id`     | Yes | Deletes your own post and its photo or video (403 for someone else's post) |
| POST   | `/api/posts/:id/like` | Yes | Like, or unlike if you already liked it |
| POST   | `/api/posts/:id/comments` | Yes | Body `{ text }`, 1 to 500 characters |
| POST   | `/api/posts/:id/share` | Yes | Counts a share (the app copies the post's link) |
| POST   | `/api/posts/:id/save` | Yes | Save, or unsave if already saved |
| POST   | `/api/posts/:id/report` | Yes | Body `{ reason }`: `spam`, `inappropriate`, `harassment` or `other`. Once per post, not your own. After 3 reports the post is hidden from everyone except its author |

Posts are returned with `hashtags`, `mentions` (`[{ id, name }]`), `likeCount`, `likedByMe`, `comments`, `shareCount`,
`savedByMe`, `reportedByMe` and `isMine`; the lists of who liked, saved or reported a post are never sent.

**Hashtags and mentions:** `#internship` at the start of the caption or after a space becomes a hashtag (stored in
lowercase; letters of any language, digits and `_`) and links to its page, `/hashtags/internship`. Students mention
friends with the **Mention a friend** button, which adds `@Name` to the caption; the server keeps only mentions of the
author's accepted friends.

| Method | Route                | Login needed | Description |
| ------ | -------------------- | ------------ | ----------- |
| GET    | `/api/users/search?q=` | Yes | Students by name (any case, up to 20), each with `status`: `friend`, `request_sent`, `request_received` or `none`. No text: the newest students |
| GET    | `/api/friends`       | Yes | `{ friends, received, sent }` |
| POST   | `/api/friends/requests` | Yes | Body `{ userId }`. Refused for yourself, an existing friend, a repeated request, or when that student already sent you one |
| POST   | `/api/friends/requests/:id/accept` | Yes | Only the student who received the request; both become friends |
| DELETE | `/api/friends/requests/:id` | Yes | The receiver declines, or the sender cancels |
| DELETE | `/api/friends/:userId` | Yes | Removes the friendship for both students |
| GET    | `/api/internships?search=&workMode=` | Yes | Open internships, closing soonest first; each has `appliedAt` (null if you have not applied) |
| GET    | `/api/internships/:id` | Yes | One internship |
| POST   | `/api/internships/:id/apply` | Yes | Body `{ coverLetter }` (50 to 1000 characters). 409 already applied; 400 closed; 403 no applications left on your plan |
| GET    | `/api/applications` | Yes | Your applications, newest first |
| GET    | `/api/subscriptions/plans` | Yes | The four plans with prices in rupees |
| GET    | `/api/subscriptions/me` | Yes | `{ plan, startedAt, expiresAt, used, limit, remaining, resetsAt }` (`null` limit = unlimited) |
| GET    | `/api/payments/window` | Yes | Whether plan payments are open now (5:00-11:45 AM IST) and when they open next |
| POST   | `/api/payments/subscription/order` | Yes | Body `{ plan }` (`bronze`, `silver` or `gold`). Creates a Razorpay order and returns what Checkout needs. 403 outside the payment window |
| POST   | `/api/payments/verify` | Yes | Body: Razorpay's `{ razorpay_order_id, razorpay_payment_id, razorpay_signature }`. Verifies the signature and the payment with Razorpay, starts the plan and emails the invoice. 400 not verified; 404 not your order; 409 already completed |
| GET    | `/api/payments` | Yes | Your completed payments with invoice numbers |
| GET    | `/api/resumes/me` | Yes | `{ resume, readiness: { ready, missing } }` (a new draft is pre-filled from the account) |
| PUT    | `/api/resumes/me` | Yes | Saves the draft; 400 with `errors: [{ field, message }]` for invalid values |
| POST   | `/api/resumes/me/otp` | Yes | Emails the code for the premium PDF (the saved draft must be ready). 429 "Please wait N seconds" |
| POST   | `/api/resumes/me/otp/verify` | Yes | Body `{ otp }`. With the right code: creates the ₹50 Razorpay order and returns `{ checkout }`; then pay and call `/api/payments/verify` |
| GET    | `/api/resumes/generated` | Yes | Your paid resume PDFs, newest first (`onProfile` marks the one on your profile) |
| GET    | `/api/resumes/generated/:id/pdf` | Yes | Downloads the PDF (owner only) |
| GET    | `/api/notifications` | Yes | The latest 30 notifications, newest first, with `unreadCount` |
| GET    | `/api/notifications/unread-count` | Yes | `{ unreadCount }` for the bell in the navbar |
| POST   | `/api/notifications/read-all` | Yes | Marks every notification as read |

**Notifications** are created when someone likes or comments on your post, a friend mentions you, you receive a
friend request, or your request is accepted. Your own actions never notify you; an unlike, a deleted post or a
cancelled/declined/accepted request removes the matching notification. The navbar bell asks for the unread count
on every page change (no live connection); opening the Notifications page marks everything as read.

Errors are returned as `{ "message": "..." }`, plus `"errors": { "field": "..." }` for invalid form fields.

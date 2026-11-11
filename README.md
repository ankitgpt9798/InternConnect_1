# InternConnect

InternConnect is a MERN stack web app where students find and apply for internships, build a resume and
connect with other students in a shared Public Space.

> **Status:** done so far: project setup; registration and login with email or phone (a server-side session in an httpOnly cookie,
> protected pages); Public Space posts with photo and video uploads, likes, comments, shares, saves and reports;
> friend requests and a friends list; a daily posting limit based on the number of friends; a friends feed,
> hashtags, mentions and notifications (Module 1 complete); forgot password with an OTP by email or mock SMS and a
> generated letters-only password (Module 2 complete); internship listings, applications with plan quotas and plans
> bought with Razorpay Test Mode within 5:00-11:45 AM IST, verified on the server, with emailed invoices (Module 3
> complete); the Resume Builder with saved drafts and a premium ATS-friendly PDF after an email code and a ₹50
> Razorpay payment (Module 4 complete); six languages (English, Spanish, Hindi, Portuguese, Chinese, French) with
> direct switching, email OTP verification required for French, persistent account language preferences and language
> change history (Module 5 complete); login security with an email code for Google Chrome, new or untrusted devices
> and unusual sign-ins, phone and tablet sign-in only from 10:00 AM to 1:00 PM IST, a detailed login history, active
> sessions with "sign out other devices" and trusted devices (Module 6 complete).

## Modules

| # | Module | Status |
| - | ------ | ------ |
| 1 | Public Space and social engagement (friends, posts, likes, comments, shares) | Done |
| 2 | Forgot password with OTP verification | Done |
| 3 | Subscription-based internship applications (Razorpay Test Mode) | Done |
| 4 | Premium Resume Builder with PDF generation (₹50 test payment) | Done |
| 5 | Six languages, with OTP verification for French | Done |
| 6 | Login activity tracking and device security | Done |

## Tech stack

| Layer    | Technology                                   |
| -------- | -------------------------------------------- |
| Frontend | React 19, Vite, Tailwind CSS 4, React Router, Axios, Context API, i18next, react-i18next |
| Backend  | Node.js, Express 5, Mongoose, server-side sessions (hashed tokens), bcryptjs, cookie-parser, Multer, Cloudinary, Nodemailer, Razorpay, PDFKit, bowser (browser detection), maxmind (offline GeoLite2 lookups) |
| Database | MongoDB Atlas                                |
| Tests    | Node.js test runner (`node:test`), mongodb-memory-server (in-memory MongoDB, development only) |

## Authentication

- Students register with name, email, 10-digit Indian mobile number and password, and log in with **either** their
  email or their mobile number.
- Passwords are hashed with **bcryptjs** before they are saved; the hash is never sent back by the API.
- Emails are stored in lowercase, so `Asha@Example.com` and `asha@example.com` count as the same account.
- After signing in (see [Login security](#login-security-and-device-trust-module-6)), the browser gets a random
  **session token** in a cookie named `token`: `httpOnly` (page JavaScript cannot read it), `SameSite=Lax` (other
  websites cannot send it), `Path=/`, and `Secure` (HTTPS only) when `NODE_ENV=production`. The server stores only a
  SHA-256 hash of the token in a `Session` record and checks that record on every request, so logging out (or signing
  a session out from another device) ends it at once.
- Axios sends the cookie with every request (`withCredentials: true`), and CORS allows credentials from `CLIENT_URL`.
- In React, `AuthContext` asks `GET /api/auth/me` on page load, so a refresh keeps the student logged in.
  `ProtectedRoute` sends guests to the login page; `GuestRoute` sends logged-in users away from login and register.
  When any request answers that the session has ended, the app returns to the login page and says why.

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
- Locally, emails go to the **Mailtrap** sandbox inbox (mailtrap.io), not to real addresses; on Render they go to the
  student's own address through **Brevo**. **SMS is simulated locally only:** no SMS provider is set up, so the text,
  including the code, is printed in the backend terminal. In production (Render) reset by mobile number is turned off
  (the server answers `SMS_UNAVAILABLE` before looking up any account) and codes are never printed in the logs.

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

## Login security and device trust (Module 6)

Every rule is enforced by the server; the app only shows the result.

### Who needs an email code, and when phones can sign in

| Situation (after a correct password) | Result |
| ------------------------------------ | ------ |
| Phone or tablet, any browser, outside **10:00 AM – 1:00 PM IST** | Refused (checked before the password, so nothing is revealed and no code is sent) |
| **Google Chrome** (computer, phone or tablet) | 6-digit email code on **every** login, even on a trusted device |
| Any browser on a **new, untrusted or changed device** | Email code; the browser then becomes a **trusted device for 30 days** |
| Trusted device, new IP address in a country the account has not signed in from | Email code |
| Trusted device, many recent failed attempts from other IP addresses | Email code |
| Trusted device, new IP address in a known country | Signed in, plus a "New sign-in" alert email (at most one per IP address per day) |
| Trusted device, known IP address (Edge, Firefox, Safari, …) | Signed in with the password |

- Chrome on a phone or tablet must be inside the window **and** enter the code; the window is checked again when the
  code is entered. Phone and tablet sessions end at **exactly 1:00 PM IST** (the server refuses every request from then
  on and the app shows why). A new IP address alone never refuses a sign-in.
- **Registration:** every new account confirms its email with a code before it gets a session. A phone or tablet
  outside the window creates the account but is not signed in.
- Codes go to the **registered email** (Mailtrap locally, Brevo on Render), work for 10 minutes, only in the browser that typed the password,
  and are stored only as a bcrypt hash. 5 wrong codes end the sign-in; a new code needs 60 seconds; at most 3 new codes
  per sign-in and **6 codes per account per hour**. The email says which browser, approximate place, IP address and
  time the sign-in came from.
- **Browser detection** uses the User-Agent (bowser) and Client Hints; a request counts as Chrome, or as a phone or
  tablet, if any of them says so. The browser reports these itself, so someone who deliberately fakes them can get
  around the Chrome and phone rules; the password, the email codes and trusted devices are the real protection.

### Login history, sessions and devices

The **Security and sign-ins** section of the Dashboard shows:

- **Login history** (newest first): every attempt, successful or not, with browser name and version, system, device
  type, model (when the browser shows it), IP address, approximate location, date and time (IST), the result and the
  reason, whether an email code was used, and badges for a first-time device, browser or IP address.
- **Active sessions**: each signed-in browser, where and when it was last used; **Sign out** one, or **Sign out all
  other devices** (both need the password).
- **Devices**: the browsers the account has used and whether they are trusted (until when). **Remove** ends its
  sessions, and its next sign-in needs a code.

A successful **password reset** signs out every session, removes every trusted device and cancels unfinished sign-ins.

### How it is protected

- Session, device and sign-in tokens are 256-bit random values; only their SHA-256 hashes are stored. The session token
  is replaced every 15 minutes (the previous one keeps working for 60 seconds for requests already on their way; if an
  old token is used after that, the whole session ends). A session or device cookie used by another browser, system or
  kind of device is refused. There is no separate refresh token: the server-side session is the only credential.
- **Failed passwords** have progressive cooldowns for one account from one IP address (after 5 failures in 15 minutes:
  1 minute, then 2, 4, 8 and at most 15) and for one IP address (20 failures: 5 minutes, 30: 15, 40: 60). An account is
  never locked as a whole, so someone guessing passwords cannot lock the real student out; a trusted device is not
  slowed down by other people's failures on a shared IP address. Limits are counted atomically, so parallel requests
  cannot get past them.
- Unknown accounts get the same answer (and the same response time) as wrong passwords.
- Only the student sees their own IP addresses and devices. Attempts on unknown accounts are kept (without the typed
  email or phone) but never shown. Login logs and codes are kept for 90 days, ended sessions for 30 days and unused
  devices for 90 days (MongoDB deletes them automatically). No fingerprinting and no coordinates are stored.
- **Location** is approximate (city, region, country) and comes from the free **MaxMind GeoLite2 City** database read
  on this server; IP addresses are never sent to an outside service. Without the database, locations show "Unknown",
  and addresses on the local network show "Local network". This product includes GeoLite2 data created by MaxMind,
  available from https://www.maxmind.com.

To add the GeoLite2 database: create a free MaxMind account, generate a licence key, download **GeoLite2 City** in
`.mmdb` format and save it as `backend/data/GeoLite2-City.mmdb` (the folder is git-ignored), or set `GEOIP_DB_PATH`.
MaxMind's licence asks you to keep it up to date; the server picks up a replaced file by itself.

Local testing: `MOBILE_LOGIN_WINDOW_TEST=open` (or `closed`) forces the phone window, and
`MOBILE_SESSION_TEST_MINUTES=2` ends phone sessions 2 minutes after sign-in, to see the 1 PM sign-out without waiting.
Both are ignored when `NODE_ENV=production`. To try phone rules on a computer, use the browser's device toolbar
(Chrome or Edge DevTools, Firefox responsive mode).

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

# Load the 20 sample internship listings (fictional companies; safe to run again, it only refreshes them)
npm run seed:internships

# Optional: approximate sign-in locations (see "Login security"): save GeoLite2-City.mmdb in backend\data\

# Start the API (http://localhost:5000) and the React app (http://localhost:5173) together
npm run dev

# Run the backend tests (an in-memory MongoDB is downloaded the first time)
npm test
```

Open http://localhost:5173. The **Service status** in the footer shows `Online` when the React app can reach the API
and the API can reach MongoDB. You can also open http://localhost:5000/api/health directly. Use
**Register** to create an account; you then land on your dashboard.

## Scripts (run from the project root)

| Command                | What it does                                   |
| ---------------------- | ---------------------------------------------- |
| `npm run install:all`  | Installs the root, backend and frontend packages |
| `npm run dev`          | Starts the backend and frontend together       |
| `npm run dev:backend`  | Starts only the API (restarts on file changes) |
| `npm run dev:frontend` | Starts only the React app                      |
| `npm run build`        | Production build of the React app (`frontend/dist`) |
| `npm run render-build` | Render's build: installs the backend (without test tools) and the frontend, then builds the React app |
| `npm start`            | Starts the API in the current environment (Render runs this; in production it also serves `frontend/dist`) |
| `npm run seed:internships` | Adds the sample internship listings, or refreshes them. Refuses production databases unless confirmed (see Deploy on Render) |
| `npm run lint`         | Checks the frontend code with ESLint           |
| `npm test`             | Runs the backend tests (unit and API tests against an in-memory MongoDB) |

## Environment variables

All settings live in `backend/.env`; `backend/.env.example` lists each one with a placeholder. `.env` files are
git-ignored and must never be committed.

| Variable | Purpose |
| -------- | ------- |
| `PORT`, `NODE_ENV` | API port (default 5000) and environment |
| `CLIENT_URL` | Address of the React app, allowed by CORS |
| `MONGODB_URI` | MongoDB Atlas connection string |
| `DNS_SERVERS` | Optional: DNS servers for networks where Node cannot resolve `mongodb+srv://` addresses |
| `TRUST_PROXY` | Optional: proxies allowed to report the client IP. Empty = only the local Vite dev server; in production the number of proxies in front of the API, e.g. `1` (`true` is refused) |
| `GEOIP_DB_PATH` | Optional: path of the GeoLite2 City database (default `backend/data/GeoLite2-City.mmdb`) |
| `MOBILE_LOGIN_WINDOW_TEST`, `MOBILE_SESSION_TEST_MINUTES` | Optional, local testing only: force the phone/tablet window `open`/`closed`, end phone sessions after N minutes (ignored in production) |
| `MAILTRAP_USER`, `MAILTRAP_PASS` | Local development: Mailtrap Email Testing sandbox for sign-in codes, new passwords and invoices (nothing reaches real inboxes) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` | Render (production): Brevo SMTP, delivering every email to the student's own address, and the sender verified in Brevo. Required when `NODE_ENV=production`; always encrypted (STARTTLS required, certificate checked). Set only in the Render dashboard |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Razorpay Test Mode keys (only `rzp_test_` keys are accepted) |
| `PAYMENT_WINDOW_TEST_OPEN` | Optional, local testing only: `true` allows plan payments outside 5:00-11:45 AM IST (ignored in production) |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Photo and video uploads |

Where each environment gets its settings:

| | Local development | Tests | Render |
| --- | --- | --- | --- |
| Settings | `backend/.env` (from `.env.example`) | set by the tests themselves (`backend/test/helpers/testServer.js`) | Render dashboard > Environment (listed in `render.yaml`) |
| Database | Atlas `internconnect_new` | in-memory MongoDB, deleted after each run | Atlas `internconnect_new` (the same data as local development) |
| Email | Mailtrap sandbox | captured by the tests, never sent | Brevo SMTP to each student's own address |
| Password reset by mobile | mock SMS (code printed in the terminal) | tested | turned off (no SMS provider; email only) |
| Payments | Razorpay Test Mode | not called | Razorpay Test Mode |

## Deploy on Render

InternConnect is an academic and portfolio project. It can be shown online on Render's **Free** plan as **one Web
Service**: Express serves the API and the built React app from the same `https://…onrender.com` address. Two separate
services would put the site and the API on different sites, and the session cookies (`SameSite`) would not be sent.
`render.yaml` describes the service; no secret is stored in it. No paid service is needed.

1. **MongoDB Atlas**: in Network Access allow `0.0.0.0/0` (Render's Free plan has no fixed IP address). Use the same
   connection string as in `backend/.env` (database `internconnect_new`); keep a strong database password.
2. **Brevo** (free plan, 300 emails a day): create an account, verify the sender address you will use in `EMAIL_FROM`
   (Senders, Domains & Dedicated IPs > Senders), and generate an **SMTP key** (SMTP & API > SMTP). Use a separate
   project mailbox as the sender, not a personal one. Without your own domain, some emails may land in spam.
3. **Render**: New > Blueprint > choose this repository. Render reads `render.yaml` and asks for each secret:
   `CLIENT_URL` (the service's own address, e.g. `https://internconnect.onrender.com`), `MONGODB_URI`, `SMTP_USER`
   (the Brevo SMTP login), `SMTP_PASS` (the SMTP key), `EMAIL_FROM`, the Razorpay Test Mode keys and the Cloudinary keys.
4. **Deploy**. Render runs `npm run render-build`, then `npm start`, and checks `/api/health`. The server refuses to
   start without `TRUST_PROXY` or the Brevo settings (it never falls back to the sandbox or skips the codes), and with
   live Razorpay keys.
5. **Check the IP address**: sign in, open Profile > Security and compare the IP in the login history with your
   real public IP. If it shows a Render address instead, set `TRUST_PROXY` to `2` and redeploy.

Tips for a reliable demo:

- **Sign-in codes** go to each person's **own email address** (Brevo). Ask evaluators to check their spam folder if a
  code does not arrive within a minute. All Module 6 rules apply: Google Chrome always asks for a code, a new browser
  or device asks once, then it is trusted for 30 days.
- **Free plan**: the service sleeps after 15 minutes without visits; open the site about a minute before the demo.
- **Shared data**: the demo and local `npm run dev` both use `internconnect_new`, so accounts and posts created in
  one also appear in the other.
- **Time rules** are features and also apply in the demo: phones and tablets can sign in only from 10:00 AM to
  1:00 PM IST, and plan purchases (Razorpay Test Mode) are possible only from 5:00 to 11:45 AM IST.
- **Sign-in locations** show "Unknown" (no GeoLite2 file is deployed).
- The seed script refuses databases whose name contains "prod" unless confirmed with
  `npm run seed:internships -- --confirm-production=<database name>`; `internconnect_new` is not affected.

## Project structure

```
InternConnect_1/
├── backend/                 Express REST API
│   ├── src/
│   │   ├── config/          MongoDB connection
│   │   ├── controllers/     Request handlers (auth, login, password reset, posts, friends, notifications, internships,
│   │   │                    subscriptions, payments, resumes, languages, security, health)
│   │   ├── middleware/      auth.js (checks the server-side session), upload.js (photo/video files), 404 and errors
│   │   ├── models/          Mongoose models (User, Post, FriendRequest, Notification, Otp, Internship, Application,
│   │   │                    Payment, Resume, GeneratedResume, LanguageChange, LoginActivity, LoginChallenge,
│   │   │                    Session, Device, AuthThrottle)
│   │   ├── seed/            Sample internship listings (npm run seed:internships)
│   │   ├── routes/          API routes (mounted under /api)
│   │   ├── utils/           Session, device and sign-in cookies, input validation, Cloudinary uploads, hashtags, posting limit,
│   │   │                    IST dates, notifications, OTP codes, email (Mailtrap), mock SMS, masking,
│   │   │                    letters-only password generator, plans, application quotas, payment window,
│   │   │                    Razorpay (orders, signature check), completing a payment and the invoice email,
│   │   │                    resume content rules, resume PDF template; Module 6: browser/device detection,
│   │   │                    GeoLite2 lookups, phone window, sign-in rules, limits, sessions, devices, emails
│   │   ├── app.js           Express app (middleware and routes)
│   │   └── server.js        Loads .env, connects to MongoDB, starts the server
│   ├── test/                Unit and API tests (npm test)
│   └── .env.example
├── frontend/                React app (Vite)
│   ├── public/              Static files (favicon)
│   └── src/
│       ├── api/             Axios instance and API calls (auth, posts, friends, notifications, password reset,
│       │                    internships, subscriptions, payments, resumes, languages, security)
│       ├── components/      Layout, ui/ (button, form field, alert), posts/ (composer, post card), route guards,
│       │                    auth/ (email-code step, sign-out notice), security/ (sessions, devices, login history)
│       ├── context/         AuthContext (logged-in user, login and email code, register, logout, session end)
│       ├── i18n/            The six interface languages
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
| POST   | `/api/auth/register` | No  | Body `{ name, email, phone, password, client? }`. 202 `OTP_REQUIRED`: the account is created and a code is emailed (no session yet); 201 `ACCOUNT_CREATED_NO_SESSION` for a phone or tablet outside 10 AM–1 PM IST; 400 invalid fields; 409 email or phone already registered (`errorCodes` per field) |
| POST   | `/api/auth/login`    | No  | Body `{ identifier, password, client? }` (identifier = email or mobile number; `client` = optional device details). 200 with the user and the session cookie; 202 `OTP_REQUIRED` `{ reasons, destination, codeExpiresAt, resendAvailableAt, attemptsLeft }`; 401 `INVALID_CREDENTIALS`; 403 `MOBILE_LOGIN_WINDOW` `{ opensAt }`; 429 `LOGIN_COOLDOWN` / `LOGIN_BUSY` / `OTP_HOURLY_LIMIT` `{ retryAfterSeconds }`; 502 `OTP_DELIVERY_FAILED` |
| POST   | `/api/auth/login/verify` | No (sign-in cookie) | Body `{ otp }`. 200 with the user and the session cookie (the device becomes trusted); 400 `OTP_INVALID` `{ attemptsLeft }`; 401 `NO_CHALLENGE`; 403 `MOBILE_LOGIN_WINDOW`; 410 `OTP_EXPIRED` / `CHALLENGE_EXPIRED`; 429 `OTP_LOCKED` |
| POST   | `/api/auth/login/resend` | No (sign-in cookie) | Sends a new code. 429 `OTP_RESEND_COOLDOWN` (60 s), `OTP_RESEND_LIMIT` (3 per sign-in), `OTP_HOURLY_LIMIT` (6 per hour) |
| POST   | `/api/auth/login/cancel` | No (sign-in cookie) | Ends the unfinished sign-in ("Use a different account") |
| POST   | `/api/auth/logout`   | No  | Ends this browser's session on the server and clears the cookie |
| GET    | `/api/auth/me`       | Yes | The logged-in user and `session: { id, deviceClass, expiresAt, serverTime }`; 401 with `code` `NOT_LOGGED_IN`, `SESSION_EXPIRED`, `SESSION_REVOKED`, `MOBILE_SESSION_ENDED` or `SESSION_CONTEXT_CHANGED` (every protected route answers the same way) |
| POST   | `/api/auth/forgot-password` | No | Body `{ identifier }` (email or mobile number). Sends a 6-digit code by email (Mailtrap locally, Brevo on Render) or, locally only, mock SMS (400 `SMS_UNAVAILABLE` in production). 404 unknown account; 429 "You can use this option only once per day." or "Please wait N seconds" (60 s between codes) |
| POST   | `/api/auth/reset-password` | No | Body `{ identifier, otp }`. With the right code: a new 12-letter password (upper- and lowercase letters only) is saved, returned once as `password` and sent to the same email or phone. Every session is signed out and every trusted device removed (`signedOutEverywhere: true`). 400 wrong (with `attemptsLeft`), expired or locked code |
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
| GET    | `/api/users/me/login-history?before=&limit=20` | Yes | Your sign-in attempts, newest first (up to 50 per page, `nextCursor` for the next page) |
| GET    | `/api/users/me/sessions` | Yes | Your active sessions (`current` marks this browser) |
| POST   | `/api/users/me/sessions/:id/revoke` | Yes | Body `{ password }`. Signs that session out; 403 `PASSWORD_INCORRECT`; 404 not one of yours |
| POST   | `/api/users/me/sessions/revoke-others` | Yes | Body `{ password }`. Signs out every other session; `{ revokedCount }` |
| GET    | `/api/users/me/devices` | Yes | Browsers your account has used, with `trusted` and `trustExpiresAt` |
| POST   | `/api/users/me/devices/:id/remove` | Yes | Body `{ password }`. Removes the device and ends its sessions |
| GET    | `/api/notifications` | Yes | The latest 30 notifications, newest first, with `unreadCount` |
| GET    | `/api/notifications/unread-count` | Yes | `{ unreadCount }` for the bell in the navbar |
| POST   | `/api/notifications/read-all` | Yes | Marks every notification as read |

**Notifications** are created when someone likes or comments on your post, a friend mentions you, you receive a
friend request, or your request is accepted. Your own actions never notify you; an unlike, a deleted post or a
cancelled/declined/accepted request removes the matching notification. The navbar bell asks for the unread count
on every page change (no live connection); opening the Notifications page marks everything as read.

Errors are returned as `{ "message": "..." }`, plus `"errors": { "field": "..." }` for invalid form fields.

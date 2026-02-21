# Kodbank – Implementation Reference

A simple banking web application with user registration, JWT-based login, and balance check functionality.

---

## Table of Contents

1. [Architecture](#architecture)
2. [Tech Stack](#tech-stack)
3. [Database Schema](#database-schema)
4. [Implementation Stages](#implementation-stages)
5. [API Endpoints](#api-endpoints)
6. [JWT Flow](#jwt-flow)
7. [Project Structure](#project-structure)
8. [Environment Variables](#environment-variables)
9. [Running Locally](#running-locally)
10. [Deployment (Render)](#deployment-render)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              KODBANK ARCHITECTURE                            │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌──────────────┐         HTTP/HTTPS          ┌──────────────────────────┐
    │   Browser    │ ◄─────────────────────────► │   Express Server         │
    │   (Client)   │     Static + JSON APIs      │   (Node.js)              │
    └──────────────┘                             └────────────┬─────────────┘
           │                                                 │
           │  • register.html                                │  • Static files
           │  • login.html                                   │  • /api/register
           │  • dashboard.html                               │  • /api/login
           │  • styles.css, *.js                             │  • /api/balance
           │                                                 │  • JWT verify
           │                                                 │  • Cookie handling
           │                                                 │
           │                                                 ▼
           │                                    ┌──────────────────────────┐
           │                                    │   MySQL Database         │
           │                                    │   (FreeDB / Aiven)       │
           │                                    │                          │
           │                                    │   • KodUser              │
           │                                    │   • UserToken            │
           │                                    └──────────────────────────┘
```

### Data Flow

```
Register → POST /api/register → Insert KodUser (balance=100000) → Redirect to Login
Login    → POST /api/login    → Validate credentials → Generate JWT → Store in UserToken
                                                      → Set cookie   → Redirect to Dashboard
Balance  → GET /api/balance   → Verify JWT cookie     → Extract username → Query KodUser
                                                      → Return balance   → Confetti animation
```

---

## Tech Stack

| Layer   | Technology                          |
|---------|-------------------------------------|
| Backend | Node.js, Express 5                  |
| Auth    | JWT (jsonwebtoken), HttpOnly cookies |
| Database| MySQL (mysql2) – FreeDB / Aiven     |
| Frontend| Vanilla HTML, CSS, JavaScript       |
| Config  | dotenv, environment variables       |

---

## Database Schema

### KodUser

| Column   | Type          | Constraints |
|----------|---------------|-------------|
| uid      | INT           | PRIMARY KEY |
| username | VARCHAR(100)  | NOT NULL, UNIQUE |
| email    | VARCHAR(255)  | NOT NULL, UNIQUE |
| password | VARCHAR(255)  | NOT NULL |
| balance  | DECIMAL(15,2) | NOT NULL, DEFAULT 100000.00 |
| phone    | VARCHAR(20)   | |
| role     | ENUM('Customer','manager','admin') | NOT NULL, DEFAULT 'Customer' |

### UserToken

| Column | Type     | Constraints |
|--------|----------|-------------|
| tid    | INT      | AUTO_INCREMENT, PRIMARY KEY |
| token  | TEXT     | NOT NULL |
| uid    | INT      | NOT NULL, FK → KodUser(uid) ON DELETE CASCADE |
| expiry | DATETIME | NOT NULL |

---

## Implementation Stages

### Stage 1: Registration & Login Pages

**Goal:** User can register and be redirected to login; then log in with valid credentials.

1. **Registration**
   - Form fields: `uid`, `uname`, `password`, `email`, `phone`, `role` (Customer only)
   - Initial balance: **100000**
   - On success: redirect to `/login.html`

2. **Login**
   - Form fields: `uname`, `password`
   - Backend validates credentials against `KodUser`
   - On success: redirect to `/dashboard.html`

### Stage 2: JWT & Token Storage

**Goal:** Secure auth using JWT and token persistence.

1. **JWT Generation**
   - Subject: `username`
   - Claim: `role`
   - Algorithm: HS256 (jsonwebtoken default)
   - Secret: from `JWT_SECRET` env var
   - Expiry: 1 hour

2. **Token Storage**
   - Insert into `UserToken` (token, uid, expiry)
   - Set `kodbank_token` cookie: HttpOnly, SameSite=Lax, 1h max-age
   - Return JSON `{ message, redirectTo }` with 200 status

### Stage 3: Dashboard & Balance Check

**Goal:** Protected balance API and celebratory UI.

1. **Check Balance**
   - Button on dashboard calls `GET /api/balance` with `credentials: 'include'`
   - Backend: verify JWT from cookie → extract username → query `KodUser.balance`
   - Response: `{ balance }`

2. **Client Display**
   - Message: `Your balance is: ₹{balance}`
   - Party confetti animation on success

---

## API Endpoints

| Method | Endpoint         | Auth  | Description |
|--------|------------------|-------|-------------|
| GET    | `/`              | No    | Redirects to /register.html |
| GET    | `/index.html`    | No    | Registration page (static) |
| GET    | `/register.html` | No    | Registration page |
| GET    | `/login.html`    | No    | Login page |
| GET    | `/dashboard.html`| No    | Dashboard page (static) |
| POST   | `/api/register`  | No    | Create user, redirect URL |
| POST   | `/api/login`     | No    | Validate, JWT, cookie, redirect URL |
| GET    | `/api/balance`   | JWT   | Return balance for logged-in user |
| POST   | `/api/chat`      | JWT   | AI chat (Mistral 7B via Hugging Face) |

---

## JWT Flow

```
Login Request (uname, password)
        │
        ▼
┌───────────────────────┐
│ Validate credentials  │
│ from KodUser          │
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│ jwt.sign()            │
│ sub: username         │
│ role: user.role       │
│ expiresIn: 1h         │
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│ INSERT UserToken      │
│ (token, uid, expiry)  │
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│ Set cookie            │
│ kodbank_token = JWT   │
│ HttpOnly, SameSite    │
└───────────┬───────────┘
            │
            ▼
   Response 200 + redirectTo
```

---

## Project Structure

```
kodbank/
├── server.js           # Express app, APIs, JWT middleware
├── src/
│   └── db.js           # MySQL pool, initSchema (KodUser, UserToken)
├── public/
│   ├── index.html      # Register page (root)
│   ├── register.html
│   ├── register.js     # Register form submit
│   ├── login.html
│   ├── login.js        # Login form submit
│   ├── dashboard.html
│   ├── dashboard.js    # Check balance, confetti
│   └── styles.css      # Glassmorphism, gradients, confetti
├── .env                # DB + JWT (local only, not committed)
├── .gitignore
├── package.json
├── render.yaml         # Render deployment config
└── IMPLEMENTATION.md   # This file
```

---

## Environment Variables

| Variable     | Description                    | Example |
|--------------|--------------------------------|---------|
| DB_HOST      | MySQL host                     | `sql.freedb.tech` |
| DB_PORT      | MySQL port                     | `3306` |
| DB_USER      | Database username              | `freedb_chandana` |
| DB_PASSWORD  | Database password              | `********` |
| DB_NAME      | Database name                  | `freedb_Kodbanking` |
| JWT_SECRET   | Secret for JWT signing         | 64-byte hex string |
| HF_TOKEN     | Hugging Face token (chatbot)   | Your HF access token |
| PORT         | Server port (optional)         | `3000` |

Generate JWT secret:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## Running Locally

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure `.env`**

   Copy or create `.env` with DB and JWT values (see [Environment Variables](#environment-variables)).

3. **Start the server**

   ```bash
   npm run dev
   ```

4. **Open in browser**

   ```
   http://localhost:3000/
   ```

5. **Test flow**

   - Register → Login → Dashboard → Check Balance

---

## Deployment (Render)

1. Push code to GitHub: `chandana28c/KodbankingAPP`
2. In Render: **New** → **Web Service** → connect repo
3. Set:
   - **Build command:** `npm install`
   - **Start command:** `npm start`
4. Add environment variables (DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, JWT_SECRET)
5. Deploy

Live URL: `https://kodbankingapp.onrender.com/`

---

## Summary

| Feature          | Implementation |
|------------------|----------------|
| Registration     | POST /api/register, initial balance 100000 |
| Login            | POST /api/login, JWT in cookie |
| Token storage    | UserToken table with expiry |
| Balance check    | GET /api/balance, JWT auth, query KodUser |
| UI               | HTML/CSS/JS, confetti on balance success |

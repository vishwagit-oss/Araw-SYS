# Sea Regent Admin — Website Flow

## 1. High-level user flow

```
                    ┌─────────────────┐
                    │   Landing (/)   │
                    │  Sign In / Up   │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
        ┌──────────┐  ┌──────────┐  ┌─────────────┐
        │  /login  │  │/register │  │ /dashboard  │
        │  Sign In │  │ Sign Up  │  │ (no auth →  │
        └────┬─────┘  └────┬─────┘  │  redirect   │
             │              │       │  to /login) │
             │              │       └──────┬──────┘
             │              │              │
             │    (after verify email)     │
             └──────────────┼──────────────┘
                            ▼
                    ┌───────────────┐
                    │  /dashboard   │  ← AuthGuard allows
                    │  HOME PAGE    │
                    │  (nav grid)   │
                    └───────┬───────┘
                            │
    User clicks one option →│
                            ▼
    ┌─────────────────────────────────────────────────────────────┐
    │  Purchase | Sale | Cargo Receiving | Internal Discharge |    │
    │  Case Receiving | Case Discharge | Result                   │
    └─────────────────────────────────────────────────────────────┘
                            │
                            ▼
                    ┌───────────────┐
                    │  Form page    │  Fill → Submit / Cancel
                    │  (e.g. Cargo  │
                    │   Receiving)  │
                    └───────────────┘
```

---

## 2. Page-by-page flow

| Step | Page | What happens |
|------|------|----------------|
| 1 | **`/`** (Landing) | User sees “SEA REGENT”, **Sign In** and **Sign Up**. Can also click “Go to Dashboard” (if not logged in, dashboard will redirect to login). |
| 2 | **`/login`** | User enters email + password → Cognito sign-in → on success, redirect to **`/dashboard`**. |
| 3 | **`/register`** | User enters name, email, password → Cognito sign-up → “Check your email” → user verifies email, then uses **`/login`** to sign in. |
| 4 | **`/dashboard`** (Home) | Only if **logged in**. Sidebar (DashboardNav) + main area. Main area = **grid of 7 options**: Purchase, Sale, Cargo Receiving, Internal Discharge, Case Receiving, Case Discharge, Result. **Clicking an option opens that page.** |
| 5 | **`/dashboard/purchase`** | Form: Date, Location, Remark, White (I.G., M.T.), Yellow (I.G., M.T.), Attachment. I.G. ↔ M.T. auto-conversion. Submit shows “Purchase form submitted.” |
| 6 | **`/dashboard/sale`** | Same as Purchase + **WHOM**. Attachment (upload / Photo / Camera). Submit. |
| 7 | **`/dashboard/cargo-receiving`** | Ship name dropdown (MANRU, PHOENIX 32, … OTHER). If **OTHER** → “Ship name (other)” required. Date, FROM, Location, Remark. White & Yellow: I.G., M.T., **Price (AED)**. Auto I.G.↔M.T. Attachment. Submit / Cancel. |
| 8 | **`/dashboard/internal-discharge`** | Ship name (+ other), Date, **TO**, Location, Remark. White/Yellow I.G. & M.T. Attachment. Submit / Cancel. |
| 9 | **`/dashboard/case-receiving`** | Same structure: Ship name, Date, FROM, Location, Remark, White/Yellow, Attachment. Submit / Cancel. |
| 10 | **`/dashboard/case-discharge`** | Same structure: Ship name, Date, TO, Location, Remark, White/Yellow, Attachment. Submit / Cancel. |
| 11 | **`/dashboard/result`** | Placeholder “Result” view with a bar chart (no real data yet). For reports/summaries once backend is connected. |
| 12 | **`/dashboard/profile`** | Shows logged-in user’s name and email (read-only). |

---

## 3. How it works technically

### 3.1 App structure (Next.js App Router)

```
Root (layout.tsx)
  └── <Providers>  ← AuthProvider (Cognito session state)
        └── children (each page)

Routes:
  /                    → page.tsx (landing)
  /login               → (auth)/login/page.tsx
  /register            → (auth)/register/page.tsx
  /dashboard/*         → (dashboard)/layout.tsx
                          ├── AuthGuard     ← checks login, else redirect to /login
                          ├── DashboardNav  ← sidebar with all 7 options + Profile, Sign Out
                          └── main → child page (dashboard home or form or result)
```

### 3.2 Authentication flow

1. **On load (any page)**  
   - Root layout wraps the app in **Providers** → **AuthProvider**.  
   - AuthProvider runs **getSession()** (Cognito) in `useEffect` and sets **isAuthenticated** and **user**.

2. **When user visits `/dashboard` or any `/dashboard/...`**  
   - **Dashboard layout** wraps content in **AuthGuard**.  
   - AuthGuard reads **isAuthenticated** and **isLoading** from **useAuth()**.  
   - If **still loading** → show “Loading…”.  
   - If **not authenticated** → **redirect to `/login`**.  
   - If **authenticated** → render sidebar (DashboardNav) + the dashboard page (e.g. home grid or form).

3. **Login**  
   - User submits email/password on **`/login`**.  
   - **signIn()** (Cognito) runs.  
   - On success, **getAuthToken()** is used to confirm session, then **redirect to `/dashboard`**.

4. **Sign out**  
   - “Sign Out” in sidebar calls **signOut()** (Cognito) and **window.location.href = "/login"**.

### 3.3 Navigation flow

- **Sidebar (DashboardNav)**  
  - Renders links: Home, Purchase, Sale, Cargo Receiving, Internal Discharge, Case Receiving, Case Discharge, Result, and (in user block) Profile, Sign Out.  
  - **Clicking a link** goes to that route (e.g. `/dashboard/cargo-receiving`).  
  - The **dashboard layout** stays; only the **main** area content (the child page) changes.

- **Home page**  
  - Renders the same 7 options as **cards**.  
  - Clicking a card uses **Link** to the same URLs as the sidebar (e.g. `/dashboard/cargo-receiving`).  
  - So: “Whatever page option user select, that page will open.”

### 3.4 Form flow (e.g. Cargo Receiving)

1. User opens **`/dashboard/cargo-receiving`**.  
2. Fills: Ship name (or “OTHER” + ship name other), Date, FROM, Location, Remark.  
3. For **White** and **Yellow**: enters I.G. or M.T. → the other field **auto-calculates** (1000 I.G. = 3.787 M.T.).  
4. Enters **Price (AED)** for White/Yellow if needed.  
5. Optionally **uploads a photo** (Attachment).  
6. **Submit** → form `onSubmit` runs → currently shows a success message (no API/DB yet).  
7. **Cancel** → clears form and result message.

### 3.5 Data flow (current vs future)

| Part | Current behavior | When you add backend |
|------|------------------|----------------------|
| Login / Register | Cognito only (session in browser) | Same; optional: store user in DB. |
| Forms (Purchase, Sale, Cargo, etc.) | Submit only shows “submitted” message | POST to API routes → save to PostgreSQL (e.g. `cargo_receiving`, `purchase`, `sale` tables). |
| Result page | Placeholder chart, no real data | API route reads from DB → return counts/summaries → chart shows real data. |
| Attachments | File chosen in state only | Upload to S3 (or similar) in API, store URL in DB. |

---

## 4. Quick reference: URLs

| URL | Purpose |
|-----|--------|
| `/` | Landing; Sign In / Sign Up |
| `/login` | Sign in with Cognito |
| `/register` | Sign up with Cognito |
| `/dashboard` | Home; grid of 7 options |
| `/dashboard/purchase` | Purchase form |
| `/dashboard/sale` | Sale form |
| `/dashboard/cargo-receiving` | Cargo Receiving form (ship, FROM, White/Yellow, AED, attachment) |
| `/dashboard/internal-discharge` | Internal Discharge form |
| `/dashboard/case-receiving` | Case Receiving form |
| `/dashboard/case-discharge` | Case Discharge form |
| `/dashboard/result` | Result / reports (placeholder) |
| `/dashboard/profile` | Profile (name, email) |

---

## 5. Summary

- **Landing** → **Login or Register** → **Dashboard (home)**.  
- **Dashboard** is protected: not logged in → redirect to **Login**.  
- From **dashboard home**, user **clicks one of 7 options** → that **page opens** (form or Result).  
- **Forms** collect data and **Submit** (today: message only; later: API + DB).  
- **Sidebar** is always visible inside dashboard and links to the same 7 sections + Profile and Sign Out.  
- **Auth** is handled by **Cognito**; **AuthProvider** holds session state; **AuthGuard** enforces access to `/dashboard/*`.

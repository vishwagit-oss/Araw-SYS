# Sea Regent Admin — Ship Management

Ship management admin built with the **same stack as EVCare Admin**: Next.js 14, TypeScript, Tailwind CSS, AWS Cognito, and PostgreSQL.

## Features

- **Home**: Clickable options for Purchase, Sale, Cargo Receiving, Internal Discharge, Case Receiving, Case Discharge, Result
- **Cargo Receiving**: Ship name dropdown (MANRU, PHOENIX 32, KOKO, APRIL 2, SEA, REGENT, OTHER); if "OTHER", Ship Name (other) is required. Date, FROM, Location, Remark. White/Yellow sections with I.G. and M.T. and **auto-conversion** (1000 I.G. = 3.787 M.T.). Price in **AED**. Attachment (upload photo). Submit / Cancel
- **Purchase, Sale, Internal Discharge, Case Receiving, Case Discharge**: Same structure (date, location, remark, White/Yellow I.G. & M.T. with auto-conversion, attachment, submit)
- **Result**: Placeholder reports; connect to your DB to show real data
- **Auth**: Sign In / Sign Up with AWS Cognito (same pattern as EVCare)

## Tech stack

- Next.js 14 (App Router), TypeScript, React 18, Tailwind CSS
- Auth: AWS Cognito (`amazon-cognito-identity-js`), JWT verification with `jose`
- Database: PostgreSQL (`pg`) — add `DATABASE_URL` when you add API persistence
- Charts: Recharts (Result page)

## Setup

1. **Install**
   ```bash
   cd sea-regent-admin
   npm install
   ```

2. **Environment**
   - Copy `.env.example` to `.env.local`
   - Set `NEXT_PUBLIC_COGNITO_USER_POOL_ID`, `NEXT_PUBLIC_COGNITO_CLIENT_ID`, and `AWS_REGION` (use the same Cognito User Pool as EVCare if you want)
   - Optionally set `DATABASE_URL` when you add API routes to save cargo/purchase/sale data

3. **Run**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000). Sign up or sign in, then use the dashboard.

## Documents / data

- **hiMAHRU cash details.docx** and **Document (5) cargo report.docx**: Not in the repo. When you have them, you can add their structure (e.g. FROM/TO dropdown options, extra fields) into the forms and API.

## Notes

- All prices are in **AED** as per your wireframes.
- I.G. ↔ M.T. conversion is **1000 I.G. = 3.787 M.T.** and is applied in both directions on the forms.
- FROM/TO dropdown options are placeholders; replace with your real options from the docx/excel when ready.

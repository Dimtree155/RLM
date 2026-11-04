# RLM — public deployment starter

This is a small React + Vite + Supabase starter for the RLM public website. It is not yet the complete social/gaming platform. It provides a deployable shell and a safe starting point for account authentication and database policies.

## Requirements
- Node.js 20.19+ or 22.12+
- A Supabase project
- A Netlify account
- A GitHub repository (recommended for continuous deployment)

## 1. Create the Supabase backend
1. Create a new Supabase project.
2. Open SQL Editor and run `supabase/schema.sql`.
3. In Project Settings / API, copy the Project URL and the publishable (or legacy anon) key.
4. Do not copy or expose the `service_role` / secret key in browser code.
5. Enable email confirmation in Auth settings for public registration.

## 2. Run locally
```bash
npm install
cp .env.example .env
```
Put your Supabase URL and publishable key into `.env`, then:
```bash
npm run dev
```
To test a production build:
```bash
npm run build
```

## 3. Deploy on Netlify
1. Push this folder to a GitHub repository.
2. In Netlify, choose Add new project / Import an existing project and connect that repository.
3. Build command: `npm run build`
4. Publish directory: `dist`
5. In Site configuration / Environment variables add:
   - `VITE_SUPABASE_URL` = your Supabase Project URL
   - `VITE_SUPABASE_ANON_KEY` = your Supabase publishable/anon key
6. Trigger a new deploy. Netlify uses `netlify.toml` for the build and SPA redirect settings.

The site address will be a Netlify subdomain selected/confirmed in the Netlify dashboard. Availability of `rlm.netlify.app` is not guaranteed.

## 4. Assign the first owner
1. Sign up using the email that should own RLM.
2. Confirm the email and sign in once.
3. In Supabase SQL Editor, find the new user's UUID in Authentication / Users.
4. Run this statement, replacing the UUID:
```sql
update public.user_roles
set role = 'owner'
where user_id = 'YOUR-USER-UUID';
```
The browser client cannot assign roles. Do not let users self-promote. Build a trusted server-side admin function for future role changes.

## Before public launch
This starter is not ready for unrestricted public chat. Add and test:
- friend request acceptance and conversation creation on the server
- message reporting, blocking, moderation queues and appeal process
- spam/rate limits, account deletion and privacy controls
- secure server-side coin, XP, quest and purchase transactions
- image upload limits and private storage policies
- age-appropriate community rules and active moderation
- backup, abuse monitoring and incident response

Never paste passwords, Supabase secret/service-role keys, or Netlify access tokens into chat or commit them to Git.

# BirdDex

BirdDex is a web application for cataloging bird photographs, competing with others, and participating in photo quests. Built with React, TypeScript, Vite, and Supabase (backend/auth and photo storage).

## Features
- User authentication (username/password or Google via Supabase)
- Upload and manage bird photos (up to 500, 5MB each)
- Select a "top" photo for each species
- Privacy controls for each photo (public, friends, private)
- Grid view of "top" photos for all unique species
- Species-specific view and top photo selection
- Global leaderboard by unique species
- Friend system (send, accept, remove friends)
- Photo feed (friends' uploads, comments, infinite scroll)
- Dedicated page to view your uploads and comments
- Quests (admin-created, voting, awards)
- Notifications for friend requests, comments, quest results, and new quests
- Minimal, responsive UI

## Setup
1. Install dependencies:
   ```sh
   npm install
   ```
2. Start the development server:
   ```sh
   npm run dev
   ```
3. Configure Supabase (see `supabase-setup.md` and `supabase-storage-setup.sql`)

## Project Structure
- `src/` — Main application code
- `.github/copilot-instructions.md` — Copilot workspace instructions
- `requirements.md` — Product requirements

## Requirements
See `requirements.md` for full product requirements.

---

This project was bootstrapped with Vite + React + TypeScript.

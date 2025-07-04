# BirdDex Product Requirements Document

## Overview
**BirdDex** is a web application that allows users to catalog bird photographs, compete with others, and participate in photo quests. Users can upload photos, select a "top" photo for each species, view a grid of their best shots, interact with friends, and join global quests. The app is built with React, uses Supabase for backend/auth, and Cloudflare R2 for photo storage.

---

## Features

### 1. User Authentication & Profiles
- **Login**: Username/password or Google account via Supabase Auth.
- **Profile**: Shows privacy settings and user’s score (unique species photographed).
- **Friend Management**: Send, accept, and remove friends. No blocking or friend limits.

### 2. Bird Photo Management
- **Species List**: Users select species from a supported list when uploading.
- **Photo Upload**: 
  - Max file size: 5MB.
  - Max photos per user: 500.
  - Users can upload multiple photos per species.
- **Privacy Controls**: Each photo (including "top" and feed photos) can be set to:
  - Public (all users)
  - Friends only
  - Private (only uploader)
- **Top Photo Selection**: For each species, users can select a "top" photo.

### 3. Photo Grid View
- **Grid Display**: Shows "top" photos for all unique species in a scrollable grid (infinite/lazy loading).
- **Score**: Prominently displays the number of unique species (user’s score).

### 4. Species-Specific View
- View all photos for a species.
- Select/change the "top" photo for that species.

### 5. Leaderboard
- **Global leaderboard**: Ranks users by score.
- **User Comparison**: View "top" photos of any user.
- **Privacy Respect**: Only shows photos per user’s privacy settings.

### 6. Friends & Social
- **Friend Requests**: Send/accept/remove friends.
- **Photo Feed**: 
  - Shows friends’ new uploads (not user’s own).
  - Infinite scrolling, chronological order.
  - Users can comment on friends’ photos.
  - Privacy respected per photo.
- **My Uploads Page**: Users can view a dedicated page showing all their uploaded photos and any comments on them.

### 7. Quests
- **Admin Dashboard**: Admins can create/manage quests (species, awards, start/end time).
- **Quest Participation**: 
  - Users can submit one photo per quest during the active period.
  - All users can vote (not for their own entry).
- **Awards**: 
  - Top 10: Top 10 award image, quest name, quest date.
  - Others: Participation award image, quest name, quest date.
- **Quest History**: View past quests and top 10 winners.

### 8. Home Page
- **Sections**:
  1. User’s score and button to view Photo Grid.
  2. Compact view of user’s awards.
  3. Photo Feed (friends’ uploads).

### 9. Notifications
- For friend requests, comments, quest results, and new quest announcements.

### 10. UI/UX
- Minimal, visually pleasing, responsive for mobile and web.
- English only.

### 11. Technology & Infrastructure
- **Frontend**: React.
- **Backend/Auth**: Supabase (free tier).
- **Photo Storage**: Cloudflare R2 (free tier).
- **No accessibility or localization requirements.**

---

## Non-Functional Requirements

- **Performance**: Efficient image loading (lazy/infinite scroll).
- **Scalability**: All services must support free tier until high volume.
- **Security**: Respect privacy settings for all photos and feeds.
- **Reliability**: Handle up to 500 photos per user, 5MB each.

---

## Out of Scope

- AI-based species identification.
- Blocking/reporting users.
- Comment/photo moderation.
- Data export.
- Accessibility beyond standard browser defaults.
- Multi-language support.

---

## Open Questions

- None at this time.

---

**End of Document**

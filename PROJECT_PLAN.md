# BirdDex Project Plan Update: Use Supabase Storage for Images

## Change in Approach
- **Image Storage:** All user-uploaded images will be stored in Supabase Storage.
- **Frontend Only:** No backend API is required for presigned URLs; all upload and download logic will use the Supabase JS client.
- **Access Control:** Supabase Storage policies and signed URLs will be used for privacy and access control.

## Updated Project Plan

### Work Done So Far
- [x] Vite + React + TypeScript frontend scaffolded
- [x] Supabase integration for auth and data
- [x] User authentication (email/password)
- [x] Photo upload form with privacy and species selection
- [x] My Uploads page with photo and comment listing
- [x] Default species and UUID handling
- [x] SQL setup for Supabase tables and default species

### Work Remaining
- [ ] **Supabase Storage Integration**
  - [ ] Create a storage bucket (e.g., `photos`) in Supabase dashboard
  - [ ] Update upload logic to use Supabase Storage
  - [ ] Update photo display logic to use Supabase signed URLs
  - [ ] Update privacy logic to use Supabase Storage policies
- [x] **Remove Cloudflare R2 code and config**
  - [x] Remove R2 credentials from .env
  - [x] Remove R2 upload logic from frontend
- [ ] **Documentation**
  - [ ] Update setup instructions for Supabase Storage
  - [ ] Add any new SQL or policy commands needed

---

**This plan will be updated as work progresses.**

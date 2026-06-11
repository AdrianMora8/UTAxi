---
name: Vehicle verification flow (pending implementation)
description: Agreed design for vehicle photo verification by admin — not yet implemented
type: project
originSessionId: 380f03da-13db-46c7-bd7a-a88b3f9fcfe9
---
Vehicle verification is planned but NOT yet implemented. When implementing:

**Flow:** User uploads photo of vehicle (showing plate + color) via expo-image-picker → backend stores photo → admin reviews and approves/rejects via admin panel.

**Backend changes needed:**
- Add `photoUrl String?` and `status String @default("PENDING")` (PENDING / VERIFIED / REJECTED) to the Vehicle model in Prisma
- Add `POST /users/me/vehicle/photo` endpoint using multer for file upload
- For sprint 2: multer local storage is fine (backend is local)
- For June production deploy: switch to Cloudinary using `multer-storage-cloudinary` (10-line change)

**Why Cloudinary (not local disk):** Cloud deployments lose local files on redeploy. Cloudinary has free tier, Node SDK, and permanent URLs.

**Admin endpoint needed:** `PATCH /admin/vehicles/:id/verify` with body `{ status: 'VERIFIED' | 'REJECTED' }`

**Tab visibility future:** Once verification exists, the "Publicar" tab should only appear when `vehicle.status === 'VERIFIED'`, not just when vehicle exists.

**Why:** Line between passenger/driver is vehicle registration. Currently tab shows if vehicle exists (any status). Future: only if VERIFIED.

# MS Temp Mail UI/UX Update Notes

## Branding
- Product name: `MS Temp Mail`
- Studio: `Mamak Studio`
- Developer: `Emir Han Mamak`

## Implemented fixes
- Address line is now visually split as:
  - username: white
  - `@`: red
  - domain: blue
- Domain selector was upgraded from a plain native select to a richer dropdown panel.
- Recent history dropdown no longer gets clipped by the address card layout.
- Account section rename button now works through authenticated profile update flow.
- Admin panel branding text was updated to `MS Temp Mail`.

## Backend additions
- `PUT /api/auth/me`
  - Updates the signed-in user's username.
  - Returns a refreshed JWT token and updated user payload.

## Domain DNS management
- Each domain now stores its own DNS-oriented values:
  - server IP
  - A record
  - MX record
  - SPF TXT
  - verification TXT
  - DKIM TXT
  - DMARC TXT
- Admin panel includes:
  - `DNS Ayarları` button for editing per-domain values
  - `Domain Docs` button for ready-to-copy DNS setup instructions
- Automatic defaults use `MAIL_SERVER_IP` when available.

## Notes
- Current system does not contain persistent IP/session telemetry storage.
- Domain availability is still driven by admin-added active domains in the database.

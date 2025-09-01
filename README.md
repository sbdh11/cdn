# Picture Vault

Picture Vault is a minimal, lightweight image upload and delivery server built with Express and SQLite. Perfect for quickly hosting images with anonymous uploads and easy management. If you own a domain, Picture Vault can double as your personal image CDN.

## Features

1. Anonymous uploads (no accounts).
2. Per-file deletion via one-time deletion password.
3. Batch upload support.
4. Image listing, metadata lookup, and HEAD checks.
5. Simple file-based storage with SQLite index.

## Run locally

1. Install Node.js (>= 18).
2. Install dependencies:

   ````bash
   npm install
   ```

3. Start the server:

   ```bash
   npm run start
   ```

The app serves a simple test UI at `/` and the API under `/images`.

## API

- POST `/images/add`
  - multipart/form-data with field `photos` (supports multiple files)
  - returns JSON: list of uploaded files with `id` and `deletionPassword`

- GET `/images/:id`
  - returns the image binary if found; 404 otherwise

- HEAD `/images/:id`
  - 200 if the image exists, 404 if not; includes `Content-Type`

- GET `/images/:id/meta`
  - returns `{ id, extn, size, modifiedAt }` for an image

- GET `/images?limit=50&offset=0`
  - paginated listing; returns `{ total, limit, offset, items: [{ id, extn }] }`

## Notes

- Images are stored under `./images/` with names `<id>.<extn>`.
- Index is persisted in `images.db` (SQLite). No external database required.
- Supported types: `image/jpeg`, `image/jpg`, `image/png`, `image/gif`.
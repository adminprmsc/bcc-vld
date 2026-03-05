# Local Database ER Model

This document describes the tables for the mobile application's local SQLite database.

## Tables

### `assets`

Stores core asset information, synced from the backend.

- `id` (TEXT, PRIMARY KEY)
- `name` (TEXT)
- `type` (TEXT)
- `location_lat` (REAL)
- `location_lon` (REAL)
- `updated_at` (INTEGER, UNIX_TIMESTAMP)
- `is_critical_local` (INTEGER, 0 or 1) - Flagged on the device, pending sync.
- `critical_notes_local` (TEXT)

### `requisitions`

Offline-first requisitions created by users.

- `local_id` (TEXT, PRIMARY KEY) - Client-generated UUID
- `asset_id` (TEXT, FOREIGN KEY -> `assets.id`)
- `priority` (TEXT)
- `required_by` (TEXT, ISO_8601_DATE)
- `notes` (TEXT)
- `created_at` (INTEGER, UNIX_TIMESTAMP)
- `sync_status` (TEXT) - `pending`, `synced`, `failed`

### `requisition_items`

Items belonging to a requisition.

- `id` (INTEGER, PRIMARY KEY AUTOINCREMENT)
- `requisition_local_id` (TEXT, FOREIGN KEY -> `requisitions.local_id`)
- `name` (TEXT)
- `quantity` (INTEGER)

### `samples`

Data for collected samples.

- `local_id` (TEXT, PRIMARY KEY) - Client-generated UUID
- `assignment_id` (TEXT)
- `barcode` (TEXT)
- `collected_at` (INTEGER, UNIX_TIMESTAMP)
- `sync_status` (TEXT) - `pending`, `synced`, `failed`

### `sample_measurements`

Measurements for a given sample.

- `id` (INTEGER, PRIMARY KEY AUTOINCREMENT)
- `sample_local_id` (TEXT, FOREIGN KEY -> `samples.local_id`)
- `type` (TEXT) - 'ph', 'turbidity', etc.
- `value` (REAL)
- `unit` (TEXT)

### `sample_photos`

Photos attached to a sample.

- `id` (INTEGER, PRIMARY KEY AUTOINCREMENT)
- `sample_local_id` (TEXT, FOREIGN KEY -> `samples.local_id`)
- `local_path` (TEXT) - Path to the image on the device
- `uploaded_url` (TEXT) - Null until uploaded

### `outbound_sync_queue`

A generic queue for actions to be sent to the backend.

- `id` (INTEGER, PRIMARY KEY AUTOINCREMENT)
- `payload_type` (TEXT) - e.g., 'asset_flag', 'requisition_create', 'sample_submit'
- `payload` (TEXT, JSON)
- `status` (TEXT) - `pending`, `retrying`, `failed`
- `retry_count` (INTEGER)
- `created_at` (INTEGER, UNIX_TIMESTAMP)

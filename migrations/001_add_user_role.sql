BEGIN;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';

UPDATE users
SET role = CASE
  WHEN is_admin = true THEN 'admin'
  ELSE 'user'
END
WHERE role IS NULL;

UPDATE users
SET is_admin = true
WHERE role = 'admin' AND is_admin = false;

UPDATE users
SET is_admin = false
WHERE role = 'user' AND is_admin = true;

UPDATE users
SET role = 'admin',
    is_admin = true
WHERE LOWER(username) IN ('pepperonie', 'rodonii');

COMMIT;

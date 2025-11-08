-- Make email field nullable to support phone-only users
ALTER TABLE user MODIFY COLUMN email VARCHAR(255) NULL;

-- Drop the unique constraint on email if it exists
-- Note: You may need to check the actual constraint name in your database
-- ALTER TABLE user DROP INDEX email;
-- Or if it's named differently:
-- ALTER TABLE user DROP INDEX user_email_unique;


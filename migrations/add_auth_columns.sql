-- Migration: Add authentication columns to users table
-- Run this once against your tutor_db database.

ALTER TABLE `users`
  ADD COLUMN `email`         VARCHAR(255) NULL DEFAULT NULL AFTER `name`,
  ADD COLUMN `password_hash` VARCHAR(255) NULL DEFAULT NULL AFTER `email`,
  ADD UNIQUE INDEX `uq_users_email` (`email`);

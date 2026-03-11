-- Migration: Add user_id to syllabus table
ALTER TABLE `syllabus` ADD COLUMN `user_id` CHAR(36) NULL DEFAULT NULL AFTER `id`;
ALTER TABLE `syllabus` ADD CONSTRAINT `fk_syllabus_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE;

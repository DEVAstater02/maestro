-- 1. Users Table: Basic student profiles
CREATE TABLE `users` (
  `id` char(36) NOT NULL,
  `name` varchar(255) NOT NULL,
  `learning_style` varchar(50) DEFAULT 'Direct',
  `reasoning_speed` varchar(20) DEFAULT 'Moderate',
  `analogy_pool` json DEFAULT NULL,
  `knowledge_map` json NOT NULL DEFAULT (json_object()),
  `last_updated` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `dob` timestamp NULL DEFAULT NULL,
  `grade` varchar(100) DEFAULT NULL,
  `interests` text,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci

-- 2. Syllabus Table: The "Textbook" 
-- One syllabus can be used across hundreds of sessions.
CREATE TABLE syllabus (
    id CHAR(36) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content_json JSON NOT NULL, -- The structure of the course (Chapters, Goals)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 3. Sessions Table: The "Teacher's Gradebook"
-- This acts as the bridge. It tracks global progress and "Memory" for a specific student/course pair.
CREATE TABLE sessions (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    syllabus_id CHAR(36) DEFAULT NULL,
    current_chapter_index INT DEFAULT 0,
    session_memory_string TEXT, -- Summarized "state" of the student's understanding
    is_completed BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_syllabus FOREIGN KEY (syllabus_id) REFERENCES syllabus(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 4. Conversations Table: The "Tape Recorder"
-- Stores the in-memory array as a persistent JSON blob.
CREATE TABLE conversations (
    session_id CHAR(36) PRIMARY KEY,
    history JSON NOT NULL, -- The actual array of messages: [{"role": "...", "content": "..."}]
    last_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_session_history FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
) ENGINE=InnoDB;
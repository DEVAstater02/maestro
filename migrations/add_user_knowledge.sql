-- Step 1: create user_knowledge table
CREATE TABLE IF NOT EXISTS user_knowledge (
    user_id    VARCHAR(36)               NOT NULL,
    type       ENUM('prior','completed') NOT NULL,
    ref_id     VARCHAR(255)              NOT NULL,
    label      VARCHAR(255)              NULL,
    score      TINYINT UNSIGNED          NOT NULL DEFAULT 0,
    updated_at TIMESTAMP                 DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, type, ref_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Step 2: drop old knowledge_map column (run only after code is live and verified)
-- ALTER TABLE users DROP COLUMN knowledge_map;

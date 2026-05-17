ALTER TABLE sessions
    ADD COLUMN llm_input_tokens INT NOT NULL DEFAULT 0,
    ADD COLUMN llm_output_tokens INT NOT NULL DEFAULT 0,
    ADD COLUMN tts_chars INT NOT NULL DEFAULT 0;

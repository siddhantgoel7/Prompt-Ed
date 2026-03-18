ALTER TABLE discussions ADD COLUMN allow_multiple_responses BOOLEAN DEFAULT false;
ALTER TABLE discussions ADD COLUMN response_limit INTEGER DEFAULT 1;

ALTER TABLE phones.soti_import_device
    ADD COLUMN IF NOT EXISTS phone_number TEXT,
    ADD COLUMN IF NOT EXISTS phone_fallback TEXT,
    ADD COLUMN IF NOT EXISTS jira_ticket TEXT,
    ADD COLUMN IF NOT EXISTS manufacturer TEXT,
    ADD COLUMN IF NOT EXISTS total_storage TEXT,
    ADD COLUMN IF NOT EXISTS total_memory TEXT,
    ADD COLUMN IF NOT EXISTS cellular_operator TEXT,
    ADD COLUMN IF NOT EXISTS os_version TEXT,
    ADD COLUMN IF NOT EXISTS locality TEXT,
    ADD COLUMN IF NOT EXISTS company TEXT,
    ADD COLUMN IF NOT EXISTS jira_request_raw TEXT,
    ADD COLUMN IF NOT EXISTS jira_request_normalized TEXT;

CREATE INDEX IF NOT EXISTS soti_import_device_jira_request_normalized_idx
    ON phones.soti_import_device (jira_request_normalized);

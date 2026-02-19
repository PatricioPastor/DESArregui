-- device_n1: normalized staging copy of phones.device.
-- Intentionally mirrors phones.device structure to allow easy promotion back to device.
-- This first migration seeds only active devices; normalization rules are applied in later steps.

CREATE TABLE IF NOT EXISTS phones.device_n1 (
    LIKE phones.device INCLUDING ALL
);

TRUNCATE TABLE phones.device_n1;

INSERT INTO phones.device_n1
SELECT *
FROM phones.device
WHERE is_deleted = FALSE;

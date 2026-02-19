ALTER TABLE phones.device_n1
    ADD COLUMN owner_user_id text,
    ADD COLUMN created_by_user_id text;

ALTER TABLE phones.device_n1
    ADD CONSTRAINT device_n1_owner_user_fk
        FOREIGN KEY (owner_user_id)
        REFERENCES main_auth."user"(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE,
    ADD CONSTRAINT device_n1_created_by_user_fk
        FOREIGN KEY (created_by_user_id)
        REFERENCES main_auth."user"(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS device_n1_owner_user_id_idx ON phones.device_n1 (owner_user_id);
CREATE INDEX IF NOT EXISTS device_n1_created_by_user_id_idx ON phones.device_n1 (created_by_user_id);

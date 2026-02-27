DO $$
DECLARE
    v_device_purchase_links BIGINT := 0;
    v_device_n1_purchase_links BIGINT := 0;
    v_fk_references BIGINT := 0;
    v_view_references BIGINT := 0;
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'phones'
          AND table_name = 'device'
          AND column_name = 'purchase_id'
    ) THEN
        EXECUTE 'SELECT COUNT(*) FROM phones.device WHERE purchase_id IS NOT NULL'
        INTO v_device_purchase_links;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'phones'
          AND table_name = 'device_n1'
          AND column_name = 'purchase_id'
    ) THEN
        EXECUTE 'SELECT COUNT(*) FROM phones.device_n1 WHERE purchase_id IS NOT NULL'
        INTO v_device_n1_purchase_links;
    END IF;

    IF to_regclass('phones.purchase') IS NOT NULL THEN
        SELECT COUNT(*)
        INTO v_fk_references
        FROM pg_constraint c
        WHERE c.contype = 'f'
          AND c.confrelid = 'phones.purchase'::regclass
          AND c.conrelid <> 'phones.purchase'::regclass
          AND NOT (
              c.conrelid IN ('phones.device'::regclass, 'phones.device_n1'::regclass)
              AND array_length(c.conkey, 1) = 1
              AND EXISTS (
                  SELECT 1
                  FROM pg_attribute a
                  WHERE a.attrelid = c.conrelid
                    AND a.attnum = c.conkey[1]
                    AND a.attname = 'purchase_id'
              )
          );

        SELECT COUNT(*)
        INTO v_view_references
        FROM pg_depend d
        JOIN pg_rewrite rw ON rw.oid = d.objid
        JOIN pg_class v ON v.oid = rw.ev_class
        JOIN pg_namespace n ON n.oid = v.relnamespace
        WHERE d.refobjid = 'phones.purchase'::regclass
          AND v.relkind IN ('v', 'm')
          AND n.nspname = 'phones';
    END IF;

    IF v_device_purchase_links > 0 OR v_device_n1_purchase_links > 0 THEN
        RAISE EXCEPTION 'purchase decommission blocked: linked rows remain (device=% , device_n1=%)',
            v_device_purchase_links,
            v_device_n1_purchase_links;
    END IF;

    IF v_fk_references > 0 OR v_view_references > 0 THEN
        RAISE EXCEPTION 'purchase decommission blocked: dependent objects remain (foreign_keys=% , views=%)',
            v_fk_references,
            v_view_references;
    END IF;
END
$$;

ALTER TABLE IF EXISTS phones.device
    DROP CONSTRAINT IF EXISTS device_purchase_id_fkey;

ALTER TABLE IF EXISTS phones.device_n1
    DROP CONSTRAINT IF EXISTS device_n1_purchase_id_fkey;

ALTER TABLE IF EXISTS phones.device
    DROP COLUMN IF EXISTS purchase_id;

ALTER TABLE IF EXISTS phones.device_n1
    DROP COLUMN IF EXISTS purchase_id;

DROP TABLE IF EXISTS phones.purchase;

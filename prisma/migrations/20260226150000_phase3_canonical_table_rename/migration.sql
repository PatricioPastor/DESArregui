DO $$
DECLARE
    v_device_relkind "char";
    v_device_n1_relkind "char";
    v_device_legacy_relkind "char";
    v_assignment_relkind "char";
    v_assignments_n1_relkind "char";
    v_assignment_legacy_relkind "char";
    v_shipment_relkind "char";
    v_shipments_n1_relkind "char";
BEGIN
    SELECT c.relkind
    INTO v_device_relkind
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'phones'
      AND c.relname = 'device';

    SELECT c.relkind
    INTO v_device_n1_relkind
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'phones'
      AND c.relname = 'device_n1';

    SELECT c.relkind
    INTO v_device_legacy_relkind
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'phones'
      AND c.relname = 'device_legacy';

    SELECT c.relkind
    INTO v_assignment_relkind
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'phones'
      AND c.relname = 'assignment';

    SELECT c.relkind
    INTO v_assignments_n1_relkind
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'phones'
      AND c.relname = 'assignments_n1';

    SELECT c.relkind
    INTO v_assignment_legacy_relkind
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'phones'
      AND c.relname = 'assignment_legacy';

    SELECT c.relkind
    INTO v_shipment_relkind
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'phones'
      AND c.relname = 'shipment';

    SELECT c.relkind
    INTO v_shipments_n1_relkind
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'phones'
      AND c.relname = 'shipments_n1';

    IF v_device_legacy_relkind IS NULL THEN
        IF v_device_relkind = 'r' AND v_device_n1_relkind = 'r' THEN
            EXECUTE 'ALTER TABLE phones.device RENAME TO device_legacy';
            EXECUTE 'ALTER TABLE phones.device_n1 RENAME TO device';
        ELSE
            RAISE EXCEPTION 'phase3 canonical rename blocked: unexpected device state (device=%, device_n1=%, device_legacy=%)',
                COALESCE(v_device_relkind, '-'),
                COALESCE(v_device_n1_relkind, '-'),
                COALESCE(v_device_legacy_relkind, '-');
        END IF;
    ELSIF v_device_legacy_relkind = 'r' THEN
        IF v_device_relkind <> 'r' OR (v_device_n1_relkind IS NOT NULL AND v_device_n1_relkind <> 'v') THEN
            RAISE EXCEPTION 'phase3 canonical rename blocked: device cutover is partially applied (device=%, device_n1=%, device_legacy=%)',
                COALESCE(v_device_relkind, '-'),
                COALESCE(v_device_n1_relkind, '-'),
                COALESCE(v_device_legacy_relkind, '-');
        END IF;
    ELSE
        RAISE EXCEPTION 'phase3 canonical rename blocked: phones.device_legacy must be a table when present';
    END IF;

    IF v_assignment_legacy_relkind IS NULL THEN
        IF v_assignment_relkind = 'r' AND v_assignments_n1_relkind = 'r' THEN
            EXECUTE 'ALTER TABLE phones.assignment RENAME TO assignment_legacy';
            EXECUTE 'ALTER TABLE phones.assignments_n1 RENAME TO assignment';
        ELSE
            RAISE EXCEPTION 'phase3 canonical rename blocked: unexpected assignment state (assignment=%, assignments_n1=%, assignment_legacy=%)',
                COALESCE(v_assignment_relkind, '-'),
                COALESCE(v_assignments_n1_relkind, '-'),
                COALESCE(v_assignment_legacy_relkind, '-');
        END IF;
    ELSIF v_assignment_legacy_relkind = 'r' THEN
        IF v_assignment_relkind <> 'r' OR (v_assignments_n1_relkind IS NOT NULL AND v_assignments_n1_relkind <> 'v') THEN
            RAISE EXCEPTION 'phase3 canonical rename blocked: assignment cutover is partially applied (assignment=%, assignments_n1=%, assignment_legacy=%)',
                COALESCE(v_assignment_relkind, '-'),
                COALESCE(v_assignments_n1_relkind, '-'),
                COALESCE(v_assignment_legacy_relkind, '-');
        END IF;
    ELSE
        RAISE EXCEPTION 'phase3 canonical rename blocked: phones.assignment_legacy must be a table when present';
    END IF;

    IF v_shipment_relkind IS NULL THEN
        IF v_shipments_n1_relkind = 'r' THEN
            EXECUTE 'ALTER TABLE phones.shipments_n1 RENAME TO shipment';
        ELSE
            RAISE EXCEPTION 'phase3 canonical rename blocked: unexpected shipment state (shipment=%, shipments_n1=%)',
                COALESCE(v_shipment_relkind, '-'),
                COALESCE(v_shipments_n1_relkind, '-');
        END IF;
    ELSIF v_shipment_relkind = 'r' THEN
        IF v_shipments_n1_relkind IS NOT NULL AND v_shipments_n1_relkind <> 'v' THEN
            RAISE EXCEPTION 'phase3 canonical rename blocked: shipment cutover is partially applied (shipment=%, shipments_n1=%)',
                COALESCE(v_shipment_relkind, '-'),
                COALESCE(v_shipments_n1_relkind, '-');
        END IF;
    ELSE
        RAISE EXCEPTION 'phase3 canonical rename blocked: phones.shipment must be a table when present';
    END IF;
END
$$;

ALTER SEQUENCE IF EXISTS phones.assignments_n1_id_seq RENAME TO assignment_id_seq;
ALTER SEQUENCE IF EXISTS phones.shipments_n1_id_seq RENAME TO shipment_id_seq;

CREATE OR REPLACE VIEW phones.device_n1 AS
SELECT *
FROM phones.device;

CREATE OR REPLACE VIEW phones.assignments_n1 AS
SELECT *
FROM phones.assignment;

CREATE OR REPLACE VIEW phones.shipments_n1 AS
SELECT *
FROM phones.shipment;

CREATE OR REPLACE FUNCTION phones.get_enhanced_kpis_legacy(
    p_start_date DATE,
    p_end_date DATE
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_result JSONB;
    v_stock JSONB;
BEGIN
    v_result := phones.get_enhanced_kpis(p_start_date, p_end_date);

    WITH stock_by_model AS (
        SELECT
            d.model_id,
            COUNT(*)::int AS model_count
        FROM phones.device_legacy d
        WHERE d.status = 'NEW'
          AND d.is_deleted = false
        GROUP BY d.model_id
    )
    SELECT jsonb_build_object(
        'available', COALESCE(SUM(sbm.model_count), 0),
        'models', COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'brand', pm.brand,
                    'model', pm.model,
                    'color', pm.color,
                    'storage_gb', pm.storage_gb,
                    'count', sbm.model_count,
                    'display_name',
                        pm.brand || ' ' || pm.model ||
                        CASE WHEN pm.storage_gb IS NOT NULL THEN ' ' || pm.storage_gb || 'GB' ELSE '' END ||
                        CASE WHEN pm.color IS NOT NULL AND pm.color != '' THEN ' - ' || pm.color ELSE '' END
                )
                ORDER BY sbm.model_count DESC, pm.brand, pm.model
            ) FILTER (WHERE sbm.model_id IS NOT NULL),
            '[]'::jsonb
        )
    )
    INTO v_stock
    FROM stock_by_model sbm
    LEFT JOIN phones.phone_model pm ON pm.id = sbm.model_id;

    RETURN jsonb_set(
        COALESCE(v_result, '{}'::jsonb),
        '{stock}',
        COALESCE(v_stock, '{"available": 0, "models": []}'::jsonb),
        true
    );
END;
$$;

CREATE OR REPLACE FUNCTION phones.get_enhanced_kpis_canonical(
    p_start_date DATE,
    p_end_date DATE
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN phones.get_enhanced_kpis(p_start_date, p_end_date);
END;
$$;

CREATE OR REPLACE FUNCTION phones.get_enhanced_kpis_source(
    p_start_date DATE,
    p_end_date DATE,
    p_source_mode TEXT DEFAULT 'legacy'
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
BEGIN
    IF lower(COALESCE(p_source_mode, 'legacy')) = 'canonical' THEN
        RETURN phones.get_enhanced_kpis_canonical(p_start_date, p_end_date);
    END IF;

    RETURN phones.get_enhanced_kpis_legacy(p_start_date, p_end_date);
END;
$$;

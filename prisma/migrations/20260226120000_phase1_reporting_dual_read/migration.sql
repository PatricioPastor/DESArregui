CREATE OR REPLACE FUNCTION phones.get_enhanced_kpis_legacy(
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

CREATE OR REPLACE FUNCTION phones.get_enhanced_kpis_canonical(
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
    v_result := phones.get_enhanced_kpis_legacy(p_start_date, p_end_date);

    WITH stock_by_model AS (
        SELECT
            d.model_id,
            COUNT(*)::int AS model_count
        FROM phones.device_n1 d
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

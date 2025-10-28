-- ================================================
-- ACTUALIZAR get_enhanced_kpis para vista anual completa
-- El gráfico siempre muestra 12 meses, resaltando el rango analizado
-- ================================================

CREATE OR REPLACE FUNCTION phones.get_enhanced_kpis(
    p_start_date DATE,
    p_end_date DATE
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_result JSONB;
    v_kpis JSONB;
    v_stock JSONB;
    v_tickets JSONB;
    v_monthly JSONB;
    v_replacement_types JSONB;
    v_year INT;
BEGIN
    -- Obtener el año del rango para análisis anual
    v_year := EXTRACT(YEAR FROM p_start_date);

    -- KPIs de demanda (solo para el rango especificado)
    SELECT jsonb_build_object(
        'total_tickets', COUNT(*),
        'total_demand', SUM(replacement_count),
        'pending_demand', COALESCE(SUM(pending_count), 0),
        'assignments', SUM(CASE WHEN is_assignment THEN replacement_count ELSE 0 END),
        'replacements', SUM(CASE WHEN is_replacement THEN replacement_count ELSE 0 END),
        'replacement_rate', ROUND(
            (SUM(CASE WHEN is_replacement THEN replacement_count ELSE 0 END) * 100.0) /
            NULLIF(SUM(replacement_count), 0),
            1
        )
    ) INTO v_kpis
    FROM phones.ticket
    WHERE created::date BETWEEN p_start_date AND p_end_date
      AND (is_assignment = TRUE OR is_replacement = TRUE);

    -- Contadores de tipos de recambio (solo para el rango especificado)
    SELECT jsonb_build_object(
        'ROBO', COALESCE(SUM(CASE WHEN replacement_type = 'ROBO' THEN 1 ELSE 0 END), 0),
        'ROTURA', COALESCE(SUM(CASE WHEN replacement_type = 'ROTURA' THEN 1 ELSE 0 END), 0),
        'OBSOLETO', COALESCE(SUM(CASE WHEN replacement_type = 'OBSOLETO' THEN 1 ELSE 0 END), 0),
        'PERDIDA', COALESCE(SUM(CASE WHEN replacement_type = 'PERDIDA' THEN 1 ELSE 0 END), 0),
        'SIN_ESPECIFICAR', COALESCE(SUM(CASE WHEN replacement_type = 'SIN_ESPECIFICAR' THEN 1 ELSE 0 END), 0)
    ) INTO v_replacement_types
    FROM phones.ticket
    WHERE created::date BETWEEN p_start_date AND p_end_date
      AND is_replacement = TRUE;

    -- Stock disponible por modelo
    SELECT jsonb_build_object(
        'available', COUNT(*),
        'models', COALESCE(jsonb_agg(
            jsonb_build_object(
                'brand', pm.brand,
                'model', pm.model,
                'color', pm.color,
                'storage_gb', pm.storage_gb,
                'count', model_count,
                'display_name',
                    pm.brand || ' ' || pm.model ||
                    CASE WHEN pm.storage_gb IS NOT NULL THEN ' ' || pm.storage_gb || 'GB' ELSE '' END ||
                    CASE WHEN pm.color IS NOT NULL AND pm.color != '' THEN ' - ' || pm.color ELSE '' END
            )
            ORDER BY model_count DESC
        ), '[]'::jsonb)
    ) INTO v_stock
    FROM (
        SELECT
            model_id,
            COUNT(*) as model_count
        FROM phones.device
        WHERE status = 'NEW'
        GROUP BY model_id
    ) d
    JOIN phones.phone_model pm ON pm.id = d.model_id;

    -- Tickets del período (completos, solo del rango)
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', t.id,
            'key', t.key,
            'title', t.title,
            'issue_type', t.issue_type,
            'label', t.label,
            'enterprise', t.enterprise,
            'created', t.created,
            'updated', t.updated,
            'creator', t.creator,
            'status', t.status,
            'category_status', t.category_status,
            'replacement_count', t.replacement_count,
            'replacement_type', t.replacement_type,
            'is_replacement', t.is_replacement,
            'is_assignment', t.is_assignment,
            'is_active', t.is_active
        )
        ORDER BY t.created DESC
    ), '[]'::jsonb) INTO v_tickets
    FROM phones.ticket t
    WHERE t.created::date BETWEEN p_start_date AND p_end_date;

    -- Datos mensuales para chart (ANUAL COMPLETO con marcador de rango)
    WITH all_months AS (
        -- Generar los 12 meses del año
        SELECT
            generate_series(
                DATE_TRUNC('year', p_start_date::date),
                DATE_TRUNC('year', p_start_date::date) + INTERVAL '11 months',
                INTERVAL '1 month'
            )::date as month_date
    ),
    ticket_data AS (
        -- Datos reales de tickets agrupados por mes
        SELECT
            DATE_TRUNC('month', created)::date as month_date,
            COUNT(*) as ticket_count,
            SUM(replacement_count) as total_demand
        FROM phones.ticket
        WHERE EXTRACT(YEAR FROM created) = v_year
          AND (is_assignment = TRUE OR is_replacement = TRUE)
        GROUP BY DATE_TRUNC('month', created)
    )
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'month', TO_CHAR(am.month_date, 'YYYY-MM'),
            'month_number', EXTRACT(MONTH FROM am.month_date)::int,
            'tickets', COALESCE(td.ticket_count, 0),
            'demand', COALESCE(td.total_demand, 0),
            'is_in_range', am.month_date BETWEEN
                DATE_TRUNC('month', p_start_date) AND
                DATE_TRUNC('month', p_end_date),
            'is_projected', FALSE
        )
        ORDER BY am.month_date
    ), '[]'::jsonb) INTO v_monthly
    FROM all_months am
    LEFT JOIN ticket_data td ON am.month_date = td.month_date;

    -- Construir resultado final
    v_result := jsonb_build_object(
        'kpis', v_kpis,
        'replacement_types', v_replacement_types,
        'stock', v_stock,
        'tickets', v_tickets,
        'monthly_data', v_monthly,
        'period', jsonb_build_object(
            'start_date', p_start_date,
            'end_date', p_end_date,
            'days', (p_end_date - p_start_date + 1)
        )
    );

    RETURN v_result;
END;
$$;

-- ================================================
-- TEST: Verificar con rango Q3 (Jul-Sep)
-- Debe retornar 12 meses, marcando Jul-Sep como is_in_range: true
-- ================================================
SELECT phones.get_enhanced_kpis('2025-07-01'::DATE, '2025-09-30'::DATE);

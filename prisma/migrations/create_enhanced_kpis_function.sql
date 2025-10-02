-- Create enhanced KPIs function for phones summary
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
BEGIN
    -- KPIs de demanda (replacement_count nunca es NULL en registros activos)
    SELECT jsonb_build_object(
        'total_tickets', COUNT(*),
        'total_demand', SUM(replacement_count),
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

    -- Tickets del período (completos)
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
            'is_replacement', t.is_replacement,
            'is_assignment', t.is_assignment,
            'is_active', t.is_active
        )
        ORDER BY t.created DESC
    ), '[]'::jsonb) INTO v_tickets
    FROM phones.ticket t
    WHERE t.created::date BETWEEN p_start_date AND p_end_date;

    -- Datos mensuales para chart
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'month', to_char(month_date, 'YYYY-MM'),
            'tickets', ticket_count,
            'demand', total_demand,
            'percentage', ROUND((total_demand * 100.0) / NULLIF(period_total, 0), 1)
        )
        ORDER BY month_date
    ), '[]'::jsonb) INTO v_monthly
    FROM (
        SELECT
            date_trunc('month', created)::date as month_date,
            COUNT(*) as ticket_count,
            SUM(replacement_count) as total_demand,
            SUM(SUM(replacement_count)) OVER() as period_total
        FROM phones.ticket
        WHERE created::date BETWEEN p_start_date AND p_end_date
          AND (is_assignment = TRUE OR is_replacement = TRUE)
        GROUP BY date_trunc('month', created)
    ) monthly;

    -- Construir resultado final
    v_result := jsonb_build_object(
        'kpis', v_kpis,
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

-- Test de la función con Q2 2025
-- SELECT phones.get_enhanced_kpis('2025-04-01'::DATE, '2025-06-30'::DATE);

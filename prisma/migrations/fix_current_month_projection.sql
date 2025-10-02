-- Fix: Show projection in current month bar chart
-- Update enhanced KPIs function to show projection in current month when demand is 0
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
    v_current_year INTEGER;
    v_current_month INTEGER;
    v_avg_monthly_demand NUMERIC;
BEGIN
    -- Obtener año y mes actual
    v_current_year := EXTRACT(YEAR FROM CURRENT_DATE);
    v_current_month := EXTRACT(MONTH FROM CURRENT_DATE);

    -- KPIs de demanda (ahora con pending_count incluido)
    SELECT jsonb_build_object(
        'total_tickets', COUNT(*),
        'total_demand', SUM(COALESCE(replacement_count, 0)),
        'pending_demand', SUM(COALESCE(pending_count, 0)),
        'assignments', SUM(CASE WHEN is_assignment THEN COALESCE(replacement_count, 0) ELSE 0 END),
        'replacements', SUM(CASE WHEN is_replacement THEN COALESCE(replacement_count, 0) ELSE 0 END),
        'replacement_rate', ROUND(
            (SUM(CASE WHEN is_replacement THEN COALESCE(replacement_count, 0) ELSE 0 END) * 100.0) /
            NULLIF(SUM(COALESCE(replacement_count, 0)), 0),
            1
        )
    ) INTO v_kpis
    FROM phones.ticket
    WHERE created::date BETWEEN p_start_date AND p_end_date
      AND (is_assignment = TRUE OR is_replacement = TRUE OR replacement_count IS NOT NULL OR pending_count IS NOT NULL);

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
            'pending_count', t.pending_count,
            'is_replacement', t.is_replacement,
            'is_assignment', t.is_assignment,
            'is_active', t.is_active
        )
        ORDER BY t.created DESC
    ), '[]'::jsonb) INTO v_tickets
    FROM phones.ticket t
    WHERE t.created::date BETWEEN p_start_date AND p_end_date;

    -- Calcular promedio mensual de demanda del año hasta el mes ANTERIOR al actual
    -- (excluimos el mes actual para que la proyección sea más precisa)
    SELECT COALESCE(AVG(monthly_demand), 0) INTO v_avg_monthly_demand
    FROM (
        SELECT SUM(COALESCE(replacement_count, 0)) as monthly_demand
        FROM phones.ticket
        WHERE EXTRACT(YEAR FROM created) = v_current_year
          AND EXTRACT(MONTH FROM created) < v_current_month
          AND (is_assignment = TRUE OR is_replacement = TRUE OR replacement_count IS NOT NULL)
        GROUP BY EXTRACT(MONTH FROM created)
    ) monthly_totals;

    -- Si no hay promedio (primeros meses del año), usar el del año anterior
    IF v_avg_monthly_demand = 0 THEN
        SELECT COALESCE(AVG(monthly_demand), 0) INTO v_avg_monthly_demand
        FROM (
            SELECT SUM(COALESCE(replacement_count, 0)) as monthly_demand
            FROM phones.ticket
            WHERE EXTRACT(YEAR FROM created) = v_current_year - 1
              AND (is_assignment = TRUE OR is_replacement = TRUE OR replacement_count IS NOT NULL)
            GROUP BY EXTRACT(MONTH FROM created)
        ) prev_year_monthly_totals;
    END IF;

    -- Datos mensuales para chart (TODO EL AÑO - 12 meses)
    -- El mes actual mostrará AMBOS: demand real Y proyección si demand > 0
    -- O solo proyección si demand = 0
    SELECT jsonb_agg(
        jsonb_build_object(
            'month', month_label,
            'month_number', month_num,
            'tickets', COALESCE(ticket_count, 0),
            'demand', COALESCE(total_demand, 0),
            'is_projected', is_future,
            'projected_demand', CASE
                -- Meses futuros: mostrar proyección
                WHEN is_future THEN ROUND(v_avg_monthly_demand)
                -- Mes actual: si demand = 0, mostrar proyección
                WHEN is_current AND COALESCE(total_demand, 0) = 0 THEN ROUND(v_avg_monthly_demand)
                ELSE NULL
            END
        )
        ORDER BY month_num
    ) INTO v_monthly
    FROM (
        SELECT
            gs.month_num,
            to_char(make_date(v_current_year, gs.month_num, 1), 'YYYY-MM') as month_label,
            CASE WHEN gs.month_num > v_current_month THEN true ELSE false END as is_future,
            CASE WHEN gs.month_num = v_current_month THEN true ELSE false END as is_current,
            actual.ticket_count,
            actual.total_demand
        FROM generate_series(1, 12) as gs(month_num)
        LEFT JOIN (
            SELECT
                EXTRACT(MONTH FROM created)::INTEGER as month_num,
                COUNT(*) as ticket_count,
                SUM(COALESCE(replacement_count, 0)) as total_demand
            FROM phones.ticket
            WHERE EXTRACT(YEAR FROM created) = v_current_year
              AND (is_assignment = TRUE OR is_replacement = TRUE OR replacement_count IS NOT NULL)
            GROUP BY EXTRACT(MONTH FROM created)
        ) actual ON actual.month_num = gs.month_num
    ) all_months;

    -- Construir resultado final
    v_result := jsonb_build_object(
        'kpis', v_kpis,
        'stock', v_stock,
        'tickets', v_tickets,
        'monthly_data', v_monthly,
        'period', jsonb_build_object(
            'start_date', p_start_date,
            'end_date', p_end_date,
            'days', (p_end_date - p_start_date + 1),
            'current_month', v_current_month,
            'avg_monthly_demand', ROUND(v_avg_monthly_demand)
        )
    );

    RETURN v_result;
END;
$$;

-- Test de la función
-- SELECT phones.get_enhanced_kpis('2025-04-01'::DATE, '2025-06-30'::DATE);

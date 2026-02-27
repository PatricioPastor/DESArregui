DO $$
DECLARE
    v_open_surface_count integer;
BEGIN
    SELECT COUNT(*)::int
    INTO v_open_surface_count
    FROM phones.migration_phase_gate_control
    WHERE source_mode = 'canonical'
      AND is_gate_open = true
      AND rollout_phase = 'phase5';

    IF v_open_surface_count < 8 THEN
        RAISE EXCEPTION 'phase5 compatibility retirement blocked: expected 8 canonical/open gate records for rollout_phase=phase5, found %', v_open_surface_count;
    END IF;
END
$$;

DROP FUNCTION IF EXISTS phones.get_enhanced_kpis_source(DATE, DATE, TEXT);
DROP FUNCTION IF EXISTS phones.get_enhanced_kpis_legacy(DATE, DATE);
DROP FUNCTION IF EXISTS phones.get_enhanced_kpis_canonical(DATE, DATE);

DROP VIEW IF EXISTS phones.shipments_n1;
DROP VIEW IF EXISTS phones.assignments_n1;
DROP VIEW IF EXISTS phones.device_n1;

DROP TABLE IF EXISTS phones.assignment_legacy;
DROP TABLE IF EXISTS phones.device_legacy;

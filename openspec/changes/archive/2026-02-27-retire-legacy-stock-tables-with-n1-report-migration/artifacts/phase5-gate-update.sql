UPDATE phones.migration_phase_gate_control
SET source_mode = 'canonical',
    rollout_phase = 'phase5',
    is_gate_open = true,
    updated_at = now(),
    notes = COALESCE(notes, '') || ' | phase5 destructive cleanup approved 2026-02-26 (retry execution)'
WHERE surface IN (
    'reports_phones',
    'reports_kpis',
    'home_kpis',
    'home_stock',
    'home_shipping',
    'distributors',
    'stock',
    'assignments'
);

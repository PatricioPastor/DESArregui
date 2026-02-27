SELECT
  to_regclass('phones.device_n1') AS device_n1,
  to_regclass('phones.assignments_n1') AS assignments_n1,
  to_regclass('phones.shipments_n1') AS shipments_n1,
  to_regclass('phones.device_legacy') AS device_legacy,
  to_regclass('phones.assignment_legacy') AS assignment_legacy,
  to_regclass('phones.device') AS device,
  to_regclass('phones.assignment') AS assignment,
  to_regclass('phones.shipment') AS shipment,
  to_regclass('phones.purchase') AS purchase;

SELECT proname
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'phones'
  AND proname IN (
    'get_enhanced_kpis_source',
    'get_enhanced_kpis_legacy',
    'get_enhanced_kpis_canonical'
  )
ORDER BY proname;

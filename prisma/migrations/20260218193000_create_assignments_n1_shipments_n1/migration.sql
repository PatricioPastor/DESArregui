-- assignments_n1 + shipments_n1
-- Snapshot migration sourced from phones.device_n1.
-- Scope:
--   - Build ONE current active assignment per active ASSIGNED device.
--   - Keep shipping/return logistics in shipments_n1 (separate table).
--   - Preserve reference to active legacy assignment when available.

DROP TABLE IF EXISTS phones.shipments_n1;
DROP TABLE IF EXISTS phones.assignments_n1;

CREATE TABLE phones.assignments_n1 (
    id BIGSERIAL PRIMARY KEY,
    device_id TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'ASSIGN',
    status TEXT NOT NULL DEFAULT 'active',
    assignee_name TEXT NOT NULL,
    assignee_phone TEXT,
    assignee_email TEXT,
    ticket_id TEXT,
    distributor_id TEXT,
    expects_return BOOLEAN NOT NULL DEFAULT FALSE,
    expected_return_imei TEXT,
    assigned_at TIMESTAMP(3) NOT NULL DEFAULT NOW(),
    closed_at TIMESTAMP(3),
    closure_reason TEXT,
    legacy_assignment_id TEXT UNIQUE,
    created_at TIMESTAMP(3) NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP(3) NOT NULL DEFAULT NOW(),

    CONSTRAINT assignments_n1_device_fk
        FOREIGN KEY (device_id) REFERENCES phones.device_n1(id) ON DELETE CASCADE,
    CONSTRAINT assignments_n1_distributor_fk
        FOREIGN KEY (distributor_id) REFERENCES phones.distributor(id) ON DELETE SET NULL,
    CONSTRAINT assignments_n1_type_chk
        CHECK (type IN ('ASSIGN', 'REPLACE')),
    CONSTRAINT assignments_n1_status_chk
        CHECK (status IN ('active', 'completed', 'cancelled'))
);

CREATE UNIQUE INDEX assignments_n1_one_active_per_device_idx
    ON phones.assignments_n1 (device_id)
    WHERE status = 'active';

CREATE INDEX assignments_n1_status_idx
    ON phones.assignments_n1 (status);

CREATE INDEX assignments_n1_ticket_id_idx
    ON phones.assignments_n1 (ticket_id);

CREATE INDEX assignments_n1_assignee_name_idx
    ON phones.assignments_n1 (assignee_name);

CREATE INDEX assignments_n1_assigned_at_idx
    ON phones.assignments_n1 (assigned_at DESC);

CREATE TABLE phones.shipments_n1 (
    id BIGSERIAL PRIMARY KEY,
    assignment_id BIGINT NOT NULL,
    leg TEXT NOT NULL,
    voucher_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    shipped_at TIMESTAMP(3),
    delivered_at TIMESTAMP(3),
    notes TEXT,
    legacy_assignment_id TEXT,
    created_at TIMESTAMP(3) NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP(3) NOT NULL DEFAULT NOW(),

    CONSTRAINT shipments_n1_assignment_fk
        FOREIGN KEY (assignment_id) REFERENCES phones.assignments_n1(id) ON DELETE CASCADE,
    CONSTRAINT shipments_n1_leg_chk
        CHECK (leg IN ('OUTBOUND', 'RETURN')),
    CONSTRAINT shipments_n1_status_chk
        CHECK (status IN ('pending', 'shipped', 'delivered', 'received', 'cancelled')),
    CONSTRAINT shipments_n1_assignment_leg_unq
        UNIQUE (assignment_id, leg)
);

CREATE INDEX shipments_n1_status_idx
    ON phones.shipments_n1 (status);

CREATE INDEX shipments_n1_assignment_id_idx
    ON phones.shipments_n1 (assignment_id);

CREATE UNIQUE INDEX shipments_n1_voucher_id_unq
    ON phones.shipments_n1 (voucher_id)
    WHERE voucher_id IS NOT NULL;

WITH legacy_active_ranked AS (
    SELECT
        a.*,
        ROW_NUMBER() OVER (
            PARTITION BY a.device_id
            ORDER BY a.at DESC, a.id DESC
        ) AS rn
    FROM phones.assignment a
    WHERE a.status = 'active'
),
base AS (
    SELECT
        d.id AS device_id,
        d.assigned_to AS n1_assigned_to,
        d.ticket_id AS n1_ticket_id,
        d.distributor_id AS n1_distributor_id,
        d.updated_at AS n1_updated_at,

        la.id AS legacy_assignment_id,
        la.type::TEXT AS legacy_type,
        la.assignee_name AS legacy_assignee_name,
        la.assigned_to AS legacy_assigned_to,
        la.assignee_phone AS legacy_assignee_phone,
        la.assignee_email AS legacy_assignee_email,
        la.ticket_id AS legacy_ticket_id,
        la.distributor_id AS legacy_distributor_id,
        la.expects_return AS legacy_expects_return,
        la.return_device_imei AS legacy_return_device_imei,
        la.at AS legacy_at,

        la.shipping_voucher_id,
        la.shipping_status,
        la.shipped_at,
        la.delivered_at,
        la.shipping_notes,
        la.return_status,
        la.return_received_at,
        la.return_notes
    FROM phones.device_n1 d
    LEFT JOIN legacy_active_ranked la
        ON la.device_id = d.id
       AND la.rn = 1
    WHERE d.is_deleted = FALSE
      AND d.status = 'ASSIGNED'::phones.device_status
),
prepared AS (
    SELECT
        b.*,
        COALESCE(
            NULLIF(BTRIM(b.legacy_assignee_name), ''),
            NULLIF(BTRIM(b.legacy_assigned_to), ''),
            NULLIF(BTRIM(b.n1_assigned_to), ''),
            'SIN_ASIGNADO'
        ) AS raw_assignee_name
    FROM base b
),
inserted_assignments AS (
    INSERT INTO phones.assignments_n1 (
        device_id,
        type,
        status,
        assignee_name,
        assignee_phone,
        assignee_email,
        ticket_id,
        distributor_id,
        expects_return,
        expected_return_imei,
        assigned_at,
        closed_at,
        closure_reason,
        legacy_assignment_id,
        created_at,
        updated_at
    )
    SELECT
        p.device_id,
        CASE
            WHEN p.legacy_type IN ('ASSIGN', 'REPLACE') THEN p.legacy_type
            ELSE 'ASSIGN'
        END AS type,
        'active' AS status,
        CASE
            WHEN LOWER(p.raw_assignee_name) ~ '^(h8|trelert)-[0-9]{2}-[0-9]{4}$'
                THEN 'H8 - ' || SUBSTRING(p.raw_assignee_name FROM '([0-9]{4})\D*$')
            ELSE p.raw_assignee_name
        END AS assignee_name,
        NULLIF(BTRIM(p.legacy_assignee_phone), '') AS assignee_phone,
        NULLIF(BTRIM(p.legacy_assignee_email), '') AS assignee_email,
        CASE
            WHEN COALESCE(NULLIF(BTRIM(p.n1_ticket_id), ''), NULLIF(BTRIM(p.legacy_ticket_id), '')) IS NULL THEN NULL
            WHEN UPPER(COALESCE(NULLIF(BTRIM(p.n1_ticket_id), ''), NULLIF(BTRIM(p.legacy_ticket_id), ''))) ~ 'DESA[- ]?[0-9]+'
                THEN 'DESA-' || SUBSTRING(UPPER(COALESCE(NULLIF(BTRIM(p.n1_ticket_id), ''), NULLIF(BTRIM(p.legacy_ticket_id), ''))) FROM 'DESA[- ]?([0-9]+)')
            WHEN COALESCE(NULLIF(BTRIM(p.n1_ticket_id), ''), NULLIF(BTRIM(p.legacy_ticket_id), '')) ~ '^[0-9]+$'
                THEN 'DESA-' || COALESCE(NULLIF(BTRIM(p.n1_ticket_id), ''), NULLIF(BTRIM(p.legacy_ticket_id), ''))
            ELSE NULL
        END AS ticket_id,
        COALESCE(p.legacy_distributor_id, p.n1_distributor_id) AS distributor_id,
        COALESCE(p.legacy_expects_return, FALSE) AS expects_return,
        NULLIF(BTRIM(p.legacy_return_device_imei), '') AS expected_return_imei,
        COALESCE(p.legacy_at, p.n1_updated_at, NOW()) AS assigned_at,
        NULL::TIMESTAMP(3) AS closed_at,
        NULL::TEXT AS closure_reason,
        p.legacy_assignment_id,
        NOW() AS created_at,
        NOW() AS updated_at
    FROM prepared p
    RETURNING id, legacy_assignment_id
)
INSERT INTO phones.shipments_n1 (
    assignment_id,
    leg,
    voucher_id,
    status,
    shipped_at,
    delivered_at,
    notes,
    legacy_assignment_id,
    created_at,
    updated_at
)
SELECT
    ia.id AS assignment_id,
    'OUTBOUND' AS leg,
    NULLIF(BTRIM(a.shipping_voucher_id), '') AS voucher_id,
    CASE
        WHEN LOWER(COALESCE(BTRIM(a.shipping_status), '')) = 'delivered' THEN 'delivered'
        WHEN LOWER(COALESCE(BTRIM(a.shipping_status), '')) = 'shipped' THEN 'shipped'
        ELSE 'pending'
    END AS status,
    a.shipped_at,
    a.delivered_at,
    NULLIF(BTRIM(a.shipping_notes), '') AS notes,
    a.id AS legacy_assignment_id,
    NOW(),
    NOW()
FROM inserted_assignments ia
JOIN phones.assignment a
    ON a.id = ia.legacy_assignment_id
WHERE
    NULLIF(BTRIM(a.shipping_voucher_id), '') IS NOT NULL
    OR LOWER(COALESCE(BTRIM(a.shipping_status), '')) IN ('shipped', 'delivered')
    OR a.shipped_at IS NOT NULL
    OR a.delivered_at IS NOT NULL
    OR NULLIF(BTRIM(a.shipping_notes), '') IS NOT NULL;

INSERT INTO phones.shipments_n1 (
    assignment_id,
    leg,
    voucher_id,
    status,
    shipped_at,
    delivered_at,
    notes,
    legacy_assignment_id,
    created_at,
    updated_at
)
SELECT
    ia.id AS assignment_id,
    'RETURN' AS leg,
    NULL::TEXT AS voucher_id,
    CASE
        WHEN LOWER(COALESCE(BTRIM(a.return_status), '')) = 'received' THEN 'received'
        WHEN LOWER(COALESCE(BTRIM(a.return_status), '')) = 'pending' THEN 'pending'
        WHEN a.expects_return THEN 'pending'
        ELSE 'pending'
    END AS status,
    NULL::TIMESTAMP(3) AS shipped_at,
    a.return_received_at AS delivered_at,
    NULLIF(BTRIM(a.return_notes), '') AS notes,
    a.id AS legacy_assignment_id,
    NOW(),
    NOW()
FROM phones.assignments_n1 ia
JOIN phones.assignment a
    ON a.id = ia.legacy_assignment_id
WHERE
    a.expects_return = TRUE
    OR NULLIF(BTRIM(a.return_status), '') IS NOT NULL
    OR a.return_received_at IS NOT NULL
    OR NULLIF(BTRIM(a.return_notes), '') IS NOT NULL;

-- =====================================================
-- Migración: Campos de Asignación y Estado SOTI
-- Fecha: 2025-10-09
-- Descripción: Agrega campos necesarios para la funcionalidad de asignación
-- =====================================================

-- Verificar que estamos en el schema correcto
SET search_path TO phones, public;

-- =====================================================
-- 1. AGREGAR CAMPOS A LA TABLA ASSIGNMENT
-- =====================================================

-- Agregar nuevas columnas a assignment
DO $$
BEGIN
    -- assignee_name
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'phones' AND table_name = 'assignment' AND column_name = 'assignee_name') THEN
        ALTER TABLE phones.assignment ADD COLUMN assignee_name VARCHAR(255);
        RAISE NOTICE 'Columna assignee_name agregada';
    ELSE
        RAISE NOTICE 'Columna assignee_name ya existe';
    END IF;

    -- assignee_phone
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'phones' AND table_name = 'assignment' AND column_name = 'assignee_phone') THEN
        ALTER TABLE phones.assignment ADD COLUMN assignee_phone VARCHAR(50);
        RAISE NOTICE 'Columna assignee_phone agregada';
    ELSE
        RAISE NOTICE 'Columna assignee_phone ya existe';
    END IF;

    -- distributor_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'phones' AND table_name = 'assignment' AND column_name = 'distributor_id') THEN
        ALTER TABLE phones.assignment ADD COLUMN distributor_id VARCHAR(255);
        RAISE NOTICE 'Columna distributor_id agregada';
    ELSE
        RAISE NOTICE 'Columna distributor_id ya existe';
    END IF;

    -- delivery_location
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'phones' AND table_name = 'assignment' AND column_name = 'delivery_location') THEN
        ALTER TABLE phones.assignment ADD COLUMN delivery_location TEXT;
        RAISE NOTICE 'Columna delivery_location agregada';
    ELSE
        RAISE NOTICE 'Columna delivery_location ya existe';
    END IF;

    -- contact_details
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'phones' AND table_name = 'assignment' AND column_name = 'contact_details') THEN
        ALTER TABLE phones.assignment ADD COLUMN contact_details TEXT;
        RAISE NOTICE 'Columna contact_details agregada';
    ELSE
        RAISE NOTICE 'Columna contact_details ya existe';
    END IF;

    -- shipping_voucher_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'phones' AND table_name = 'assignment' AND column_name = 'shipping_voucher_id') THEN
        ALTER TABLE phones.assignment ADD COLUMN shipping_voucher_id VARCHAR(100);
        RAISE NOTICE 'Columna shipping_voucher_id agregada';
    ELSE
        RAISE NOTICE 'Columna shipping_voucher_id ya existe';
    END IF;

    -- expects_return
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'phones' AND table_name = 'assignment' AND column_name = 'expects_return') THEN
        ALTER TABLE phones.assignment ADD COLUMN expects_return BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Columna expects_return agregada';
    ELSE
        RAISE NOTICE 'Columna expects_return ya existe';
    END IF;

    -- return_device_imei
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'phones' AND table_name = 'assignment' AND column_name = 'return_device_imei') THEN
        ALTER TABLE phones.assignment ADD COLUMN return_device_imei VARCHAR(100);
        RAISE NOTICE 'Columna return_device_imei agregada';
    ELSE
        RAISE NOTICE 'Columna return_device_imei ya existe';
    END IF;

    -- soti_device_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'phones' AND table_name = 'assignment' AND column_name = 'soti_device_id') THEN
        ALTER TABLE phones.assignment ADD COLUMN soti_device_id VARCHAR(255);
        RAISE NOTICE 'Columna soti_device_id agregada';
    ELSE
        RAISE NOTICE 'Columna soti_device_id ya existe';
    END IF;

    -- status
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'phones' AND table_name = 'assignment' AND column_name = 'status') THEN
        ALTER TABLE phones.assignment ADD COLUMN status VARCHAR(50) DEFAULT 'active';
        RAISE NOTICE 'Columna status agregada';
    ELSE
        RAISE NOTICE 'Columna status ya existe';
    END IF;
END $$;

-- =====================================================
-- 2. MODIFICAR DEVICE_ID PARA QUE SEA OPCIONAL
-- =====================================================

DO $$
BEGIN
    -- Hacer device_id nullable ya que ahora podemos tener asignaciones solo con soti_device_id
    ALTER TABLE phones.assignment ALTER COLUMN device_id DROP NOT NULL;
    RAISE NOTICE 'device_id ahora es opcional';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error modificando device_id: %', SQLERRM;
END $$;

-- =====================================================
-- 3. AGREGAR CAMPO STATUS A SOTI_DEVICE
-- =====================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'phones' AND table_name = 'soti_device' AND column_name = 'status') THEN
        ALTER TABLE phones.soti_device ADD COLUMN status VARCHAR(50) DEFAULT 'NEW';
        RAISE NOTICE 'Columna status agregada a soti_device';
    ELSE
        RAISE NOTICE 'Columna status ya existe en soti_device';
    END IF;
END $$;

-- =====================================================
-- 4. CREAR ÍNDICES
-- =====================================================

-- Índices para assignment
DO $$
BEGIN
    -- Índice para soti_device_id
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'phones' AND tablename = 'assignment' AND indexname = 'idx_assignment_soti_device_id') THEN
        CREATE INDEX idx_assignment_soti_device_id ON phones.assignment(soti_device_id);
        RAISE NOTICE 'Índice idx_assignment_soti_device_id creado';
    ELSE
        RAISE NOTICE 'Índice idx_assignment_soti_device_id ya existe';
    END IF;

    -- Índice para distributor_id
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'phones' AND tablename = 'assignment' AND indexname = 'idx_assignment_distributor_id') THEN
        CREATE INDEX idx_assignment_distributor_id ON phones.assignment(distributor_id);
        RAISE NOTICE 'Índice idx_assignment_distributor_id creado';
    ELSE
        RAISE NOTICE 'Índice idx_assignment_distributor_id ya existe';
    END IF;

    -- Índice para status
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'phones' AND tablename = 'assignment' AND indexname = 'idx_assignment_status') THEN
        CREATE INDEX idx_assignment_status ON phones.assignment(status);
        RAISE NOTICE 'Índice idx_assignment_status creado';
    ELSE
        RAISE NOTICE 'Índice idx_assignment_status ya existe';
    END IF;

    -- Índice único para shipping_voucher_id
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'phones' AND tablename = 'assignment' AND indexname = 'idx_assignment_shipping_voucher_unique') THEN
        CREATE UNIQUE INDEX idx_assignment_shipping_voucher_unique ON phones.assignment(shipping_voucher_id) WHERE shipping_voucher_id IS NOT NULL;
        RAISE NOTICE 'Índice único idx_assignment_shipping_voucher_unique creado';
    ELSE
        RAISE NOTICE 'Índice único idx_assignment_shipping_voucher_unique ya existe';
    END IF;
END $$;

-- Índice para status en soti_device
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'phones' AND tablename = 'soti_device' AND indexname = 'idx_soti_device_status') THEN
        CREATE INDEX idx_soti_device_status ON phones.soti_device(status);
        RAISE NOTICE 'Índice idx_soti_device_status creado';
    ELSE
        RAISE NOTICE 'Índice idx_soti_device_status ya existe';
    END IF;
END $$;

-- =====================================================
-- 5. CREAR FOREIGN KEYS
-- =====================================================

DO $$
BEGIN
    -- FK para soti_device_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_schema = 'phones' AND table_name = 'assignment' AND constraint_name = 'fk_assignment_soti_device') THEN
        ALTER TABLE phones.assignment 
        ADD CONSTRAINT fk_assignment_soti_device 
        FOREIGN KEY (soti_device_id) REFERENCES phones.soti_device(id) ON DELETE SET NULL;
        RAISE NOTICE 'Foreign key fk_assignment_soti_device creada';
    ELSE
        RAISE NOTICE 'Foreign key fk_assignment_soti_device ya existe';
    END IF;

    -- FK para distributor_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_schema = 'phones' AND table_name = 'assignment' AND constraint_name = 'fk_assignment_distributor') THEN
        ALTER TABLE phones.assignment 
        ADD CONSTRAINT fk_assignment_distributor 
        FOREIGN KEY (distributor_id) REFERENCES phones.distributor(id) ON DELETE SET NULL;
        RAISE NOTICE 'Foreign key fk_assignment_distributor creada';
    ELSE
        RAISE NOTICE 'Foreign key fk_assignment_distributor ya existe';
    END IF;
END $$;

-- =====================================================
-- 6. FUNCIÓN PARA GENERAR ID DE VALE DE ENVÍO
-- =====================================================

CREATE OR REPLACE FUNCTION phones.generate_shipping_voucher_id()
RETURNS TEXT AS $$
DECLARE
    prefix TEXT := 'ENV';
    date_part TEXT := TO_CHAR(NOW(), 'YYYYMMDD');
    random_part TEXT := UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 5));
BEGIN
    RETURN prefix || '-' || date_part || '-' || random_part;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. COMENTARIOS PARA DOCUMENTACIÓN
-- =====================================================

DO $$
BEGIN
    -- Comentarios en assignment
    COMMENT ON COLUMN phones.assignment.assignee_name IS 'Nombre y apellido de la persona que recibe el equipo';
    COMMENT ON COLUMN phones.assignment.assignee_phone IS 'Teléfono de contacto del asignatario';
    COMMENT ON COLUMN phones.assignment.distributor_id IS 'ID de la distribuidora encargada del envío';
    COMMENT ON COLUMN phones.assignment.delivery_location IS 'Dirección o lugar de entrega del dispositivo';
    COMMENT ON COLUMN phones.assignment.contact_details IS 'Información de contacto adicional';
    COMMENT ON COLUMN phones.assignment.shipping_voucher_id IS 'ID único del vale de envío';
    COMMENT ON COLUMN phones.assignment.expects_return IS 'Indica si se espera la devolución de otro dispositivo';
    COMMENT ON COLUMN phones.assignment.return_device_imei IS 'IMEI del dispositivo que se espera recibir en devolución';
    COMMENT ON COLUMN phones.assignment.soti_device_id IS 'ID del dispositivo SOTI asignado';
    COMMENT ON COLUMN phones.assignment.status IS 'Estado de la asignación: active, completed, cancelled';
    
    -- Comentario en soti_device
    COMMENT ON COLUMN phones.soti_device.status IS 'Estado del dispositivo: NEW, ASSIGNED, USED, etc.';
    
    RAISE NOTICE 'Comentarios agregados exitosamente';
END $$;

-- =====================================================
-- 8. VERIFICACIÓN FINAL
-- =====================================================

DO $$
DECLARE
    assignment_count INTEGER;
    soti_device_count INTEGER;
BEGIN
    -- Contar registros para verificar que las tablas están accesibles
    SELECT COUNT(*) INTO assignment_count FROM phones.assignment;
    SELECT COUNT(*) INTO soti_device_count FROM phones.soti_device;
    
    RAISE NOTICE '✅ Migración completada exitosamente';
    RAISE NOTICE '📊 Registros en assignment: %', assignment_count;
    RAISE NOTICE '📊 Registros en soti_device: %', soti_device_count;
    RAISE NOTICE '🎉 Base de datos lista para la funcionalidad de asignaciones';
END $$;

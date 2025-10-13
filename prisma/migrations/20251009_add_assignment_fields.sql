-- Migración para agregar campos de asignación a la tabla assignment
-- y campo de estado a soti_device

-- Agregar campos a la tabla assignment
ALTER TABLE phones.assignment 
ADD COLUMN IF NOT EXISTS assignee_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS assignee_phone VARCHAR(50),
ADD COLUMN IF NOT EXISTS distributor_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS delivery_location TEXT,
ADD COLUMN IF NOT EXISTS contact_details TEXT,
ADD COLUMN IF NOT EXISTS shipping_voucher_id VARCHAR(100) UNIQUE,
ADD COLUMN IF NOT EXISTS expects_return BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS return_device_imei VARCHAR(100),
ADD COLUMN IF NOT EXISTS soti_device_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';

-- Hacer device_id opcional
ALTER TABLE phones.assignment 
ALTER COLUMN device_id DROP NOT NULL;

-- Agregar índices para mejor performance
CREATE INDEX IF NOT EXISTS idx_assignment_soti_device_id ON phones.assignment(soti_device_id);
CREATE INDEX IF NOT EXISTS idx_assignment_distributor_id ON phones.assignment(distributor_id);
CREATE INDEX IF NOT EXISTS idx_assignment_status ON phones.assignment(status);

-- Agregar foreign keys
ALTER TABLE phones.assignment
ADD CONSTRAINT fk_assignment_soti_device FOREIGN KEY (soti_device_id) 
REFERENCES phones.soti_device(id) ON DELETE SET NULL,
ADD CONSTRAINT fk_assignment_distributor FOREIGN KEY (distributor_id) 
REFERENCES phones.distributor(id) ON DELETE SET NULL;

-- Agregar campo status a soti_device
ALTER TABLE phones.soti_device 
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'NEW';

-- Agregar índice para status en soti_device
CREATE INDEX IF NOT EXISTS idx_soti_device_status ON phones.soti_device(status);

-- Función para generar ID de vale de envío único
CREATE OR REPLACE FUNCTION generate_shipping_voucher_id()
RETURNS TEXT AS $$
DECLARE
    prefix TEXT := 'ENV';
    date_part TEXT := TO_CHAR(NOW(), 'YYYYMMDD');
    random_part TEXT := UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 5));
BEGIN
    RETURN prefix || '-' || date_part || '-' || random_part;
END;
$$ LANGUAGE plpgsql;

-- Comentarios para documentación
COMMENT ON COLUMN phones.assignment.assignee_name IS 'Nombre y apellido de la persona que recibe el equipo';
COMMENT ON COLUMN phones.assignment.assignee_phone IS 'Teléfono de contacto del asignatario';
COMMENT ON COLUMN phones.assignment.distributor_id IS 'ID de la distribuidora encargada del envío';
COMMENT ON COLUMN phones.assignment.delivery_location IS 'Dirección o lugar de entrega del dispositivo';
COMMENT ON COLUMN phones.assignment.contact_details IS 'Información de contacto adicional';
COMMENT ON COLUMN phones.assignment.shipping_voucher_id IS 'ID único del vale de envío';
COMMENT ON COLUMN phones.assignment.expects_return IS 'Indica si se espera la devolución de otro dispositivo';
COMMENT ON COLUMN phones.assignment.return_device_imei IS 'IMEI del dispositivo que se espera recibir en devolución';
COMMENT ON COLUMN phones.assignment.status IS 'Estado de la asignación: active, completed, cancelled';
COMMENT ON COLUMN phones.soti_device.status IS 'Estado del dispositivo: NEW, ASSIGNED, USED, etc.';

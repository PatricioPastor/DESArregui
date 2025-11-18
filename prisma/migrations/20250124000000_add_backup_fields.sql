-- Migración para agregar campos de backup a la tabla device
-- Permite identificar dispositivos de backup que están físicamente en distribuidoras

-- Agregar campos a la tabla device
ALTER TABLE phones.device 
ADD COLUMN IF NOT EXISTS is_backup BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS backup_distributor_id VARCHAR(255);

-- Agregar índice para búsquedas eficientes por distribuidora de backup
CREATE INDEX IF NOT EXISTS idx_device_backup_distributor_id ON phones.device(backup_distributor_id);

-- Agregar foreign key constraint
ALTER TABLE phones.device
ADD CONSTRAINT fk_device_backup_distributor FOREIGN KEY (backup_distributor_id) 
REFERENCES phones.distributor(id) ON DELETE SET NULL;

-- Comentarios para documentación
COMMENT ON COLUMN phones.device.is_backup IS 'Indica si el dispositivo es de backup (stock en distribuidora sin asignación activa)';
COMMENT ON COLUMN phones.device.backup_distributor_id IS 'ID de la distribuidora donde está físicamente el dispositivo de backup';


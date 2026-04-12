ALTER TABLE logs_auditoria
  ADD COLUMN IF NOT EXISTS id_paciente uuid REFERENCES pacientes(id);

CREATE INDEX IF NOT EXISTS idx_auditoria_id_paciente
  ON logs_auditoria(id_paciente);

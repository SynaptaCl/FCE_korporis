-- Tabla de consentimientos informados (M5)
CREATE TABLE IF NOT EXISTS fce_consentimientos (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_paciente        uuid NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  id_clinica         uuid,
  tipo               text NOT NULL CHECK (tipo IN ('general', 'menores', 'teleconsulta')),
  version            integer NOT NULL DEFAULT 1,
  contenido          text NOT NULL,
  firma_paciente     jsonb,
  firma_profesional  jsonb,
  firmado            boolean NOT NULL DEFAULT false,
  created_by         uuid REFERENCES auth.users(id),
  created_at         timestamptz DEFAULT now(),
  firmado_at         timestamptz
);

ALTER TABLE fce_consentimientos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profesionales leen consentimientos"
  ON fce_consentimientos FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "profesionales crean consentimientos"
  ON fce_consentimientos FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "autor firma consentimiento"
  ON fce_consentimientos FOR UPDATE TO authenticated
  USING (firmado = false AND created_by = auth.uid());

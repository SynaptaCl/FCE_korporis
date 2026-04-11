# Plan de Proyecto — FCE Korporis
## Ficha Clínica Electrónica · Clínica Korporis Centro de Salud

**Documento:** Plan técnico para desarrollo con Claude Code
**Versión:** 1.0 · Abril 2026
**Stack:** Next.js 16 · TypeScript 5 · Tailwind v4 · Supabase · Vercel

---

## 1. VISIÓN DEL PRODUCTO

### Qué es
Una Ficha Clínica Electrónica (FCE) web que unifica kinesiología, fonoaudiología y masoterapia bajo un modelo biopsicosocial, cumpliendo la normativa sanitaria chilena (Decreto 41 MINSAL, Ley 20.584, Ley 21.668).

### Qué NO es (alcance v1)
- No es un sistema de agendamiento (eso lo cubre Synapta SaaS)
- No es un ERP administrativo ni de facturación
- No implementa interoperabilidad FHIR real en v1 (se diseña FHIR-ready)
- No integra FEA real en v1 (se simula el flujo, se integra después)
- No es telemedicina

### Arquitectura de despliegue
```
korporis.cl              → Sitio marketing (repo existente)
fce.korporis.cl          → FCE clínica (ESTE PROYECTO)
synapta.cl/demo/korporis → Demo SaaS Synapta (ya existe)
```

---

## 2. USUARIOS Y ROLES (RBAC)

| Rol | Acceso escritura | Acceso lectura | Restricciones |
|-----|-----------------|----------------|---------------|
| **Kinesiólogo** | Módulos kine (M3.1) + SOAP + Anamnesis | Fono y maso (solo lectura) | No ve agenda admin |
| **Fonoaudiólogo** | Módulos fono (M3.2) + SOAP + Anamnesis | Kine y maso (solo lectura) | No ve agenda admin |
| **Masoterapeuta** | Módulos maso (M3.3) + SOAP + Anamnesis | Kine y fono (solo lectura) | Hard-stop contraindicaciones obligatorio |
| **Recepción** | Módulo 1 (datos paciente) + agenda | Nombre, hora, contacto | Sin acceso a anamnesis, diagnósticos, SOAP |
| **Admin clínico** | Todo | Todo + configuración + audit logs | Superusuario |

---

## 3. MÓDULOS FUNCIONALES

### M1 — Identificación y Perfil Sociodemográfico
**Recurso FHIR:** Patient-PacienteCL

| Campo | Tipo | Obligatorio | Validación |
|-------|------|:-----------:|------------|
| RUN | string | ✅ | Algoritmo módulo 11 (dígito verificador) |
| Nombres | string | ✅ | Min 2 chars |
| Apellido paterno | string | ✅ | Min 2 chars |
| Apellido materno | string | ✅ | Min 2 chars |
| Fecha nacimiento | date | ✅ | Calcula edad dinámica |
| Sexo registral | enum | ✅ | M/F/Otro |
| Identidad de género | enum | — | Libre |
| Nacionalidad | string | ✅ | Default: Chilena |
| Teléfono móvil | string | ✅ | Formato +56 9 XXXX XXXX |
| Email | string | — | Validación formato |
| Dirección | structured | ✅ | Región + Comuna + Calle + Número |
| Ocupación | string | ✅ | Crítico para riesgo postural/vocal |
| Previsión | enum | ✅ | FONASA (A/B/C/D) / Isapre / Particular |
| Contacto emergencia | structured | ✅ | Nombre + parentesco + teléfono |

### M2 — Anamnesis General y Red Flags
**Recurso FHIR:** Condition + AllergyIntolerance

| Sección | Campos | Notas |
|---------|--------|-------|
| Motivo de consulta | Texto libre enriquecido | Perspectiva biopsicosocial |
| Antecedentes médicos | Multi-select + texto | HTA, DM, asma, EPOC, etc. |
| Antecedentes quirúrgicos | Lista cronológica | Fecha + tipo + hospital |
| Farmacología activa | Lista medicamentos | Nombre + dosis + frecuencia |
| Alergias | Lista + severidad | ⚠️ Flag visual prominente |
| Red Flags | Checkboxes obligatorios | Marcapasos, embarazo, TVP, oncológico, fiebre |
| Signos vitales | Panel numérico | PA, FC, SpO2, T°, FR |
| Hábitos | Multi-select | Tabaco, alcohol, actividad física, sueño |

### M3 — Evaluación por Especialidad

#### M3.1 — Kinesiología
| Sub-área | Herramientas de evaluación |
|----------|--------------------------|
| Musculoesquelética | Body map interactivo, goniometría (ROM activo/pasivo), escala Daniels, pruebas especiales, EVA dolor |
| Respiratoria (ERA) | Auscultación estandarizada, patrón respiratorio, SpO2 reposo/esfuerzo, escala mMRC, Borg modificada, test marcha 6min |
| Geriátrica | Timed Up & Go, Índice de Barthel, Berg Balance, velocidad de marcha |
| Infantil | Hitos motores, desarrollo psicomotor, integración sensorial |
| Neurológica | Escala Ashworth, sensibilidad, coordinación, equilibrio |
| Vestibular | Dix-Hallpike, maniobras posicionales, nistagmo |
| Piso pélvico | Escala Oxford, diario miccional, calidad de vida |

#### M3.2 — Fonoaudiología
| Área | Herramientas |
|------|-------------|
| Desarrollo fonológico | TEPROSIF-R (cálculo automático DE por edad), screening TEA, evaluación discurso/gramática |
| Salud vocal | GRBAS/RASATI, conductas fonotraumáticas, modo aparición fatiga vocal, síntomas rinofaríngeos |
| Deglución (disfagia) | Inspección orofacial, test consistencias, signos aspiración (tos, voz húmeda, regurgitación nasal) |
| Lenguaje adulto | Evaluación afasia, comprensión, denominación |

#### M3.3 — Masoterapia
| Área | Herramientas |
|------|-------------|
| Evaluación tisular | Consistencia, temperatura, movilidad tejidos blandos, nódulos miofasciales |
| Post-cirugía | Perimetría edema, prueba fóvea, estado cicatrizal (color, adherencias, queloides) |
| **Hard-stop contraindicaciones** | ⛔ Checklist OBLIGATORIO antes de iniciar: TVP, oncológico activo, infección cutánea, fragilidad capilar, fiebre aguda |

### M4 — Evolución Clínica SOAP + CIF
**Recurso FHIR:** Encounter + Observation + CarePlan

| Sección | Contenido | Integración |
|---------|-----------|-------------|
| **S** — Subjetivo | Reporte del paciente, EVA dolor, adherencia a indicaciones | Texto libre |
| **O** — Objetivo | Signos vitales, resultados test, observaciones palpables | Extracción automática de M3 |
| **A** — Análisis CIF | Síntesis clínica usando dominios CIF | **CIF Mapper** (ver abajo) |
| **P** — Plan | Intervenciones realizadas, dosificación, tareas domiciliarias, próxima sesión | Mapea a CarePlan FHIR |

#### CIF Mapper (componente clave)
Widget visual con 4 columnas:
1. **Funciones/Estructuras Corporales** — alteraciones anatómicas/fisiológicas
2. **Actividades** — limitaciones en tareas individuales
3. **Participación** — restricciones en situaciones vitales/sociales
4. **Factores Contextuales** — facilitadores y barreras (ambientales/personales)

Cada item con cuantificador de gravedad (0–4).

### M5 — Consentimiento Informado
| Tipo | Firmante | Integración |
|------|----------|-------------|
| Consentimiento general de tratamiento | Paciente + Profesional | Tableta/mouse + FEA profesional |
| Autorización menores/vulnerables | Tutor legal + Profesional | Grabación video/foto para docencia |
| Consentimiento teleconsulta | Paciente | Si aplica modalidad virtual |

### M6 — Auditoría y Seguridad
| Evento | Registro |
|--------|---------|
| Login/logout | Usuario + IP + timestamp + dispositivo |
| Lectura de ficha | Quién + cuándo + qué paciente |
| Modificación | Estado previo + estado nuevo + quién + cuándo |
| Firma de documento | Hash + timestamp + certificado |
| Exportación/impresión | Quién + cuándo + motivo |

---

## 4. MODELO DE DATOS (Supabase/PostgreSQL)

### Tablas principales

```sql
-- Pacientes (M1)
patients (
  id uuid PK,
  run text UNIQUE NOT NULL,          -- validado módulo 11
  nombres text NOT NULL,
  apellido_paterno text NOT NULL,
  apellido_materno text NOT NULL,
  fecha_nacimiento date NOT NULL,
  sexo_registral text NOT NULL,
  identidad_genero text,
  nacionalidad text DEFAULT 'Chilena',
  telefono text NOT NULL,
  email text,
  direccion jsonb NOT NULL,          -- {region, comuna, calle, numero}
  ocupacion text NOT NULL,
  prevision jsonb NOT NULL,          -- {tipo, tramo, isapre}
  contacto_emergencia jsonb NOT NULL,-- {nombre, parentesco, telefono}
  created_at timestamptz,
  updated_at timestamptz
)

-- Profesionales (vinculado a Supabase Auth)
practitioners (
  id uuid PK REFERENCES auth.users(id),
  rut text UNIQUE NOT NULL,
  nombres text NOT NULL,
  apellidos text NOT NULL,
  especialidad text NOT NULL,        -- kinesiologia | fonoaudiologia | masoterapia
  rol text NOT NULL,                 -- profesional | recepcion | admin
  registro_superintendencia text,
  activo boolean DEFAULT true,
  created_at timestamptz
)

-- Anamnesis compartida (M2)
anamnesis (
  id uuid PK,
  patient_id uuid FK → patients,
  motivo_consulta text,
  antecedentes_medicos jsonb,        -- [{patologia, desde, controlado}]
  antecedentes_quirurgicos jsonb,    -- [{tipo, fecha, hospital}]
  farmacologia jsonb,                -- [{medicamento, dosis, frecuencia}]
  alergias jsonb,                    -- [{sustancia, severidad, reaccion}]
  red_flags jsonb,                   -- {marcapasos: bool, embarazo: bool, tvp: bool, ...}
  habitos jsonb,                     -- {tabaco, alcohol, ejercicio, sueño}
  created_by uuid FK → practitioners,
  created_at timestamptz,
  updated_at timestamptz
)

-- Signos vitales (registro por sesión)
vital_signs (
  id uuid PK,
  patient_id uuid FK,
  encounter_id uuid FK,
  presion_arterial text,             -- "120/80"
  frecuencia_cardiaca int,
  spo2 int,
  temperatura decimal,
  frecuencia_respiratoria int,
  recorded_by uuid FK,
  recorded_at timestamptz
)

-- Encuentros/Sesiones (M4)
encounters (
  id uuid PK,
  patient_id uuid FK,
  practitioner_id uuid FK,
  especialidad text NOT NULL,
  modalidad text NOT NULL,           -- presencial | domicilio | virtual
  status text DEFAULT 'en_progreso', -- planificado | en_progreso | finalizado | cancelado
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz
)

-- Evaluaciones por especialidad (M3)
evaluations (
  id uuid PK,
  encounter_id uuid FK,
  patient_id uuid FK,
  especialidad text NOT NULL,
  sub_area text,                     -- musculoesqueletica | respiratoria | vocal | deglusion | etc
  data jsonb NOT NULL,               -- Estructura flexible por tipo de evaluación
  created_by uuid FK,
  created_at timestamptz
)

-- Evolución SOAP (M4)
soap_notes (
  id uuid PK,
  encounter_id uuid FK,
  patient_id uuid FK,
  subjetivo text,
  objetivo text,
  analisis_cif jsonb,                -- {funciones: [], actividades: [], participacion: [], contexto: []}
  plan text,
  intervenciones jsonb,              -- [{tipo, descripcion, dosificacion}]
  tareas_domiciliarias text,
  proxima_sesion date,
  firmado boolean DEFAULT false,
  firmado_at timestamptz,
  firmado_por uuid FK,
  created_at timestamptz
)

-- Consentimientos (M5)
consents (
  id uuid PK,
  patient_id uuid FK,
  tipo text NOT NULL,                -- general | menores | teleconsulta
  version int DEFAULT 1,
  contenido text NOT NULL,
  firma_paciente jsonb,              -- {data_url, timestamp}
  firma_profesional jsonb,           -- {practitioner_id, timestamp, hash}
  firmado boolean DEFAULT false,
  created_at timestamptz
)

-- Audit log (M6) — append-only, sin UPDATE ni DELETE
audit_log (
  id bigint PK GENERATED ALWAYS AS IDENTITY,
  user_id uuid,
  action text NOT NULL,              -- login | read | create | update | sign | export
  resource_type text,                -- patient | encounter | soap_note | consent
  resource_id uuid,
  details jsonb,                     -- {campo_modificado, valor_anterior, valor_nuevo}
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now()
)
```

### RLS (Row Level Security)

```sql
-- Principio: Todo bloqueado por defecto, abrir solo lo necesario

-- Pacientes: profesionales autenticados ven todos los pacientes de la clínica
-- Recepción: solo M1 (se filtra en la app, pero RLS garantiza auth)
-- Audit log: solo admin puede leer; todos escriben vía function

-- Ejemplo política profesionales:
CREATE POLICY "profesionales ven pacientes"
  ON patients FOR SELECT TO authenticated
  USING (true);  -- todos los profesionales autenticados ven pacientes

CREATE POLICY "profesionales crean pacientes"
  ON patients FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM practitioners WHERE id = (SELECT auth.uid()) AND activo = true)
  );

-- SOAP: solo el autor puede editar mientras no esté firmado
CREATE POLICY "autor edita soap no firmado"
  ON soap_notes FOR UPDATE TO authenticated
  USING (
    created_by = (SELECT auth.uid()) AND firmado = false
  );

-- Audit log: append-only
CREATE POLICY "todos insertan audit"
  ON audit_log FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "solo admin lee audit"
  ON audit_log FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM practitioners WHERE id = (SELECT auth.uid()) AND rol = 'admin')
  );

-- NUNCA permitir DELETE en audit_log
-- No crear política FOR DELETE
```

---

## 5. ESTRUCTURA DE DIRECTORIOS

```
korporis-fce/
├── src/
│   ├── app/
│   │   ├── layout.tsx                      → Root layout + Supabase provider
│   │   ├── globals.css                     → Tokens kp-* + utilidades
│   │   ├── page.tsx                        → Redirect a /login o /dashboard
│   │   ├── login/page.tsx                  → Auth con Supabase
│   │   ├── dashboard/
│   │   │   ├── layout.tsx                  → Sidebar + auth guard
│   │   │   ├── page.tsx                    → Vista general (agenda del día)
│   │   │   └── pacientes/
│   │   │       ├── page.tsx                → Lista de pacientes
│   │   │       └── [id]/
│   │   │           ├── page.tsx            → Ficha completa del paciente
│   │   │           ├── anamnesis/page.tsx  → M2
│   │   │           ├── evaluacion/page.tsx → M3 (dinámico por especialidad)
│   │   │           ├── evolucion/page.tsx  → M4 SOAP + CIF
│   │   │           └── consentimiento/page.tsx → M5
│   ├── components/
│   │   ├── ui/                             → Componentes atómicos
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Textarea.tsx
│   │   │   ├── Select.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── AlertBanner.tsx
│   │   │   ├── SignatureBlock.tsx
│   │   │   └── LoadingSpinner.tsx
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── TopBar.tsx
│   │   │   └── PatientHeader.tsx
│   │   ├── modules/
│   │   │   ├── PatientForm.tsx             → M1
│   │   │   ├── AnamnesisForm.tsx           → M2
│   │   │   ├── RedFlagsChecklist.tsx       → M2 sub-componente
│   │   │   ├── VitalSignsPanel.tsx         → M2 sub-componente
│   │   │   ├── KinesiologiaEval.tsx        → M3.1
│   │   │   ├── FonoaudiologiaEval.tsx      → M3.2
│   │   │   ├── MasoterapiaEval.tsx         → M3.3
│   │   │   ├── MasoterapiaHardStop.tsx     → M3.3 contraindicaciones
│   │   │   ├── SoapForm.tsx               → M4
│   │   │   ├── CifMapper.tsx              → M4 sub-componente
│   │   │   ├── ConsentManager.tsx         → M5
│   │   │   └── AuditTimeline.tsx          → M6
│   │   └── shared/
│   │       ├── BodyMap.tsx                 → SVG interactivo
│   │       └── ScaleSlider.tsx             → EVA, Daniels, CIF quantifiers
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts                   → Browser client
│   │   │   ├── server.ts                   → Server client
│   │   │   └── types.ts                    → Generated types
│   │   ├── constants.ts                    → Config clínica
│   │   ├── utils.ts                        → cn() + helpers
│   │   ├── validations.ts                  → Zod schemas (RUN, formularios)
│   │   ├── run-validator.ts                → Módulo 11 chileno
│   │   └── audit.ts                        → Helper para log de auditoría
│   ├── hooks/
│   │   ├── useAuth.ts                      → Auth state + role
│   │   ├── usePatient.ts                   → CRUD paciente
│   │   └── useAudit.ts                     → Log actions
│   └── types/
│       ├── patient.ts
│       ├── encounter.ts
│       ├── evaluation.ts
│       ├── soap.ts
│       ├── cif.ts
│       └── consent.ts
├── supabase/
│   └── migrations/
│       ├── 20260410_create_patients.sql
│       ├── 20260410_create_practitioners.sql
│       ├── 20260410_create_anamnesis.sql
│       ├── 20260410_create_encounters.sql
│       ├── 20260410_create_evaluations.sql
│       ├── 20260410_create_soap_notes.sql
│       ├── 20260410_create_consents.sql
│       ├── 20260410_create_audit_log.sql
│       └── 20260410_create_rls_policies.sql
├── public/
│   └── logo-korporis.svg
├── .env.local.example
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

---

## 6. FASES DE DESARROLLO

### Fase 0 — Bootstrap del Proyecto (primera sesión de Claude Code)

**Paso 1: Crear el proyecto Next.js**
```bash
npx create-next-app@latest korporis-fce \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*" \
  --turbopack

cd korporis-fce
```

**Paso 2: Instalar dependencias core**
```bash
# UI e iconos
npm install lucide-react clsx tailwind-merge

# Validación de formularios
npm install zod react-hook-form @hookform/resolvers

# Animaciones (nunca framer-motion)
npm install motion

# Supabase
npm install @supabase/supabase-js @supabase/ssr

# Utilidades
npm install date-fns
```

**Paso 3: Instalar dependencias de desarrollo**
```bash
npm install -D @types/node
```

**Paso 4: Inicializar Git**
```bash
git init
git add -A
git commit -m "feat: bootstrap Next.js 16 + deps"
```

**Paso 5: Crear estructura de directorios**
```bash
# Directorios de la app
mkdir -p src/app/login
mkdir -p src/app/dashboard/pacientes/\[id\]/{anamnesis,evaluacion,evolucion,consentimiento}

# Componentes
mkdir -p src/components/{ui,layout,modules,shared}

# Lógica
mkdir -p src/lib/supabase
mkdir -p src/hooks
mkdir -p src/types

# Supabase migraciones
mkdir -p supabase/migrations

# Assets
mkdir -p public

# Documentación de referencia (para Claude Code)
mkdir -p docs
```

**Paso 5b: Copiar documentos de referencia al repo**

⚠️ **IMPORTANTE:** Los archivos de diseño clínico y modelo de marca viven en el proyecto de Claude.ai.
Debes copiarlos manualmente a la carpeta `docs/` del repo nuevo para que Claude Code pueda leerlos.

```bash
# Copiar estos 3 archivos a docs/
# 1. Este plan de proyecto:
#    → docs/plan-fce-korporis.md
#
# 2. El documento de diseño clínico-legal (78 páginas):
#    → docs/diseno-integral-fce.md
#
# 3. El CLAUDE.md del proyecto marketing (tokens, paleta, reglas):
#    → docs/korporis-modelo.md
```

Descarga los 3 archivos desde el proyecto de Claude.ai y colócalos en `docs/`.
Luego Claude Code los referencia como `docs/plan-fce-korporis.md`, etc.

También crea un `CLAUDE.md` en la raíz del repo que apunte a estos docs:

```bash
cat > CLAUDE.md << 'EOF'
# CLAUDE.md — Korporis FCE

## Documentación de referencia
Leer ANTES de cualquier implementación:
- `docs/plan-fce-korporis.md` — Plan completo del proyecto (fases, modelo de datos, criterios)
- `docs/diseno-integral-fce.md` — Requisitos clínicos y legales (Decreto 41, Ley 20.584, CIF, FHIR)
- `docs/korporis-modelo.md` — Tokens de color kp-*, reglas de diseño, datos confirmados del cliente

## Stack
Next.js 16 · TypeScript 5 strict · Tailwind v4 · Supabase · Vercel

## Reglas inquebrantables
1. `npm run build` = 0 errores después de CADA fase
2. Tokens kp-* siempre, nunca colores Tailwind genéricos
3. TypeScript strict — sin `any`
4. RLS habilitado en TODAS las tablas
5. Audit log en toda operación de escritura
6. Contenido médico nunca se inventa
7. SOAP firmado = inmutable
8. Hard-stop contraindicaciones masoterapia = obligatorio
9. Server Components por defecto
10. Seguir fases en orden, no saltar
EOF
```

**Paso 6: Crear .env.local.example**
```bash
cat > .env.local.example << 'EOF'
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_CLINIC_NAME=Korporis
EOF

cp .env.local.example .env.local
```

**Paso 7: Configurar next.config.ts**
```typescript
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
};

export default nextConfig;
```

**Paso 8: Verificar que compila**
```bash
npm run build
# Debe dar 0 errores
```

```bash
git add -A
git commit -m "feat: estructura de directorios + env config"
```

---

### Fase 1 — Fundaciones: Design System + Tipos + Utilidades (1–2 días)

**Paso 1: globals.css con tokens kp-***
```
□ Borrar contenido default de globals.css
□ Crear @theme con toda la paleta kp-* (ver docs/korporis-modelo.md)
□ Crear utilidades base (@utility)
□ Tipografía: configurar fuentes (Outfit headings + Plus Jakarta Sans body)
```

**Paso 2: Archivos lib/**
```
□ lib/utils.ts              → cn() = clsx + tailwind-merge
□ lib/constants.ts           → Datos clínica (nombre, dirección, WhatsApp, horarios)
□ lib/run-validator.ts       → Validación RUN chileno (algoritmo módulo 11)
□ lib/validations.ts         → Schemas Zod para todos los formularios
□ lib/audit.ts               → Helper para registrar acciones en audit_log
```

**Paso 3: Archivos types/**
```
□ types/patient.ts           → Patient, PatientFormData, Address, EmergencyContact, Prevision
□ types/encounter.ts         → Encounter, EncounterStatus, Modalidad, Especialidad
□ types/evaluation.ts        → Evaluation, KineEval, FonoEval, MasoEval (por sub-área)
□ types/soap.ts              → SoapNote, SoapSection
□ types/cif.ts               → CifDomain, CifItem, CifQuantifier (0–4)
□ types/consent.ts           → Consent, ConsentType, Signature
□ types/practitioner.ts      → Practitioner, PractitionerRole
□ types/audit.ts             → AuditEntry, AuditAction, AuditResourceType
```

**Paso 4: Verificar**
```bash
npm run lint && npm run build  # 0 errores obligatorio
git add -A
git commit -m "feat: design system + tipos + utilidades"
```

---

### Fase 2 — Supabase Setup (1 día)

**Paso 1: Crear proyecto Supabase**
```
□ Ir a supabase.com → New Project (o usar proyecto existente de Synapta)
□ Copiar URL y keys a .env.local
□ NUNCA commitear .env.local (verificar .gitignore)
```

**Paso 2: Crear clientes Supabase**
```
□ lib/supabase/client.ts     → createBrowserClient() para componentes client
□ lib/supabase/server.ts     → createServerClient() para Server Components/Actions
□ lib/supabase/middleware.ts  → Para refresh de sesión en middleware.ts
□ src/middleware.ts           → Middleware de auth (proteger /dashboard/*)
```

**Paso 3: Migraciones SQL**
```
□ Aplicar migraciones en orden (usar MCP Supabase: apply_migration):
  1. 20260410_create_patients.sql
  2. 20260410_create_practitioners.sql
  3. 20260410_create_anamnesis.sql
  4. 20260410_create_vital_signs.sql
  5. 20260410_create_encounters.sql
  6. 20260410_create_evaluations.sql
  7. 20260410_create_soap_notes.sql
  8. 20260410_create_consents.sql
  9. 20260410_create_audit_log.sql
  10. 20260410_create_rls_policies.sql
```

**Paso 4: Seed data**
```
□ Crear 3 usuarios en Supabase Auth (1 kine, 1 fono, 1 maso)
□ Insertar registros en practitioners vinculados a esos users
□ Insertar 3 pacientes de ejemplo con datos realistas chilenos
□ Insertar 1 anamnesis de ejemplo
```

**Paso 5: Verificar seguridad**
```
□ Ejecutar get_advisors → 0 alertas de seguridad
□ Verificar RLS habilitado en TODAS las tablas
□ Verificar que audit_log NO tiene política DELETE
□ Generar types: generate_typescript_types → copiar a lib/supabase/types.ts
```

```bash
npm run lint && npm run build
git add -A
git commit -m "feat: supabase setup + migraciones + RLS + seed"
```

### Fase 3 — UI Base + Layout (1–2 días)
```
□ Componentes atómicos: Button, Input, Textarea, Select, Badge, Card
□ AlertBanner (para red flags)
□ SignatureBlock (simulación FEA)
□ LoadingSpinner
□ Sidebar con nav + rol del usuario + indicador seguridad
□ TopBar con fecha + nombre usuario
□ PatientHeader (banner con datos M1 + selector especialidad)
□ Login page funcional con Supabase Auth
□ Dashboard layout con auth guard
□ npm run build → 0 errores
```

### Fase 4 — Módulo 1: Pacientes (1 día)
```
□ PatientForm completo con validación Zod
□ Validación RUN en tiempo real
□ Lista de pacientes con búsqueda
□ CRUD completo (crear, leer, editar)
□ Audit log en cada operación
□ npm run build → 0 errores
```

### Fase 5 — Módulo 2: Anamnesis (1 día)
```
□ AnamnesisForm con todas las secciones
□ RedFlagsChecklist con alertas visuales
□ VitalSignsPanel con validación de rangos
□ Persistencia en Supabase
□ Visible para todas las especialidades (lectura)
□ npm run build → 0 errores
```

### Fase 6 — Módulo 3: Evaluaciones (2–3 días)
```
□ KinesiologiaEval (sub-tabs por área: MSK, ERA, geriátrica, infantil, neuro, vestibular, piso pélvico)
□ BodyMap SVG interactivo (al menos para MSK)
□ ScaleSlider reutilizable (EVA, Daniels, Borg, mMRC)
□ FonoaudiologiaEval (vocal, deglución, desarrollo fonológico)
□ MasoterapiaEval (tisular, post-cirugía)
□ MasoterapiaHardStop (⛔ contraindicaciones obligatorias — bloquea avance)
□ Cada evaluación persiste en Supabase como JSONB
□ RBAC: escritura solo en la especialidad del profesional, lectura en las demás
□ npm run build → 0 errores
```

### Fase 7 — Módulo 4: Evolución SOAP + CIF (2 días)
```
□ SoapForm con 4 cuadrantes (S/O/A/P)
□ CifMapper visual con 4 columnas + cuantificadores 0–4
□ Integración: datos del Objetivo se pre-llenan desde última evaluación
□ SignatureBlock funcional (simula FEA, registra timestamp + hash)
□ Una vez firmado: documento se bloquea (inmutable)
□ Audit log en firma
□ npm run build → 0 errores
```

### Fase 8 — Módulo 5: Consentimientos (1 día)
```
□ ConsentManager con templates por tipo
□ Captura de firma con canvas (mouse/touch)
□ Versionado de consentimientos
□ Almacenamiento en Supabase Storage (firma como imagen)
□ npm run build → 0 errores
```

### Fase 9 — Módulo 6: Auditoría (0.5 días)
```
□ AuditTimeline visual (quién hizo qué y cuándo)
□ Solo visible para rol admin
□ Filtros por paciente, profesional, tipo de acción, rango de fechas
□ npm run build → 0 errores
```

### Fase 10 — Polish + Deploy (1 día)
```
□ Responsive check (tablet es el target principal)
□ Loading states en todas las operaciones async
□ Error boundaries
□ Empty states
□ Deploy en Vercel (subdominio fce.korporis.cl)
□ Variables de entorno en Vercel
□ Smoke test completo
```

**Total estimado: 11–16 días de desarrollo con Claude Code**
**Fase 0 (bootstrap) se completa en ~30 minutos**

---

## 7. PROMPT MAESTRO PARA CLAUDE CODE

Copiar esto como contexto inicial al abrir Claude Code en el repo:

```markdown
# Contexto del proyecto

Estás trabajando en la Ficha Clínica Electrónica (FCE) de Korporis Centro de Salud,
una clínica chilena de kinesiología, fonoaudiología y masoterapia en San Joaquín, Santiago.

## Archivos de referencia obligatorios
Lee estos archivos ANTES de cualquier implementación:
1. docs/plan-fce-korporis.md — Plan completo del proyecto (fases, modelo de datos, criterios)
2. docs/diseno-integral-fce.md — Requisitos clínicos y legales (Decreto 41, Ley 20.584, CIF, FHIR)
3. docs/korporis-modelo.md — Tokens de color kp-*, reglas de diseño, datos confirmados del cliente

## Stack
- Next.js 16 (App Router) + TypeScript 5 strict
- Tailwind CSS v4 con tokens kp-* (ver paleta en docs/korporis-modelo.md)
- Supabase (Auth + PostgreSQL + RLS + Storage)
- Vercel para deploy
- lucide-react para iconos
- zod para validación
- motion/react para animaciones (nunca framer-motion)

## Reglas inquebrantables
1. `npm run build` debe pasar con 0 errores después de CADA fase
2. Tokens kp-* siempre, nunca colores Tailwind genéricos (bg-teal-500 ❌)
3. TypeScript strict — sin `any` implícitos
4. RLS habilitado en TODAS las tablas
5. Audit log en toda operación de escritura
6. Contenido médico nunca se inventa — usar datos confirmados o [PENDIENTE]
7. Una vez firmado un SOAP, es inmutable
8. Hard-stop de contraindicaciones en masoterapia es OBLIGATORIO
9. Cada componente es independiente e importable
10. Server Components por defecto, 'use client' solo cuando sea necesario

## Orden de trabajo
Empezar por Fase 0 (bootstrap desde cero). Seguir las fases del plan estrictamente. No saltar fases.
Después de completar cada fase, ejecutar: npm run build && npm run lint

## Diseño visual
Estética: Clinical Editorial — limpia, profesional, confiable.
- Sidebar oscuro (slate-900) con acento teal
- Cards blancas con bordes sutiles sobre fondo slate-50/100
- Tipografía con jerarquía clara (badges de color por sección SOAP)
- Iconos de lucide-react
- Animaciones mínimas (solo transiciones de estado)
- Target principal: tablet (el profesional usa tablet en consulta)
```

---

## 8. CRITERIOS DE ACEPTACIÓN POR MÓDULO

### M1 — Pacientes ✅ cuando:
- [ ] Se puede crear paciente con RUN validado (módulo 11)
- [ ] Se puede buscar paciente por RUN o nombre
- [ ] Se puede editar datos del paciente
- [ ] Recepción NO ve anamnesis ni SOAP
- [ ] Audit log registra creación y edición

### M2 — Anamnesis ✅ cuando:
- [ ] Red flags se muestran como alertas visuales prominentes
- [ ] Signos vitales se registran con validación de rangos
- [ ] Datos son visibles para todas las especialidades
- [ ] Solo profesionales pueden editar (no recepción)

### M3 — Evaluación ✅ cuando:
- [ ] Formularios dinámicos según rol del profesional logueado
- [ ] Kine ve 7 sub-áreas con herramientas específicas
- [ ] Fono ve vocal + deglución + desarrollo fonológico
- [ ] Maso ve tisular + post-cirugía + hard-stop
- [ ] Hard-stop bloquea avance si no se certifican contraindicaciones
- [ ] Profesional ve sus módulos en escritura y los demás en lectura

### M4 — SOAP ✅ cuando:
- [ ] 4 cuadrantes funcionales con texto enriquecido
- [ ] CIF Mapper con 4 columnas y cuantificadores 0–4
- [ ] Botón de firma que bloquea el documento
- [ ] Documento firmado es inmutable
- [ ] Audit log registra la firma

### M5 — Consentimiento ✅ cuando:
- [ ] Se puede firmar con canvas (mouse/touch)
- [ ] Se genera PDF/imagen del consentimiento firmado
- [ ] Se almacena en Supabase Storage
- [ ] Tiene versionado

### M6 — Auditoría ✅ cuando:
- [ ] Timeline visual de todas las acciones
- [ ] Solo visible para rol admin
- [ ] Filtrable por paciente, profesional, acción, fecha
- [ ] Tabla audit_log no tiene políticas UPDATE ni DELETE

---

## 9. RIESGOS Y MITIGACIONES

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| Colores kp-* no confirmados por cliente | Visual no definitivo | Usar aproximaciones, documentar como pendiente |
| FEA real requiere proveedor externo | No se puede firmar legalmente | v1 simula el flujo; v2 integra Acepta/E-CertChile |
| FHIR CL Core aún en evolución | Mappeo puede cambiar | Diseñar FHIR-ready (estructura compatible) sin depender de API FHIR externa |
| Ley 21.668 reglamento aún no publicado | Requisitos técnicos pueden cambiar | Implementar estándar FHIR como base; adaptar cuando salga reglamento |
| Pacientes sin email | 2FA limitado | Auth por teléfono como alternativa (Supabase soporta OTP SMS) |
| Tablet como dispositivo principal | UI debe ser touch-friendly | Botones mínimo 44px, inputs grandes, scroll vertical |

---

## 10. ROADMAP POST-V1

| Versión | Feature | Dependencia |
|---------|---------|-------------|
| v1.1 | Exportar ficha a PDF (para entregar al paciente — Ley 20.584) | Ninguna |
| v1.2 | Integración FEA real con Acepta.com o E-CertChile | Contrato con proveedor |
| v1.3 | TEPROSIF-R automatizado (cálculo DE por edad) | Licencia del instrumento |
| v2.0 | Interoperabilidad FHIR real (API de lectura/escritura) | Reglamento Ley 21.668 |
| v2.1 | Teleconsulta integrada (video + registro automático modalidad virtual) | Ley 21.541 |
| v2.2 | Body Map interactivo avanzado (SVG con zonas anatómicas clickeables) | Diseño SVG |
| v3.0 | Integración con agenda Synapta SaaS | API Synapta |
```

---

*Plan generado por Synapta HealthTech — uso interno*

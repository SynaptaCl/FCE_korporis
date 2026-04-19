# CLAUDE.md — Korporis FCE (Ficha Clínica Electrónica)

## Qué es este proyecto
Ficha Clínica Electrónica para Korporis Centro de Salud — una clínica chilena
de kinesiología, fonoaudiología y masoterapia en San Joaquín, Santiago.

Repo separado del sitio marketing (korporis.cl). Se despliega en fce.korporis.cl.

## Documentación de referencia
Leer ANTES de cualquier implementación:
- `docs/plan-fce-korporis.md` — Plan completo (fases, modelo de datos, criterios de aceptación)
- `docs/diseno-integral-fce.md` — Requisitos clínicos y legales (Decreto 41, Ley 20.584, CIF, FHIR)
- `docs/korporis-modelo.md` — Tokens de color kp-*, reglas de diseño, datos confirmados del cliente
- `docs/korporis-informe.md` — Informe completo del cliente (servicios, precios, competencia)

---

## Stack técnico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Framework | Next.js (App Router) | 16.2.3 |
| Lenguaje | TypeScript strict | ^5 |
| Estilos | Tailwind CSS v4 | ^4 |
| Backend / Auth / DB | Supabase | @supabase/ssr ^0.10.2 · @supabase/supabase-js ^2.103.0 |
| Deploy | Vercel | — |
| Formularios | react-hook-form + zod | ^7 · ^4 |
| UI / Animación | lucide-react · motion/react | ^1.8 · ^12 |
| Fechas | date-fns | ^4 |
| PDF | html2pdf.js | ^0.14 |
| Estilos merge | tailwind-merge · clsx | ^3 · ^2 |

---

## Paleta de colores (tokens kp-*)
```
kp-primary       #006B6B   Teal oscuro — headings, fondos oscuros
kp-primary-deep  #004545   Muy oscuro — fondo Hero/sidebar
kp-accent        #00B0A8   Verde-teal vibrante — CTAs, botones, iconos
kp-accent-md     #33C4BE   Teal más brillante — gradientes
kp-accent-lt     #D5F5F4   Fondo de badges
kp-accent-xs     #E6FAF9   Fondo ultra-claro
kp-secondary     #F5A623   Naranja/amarillo — acento secundario
kp-secondary-lt  #FEF3E2   Fondo naranja ultra-claro
kp-border        #E2E8F0   Bordes estándar
kp-border-md     #CBD5E1   Bordes con mayor contraste
surface-0        #F1F5F9   Fondo base
surface-1        #FFFFFF   Cards
surface-dark     #0B1120   Secciones oscuras
ink-1            #1E293B   Texto enfatizado
ink-2            #475569   Cuerpo
ink-3            #94A3B8   Secundario
ink-4            #CBD5E1   Placeholders
```

---

## 10 reglas inquebrantables
1. `npm run build` = 0 errores después de CADA fase
2. Tokens kp-* siempre, nunca colores Tailwind genéricos (bg-teal-500 ❌)
3. TypeScript strict — sin `any` implícitos
4. RLS habilitado en TODAS las tablas de Supabase
5. Audit log en toda operación de escritura
6. Contenido médico nunca se inventa — datos confirmados o `[PENDIENTE]`
7. SOAP firmado = inmutable (no se puede editar después de firma)
8. Hard-stop contraindicaciones masoterapia = obligatorio antes de iniciar
9. Server Components por defecto, `'use client'` solo cuando sea necesario
10. Seguir fases en orden (ver docs/plan-fce-korporis.md), no saltar

---

## Estructura del proyecto
```
src/
├── app/
│   ├── layout.tsx                        → Root layout (globals.css, fuentes)
│   ├── page.tsx                          → Redirect a /dashboard
│   ├── login/page.tsx                    → Login con Supabase Auth (Client Component)
│   └── dashboard/
│       ├── layout.tsx                    → Auth guard + fetch profesional/admin/branding
│       ├── page.tsx                      → Dashboard principal (agenda diaria)
│       └── pacientes/
│           ├── page.tsx                  → Listado de pacientes (vista_pacientes_clinicos)
│           ├── nuevo/page.tsx            → Crear nuevo paciente
│           └── [id]/
│               ├── page.tsx              → Ficha resumen (redirige a /anamnesis)
│               ├── anamnesis/page.tsx    → M2: Anamnesis + Red Flags + Signos Vitales
│               ├── evaluacion/page.tsx   → M3: Evaluación por especialidad
│               ├── evolucion/page.tsx    → M4: Evolución SOAP + CIF Mapper
│               ├── consentimiento/page.tsx → M5: Consentimiento informado + firma canvas
│               ├── auditoria/page.tsx    → M6: Auditoría (solo admin)
│               ├── exportar-pdf/page.tsx → Exportar ficha a PDF
│               ├── fhir/page.tsx         → Vista FHIR R4
│               └── editar/page.tsx       → Editar datos paciente (M1)
│   └── actions/                         → Server Actions (toda la lógica de negocio)
│       ├── patients.ts                   → CRUD pacientes, helpers auth/contexto
│       ├── anamnesis.ts                  → Anamnesis + signos vitales
│       ├── evaluacion.ts                 → Evaluaciones por especialidad
│       ├── soap.ts                       → Notas SOAP + firma + encuentros
│       ├── consentimiento.ts             → Consentimientos + firma canvas
│       ├── auditoria.ts                  → Logs auditoría (solo admin)
│       ├── timeline.ts                   → Timeline clínico + resumen paciente
│       └── exportar-pdf.ts              → Fetch completo para generación PDF
├── components/
│   ├── ui/                              → Átomos: Button, Input, Card, Badge, Select,
│   │                                       Textarea, AlertBanner, SignatureBlock,
│   │                                       LoadingSpinner, LoadingPage
│   ├── layout/                          → Sidebar, TopBar, DashboardShell,
│   │                                       PatientHeader, BrandingInjector
│   ├── modules/                         → Módulos clínicos M1–M6:
│   │   ├── PatientForm.tsx              → M1: Formulario identificación
│   │   ├── PatientList.tsx              → Lista pacientes con filtros
│   │   ├── AnamnesisForm.tsx            → M2: Anamnesis
│   │   ├── RedFlagsChecklist.tsx        → M2: Red flags clínicas
│   │   ├── VitalSignsPanel.tsx          → M2: Signos vitales
│   │   ├── KinesiologiaEval.tsx         → M3: Evaluación kine
│   │   ├── FonoaudiologiaEval.tsx       → M3: Evaluación fono
│   │   ├── MasoterapiaEval.tsx          → M3: Evaluación maso + hard-stop contraindicaciones
│   │   ├── SoapForm.tsx                 → M4: Formulario SOAP
│   │   ├── CifMapper.tsx                → M4: Clasificación CIF
│   │   ├── ClinicalTimeline.tsx         → M4/resumen: Timeline clínico
│   │   ├── SummaryPanel.tsx             → Panel resumen paciente
│   │   ├── ConsentManager.tsx           → M5: Gestor consentimientos
│   │   ├── AuditTimeline.tsx            → M6: Timeline auditoría
│   │   ├── AgendaTable.tsx              → Dashboard: Agenda diaria
│   │   ├── FhirPreview.tsx              → Vista FHIR R4
│   │   └── PdfExportView.tsx            → Vista para exportación PDF
│   └── shared/
│       ├── BodyMap.tsx                  → Mapa corporal interactivo
│       └── ScaleSlider.tsx             → Escalas numéricas (dolor, función)
├── lib/
│   ├── supabase/
│   │   ├── client.ts                    → createBrowserClient (Client Components)
│   │   ├── server.ts                    → createServerClient con cookies (Server/Actions)
│   │   └── types.ts                     → Database type stub (regenerar con supabase gen types)
│   ├── constants.ts                     → Constantes clínica, Especialidad, Rol, PREVISIONES
│   ├── utils.ts                         → cn(), calculateAge(), formatRut (display)
│   ├── run-validator.ts                 → cleanRut, validateRut, formatRut, aliases *Run
│   ├── validations.ts                   → Schemas Zod: patientSchema, anamnesisSchema,
│   │                                       vitalSignsSchema, soapSchema, consentSchema
│   ├── permissions.ts                   → canWrite(), canAccessFCE(), canSignSOAP()
│   ├── audit.ts                         → createAuditEntry() helper
│   └── fhir-mapper.ts                   → Mapeador FHIR R4
├── hooks/                               → (directorio reservado, actualmente vacío)
├── types/
│   ├── index.ts                         → Re-exports de todos los tipos
│   ├── patient.ts                       → Patient, PacienteClinico, CitaAgenda
│   ├── encounter.ts                     → Encounter
│   ├── anamnesis.ts                     → Anamnesis, VitalSigns
│   ├── evaluation.ts                    → Evaluation
│   ├── soap.ts                          → SoapNote
│   ├── consent.ts                       → Consent
│   ├── audit.ts                         → AuditEntry, AuditAction
│   ├── cif.ts                           → CIF types
│   ├── practitioner.ts                  → Practitioner
│   └── html2pdf.d.ts                    → Type declaration para html2pdf.js
docs/                                    → Documentación de referencia (no se deploya)
supabase/
└── migrations/
    ├── 20260411_create_fce_consentimientos.sql → CREATE TABLE fce_consentimientos + RLS
    └── 20260411_add_id_paciente_auditoria.sql  → ALTER TABLE logs_auditoria + índice
```

---

## Módulos clínicos
- **M1** — Identificación paciente (Decreto 41 MINSAL) ✅ completo
- **M2** — Anamnesis + Red Flags + Signos Vitales ✅ completo
- **M3** — Evaluación por especialidad (kine/fono/maso) ✅ completo
- **M4** — Evolución SOAP + CIF Mapper ✅ completo
- **M5** — Consentimiento informado (firma canvas) ✅ completo
- **M6** — Auditoría (append-only, solo admin)

---

## Arquitectura Supabase — interacción completa con la base de datos

### Clientes Supabase

| Archivo | Función exportada | Cuándo usar |
|---------|------------------|-------------|
| `src/lib/supabase/client.ts` | `createClient()` | Client Components (`'use client'`). Usa `createBrowserClient` de `@supabase/ssr`. Ejemplo: login page, firma canvas. |
| `src/lib/supabase/server.ts` | `createClient()` (async) | Server Components, Server Actions, layouts. Usa `createServerClient` con cookies de Next.js para manejar la sesión. **Siempre llamar `await createClient()`**. |

**Regla crítica:** En Server Components y layouts usar siempre `supabase.auth.getUser()` (verifica el JWT con el servidor), NUNCA `supabase.auth.getSession()` (solo lee la cookie local, no valida).

### Flujo de autenticación

```
[/login/page.tsx]          → createBrowserClient → supabase.auth.signInWithPassword()
                             → Supabase escribe cookie de sesión en el browser
[dashboard/layout.tsx]     → createServerClient → supabase.auth.getUser()
                             → Si no autenticado → redirect("/login")
                             → Si rol === "recepcion" → redirect("/login")
                             → Fetch paralelo: profesionales + admin_users + clinicas (branding)
[Server Actions]           → createServerClient → supabase.auth.getUser()
                             → Toda operación protegida con requireAuth() interno
```

### Tablas de Supabase

#### Tablas de identidad y configuración

| Tabla | Descripción | Columnas clave | RLS |
|-------|-------------|---------------|-----|
| `auth.users` | Usuarios de Supabase Auth (gestionado por Supabase) | `id` (uuid) | N/A |
| `admin_users` | Vincula auth.uid con clínica y rol administrativo | `auth_id` → `auth.users.id`, `id_clinica` → `clinicas.id`, `rol` | Sí |
| `profesionales` | Datos del profesional clínico | `id`, `auth_id` → `auth.users.id`, `nombre`, `apellidos`, `especialidad` ("Kinesiología"\|"Fonoaudiología"\|"Masoterapia"), `rol` ("profesional"\|"admin"\|"recepcion") | Sí |
| `clinicas` | Configuración de la clínica (branding, nombre) | `id`, `nombre`, `config` (jsonb con `config.branding`) | Sí |
| `pacientes` | Ficha de identificación del paciente (M1) | `id`, `nombre`, `apellido_paterno`, `apellido_materno`, `rut`, `fecha_nacimiento`, `id_clinica`, `updated_at` — todos nullable excepto `id` | Sí |

#### Tablas FCE (Ficha Clínica Electrónica)

| Tabla | Descripción | `id_clinica` | Columnas clave |
|-------|-------------|:------------:|----------------|
| `fce_encuentros` | Sesión clínica (check-in o walk-in) | ✅ | `id`, `id_paciente`, `id_clinica`, `id_profesional`, `id_cita`, `especialidad`, `modalidad`, `status` ("planificado"\|"en_progreso"\|"finalizado"), `started_at`, `ended_at` |
| `fce_anamnesis` | Historia clínica del paciente (M2) — 1 por paciente | ✅ | `id`, `id_paciente`, `id_clinica`, `motivo_consulta`, `antecedentes_medicos` (jsonb), `antecedentes_quirurgicos` (jsonb), `farmacologia` (jsonb), `alergias` (jsonb), `red_flags` (jsonb), `habitos` (jsonb), `created_by` → `profesionales.id`, `updated_at` |
| `fce_signos_vitales` | Registro de signos vitales (M2) — N por paciente | ❌ | `id`, `id_paciente`, `id_encuentro` (nullable), `presion_arterial`, `frecuencia_cardiaca`, `spo2`, `temperatura`, `frecuencia_respiratoria`, `recorded_by` → `profesionales.id`, `recorded_at` |
| `fce_evaluaciones` | Evaluación clínica por especialidad/sub-área (M3) | ❌ | `id`, `id_paciente`, `id_encuentro` (nullable), `especialidad`, `sub_area`, `data` (jsonb), `contraindicaciones_certificadas` (bool), `created_by` → `profesionales.id`, `created_at` |
| `fce_notas_soap` | Notas de evolución SOAP + CIF (M4) — N por paciente | ❌ | `id`, `id_encuentro`, `id_paciente`, `subjetivo`, `objetivo`, `analisis_cif` (jsonb), `plan`, `intervenciones` (jsonb), `tareas_domiciliarias`, `proxima_sesion`, `firmado` (bool), `firmado_at`, `firmado_por` → `profesionales.id`, `created_at` |
| `fce_consentimientos` | Consentimientos informados con firma canvas (M5) | ✅ | `id`, `id_paciente`, `id_clinica`, `tipo` ("general"\|"menores"\|"teleconsulta"), `version` (int), `contenido` (text), `firma_paciente` (jsonb: `{data_url, timestamp}`), `firma_profesional` (jsonb: `{id_profesional, timestamp, hash}`), `firmado` (bool), `firmado_at`, `created_by` → `auth.users.id`, `created_at` |

#### Tablas de auditoría y agenda

| Tabla | Descripción | Columnas clave |
|-------|-------------|----------------|
| `logs_auditoria` | Registro append-only de todas las operaciones de escritura | `id`, `actor_id` → `auth.users.id`, `actor_tipo` ("profesional"\|"admin"\|"sistema"), `accion` (read\|create\|update\|sign\|exportar_ficha), `tabla_afectada`, `registro_id`, `id_clinica` (nullable), `id_paciente` → `pacientes.id` (nullable, índice), `created_at` |
| `vista_pacientes_clinicos` | Vista: pacientes con datos de última atención | `id_clinica`, `ultima_atencion`, etc. — filtrar siempre por `id_clinica` |
| `vista_agenda_diaria` | Vista: citas del día con datos de paciente y profesional | `id_cita`, `estado`, `fecha`, `hora_inicio`, `hora_fin`, `id_paciente`, `paciente_nombre/apellido/rut`, `id_profesional`, `profesional_nombre/especialidad`, `color_agenda`, `notas_cita`, `id_encuentro`, `encuentro_status`, `id_clinica` |

### Flujo de datos por Server Action

#### `patients.ts` — CRUD pacientes y helpers de contexto

| Función | Tablas leídas | Tablas escritas | Notas |
|---------|--------------|----------------|-------|
| `requireAuth()` | `auth.users` | — | Llama `getUser()`, redirect si falla |
| `getIdClinica(supabase, userId)` | `admin_users` | — | `.eq("auth_id", userId).single()` — null = hard-fail en acciones que requieren id_clinica |
| `getProfesionalId(supabase, authId)` | `profesionales` | — | `.eq("auth_id", authId).maybeSingle()` — null = error en acciones que requieren FK profesional |
| `getUserContext(supabase, userId)` | `admin_users` + `profesionales` | — | Fetch en paralelo. Normaliza especialidad (quita tildes). Prioridad rol: profesionales > admin_users > "profesional" |
| `getPatients()` | `admin_users`, `vista_pacientes_clinicos` | — | Filtra por `id_clinica`, ordena por `ultima_atencion` desc |
| `getAgendaDiaria()` | `admin_users`, `profesionales`, `vista_agenda_diaria` | — | Filtra por clínica + fecha Santiago. Profesional clínico ve solo su agenda |
| `getPatientById(id)` | `pacientes` | `logs_auditoria` | Audit: accion="read" |
| `createPatient(formData)` | `admin_users` | `pacientes`, `logs_auditoria` | Valida Zod, formatea RUT, inserta con `id_clinica`. Error 23505 = RUT duplicado |
| `updatePatient(id, formData)` | — | `pacientes`, `logs_auditoria` | Actualiza `updated_at`, formatea RUT |

#### `anamnesis.ts` — M2: anamnesis y signos vitales

| Función | Tablas leídas | Tablas escritas | Notas |
|---------|--------------|----------------|-------|
| `getAnamnesis(patientId)` | `fce_anamnesis` | — | `.maybeSingle()` — puede retornar null |
| `upsertAnamnesis(patientId, formData)` | `fce_anamnesis`, `admin_users`, `profesionales` | `fce_anamnesis`, `logs_auditoria` | Busca existente → UPDATE o INSERT. INSERT agrega `created_by` + `id_clinica` |
| `getLatestVitalSigns(patientId)` | `fce_signos_vitales` | — | Último registro por `recorded_at` desc |
| `saveVitalSigns(patientId, formData)` | `profesionales` | `fce_signos_vitales`, `logs_auditoria` | `id_encuentro: null` — signos sin encuentro activo en M2 |

#### `evaluacion.ts` — M3: evaluaciones por especialidad

| Función | Tablas leídas | Tablas escritas | Notas |
|---------|--------------|----------------|-------|
| `getEvaluaciones(patientId)` | `fce_evaluaciones` | — | Todas las evaluaciones del paciente, desc |
| `upsertEvaluacion(patientId, especialidad, subArea, data)` | `fce_evaluaciones`, `profesionales` | `fce_evaluaciones`, `logs_auditoria` | Upsert por `(id_paciente, especialidad, sub_area)`. `id_clinica` ausente (tabla no la tiene). `data` es jsonb libre |

#### `soap.ts` — M4: notas SOAP + encuentros

| Función | Tablas leídas | Tablas escritas | Notas |
|---------|--------------|----------------|-------|
| `getSoapNotes(patientId)` | `fce_notas_soap` | — | Todas las notas, desc por `created_at` |
| `upsertSoapNote(patientId, formData, noteId?)` | `profesionales`, `admin_users`, `fce_encuentros`, `fce_notas_soap` | `fce_encuentros`, `fce_notas_soap`, `logs_auditoria` | Si `noteId`: UPDATE (si no firmado). Si no: llama `getOrCreateEncounter` |
| `signSoapNote(noteId, patientId)` | `profesionales`, `fce_notas_soap` | `fce_notas_soap`, `fce_encuentros`, `logs_auditoria` | `firmado=true`, `firmado_por=profesionales.id`. Cambia `fce_encuentros.status` a "finalizado" |
| `getOrCreateEncounter(...)` | `fce_encuentros` | `fce_encuentros` | 1) Busca encuentro "planificado" con `id_cita` de hoy en Santiago. 2) Si no, crea walk-in "en_progreso" |

**Lógica de encuentros:**
- Check-in por agenda → encuentra `fce_encuentros.status="planificado"` con `id_cita` not null, lo transiciona a `"en_progreso"`.
- Walk-in (sin agenda) → inserta nuevo encuentro `status="en_progreso"`, `id_cita=null`.
- Al firmar SOAP → el encuentro pasa a `status="finalizado"`.

#### `consentimiento.ts` — M5: consentimientos + firma canvas

| Función | Tablas leídas | Tablas escritas | Notas |
|---------|--------------|----------------|-------|
| `getConsentimientos(patientId)` | `fce_consentimientos` | — | Todos los consentimientos, desc |
| `createConsentimiento(patientId, formData)` | `fce_consentimientos`, `admin_users`, `profesionales` | `fce_consentimientos`, `logs_auditoria` | Auto-versiona: consulta la versión más alta del mismo `tipo` → `nextVersion = max + 1` |
| `signConsentimiento(consentId, patientId, firmaDataUrl)` | `profesionales` | `fce_consentimientos`, `logs_auditoria` | Valida `data:image/`. Escribe `firma_paciente` + `firma_profesional` (jsonb). Solo si `firmado = false` |

#### `auditoria.ts` — M6: solo admin

| Función | Tablas leídas | Tablas escritas | Notas |
|---------|--------------|----------------|-------|
| `getAuditLogs(filter)` | `admin_users`, `logs_auditoria` | — | `requireAdmin()`: verifica `admin_users.rol === "admin"` o redirect. Máx 200 registros. Filtros: `id_paciente`, `accion`, `desde/hasta` |

#### `timeline.ts` — timeline clínico unificado

Fetch en paralelo de 5 tablas: `fce_notas_soap`, `fce_evaluaciones`, `fce_signos_vitales`, `fce_consentimientos`, `fce_anamnesis`. Luego batch lookup de nombres en `profesionales` por los IDs de autor encontrados. Construye `TimelineEntry[]` + `PatientSummary`.

#### `exportar-pdf.ts` — datos completos para PDF

Fetch en paralelo de: `pacientes`, `admin_users`, `fce_anamnesis`, `fce_signos_vitales`, `fce_evaluaciones` (últimas 5), `fce_notas_soap` (últimas 3), `fce_consentimientos`, `clinicas` (branding). Registra `accion="exportar_ficha"` en `logs_auditoria`.

### Helpers de contexto reutilizables (en `patients.ts`)

```typescript
// Obtener id_clinica del usuario autenticado
export async function getIdClinica(supabase, userId): Promise<string | null>
// → admin_users WHERE auth_id = userId

// Obtener profesionales.id del usuario autenticado
export async function getProfesionalId(supabase, authId): Promise<string | null>
// → profesionales WHERE auth_id = authId

// Contexto completo: id_clinica + rol + id_profesional + especialidad
export async function getUserContext(supabase, userId): Promise<UserContext | null>
// → admin_users + profesionales en paralelo
```

### Convenciones DB — FUENTE DE VERDAD (no cambiar sin verificar schema real)

#### Tabla `pacientes`
- Columna nombre: `nombre` (singular, NO `nombres`)
- Columna identificación: `rut` (NO `run`)
- Todos los campos son `nullable` — usar `?? "Sin registro"` en display

#### Tabla `profesionales`
- Columna nombre: `nombre` (singular, NO `nombres`)
- Columna apellidos: `apellidos`
- Columna especialidad: guarda con tilde y mayúscula ("Kinesiología") — normalizar a lowercase/sin-tilde al leer

#### Foreign keys — siempre en español con prefijo `id_`
```
id_paciente      (NO patient_id)
id_encuentro     (NO encounter_id)
id_profesional   (NO practitioner_id)
id_clinica       (NO clinic_id)
```

#### Tabla `logs_auditoria` — campos exactos
```
actor_id         (NO user_id)
actor_tipo       "profesional" | "admin" | "sistema"
accion           (NO action)
tabla_afectada   (NO resource_type)
registro_id      (NO resource_id)
id_paciente      uuid nullable — FK a pacientes.id (índice: idx_auditoria_id_paciente)
id_clinica       uuid nullable
```

#### Tablas FCE — columna `id_clinica`
```
CON id_clinica:    fce_anamnesis, fce_encuentros, fce_consentimientos
SIN id_clinica:    fce_evaluaciones, fce_signos_vitales, fce_notas_soap
```
NO agregar `id_clinica` a tablas que no la tienen — provoca error de columna inexistente.

#### Schema `fce_notas_soap` (columnas exactas)
```
id, id_encuentro, id_paciente,
subjetivo, objetivo, analisis_cif, plan,
intervenciones, tareas_domiciliarias, proxima_sesion,
firmado, firmado_at, firmado_por, created_at
```
NO tiene: `created_by`, `updated_at`, `id_clinica`.
El autor queda en `firmado_por` al firmar. Notas inmutables una vez firmadas.

#### Schema `fce_evaluaciones` (columnas exactas)
```
id, id_encuentro, id_paciente, especialidad, sub_area,
data, contraindicaciones_certificadas, created_by, created_at
```
NO tiene: `id_clinica`.

#### RLS — solo las tablas CON `id_clinica` la requieren en INSERT
Obtener con `getIdClinica(supabase, user.id)` desde `patients.ts`.
Si retorna null → hard-fail con mensaje al usuario, no insertar.

#### `admin_users` — lookup de id_clinica
```typescript
// Patrón canónico para obtener id_clinica del usuario autenticado:
const { data } = await supabase
  .from("admin_users")
  .select("id_clinica")
  .eq("auth_id", userId)
  .single();
```

#### `fce_consentimientos` — RLS policies
```sql
-- SELECT: cualquier usuario autenticado puede leer
-- INSERT: cualquier usuario autenticado puede crear
-- UPDATE: solo el creador puede actualizar (y solo si firmado = false)
USING (firmado = false AND created_by = auth.uid())
```

---

## Patrones de código consolidados

### Campos nullable en Patient
Todos los campos del tipo `Patient` son `string | null`. Patrón de display:
```typescript
patient.nombre ?? "Sin registro"
patient.rut ?? "—"
patient.prevision?.tipo ?? "Sin registro"
patient.direccion?.region ?? "Sin registro"

// fullName null-safe
[patient.nombre, patient.apellido_paterno, patient.apellido_materno]
  .filter(Boolean).join(" ")
```

### calculateAge — acepta null
```typescript
// src/lib/utils.ts
calculateAge(fecha: Date | string | null | undefined): number | null
// Display:
const age = calculateAge(patient.fecha_nacimiento);
age !== null ? `${age} años` : "Sin registro"
```

### formatRut — acepta null
```typescript
// src/lib/run-validator.ts — exports actuales:
cleanRut, validateRut, formatRut
// (aliases: cleanRun, validateRun, formatRun para compatibilidad)
formatRut(null)  // → "—"
```

### logAudit — patrón canónico en server actions
```typescript
async function logAudit(
  supabase: any, userId: string,
  accion: string, tablaAfectada: string, registroId: string,
  idClinica?: string | null, idPaciente?: string | null
) {
  try {
    await supabase.from("logs_auditoria").insert({
      actor_id: userId,
      actor_tipo: "profesional",
      accion,
      tabla_afectada: tablaAfectada,
      registro_id: registroId,
      ...(idClinica ? { id_clinica: idClinica } : {}),
      ...(idPaciente ? { id_paciente: idPaciente } : {}),
    });
  } catch { /* no bloquea el flujo principal */ }
}
```

### requireAuth — patrón en cada server action
```typescript
async function requireAuth() {
  const supabase = await createClient();  // server client con cookies
  const { data: { user }, error } = await supabase.auth.getUser(); // NO getSession()
  if (error || !user) redirect("/login");
  return { supabase, user };
}
```

### ActionResult — tipo de respuesta estándar
```typescript
export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };
```

### Fetch paralelo con Promise.all
Siempre usar `Promise.all` para queries independientes en Server Actions:
```typescript
const [idClinica, profesionalId] = await Promise.all([
  getIdClinica(supabase, user.id),
  getProfesionalId(supabase, user.id),
]);
```

### Zona horaria Santiago
Siempre usar `America/Santiago` para fechas comparadas con la DB:
```typescript
const hoy = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Santiago" });
// → "YYYY-MM-DD"
```

### Especialidad — normalización
La DB guarda "Kinesiología" (con tilde y mayúscula). El type `Especialidad` espera "kinesiologia":
```typescript
const rawEsp = profData?.especialidad as string;
const especialidad = rawEsp.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
// "Kinesiología" → "kinesiologia"
```

---

## Control de acceso (src/lib/permissions.ts)

```typescript
// Roles: "profesional" | "recepcion" | "admin"
// Especialidades: "kinesiologia" | "fonoaudiologia" | "masoterapia"

canWrite(ctx, moduloEspecialidad)  // admin: cualquier módulo; profesional: solo su esp; recepcion: nunca
canAccessFCE(ctx)                  // recepcion = false; resto = true
canSignSOAP(ctx, moduloEspecialidad)  // solo profesional de esa especialidad
```

El guard de acceso se aplica en `dashboard/layout.tsx`: si `!canAccessFCE(userCtx)` → redirect("/login").

---

## Migraciones (supabase/migrations/)
Las tablas YA EXISTEN en producción. **NUNCA usar `apply_migration` ni DDL sin coordinación explícita.**

| Archivo | Qué hace |
|---------|---------|
| `20260411_create_fce_consentimientos.sql` | Crea `fce_consentimientos` con RLS. 3 policies: SELECT/INSERT para auth, UPDATE solo al creador si no firmado |
| `20260411_add_id_paciente_auditoria.sql` | Agrega columna `id_paciente uuid` a `logs_auditoria` con FK e índice |

---

## Comandos
```bash
npm run dev          # Desarrollo local
npm run build        # Build producción (0 errores obligatorio)
npm run lint         # Linting
```

## Convención de commits
```
feat: descripción breve en español
fix: corrección de X
refactor: reorganización de Y
```

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

## Stack
- Next.js 16 (App Router) · TypeScript 5 strict · Tailwind CSS v4
- Supabase (Auth + PostgreSQL + RLS + Storage)
- Vercel para deploy
- lucide-react · zod · react-hook-form · motion/react · date-fns

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

## Estructura del proyecto
```
src/
├── app/                          → Rutas (App Router)
│   ├── login/                    → Auth con Supabase
│   └── dashboard/                → App principal (auth guard)
│       └── pacientes/[id]/       → Ficha del paciente (M1–M6)
├── components/
│   ├── ui/                       → Atómicos (Button, Input, Card, Badge...)
│   ├── layout/                   → Sidebar, TopBar, PatientHeader
│   ├── modules/                  → Módulos clínicos (M1–M6)
│   └── shared/                   → BodyMap, ScaleSlider, etc.
├── lib/
│   ├── supabase/                 → Clients (browser + server) + types
│   ├── constants.ts              → Datos clínica
│   ├── utils.ts                  → cn() + calculateAge + formatRut
│   ├── run-validator.ts          → Validación RUT chileno (módulo 11)
│   ├── validations.ts            → Schemas Zod
│   └── audit.ts                  → Helper createAuditEntry()
├── hooks/                        → useAuth, usePatient, useAudit
├── types/                        → Patient, Encounter, SOAP, CIF, Consent...
docs/                             → Documentación de referencia (no se deploya)
supabase/migrations/              → SQL migraciones
```

## Módulos clínicos
- **M1** — Identificación paciente (Decreto 41 MINSAL) ✅ completo
- **M2** — Anamnesis + Red Flags + Signos Vitales ✅ completo
- **M3** — Evaluación por especialidad (kine/fono/maso) ✅ completo
- **M4** — Evolución SOAP + CIF Mapper ✅ completo
- **M5** — Consentimiento informado (firma canvas) ✅ completo
- **M6** — Auditoría (append-only, solo admin)

## Convenciones DB — FUENTE DE VERDAD (no cambiar sin verificar schema real)

### Tabla `pacientes`
- Columna nombre: `nombre` (singular, NO `nombres`)
- Columna identificación: `rut` (NO `run`)
- Todos los campos son `nullable` — usar `?? "Sin registro"` en display

### Tabla `profesionales`
- Columna nombre: `nombre` (singular, NO `nombres`)
- Columna apellidos: `apellidos`

### Foreign keys — siempre en español con prefijo `id_`
```
id_paciente      (NO patient_id)
id_encuentro     (NO encounter_id)
id_profesional   (NO practitioner_id)
id_clinica       (NO clinic_id)
```

### Tabla `logs_auditoria` — campos exactos
```
actor_id         (NO user_id)
actor_tipo       "profesional" | "admin" | "sistema"
accion           (NO action)
tabla_afectada   (NO resource_type)
registro_id      (NO resource_id)
```

### Tablas FCE — columna `id_clinica`
```
CON id_clinica:    fce_anamnesis, fce_encuentros, fce_consentimientos
SIN id_clinica:    fce_evaluaciones, fce_signos_vitales, fce_notas_soap
```

### Schema `fce_notas_soap` (columnas exactas)
```
id, id_encuentro, id_paciente,
subjetivo, objetivo, analisis_cif, plan,
intervenciones, tareas_domiciliarias, proxima_sesion,
firmado, firmado_at, firmado_por, created_at
```
NO tiene: `created_by`, `id_clinica`. El autor queda registrado en `firmado_por` al firmar.

### Schema `fce_evaluaciones` (columnas exactas)
```
id, id_encuentro, id_paciente, especialidad, sub_area,
data, contraindicaciones_certificadas, created_by, created_at
```
NO tiene: `id_clinica`.

### RLS — solo las tablas CON `id_clinica` la requieren en INSERT
Obtener con `getIdClinica(supabase, user.id)` desde `patients.ts`.
Si retorna null → hard-fail con mensaje al usuario, no insertar.
NO agregar `id_clinica` a tablas que no la tienen — provoca error de columna inexistente.

### `admin_users` — lookup de id_clinica
```typescript
// Patrón canónico para obtener id_clinica del usuario autenticado:
const { data } = await supabase
  .from("admin_users")
  .select("id_clinica")
  .eq("auth_id", userId)
  .single();
```

## Patrones de código consolidados

### Campos nullable en Patient
Todos los campos del tipo `Patient` son `string | null`. Patrón de display:
```typescript
// Display seguro
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
  accion: string, tablaAfectada: string, registroId: string
) {
  try {
    await supabase.from("logs_auditoria").insert({
      actor_id: userId,
      actor_tipo: "profesional",
      accion,
      tabla_afectada: tablaAfectada,
      registro_id: registroId,
    });
  } catch { /* no bloquea el flujo */ }
}
```

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

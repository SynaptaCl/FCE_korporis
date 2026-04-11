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
│   ├── utils.ts                  → cn() = clsx + tailwind-merge
│   ├── run-validator.ts          → Validación RUN chileno (módulo 11)
│   ├── validations.ts            → Schemas Zod
│   └── audit.ts                  → Helper audit log
├── hooks/                        → useAuth, usePatient, useAudit
├── types/                        → Patient, Encounter, SOAP, CIF, Consent...
docs/                             → Documentación de referencia (no se deploya)
supabase/migrations/              → SQL migraciones
```

## Módulos clínicos
- **M1** — Identificación paciente (Decreto 41 MINSAL)
- **M2** — Anamnesis + Red Flags + Signos Vitales
- **M3** — Evaluación por especialidad (kine/fono/maso)
- **M4** — Evolución SOAP + CIF Mapper
- **M5** — Consentimiento informado (firma canvas)
- **M6** — Auditoría (append-only, solo admin)

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

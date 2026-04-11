# CLAUDE.md — Korporis Centro de Salud
> Proyecto: Sitio web de marketing + integración con demo SaaS Synapta
> Stack: Next.js 16 · TypeScript 5 · Tailwind CSS v4 · Vercel
> Última actualización: abril 2026 — estructura src/, `<img>` nativo, paths `/korporis/imagenes/`

---

## IDENTIDAD DEL PROYECTO

**Cliente:** Korporis Centro de Salud — kinesiología, fonoaudiología y masoterapia
**Ubicación:** Juan Sebastián Bach 208, San Joaquín, Santiago
**WhatsApp:** +56 9 3727 7066
**Sitio actual:** korporis.cl (Wix — reemplazo total)
**Dominio destino:** korporis.cl (mismo dominio, nuevo stack)
**Diferenciador:** Único centro de la zona sur que combina kine + fono + maso con atención presencial y a domicilio

---

## CONTEXTO DE NEGOCIO

Korporis es el **primer cliente real** de Synapta HealthTech. El proyecto tiene dos entregables:

1. **Sitio web de marketing** (este repo) — landing + páginas de servicio + SEO local
2. **Demo del SaaS** — chat con IA en `synapta.cl/demo/korporis` (ya configurado en Supabase, no se toca en este repo)

El sitio web es el layer de **generación de demanda**. El SaaS de Synapta es el layer de **conversión y retención**. El sitio web optimizado genera tráfico orgánico → más pacientes descubren Korporis → más citas se agendan → más recordatorios envía Synapta → mayor valor del SaaS.

---

## STACK TECNOLÓGICO

| Capa | Tecnología | Notas |
|---|---|---|
| Framework | Next.js 16 (App Router) | `reactCompiler: true` |
| Lenguaje | TypeScript 5 strict | Sin `any` implícitos |
| Estilos | Tailwind CSS v4 | `@import "tailwindcss"` · `@theme {}` · `@utility {}` |
| Fuentes | Outfit (headings) + Plus Jakarta Sans (body) | `next/font/google` |
| Animaciones | `motion/react` | Nunca `framer-motion` |
| Utilidades | `clsx` + `tailwind-merge` → `cn()` | `lib/utils.ts` |
| Deploy | Vercel | Rama `main` → producción |
| Imágenes | `next/image` siempre | Prohibido `<img>` nativo |

---

## PREFIJO DE TOKENS CSS

**Prefijo: `kp-`** (Korporis)

Todas las clases de color del design system usan este prefijo:
- `bg-kp-primary`, `text-kp-accent`, `border-kp-border`
- **Nunca** usar colores de Tailwind estándar (`bg-teal-500`) — siempre tokens del tema

---

## PALETA DE COLORES

```
kp-primary       #006B6B   Teal oscuro — headings, fondos oscuros
kp-primary-deep  #004545   Muy oscuro — fondo Hero
kp-accent        #00B0A8   Verde-teal vibrante — CTAs, botones, iconos
kp-accent-md     #33C4BE   Teal más brillante — gradientes
kp-accent-lt     #D5F5F4   Fondo de badges
kp-accent-xs     #E6FAF9   Fondo ultra-claro
kp-secondary     #F5A623   Naranja/amarillo — acento secundario (infografías, CTAs alt)
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

> ⚠️ Los colores `kp-primary` y `kp-accent` son **aproximaciones** extraídas del material gráfico. Si el cliente envía HEX exactos, actualizar aquí y en `globals.css`.

---

## ESTRUCTURA DE RUTAS

```
/                              → Homepage (hero + servicios + por qué elegirnos + normas + CTA)
/kinesiologia                  → Página servicio Kinesiología (con 5 sub-especialidades y precios)
/fonoaudiologia                → Página servicio Fonoaudiología (con precios)
/masoterapia                   → Página servicio Masoterapia (precios pendientes)
/atencion-a-domicilio          → Página diferenciador domicilio
/preguntas-frecuentes          → FAQ
```

**URLs inmutables** — no cambiar slugs después del primer deploy.

---

## ESTRUCTURA DE DIRECTORIOS

```
src/
├── app/
│   ├── layout.tsx                    → Root layout + fonts + metadata template
│   ├── page.tsx                      → Homepage
│   ├── globals.css                   → @theme + @utility + todas las reglas
│   ├── robots.ts                     → Permitir indexación completa
│   ├── sitemap.ts                    → Todas las rutas con prioridades
│   ├── kinesiologia/page.tsx         → Página de servicio
│   ├── fonoaudiologia/page.tsx       → Página de servicio
│   ├── masoterapia/page.tsx          → Página de servicio
│   ├── atencion-a-domicilio/page.tsx → Diferenciador
│   └── preguntas-frecuentes/page.tsx → FAQ
├── components/
│   ├── ui/
│   │   ├── Button.tsx                → Polimórfico (link/button)
│   │   ├── Badge.tsx                 → SectionBadge con variantes
│   │   ├── Card.tsx                  → Card base con acento configurable
│   │   ├── AnimateIn.tsx             → Scroll reveal accesible
│   │   ├── FAQAccordion.tsx          → Accordion con ARIA
│   │   ├── WhatsAppWidget.tsx        → Floating button + tooltip
│   │   └── ScrollProgress.tsx        → Barra de progreso de scroll
│   └── sections/
│       ├── Navbar.tsx                → Nav fijo con scroll detection
│       ├── Hero.tsx                  → Hero con Ken Burns + imagen de fondo real
│       ├── TrustBar.tsx              → Stats editoriales: números enormes teal
│       ├── Services.tsx              → Card featured full-width (Kine) + 2-col grid
│       ├── WhyUs.tsx                 → 2 cols: intro sticky izq. + lista numerada
│       ├── Norms.tsx                 → Sección oscura: stats de normas de atención
│       ├── Locations.tsx             → Mapa + datos de la sede
│       ├── DomicilioCTA.tsx          → CTA de atención a domicilio (diferenciador)
│       ├── ServicePageTemplate.tsx   → Template reutilizable para páginas de servicio
│       └── Footer.tsx                → Footer con links, contacto, legal
└── lib/
    ├── constants.ts                  → WhatsApp, teléfonos, sedes, horarios
    ├── utils.ts                      → cn() = clsx + tailwind-merge
    ├── images.ts                     → Paths de imágenes centralizados (con /korporis/imagenes/)
    └── services-data.ts              → Data de servicios con tipos, precios, FAQ
public/
├── imagenes/                         → Fotos reales del cliente
└── og-image.jpg                      → 1200×630 para Open Graph
```

---

## DIRECCIÓN DE DISEÑO — Editorial Wellness

Adoptada en abril 2026. Todos los componentes nuevos deben seguir esta estética.

**Principios:**
- **Layouts asimétricos y anclados a la izquierda** — nada centrado por defecto (excepto secciones oscuras tipo Norms/DomicilioCTA).
- **Jerarquía tipográfica extrema** — H1 en `font-black` desde 3.25rem hasta 5.25rem. Contraste radical entre títulos y labels.
- **Imágenes con overlay, no cards de borde blanco** — en Services las cards son `<div>` con `<img>` de fondo + gradiente, no `<Card>`.
- **Stats como anclas visuales** — TrustBar y Norms muestran el número/monto grande primero (`text-5xl`/`text-6xl`), el label abajo en micro-label uppercase.
- **Listas numeradas editoriales** — WhyUs usa ordinales (01, 02...) en teal-border-md como decorativos, con dividers entre items.
- **`animate-blur-reveal`** — usar en lugar de `animate-slide-up` para entradas principales (Hero). Disponible en globals.css.
- **Sección oscura para contraste** — `section-dark` (= `kp-primary-deep`) en Norms y DomicilioCTA. Da ritmo oscuro-claro-oscuro a la página.
- **Micro-labels institucionales** — headers de columna en `text-[0.65rem] uppercase tracking-[0.12em] text-white/30` (o `text-ink-3` en fondo claro). Usar en Footer, Locations, y columnas de datos.
- **Ghost ordinals** — numerales 01–04 en `opacity-[0.035]` y `~8rem` como decoración editorial en Norms. No repetir en otras secciones oscuras.
- **Franjas teal de acento** — línea de 1–2px con `linear-gradient(90deg, transparent, #00B0A8, #33C4BE, #00B0A8, transparent)` en bordes de sección. Top en Norms y Footer; bottom en TrustBar.
- **Separadores `gap-px bg-white/[0.07–0.10]`** — para grids en fondos oscuros (TrustBar, Norms). Más limpio que `divide-x`.

**Paleta de fondos por sección (orden homepage):**
| Sección | Fondo |
|---|---|
| Hero | `kp-primary-deep` + imagen |
| TrustBar | `kp-primary-deep` (continuidad) |
| Services | `surface-0` (section-surface-alt) |
| WhyUs | `surface-1` (blanco) |
| Norms | `section-dark` = `kp-primary-deep` |
| DomicilioCTA | `section-teal-mesh` + imagen |
| Locations | `surface-1` (blanco) |
| Footer | `surface-dark` |

---

## LAS 12 REGLAS DE HIERRO

1. **Abstracción preventiva:** WhatsApp → `lib/constants.ts`, imágenes → `lib/images.ts`, servicios → `lib/services-data.ts`. Nada hardcodeado en componentes.
2. **`<img>` nativo (no `next/image`):** El proyecto usa `<img>` estándar. Cada `<img>` lleva `{/* eslint-disable-next-line @next/next/no-img-element */}` encima.
3. **Paths de imágenes con prefijo completo:** Todo path local debe comenzar con `/korporis/imagenes/` (el `basePath` no se agrega automáticamente con `<img>`). Las constantes en `lib/images.ts` ya incluyen el prefijo.
4. **`sizes` y `priority` NO aplican:** Son props exclusivos de `next/image`. No usarlos.
5. **`'use client'` mínimo:** Solo con `useState`, `useEffect`, event listeners. Todo lo demás es Server Component.
6. **Design system antes que componentes:** `globals.css` completo antes del primer componente.
7. **Orden de fases:** `globals.css → lib/ → ui/ → sections/ → pages`. No saltar.
8. **URLs inmutables:** Las rutas no cambian después del primer deploy.
9. **Metadata única:** Ninguna página tiene el mismo `<title>` que otra.
10. **JSON-LD desde constantes:** Datos en schemas siempre desde `lib/constants.ts`.
11. **Contenido médico no se inventa:** Precios, horarios, nombres → solo datos confirmados o placeholder `[PENDIENTE]`.
12. **E-E-A-T en servicios:** Disclaimer que no reemplaza consulta médica en cada página de servicio.

---

## DATOS CONFIRMADOS DEL CLIENTE

### Servicios y precios (✅ Confirmados)

| Servicio | En clínica | A domicilio |
|---|---|---|
| Kinesiología musculo-esquelética | $23.000 | $29.000 |
| Kinesiología neurológica | $23.000 | $29.000 |
| Kinesiología respiratoria | $30.000 | $36.000 |
| Kinesiología vestibular | $30.000 | $36.000 |
| Kinesiología piso pélvico | $30.000 | $36.000 |
| Fonoaudiología | $25.000 | $29.000 |
| Masoterapia (desde) | $20.000 | — |

### Normas de atención (✅ Confirmadas)

- Abono de confirmación: **$15.000** (se descuenta del valor total)
- Máximo atraso: **15 minutos**
- Reagendar: con **6 horas** de anticipación
- Cancelación con devolución: **48 horas** de anticipación
- Modalidad: presencial en clínica + a domicilio

### Horarios (✅ Confirmados)

| Día | Horario |
|---|---|
| Lunes a Jueves | 10:00–20:00 |
| Viernes | 10:00–19:00 |
| Sábado | 10:00–17:00 |
| Domingo | Cerrado |

### Datos pendientes (⚠️)

- Nombres del equipo profesional
- Colores HEX exactos (manual de marca o SVG del logo)
- Precios de masoterapia
- Comunas de cobertura a domicilio
- ¿Fonasa? ¿Isapre?
- Fotos reales de la clínica y del equipo
- URL de Facebook

---

## INTEGRACIÓN CON SYNAPTA SaaS

El demo del asistente de agenda ya está configurado en Supabase Product:

```
Clínica ID:      572be8d9-f764-4a07-8045-13808679c7e9
Slug:            korporis
URL demo:        https://synapta.cl/demo/korporis
Kinesiólogo ID:  90e38525-773f-4348-b641-06888143d26e
Fonoaudiólogo ID: f8275e6e-9b90-419a-b21f-a81191c1f6a3
Slots generados: 176 (2 semanas)
```

**En el sitio web de marketing**, el CTA principal debe linkear al demo:
```typescript
// En el Hero o cualquier CTA de agendamiento:
<Button href="https://synapta.cl/demo/korporis" variant="primary">
  Agendar hora online
</Button>
```

---

## SEO LOCAL — KEYWORDS OBJETIVO

| Prioridad | Keyword | Intención |
|---|---|---|
| 🔴 Alta | kinesiología san joaquín | Servicio principal + comuna |
| 🔴 Alta | kinesiólogo san joaquín | Profesional + comuna |
| 🔴 Alta | kinesiología a domicilio santiago sur | Diferenciador |
| 🟠 Media | fonoaudiología san joaquín | Servicio secundario |
| 🟠 Media | fonoaudiólogo a domicilio santiago | Servicio + domicilio |
| 🟠 Media | kinesiología piso pélvico santiago | Sub-especialidad |
| 🟡 Baja | masoterapia san joaquín | Servicio terciario |
| 🟡 Baja | korporis | Branded |

---

## PROTOCOLO DE TRABAJO

### Antes de cualquier modificación
```bash
# 1. Diagnóstico — leer archivos existentes primero
cat [archivo-que-vas-a-modificar]

# 2. Verificar estado
git status && git log --oneline -3

# 3. Después de cada cambio
npm run build  # 0 errores obligatorio
```

### Convenciones de commits
```
feat: descripción breve en español
fix: corrección de X
refactor: reorganización de Y
content: textos de página Z
seo: metadata + schemas de página W
```

### Antes de push
```bash
npm run lint && npm run build  # AMBOS deben pasar con 0 errores
git add -A
git commit -m "feat: descripción"
git push origin main
```

---

## CONTENIDO MÉDICO — REGLA ESTRICTA

**Nunca inventar** información médica. Todo el contenido de servicios de salud debe:
1. Ser verificable o genérico ("la kinesiología ayuda a rehabilitar lesiones musculares")
2. Incluir disclaimer: "Esta información es orientativa. Consulte con un profesional de salud."
3. No prometer resultados específicos
4. No mencionar precios sin confirmación del cliente
5. Usar terminología chilena estándar (kinesiólogo, no fisioterapeuta)
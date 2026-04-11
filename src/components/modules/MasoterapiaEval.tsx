"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { ShieldAlert, Save, AlertOctagon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { Input } from "@/components/ui/Input";
import { AlertBanner } from "@/components/ui/AlertBanner";
import { BodyMap } from "@/components/shared/BodyMap";
import { upsertEvaluacion } from "@/app/actions/evaluacion";
import type { Evaluation } from "@/types";
import { cn } from "@/lib/utils";

// ── Contraindicaciones hard-stop ───────────────────────────────────────────

interface ContraItem {
  key: keyof MasoContraState;
  label: string;
  description: string;
}

const CONTRA_ITEMS: ContraItem[] = [
  { key: "tvp", label: "TVP / Tromboembolia", description: "Trombosis venosa profunda activa" },
  { key: "oncologico_activo", label: "Oncológico activo", description: "Tratamiento activo de cáncer en el área a tratar" },
  { key: "infeccion_cutanea", label: "Infección cutánea", description: "Infección o lesión activa en piel en la zona de trabajo" },
  { key: "fragilidad_capilar", label: "Fragilidad capilar", description: "Historial de hematomas espontáneos o fragilidad vascular" },
  { key: "fiebre_aguda", label: "Fiebre aguda", description: "Temperatura corporal >37.5°C al momento de la sesión" },
];

type MasoContraState = {
  tvp: boolean;
  oncologico_activo: boolean;
  infeccion_cutanea: boolean;
  fragilidad_capilar: boolean;
  fiebre_aguda: boolean;
};

// ── Sub-áreas ──────────────────────────────────────────────────────────────

const SUB_AREAS = [
  { key: "tisular", label: "Evaluación Tisular" },
  { key: "post_cirugia", label: "Post-Cirugía" },
] as const;

type MasoSubAreaKey = (typeof SUB_AREAS)[number]["key"];

interface MasoterapiaEvalProps {
  patientId: string;
  evaluaciones: Evaluation[];
  readOnly?: boolean;
}

function getSubAreaData(evals: Evaluation[], subArea: string): Record<string, unknown> {
  return (evals.find((e) => e.sub_area === subArea)?.data ?? {}) as Record<string, unknown>;
}

// ── Componente principal ───────────────────────────────────────────────────

export function MasoterapiaEval({ patientId, evaluaciones, readOnly = false }: MasoterapiaEvalProps) {
  const [contraState, setContraState] = useState<MasoContraState>(() => {
    const saved = getSubAreaData(evaluaciones, "contraindicaciones");
    return {
      tvp: (saved.tvp as boolean) ?? false,
      oncologico_activo: (saved.oncologico_activo as boolean) ?? false,
      infeccion_cutanea: (saved.infeccion_cutanea as boolean) ?? false,
      fragilidad_capilar: (saved.fragilidad_capilar as boolean) ?? false,
      fiebre_aguda: (saved.fiebre_aguda as boolean) ?? false,
    };
  });
  const [contraError, setContraError] = useState<string | null>(null);
  const [contraSaved, setContraSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<MasoSubAreaKey>("tisular");

  const activeContras = CONTRA_ITEMS.filter((c) => contraState[c.key]);
  const isBlocked = activeContras.length > 0;

  async function saveContra() {
    setContraError(null);
    setContraSaved(false);
    const result = await upsertEvaluacion(
      patientId, "masoterapia", "contraindicaciones",
      { ...contraState, certificado_at: new Date().toISOString() }
    );
    if (!result.success) { setContraError(result.error); return; }
    setContraSaved(true);
  }

  function toggleContra(key: keyof MasoContraState) {
    if (readOnly) return;
    setContraState((prev) => ({ ...prev, [key]: !prev[key] }));
    setContraSaved(false);
  }

  return (
    <div className="space-y-6">
      {readOnly && (
        <AlertBanner variant="warning" title="Modo lectura">
          Solo profesionales de Masoterapia pueden editar esta evaluación.
        </AlertBanner>
      )}

      {/* ── Hard-stop: Contraindicaciones ── */}
      <div className="rounded-xl border-2 border-kp-border bg-surface-0 p-4 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-kp-danger" />
          <h4 className="text-sm font-bold text-ink-1 uppercase tracking-wide">
            Contraindicaciones — Verificación OBLIGATORIA
          </h4>
        </div>

        {isBlocked && (
          <div className="flex items-start gap-3 bg-kp-danger-lt border border-kp-danger/30 rounded-lg px-4 py-3">
            <AlertOctagon className="w-5 h-5 text-kp-danger shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-red-900">
                ⛔ CONTRAINDICACIÓN ACTIVA — No proceder con masoterapia
              </p>
              <ul className="mt-1 list-disc list-inside space-y-0.5">
                {activeContras.map((c) => (
                  <li key={c.key} className="text-sm text-red-800">{c.label}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {CONTRA_ITEMS.map((item) => {
            const active = contraState[item.key];
            return (
              <button
                key={item.key}
                type="button"
                disabled={readOnly}
                onClick={() => toggleContra(item.key)}
                aria-pressed={active}
                className={cn(
                  "flex items-start gap-3 rounded-lg border px-4 py-3 text-left transition-all cursor-pointer disabled:cursor-default",
                  active
                    ? "bg-kp-danger-lt border-kp-danger/40 text-red-900"
                    : "bg-surface-1 border-kp-border text-ink-2 hover:border-kp-border-md"
                )}
              >
                <span className={cn(
                  "mt-0.5 w-4 h-4 rounded shrink-0 border-2 flex items-center justify-center transition-colors",
                  active ? "bg-kp-danger border-kp-danger" : "border-kp-border-md"
                )}>
                  {active && (
                    <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4l2.5 2.5L9 1" stroke="currentColor" strokeWidth="1.8"
                        strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
                <div>
                  <p className="text-sm font-semibold">{item.label}</p>
                  <p className="text-xs text-ink-3 mt-0.5">{item.description}</p>
                </div>
              </button>
            );
          })}
        </div>

        {!isBlocked && !readOnly && (
          <p className="text-xs text-kp-success font-medium flex items-center gap-1.5">
            ✓ Sin contraindicaciones activas — puede proceder con masoterapia
          </p>
        )}

        {contraError && <AlertBanner variant="danger">{contraError}</AlertBanner>}

        {!readOnly && (
          <div className="flex items-center justify-end gap-3">
            {contraSaved && <span className="text-sm text-kp-success font-medium">✓ Verificación guardada</span>}
            <Button type="button" variant="secondary" size="sm" onClick={saveContra}>
              <Save className="w-3.5 h-3.5 mr-1.5" />
              Guardar verificación
            </Button>
          </div>
        )}
      </div>

      {/* ── Evaluación (bloqueada si hay contraindicaciones) ── */}
      {isBlocked ? (
        <div className="rounded-xl border border-kp-danger/30 bg-kp-danger-lt px-6 py-8 text-center">
          <AlertOctagon className="w-10 h-10 text-kp-danger mx-auto mb-3" />
          <p className="text-sm font-semibold text-red-900">
            Evaluación bloqueada por contraindicación activa.
          </p>
          <p className="text-xs text-red-700 mt-1">
            Resuelve las contraindicaciones antes de continuar con la evaluación.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-1.5">
            {SUB_AREAS.map((area) => {
              const hasData = evaluaciones.some((e) => e.sub_area === area.key);
              return (
                <button key={area.key} type="button" onClick={() => setActiveTab(area.key)}
                  className={
                    activeTab === area.key
                      ? "px-3 py-1.5 text-xs font-semibold rounded-lg bg-kp-accent text-white"
                      : hasData
                        ? "px-3 py-1.5 text-xs font-semibold rounded-lg bg-kp-accent-xs border border-kp-accent/30 text-kp-primary"
                        : "px-3 py-1.5 text-xs font-medium rounded-lg bg-surface-0 border border-kp-border text-ink-2 hover:border-kp-border-md"
                  }>
                  {area.label}
                  {hasData && activeTab !== area.key && (
                    <span className="ml-1 text-[0.55rem] font-bold text-kp-accent">●</span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="pt-2">
            {activeTab === "tisular" && (
              <TisularForm patientId={patientId}
                initialData={getSubAreaData(evaluaciones, "tisular")} readOnly={readOnly} />
            )}
            {activeTab === "post_cirugia" && (
              <PostCirugiaForm patientId={patientId}
                initialData={getSubAreaData(evaluaciones, "post_cirugia")} readOnly={readOnly} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-form helpers ───────────────────────────────────────────────────────

interface SubFormProps { patientId: string; initialData: Record<string, unknown>; readOnly: boolean; }

function SaveRow({ isSubmitting, readOnly, saved }: { isSubmitting: boolean; readOnly: boolean; saved: boolean }) {
  if (readOnly) return null;
  return (
    <div className="flex items-center justify-end gap-3 pt-4 border-t border-kp-border">
      {saved && <span className="text-sm text-kp-success font-medium">✓ Guardado</span>}
      <Button type="submit" size="sm" disabled={isSubmitting}>
        <Save className="w-3.5 h-3.5 mr-1.5" />
        {isSubmitting ? "Guardando…" : "Guardar evaluación"}
      </Button>
    </div>
  );
}

// ── EVALUACIÓN TISULAR ────────────────────────────────────────────────────

type TisularFormData = {
  zonas_tension: string[];
  nodulos_miofasciales: string;
  temperatura_tejido: string;
  movilidad_tejidos: string;
  observaciones: string;
};

function TisularForm({ patientId, initialData, readOnly }: SubFormProps) {
  const [saved, setSaved] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const d = initialData as Partial<TisularFormData>;

  const { register, control, handleSubmit, setValue, formState: { isSubmitting } } =
    useForm<TisularFormData>({
      defaultValues: {
        zonas_tension: (d.zonas_tension as string[]) ?? [],
        nodulos_miofasciales: (d.nodulos_miofasciales as string) ?? "",
        temperatura_tejido: (d.temperatura_tejido as string) ?? "",
        movilidad_tejidos: (d.movilidad_tejidos as string) ?? "",
        observaciones: (d.observaciones as string) ?? "",
      },
    });

  const zonasValue = useWatch({ control, name: "zonas_tension" });

  async function onSubmit(data: TisularFormData) {
    setServerError(null); setSaved(false);
    const result = await upsertEvaluacion(patientId, "masoterapia", "tisular", data as Record<string, unknown>);
    if (!result.success) { setServerError(result.error); return; }
    setSaved(true);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {serverError && <AlertBanner variant="danger">{serverError}</AlertBanner>}

      <BodyMap value={zonasValue} onChange={(z) => setValue("zonas_tension", z)}
        readOnly={readOnly} label="Zonas de tensión / puntos gatillo" />

      <Textarea label="Nódulos miofasciales" placeholder="Localización y características de puntos gatillo…"
        rows={2} readOnly={readOnly} {...register("nodulos_miofasciales")} />
      <Textarea label="Temperatura del tejido" placeholder="Normal, aumentada, disminuida, asimétrica…"
        rows={2} readOnly={readOnly} {...register("temperatura_tejido")} />
      <Textarea label="Movilidad de tejidos blandos" placeholder="Normal, restringida, adherente…"
        rows={2} readOnly={readOnly} {...register("movilidad_tejidos")} />
      <Textarea label="Observaciones" rows={3} readOnly={readOnly} {...register("observaciones")} />

      <SaveRow isSubmitting={isSubmitting} readOnly={readOnly} saved={saved} />
    </form>
  );
}

// ── POST-CIRUGÍA ──────────────────────────────────────────────────────────

type PostCirugiaFormData = {
  perimetria_edema: string;
  prueba_fovea: string;
  cicatriz_coloracion: string;
  cicatriz_adherencias: boolean;
  cicatriz_queloides: boolean;
  observaciones: string;
};

function PostCirugiaForm({ patientId, initialData, readOnly }: SubFormProps) {
  const [saved, setSaved] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const d = initialData as Partial<PostCirugiaFormData>;

  const { register, handleSubmit, formState: { isSubmitting } } =
    useForm<PostCirugiaFormData>({
      defaultValues: {
        perimetria_edema: (d.perimetria_edema as string) ?? "",
        prueba_fovea: (d.prueba_fovea as string) ?? "",
        cicatriz_coloracion: (d.cicatriz_coloracion as string) ?? "",
        cicatriz_adherencias: (d.cicatriz_adherencias as boolean) ?? false,
        cicatriz_queloides: (d.cicatriz_queloides as boolean) ?? false,
        observaciones: (d.observaciones as string) ?? "",
      },
    });

  async function onSubmit(data: PostCirugiaFormData) {
    setServerError(null); setSaved(false);
    const result = await upsertEvaluacion(patientId, "masoterapia", "post_cirugia", data as Record<string, unknown>);
    if (!result.success) { setServerError(result.error); return; }
    setSaved(true);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {serverError && <AlertBanner variant="danger">{serverError}</AlertBanner>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Perimetría de edema" placeholder="Ej: 38 cm (muslo a 10 cm desde rótula)"
          readOnly={readOnly} {...register("perimetria_edema")} />
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-ink-1">Prueba de fóvea</label>
          <select disabled={readOnly}
            className="w-full px-3 py-2 text-sm text-ink-1 bg-surface-1 border border-kp-border rounded-lg focus:outline-none focus:ring-2 focus:ring-kp-accent/30 disabled:bg-surface-0"
            {...register("prueba_fovea")}>
            <option value="">No realizada</option>
            <option value="negativa">Negativa</option>
            <option value="positiva_leve">Positiva leve (+1)</option>
            <option value="positiva_moderada">Positiva moderada (+2)</option>
            <option value="positiva_severa">Positiva severa (+3/+4)</option>
          </select>
        </div>
      </div>

      <Input label="Coloración de la cicatriz" placeholder="Ej: rosada, eritematosa, hiperpigmentada…"
        readOnly={readOnly} {...register("cicatriz_coloracion")} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[
          { name: "cicatriz_adherencias" as const, label: "Adherencias cicatrizales" },
          { name: "cicatriz_queloides" as const, label: "Formación de queloides" },
        ].map(({ name, label }) => (
          <label key={name}
            className="flex items-center gap-2.5 cursor-pointer rounded-lg border border-kp-border px-3 py-2.5 hover:border-kp-border-md transition-colors">
            <input type="checkbox" disabled={readOnly}
              className="accent-kp-accent w-4 h-4" {...register(name)} />
            <span className="text-sm text-ink-2">{label}</span>
          </label>
        ))}
      </div>

      <Textarea label="Observaciones" rows={3} readOnly={readOnly} {...register("observaciones")} />

      <SaveRow isSubmitting={isSubmitting} readOnly={readOnly} saved={saved} />
    </form>
  );
}

"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { AlertBanner } from "@/components/ui/AlertBanner";
import { ScaleSlider } from "@/components/shared/ScaleSlider";
import { upsertEvaluacion } from "@/app/actions/evaluacion";
import type { Evaluation } from "@/types";

// ── Sub-áreas ──────────────────────────────────────────────────────────────

const SUB_AREAS = [
  { key: "vocal", label: "Salud Vocal" },
  { key: "deglucion", label: "Deglución" },
  { key: "desarrollo_fonologico", label: "Desarrollo Fonológico" },
] as const;

type FonoSubAreaKey = (typeof SUB_AREAS)[number]["key"];

interface FonoaudiologiaEvalProps {
  patientId: string;
  evaluaciones: Evaluation[];
  readOnly?: boolean;
}

function getSubAreaData(evals: Evaluation[], subArea: string): Record<string, unknown> {
  return (evals.find((e) => e.sub_area === subArea)?.data ?? {}) as Record<string, unknown>;
}

export function FonoaudiologiaEval({ patientId, evaluaciones, readOnly = false }: FonoaudiologiaEvalProps) {
  const [activeTab, setActiveTab] = useState<FonoSubAreaKey>("vocal");

  return (
    <div className="space-y-4">
      {readOnly && (
        <AlertBanner variant="warning" title="Modo lectura">
          Solo profesionales de Fonoaudiología pueden editar esta evaluación.
        </AlertBanner>
      )}

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
        {activeTab === "vocal" && (
          <VocalForm patientId={patientId}
            initialData={getSubAreaData(evaluaciones, "vocal")} readOnly={readOnly} />
        )}
        {activeTab === "deglucion" && (
          <DeglucionForm patientId={patientId}
            initialData={getSubAreaData(evaluaciones, "deglucion")} readOnly={readOnly} />
        )}
        {activeTab === "desarrollo_fonologico" && (
          <DesarrolloForm patientId={patientId}
            initialData={getSubAreaData(evaluaciones, "desarrollo_fonologico")} readOnly={readOnly} />
        )}
      </div>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────

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

// ── VOCAL (GRBAS) ──────────────────────────────────────────────────────────

type VocalFormData = {
  grbas: { g: number; r: number; b: number; a: number; s: number };
  conductas_fonotraumaticas: string;
  modo_aparicion_fatiga: "subita" | "progresiva" | "matutina" | "vespertina" | "no_aplica";
  sintomas_rinofaringeos: string;
  observaciones: string;
};

const GRBAS_PARAMS: { key: keyof VocalFormData["grbas"]; label: string; desc: string }[] = [
  { key: "g", label: "G — Grade", desc: "Grado general de disfonía" },
  { key: "r", label: "R — Rough", desc: "Aspereza / irregularidad" },
  { key: "b", label: "B — Breathy", desc: "Soplosidad" },
  { key: "a", label: "A — Asthenic", desc: "Asténico / débil" },
  { key: "s", label: "S — Strained", desc: "Tensión / esfuerzo" },
];

function VocalForm({ patientId, initialData, readOnly }: SubFormProps) {
  const [saved, setSaved] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const d = initialData as Partial<VocalFormData>;

  const { register, control, handleSubmit, formState: { isSubmitting } } =
    useForm<VocalFormData>({
      defaultValues: {
        grbas: {
          g: (d.grbas as VocalFormData["grbas"])?.g ?? 0,
          r: (d.grbas as VocalFormData["grbas"])?.r ?? 0,
          b: (d.grbas as VocalFormData["grbas"])?.b ?? 0,
          a: (d.grbas as VocalFormData["grbas"])?.a ?? 0,
          s: (d.grbas as VocalFormData["grbas"])?.s ?? 0,
        },
        conductas_fonotraumaticas: (d.conductas_fonotraumaticas as string) ?? "",
        modo_aparicion_fatiga: (d.modo_aparicion_fatiga as VocalFormData["modo_aparicion_fatiga"]) ?? "no_aplica",
        sintomas_rinofaringeos: (d.sintomas_rinofaringeos as string) ?? "",
        observaciones: (d.observaciones as string) ?? "",
      },
    });

  async function onSubmit(data: VocalFormData) {
    setServerError(null); setSaved(false);
    const result = await upsertEvaluacion(patientId, "fonoaudiologia", "vocal", data as Record<string, unknown>);
    if (!result.success) { setServerError(result.error); return; }
    setSaved(true);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {serverError && <AlertBanner variant="danger">{serverError}</AlertBanner>}

      {/* GRBAS */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-ink-1">Escala GRBAS (0 = normal, 3 = severo)</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {GRBAS_PARAMS.map(({ key, label, desc }) => (
            <div key={key} className="space-y-1">
              <p className="text-xs text-ink-3">{desc}</p>
              <Controller name={`grbas.${key}`} control={control}
                render={({ field }) => (
                  <ScaleSlider label={label} value={field.value} min={0} max={3}
                    colorScale="green-red"
                    labels={{ 0: "0 Normal", 1: "1", 2: "2", 3: "3 Severo" }}
                    onChange={field.onChange} />
                )} />
            </div>
          ))}
        </div>
      </div>

      {/* Modo aparición fatiga */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-ink-1">Modo de aparición de fatiga vocal</label>
        <select disabled={readOnly}
          className="w-full px-3 py-2 text-sm text-ink-1 bg-surface-1 border border-kp-border rounded-lg focus:outline-none focus:ring-2 focus:ring-kp-accent/30 disabled:bg-surface-0"
          {...register("modo_aparicion_fatiga")}>
          <option value="no_aplica">No aplica</option>
          <option value="subita">Súbita</option>
          <option value="progresiva">Progresiva</option>
          <option value="matutina">Matutina</option>
          <option value="vespertina">Vespertina</option>
        </select>
      </div>

      <Textarea label="Conductas fonotraumáticas" placeholder="Carraspeo frecuente, gritos, tos crónica…"
        rows={2} readOnly={readOnly} {...register("conductas_fonotraumaticas")} />
      <Textarea label="Síntomas rinofaríngeos" placeholder="Mucosidad, ardor, sensación de cuerpo extraño…"
        rows={2} readOnly={readOnly} {...register("sintomas_rinofaringeos")} />
      <Textarea label="Observaciones" rows={3} readOnly={readOnly} {...register("observaciones")} />

      <SaveRow isSubmitting={isSubmitting} readOnly={readOnly} saved={saved} />
    </form>
  );
}

// ── DEGLUCIÓN ─────────────────────────────────────────────────────────────

type DeglucionFormData = {
  inspeccion_orofacial: string;
  movilidad_lingual: string;
  signos_aspiracion: {
    tos: boolean;
    voz_humeda: boolean;
    asfixia: boolean;
    regurgitacion_nasal: boolean;
  };
  consistencias_evaluadas: string;
  observaciones: string;
};

const SIGNOS_ASPIRACION: { key: keyof DeglucionFormData["signos_aspiracion"]; label: string }[] = [
  { key: "tos", label: "Tos durante/después de deglutir" },
  { key: "voz_humeda", label: "Voz húmeda / gorgoreo" },
  { key: "asfixia", label: "Episodios de asfixia" },
  { key: "regurgitacion_nasal", label: "Regurgitación nasal" },
];

function DeglucionForm({ patientId, initialData, readOnly }: SubFormProps) {
  const [saved, setSaved] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const d = initialData as Partial<DeglucionFormData>;
  const prevSignos = (d.signos_aspiracion as DeglucionFormData["signos_aspiracion"]) ?? {
    tos: false, voz_humeda: false, asfixia: false, regurgitacion_nasal: false,
  };

  const { register, handleSubmit, formState: { isSubmitting } } =
    useForm<DeglucionFormData>({
      defaultValues: {
        inspeccion_orofacial: (d.inspeccion_orofacial as string) ?? "",
        movilidad_lingual: (d.movilidad_lingual as string) ?? "",
        signos_aspiracion: prevSignos,
        consistencias_evaluadas: (d.consistencias_evaluadas as string) ?? "",
        observaciones: (d.observaciones as string) ?? "",
      },
    });

  async function onSubmit(data: DeglucionFormData) {
    setServerError(null); setSaved(false);
    const result = await upsertEvaluacion(patientId, "fonoaudiologia", "deglucion", data as Record<string, unknown>);
    if (!result.success) { setServerError(result.error); return; }
    setSaved(true);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {serverError && <AlertBanner variant="danger">{serverError}</AlertBanner>}

      <Textarea label="Inspección orofacial" placeholder="Simetría labial, tono, sensibilidad…"
        rows={2} readOnly={readOnly} {...register("inspeccion_orofacial")} />
      <Textarea label="Movilidad lingual" placeholder="Rango, fuerza, coordinación…"
        rows={2} readOnly={readOnly} {...register("movilidad_lingual")} />

      {/* Signos de aspiración */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-ink-1">Signos de aspiración</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {SIGNOS_ASPIRACION.map(({ key, label }) => (
            <label key={key}
              className="flex items-center gap-2.5 cursor-pointer rounded-lg border border-kp-border px-3 py-2.5 hover:border-kp-border-md transition-colors">
              <input type="checkbox" disabled={readOnly}
                className="accent-kp-danger w-4 h-4"
                {...register(`signos_aspiracion.${key}`)} />
              <span className="text-sm text-ink-2">{label}</span>
            </label>
          ))}
        </div>
      </div>

      <Textarea label="Consistencias evaluadas" placeholder="Líquido, néctar, pudding, sólido blando…"
        rows={2} readOnly={readOnly} {...register("consistencias_evaluadas")} />
      <Textarea label="Observaciones" rows={3} readOnly={readOnly} {...register("observaciones")} />

      <SaveRow isSubmitting={isSubmitting} readOnly={readOnly} saved={saved} />
    </form>
  );
}

// ── DESARROLLO FONOLÓGICO ─────────────────────────────────────────────────

type DesarrolloFormData = {
  teprosif_puntaje: number;
  teprosif_de: number;
  teprosif_clasificacion: "normal" | "riesgo" | "deficit";
  screening_tea: string;
  evaluacion_discurso: string;
  observaciones: string;
};

function DesarrolloForm({ patientId, initialData, readOnly }: SubFormProps) {
  const [saved, setSaved] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const d = initialData as Partial<DesarrolloFormData>;

  const { register, handleSubmit, formState: { isSubmitting } } =
    useForm<DesarrolloFormData>({
      defaultValues: {
        teprosif_puntaje: (d.teprosif_puntaje as number) ?? 0,
        teprosif_de: (d.teprosif_de as number) ?? 0,
        teprosif_clasificacion: (d.teprosif_clasificacion as DesarrolloFormData["teprosif_clasificacion"]) ?? "normal",
        screening_tea: (d.screening_tea as string) ?? "",
        evaluacion_discurso: (d.evaluacion_discurso as string) ?? "",
        observaciones: (d.observaciones as string) ?? "",
      },
    });

  async function onSubmit(data: DesarrolloFormData) {
    setServerError(null); setSaved(false);
    const result = await upsertEvaluacion(patientId, "fonoaudiologia", "desarrollo_fonologico", data as Record<string, unknown>);
    if (!result.success) { setServerError(result.error); return; }
    setSaved(true);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {serverError && <AlertBanner variant="danger">{serverError}</AlertBanner>}

      {/* TEPROSIF-R */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-ink-1">TEPROSIF-R</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input label="Puntaje bruto" type="number"
            readOnly={readOnly} {...register("teprosif_puntaje", { valueAsNumber: true })} />
          <Input label="Desviación estándar" type="number" step="0.1"
            readOnly={readOnly} {...register("teprosif_de", { valueAsNumber: true })} />
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-ink-1">Clasificación</label>
            <select disabled={readOnly}
              className="w-full px-3 py-2 text-sm text-ink-1 bg-surface-1 border border-kp-border rounded-lg focus:outline-none focus:ring-2 focus:ring-kp-accent/30 disabled:bg-surface-0"
              {...register("teprosif_clasificacion")}>
              <option value="normal">Normal</option>
              <option value="riesgo">Riesgo</option>
              <option value="deficit">Déficit</option>
            </select>
          </div>
        </div>
      </div>

      <Textarea label="Screening TEA" placeholder="Observaciones de screening…"
        rows={2} readOnly={readOnly} {...register("screening_tea")} />
      <Textarea label="Evaluación del discurso y gramática"
        placeholder="Estructura narrativa, uso gramatical, longitud media de enunciados…"
        rows={3} readOnly={readOnly} {...register("evaluacion_discurso")} />
      <Textarea label="Observaciones" rows={3} readOnly={readOnly} {...register("observaciones")} />

      <SaveRow isSubmitting={isSubmitting} readOnly={readOnly} saved={saved} />
    </form>
  );
}

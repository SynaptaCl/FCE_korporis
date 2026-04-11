"use client";

import { useState } from "react";
import { useForm, Controller, useFieldArray, useWatch } from "react-hook-form";
import { Plus, Trash2, Save } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { AlertBanner } from "@/components/ui/AlertBanner";
import { ScaleSlider } from "@/components/shared/ScaleSlider";
import { BodyMap } from "@/components/shared/BodyMap";
import { upsertEvaluacion } from "@/app/actions/evaluacion";
import type { Evaluation } from "@/types";

// ── Sub-áreas ──────────────────────────────────────────────────────────────

const SUB_AREAS = [
  { key: "musculoesqueletica", label: "Musculoesquelética" },
  { key: "respiratoria", label: "Respiratoria" },
  { key: "geriatrica", label: "Geriátrica" },
  { key: "neurologica", label: "Neurológica" },
  { key: "vestibular", label: "Vestibular" },
  { key: "piso_pelvico", label: "Piso Pélvico" },
] as const;

type KineSubAreaKey = (typeof SUB_AREAS)[number]["key"];

// ── Props ──────────────────────────────────────────────────────────────────

interface KinesiologiaEvalProps {
  patientId: string;
  evaluaciones: Evaluation[];
  readOnly?: boolean;
}

// ── Helper: extract data for sub_area ─────────────────────────────────────

function getSubAreaData(evals: Evaluation[], subArea: string): Record<string, unknown> {
  return (evals.find((e) => e.sub_area === subArea)?.data ?? {}) as Record<string, unknown>;
}

// ── Componente principal ───────────────────────────────────────────────────

export function KinesiologiaEval({ patientId, evaluaciones, readOnly = false }: KinesiologiaEvalProps) {
  const [activeTab, setActiveTab] = useState<KineSubAreaKey>("musculoesqueletica");

  return (
    <div className="space-y-4">
      {readOnly && (
        <AlertBanner variant="warning" title="Modo lectura">
          Solo profesionales de Kinesiología pueden editar esta evaluación.
        </AlertBanner>
      )}

      {/* Sub-area tabs */}
      <div className="flex flex-wrap gap-1.5">
        {SUB_AREAS.map((area) => {
          const hasData = evaluaciones.some((e) => e.sub_area === area.key);
          return (
            <button
              key={area.key}
              type="button"
              onClick={() => setActiveTab(area.key)}
              className={
                activeTab === area.key
                  ? "px-3 py-1.5 text-xs font-semibold rounded-lg bg-kp-accent text-white"
                  : hasData
                    ? "px-3 py-1.5 text-xs font-semibold rounded-lg bg-kp-accent-xs border border-kp-accent/30 text-kp-primary"
                    : "px-3 py-1.5 text-xs font-medium rounded-lg bg-surface-0 border border-kp-border text-ink-2 hover:border-kp-border-md"
              }
            >
              {area.label}
              {hasData && activeTab !== area.key && (
                <span className="ml-1 text-[0.55rem] font-bold text-kp-accent">●</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Active sub-area form */}
      <div className="pt-2">
        {activeTab === "musculoesqueletica" && (
          <MSKForm
            patientId={patientId}
            initialData={getSubAreaData(evaluaciones, "musculoesqueletica")}
            readOnly={readOnly}
          />
        )}
        {activeTab === "respiratoria" && (
          <RespiratoriaForm
            patientId={patientId}
            initialData={getSubAreaData(evaluaciones, "respiratoria")}
            readOnly={readOnly}
          />
        )}
        {activeTab === "geriatrica" && (
          <GeriatricaForm
            patientId={patientId}
            initialData={getSubAreaData(evaluaciones, "geriatrica")}
            readOnly={readOnly}
          />
        )}
        {activeTab === "neurologica" && (
          <NeurologicaForm
            patientId={patientId}
            initialData={getSubAreaData(evaluaciones, "neurologica")}
            readOnly={readOnly}
          />
        )}
        {activeTab === "vestibular" && (
          <VestibularForm
            patientId={patientId}
            initialData={getSubAreaData(evaluaciones, "vestibular")}
            readOnly={readOnly}
          />
        )}
        {activeTab === "piso_pelvico" && (
          <PisoPelvicoForm
            patientId={patientId}
            initialData={getSubAreaData(evaluaciones, "piso_pelvico")}
            readOnly={readOnly}
          />
        )}
      </div>
    </div>
  );
}

// ── Sub-area form helpers ──────────────────────────────────────────────────

interface SubFormProps {
  patientId: string;
  initialData: Record<string, unknown>;
  readOnly: boolean;
}

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

// ── MSK ───────────────────────────────────────────────────────────────────

type MSKFormData = {
  dolor_eva: number;
  zonas_dolor: string[];
  fuerza_daniels: { segmento: string; valor: number }[];
  pruebas_especiales: string;
  observaciones: string;
};

function MSKForm({ patientId, initialData, readOnly }: SubFormProps) {
  const [saved, setSaved] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const d = initialData as Partial<MSKFormData>;
  const { register, control, handleSubmit, setValue, formState: { isSubmitting } } =
    useForm<MSKFormData>({
      defaultValues: {
        dolor_eva: (d.dolor_eva as number) ?? 0,
        zonas_dolor: (d.zonas_dolor as string[]) ?? [],
        fuerza_daniels: (d.fuerza_daniels as MSKFormData["fuerza_daniels"]) ?? [],
        pruebas_especiales: (d.pruebas_especiales as string) ?? "",
        observaciones: (d.observaciones as string) ?? "",
      },
    });

  const danielsFields = useFieldArray({ control, name: "fuerza_daniels" });
  const zonasValue = useWatch({ control, name: "zonas_dolor" });

  async function onSubmit(data: MSKFormData) {
    setServerError(null);
    setSaved(false);
    const result = await upsertEvaluacion(patientId, "kinesiologia", "musculoesqueletica", data as Record<string, unknown>);
    if (!result.success) { setServerError(result.error); return; }
    setSaved(true);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {serverError && <AlertBanner variant="danger">{serverError}</AlertBanner>}

      {/* EVA dolor */}
      <Controller
        name="dolor_eva"
        control={control}
        render={({ field }) => (
          <ScaleSlider
            label="Escala EVA (dolor)"
            value={field.value}
            min={0} max={10}
            colorScale="green-red"
            labels={{ 0: "Sin dolor", 5: "Moderado", 10: "Insoportable" }}
            onChange={field.onChange}
          />
        )}
      />

      {/* Mapa corporal */}
      <BodyMap
        value={zonasValue}
        onChange={(z) => setValue("zonas_dolor", z)}
        readOnly={readOnly}
      />

      {/* Daniels */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-ink-1">Fuerza muscular (Daniels 0–5)</span>
          {!readOnly && (
            <Button type="button" variant="ghost" size="sm"
              onClick={() => danielsFields.append({ segmento: "", valor: 5 })}>
              <Plus className="w-3.5 h-3.5 mr-1" />Agregar
            </Button>
          )}
        </div>
        {danielsFields.fields.map((field, idx) => (
          <div key={field.id} className="grid grid-cols-[1fr_auto_auto] gap-2 items-center">
            <Input placeholder="Segmento (ej: Cuádriceps D)" {...register(`fuerza_daniels.${idx}.segmento`)} />
            <Controller
              name={`fuerza_daniels.${idx}.valor`}
              control={control}
              render={({ field: f }) => (
                <ScaleSlider label="" value={f.value} min={0} max={5}
                  colorScale="red-green"
                  labels={{ 0: "0", 3: "3", 5: "5" }}
                  onChange={f.onChange}
                  className="w-48"
                />
              )}
            />
            {!readOnly && (
              <button type="button" onClick={() => danielsFields.remove(idx)}
                className="text-ink-3 hover:text-kp-danger">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
        {danielsFields.fields.length === 0 && (
          <p className="text-xs text-ink-4 italic">Sin registros de fuerza</p>
        )}
      </div>

      <Textarea label="Pruebas especiales" placeholder="Ej: Neer +, Lachman +" rows={2}
        readOnly={readOnly} {...register("pruebas_especiales")} />
      <Textarea label="Observaciones" placeholder="Observaciones clínicas…" rows={3}
        readOnly={readOnly} {...register("observaciones")} />

      <SaveRow isSubmitting={isSubmitting} readOnly={readOnly} saved={saved} />
    </form>
  );
}

// ── RESPIRATORIA ──────────────────────────────────────────────────────────

type RespFormData = {
  auscultacion: string;
  patron_respiratorio: string;
  spo2_reposo: number;
  spo2_esfuerzo: number;
  escala_mmrc: number;
  escala_borg: number;
  test_marcha_6min: number;
  observaciones: string;
};

function RespiratoriaForm({ patientId, initialData, readOnly }: SubFormProps) {
  const [saved, setSaved] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const d = initialData as Partial<RespFormData>;

  const { register, control, handleSubmit, formState: { isSubmitting } } =
    useForm<RespFormData>({
      defaultValues: {
        auscultacion: (d.auscultacion as string) ?? "",
        patron_respiratorio: (d.patron_respiratorio as string) ?? "",
        spo2_reposo: (d.spo2_reposo as number) ?? 98,
        spo2_esfuerzo: (d.spo2_esfuerzo as number) ?? 95,
        escala_mmrc: (d.escala_mmrc as number) ?? 0,
        escala_borg: (d.escala_borg as number) ?? 0,
        test_marcha_6min: (d.test_marcha_6min as number) ?? 0,
        observaciones: (d.observaciones as string) ?? "",
      },
    });

  async function onSubmit(data: RespFormData) {
    setServerError(null); setSaved(false);
    const result = await upsertEvaluacion(patientId, "kinesiologia", "respiratoria", data as Record<string, unknown>);
    if (!result.success) { setServerError(result.error); return; }
    setSaved(true);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {serverError && <AlertBanner variant="danger">{serverError}</AlertBanner>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="SpO₂ en reposo (%)" type="number" min={50} max={100}
          readOnly={readOnly} {...register("spo2_reposo", { valueAsNumber: true })} />
        <Input label="SpO₂ en esfuerzo (%)" type="number" min={50} max={100}
          readOnly={readOnly} {...register("spo2_esfuerzo", { valueAsNumber: true })} />
        <Input label="Test marcha 6 minutos (metros)" type="number"
          readOnly={readOnly} {...register("test_marcha_6min", { valueAsNumber: true })} />
      </div>

      <Controller name="escala_mmrc" control={control}
        render={({ field }) => (
          <ScaleSlider label="Escala mMRC (disnea)" value={field.value} min={0} max={4}
            colorScale="green-red"
            labels={{ 0: "0 Sin disnea", 1: "1", 2: "2", 3: "3", 4: "4 Confinado" }}
            onChange={field.onChange} />
        )} />

      <Controller name="escala_borg" control={control}
        render={({ field }) => (
          <ScaleSlider label="Escala de Borg (esfuerzo percibido)" value={field.value} min={0} max={10}
            colorScale="green-red"
            labels={{ 0: "0 Nada", 3: "3 Moderado", 7: "7 Muy fuerte", 10: "10 Máximo" }}
            onChange={field.onChange} />
        )} />

      <Textarea label="Auscultación" placeholder="Murmullo vesicular, crepitantes, sibilancias…" rows={2}
        readOnly={readOnly} {...register("auscultacion")} />
      <Textarea label="Patrón respiratorio" placeholder="Eupneico, taquipneico, paradójico…" rows={2}
        readOnly={readOnly} {...register("patron_respiratorio")} />
      <Textarea label="Observaciones" placeholder="Observaciones clínicas…" rows={3}
        readOnly={readOnly} {...register("observaciones")} />

      <SaveRow isSubmitting={isSubmitting} readOnly={readOnly} saved={saved} />
    </form>
  );
}

// ── GERIÁTRICA ─────────────────────────────────────────────────────────────

type GerFormData = {
  timed_up_and_go: number;
  indice_barthel: number;
  berg_balance: number;
  velocidad_marcha: number;
  observaciones: string;
};

function GeriatricaForm({ patientId, initialData, readOnly }: SubFormProps) {
  const [saved, setSaved] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const d = initialData as Partial<GerFormData>;

  const { register, control, handleSubmit, formState: { isSubmitting } } =
    useForm<GerFormData>({
      defaultValues: {
        timed_up_and_go: (d.timed_up_and_go as number) ?? 0,
        indice_barthel: (d.indice_barthel as number) ?? 100,
        berg_balance: (d.berg_balance as number) ?? 0,
        velocidad_marcha: (d.velocidad_marcha as number) ?? 0,
        observaciones: (d.observaciones as string) ?? "",
      },
    });

  async function onSubmit(data: GerFormData) {
    setServerError(null); setSaved(false);
    const result = await upsertEvaluacion(patientId, "kinesiologia", "geriatrica", data as Record<string, unknown>);
    if (!result.success) { setServerError(result.error); return; }
    setSaved(true);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {serverError && <AlertBanner variant="danger">{serverError}</AlertBanner>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Timed Up & Go (segundos)" type="number" step="0.1"
          readOnly={readOnly} {...register("timed_up_and_go", { valueAsNumber: true })} />
        <Input label="Velocidad de marcha (m/s)" type="number" step="0.01"
          readOnly={readOnly} {...register("velocidad_marcha", { valueAsNumber: true })} />
      </div>

      <Controller name="indice_barthel" control={control}
        render={({ field }) => (
          <ScaleSlider label="Índice de Barthel (independencia funcional)" value={field.value}
            min={0} max={100} step={5} colorScale="red-green"
            labels={{ 0: "0 Dependiente", 50: "50 Parcial", 100: "100 Independiente" }}
            onChange={field.onChange} />
        )} />

      <Controller name="berg_balance" control={control}
        render={({ field }) => (
          <ScaleSlider label="Escala de Berg (equilibrio)" value={field.value}
            min={0} max={56} step={1} colorScale="red-green"
            labels={{ 0: "0", 28: "28", 56: "56 Normal" }}
            onChange={field.onChange} />
        )} />

      <Textarea label="Observaciones" placeholder="Observaciones clínicas…" rows={3}
        readOnly={readOnly} {...register("observaciones")} />

      <SaveRow isSubmitting={isSubmitting} readOnly={readOnly} saved={saved} />
    </form>
  );
}

// ── NEUROLÓGICA ───────────────────────────────────────────────────────────

type NeuroFormData = {
  ashworth: { segmento: string; grado: number }[];
  sensibilidad: string;
  coordinacion: string;
  equilibrio: string;
  observaciones: string;
};

function NeurologicaForm({ patientId, initialData, readOnly }: SubFormProps) {
  const [saved, setSaved] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const d = initialData as Partial<NeuroFormData>;

  const { register, control, handleSubmit, formState: { isSubmitting } } =
    useForm<NeuroFormData>({
      defaultValues: {
        ashworth: (d.ashworth as NeuroFormData["ashworth"]) ?? [],
        sensibilidad: (d.sensibilidad as string) ?? "",
        coordinacion: (d.coordinacion as string) ?? "",
        equilibrio: (d.equilibrio as string) ?? "",
        observaciones: (d.observaciones as string) ?? "",
      },
    });

  const ashworthFields = useFieldArray({ control, name: "ashworth" });

  async function onSubmit(data: NeuroFormData) {
    setServerError(null); setSaved(false);
    const result = await upsertEvaluacion(patientId, "kinesiologia", "neurologica", data as Record<string, unknown>);
    if (!result.success) { setServerError(result.error); return; }
    setSaved(true);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {serverError && <AlertBanner variant="danger">{serverError}</AlertBanner>}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-ink-1">Escala de Ashworth Modificada (espasticidad 0–4)</span>
          {!readOnly && (
            <Button type="button" variant="ghost" size="sm"
              onClick={() => ashworthFields.append({ segmento: "", grado: 0 })}>
              <Plus className="w-3.5 h-3.5 mr-1" />Agregar
            </Button>
          )}
        </div>
        {ashworthFields.fields.map((field, idx) => (
          <div key={field.id} className="grid grid-cols-[1fr_auto_auto] gap-2 items-center">
            <Input placeholder="Segmento" {...register(`ashworth.${idx}.segmento`)} />
            <Controller name={`ashworth.${idx}.grado`} control={control}
              render={({ field: f }) => (
                <ScaleSlider label="" value={f.value} min={0} max={4}
                  labels={{ 0: "0", 2: "2", 4: "4" }}
                  onChange={f.onChange} className="w-40" />
              )} />
            {!readOnly && (
              <button type="button" onClick={() => ashworthFields.remove(idx)}
                className="text-ink-3 hover:text-kp-danger">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      <Textarea label="Sensibilidad" placeholder="Superficial, profunda, propioceptiva…" rows={2}
        readOnly={readOnly} {...register("sensibilidad")} />
      <Textarea label="Coordinación" placeholder="Dedo-nariz, talón-rodilla, disdiadococinesia…" rows={2}
        readOnly={readOnly} {...register("coordinacion")} />
      <Textarea label="Equilibrio" placeholder="Romberg, Tandem, apoyo monopodal…" rows={2}
        readOnly={readOnly} {...register("equilibrio")} />
      <Textarea label="Observaciones" rows={3}
        readOnly={readOnly} {...register("observaciones")} />

      <SaveRow isSubmitting={isSubmitting} readOnly={readOnly} saved={saved} />
    </form>
  );
}

// ── VESTIBULAR ────────────────────────────────────────────────────────────

type VestFormData = {
  dix_hallpike_d: "negativo" | "positivo" | "no_realizado";
  dix_hallpike_i: "negativo" | "positivo" | "no_realizado";
  nistagmo: string;
  maniobras: string;
  observaciones: string;
};

function VestibularForm({ patientId, initialData, readOnly }: SubFormProps) {
  const [saved, setSaved] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const d = initialData as Partial<VestFormData>;

  const { register, handleSubmit, formState: { isSubmitting } } =
    useForm<VestFormData>({
      defaultValues: {
        dix_hallpike_d: (d.dix_hallpike_d as VestFormData["dix_hallpike_d"]) ?? "no_realizado",
        dix_hallpike_i: (d.dix_hallpike_i as VestFormData["dix_hallpike_i"]) ?? "no_realizado",
        nistagmo: (d.nistagmo as string) ?? "",
        maniobras: (d.maniobras as string) ?? "",
        observaciones: (d.observaciones as string) ?? "",
      },
    });

  async function onSubmit(data: VestFormData) {
    setServerError(null); setSaved(false);
    const result = await upsertEvaluacion(patientId, "kinesiologia", "vestibular", data as Record<string, unknown>);
    if (!result.success) { setServerError(result.error); return; }
    setSaved(true);
  }

  const opts = [
    { value: "no_realizado", label: "No realizado" },
    { value: "negativo", label: "Negativo" },
    { value: "positivo", label: "Positivo ⚠" },
  ];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {serverError && <AlertBanner variant="danger">{serverError}</AlertBanner>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          { name: "dix_hallpike_d" as const, label: "Dix-Hallpike Derecho" },
          { name: "dix_hallpike_i" as const, label: "Dix-Hallpike Izquierdo" },
        ].map(({ name, label }) => (
          <div key={name} className="space-y-1.5">
            <label className="text-sm font-medium text-ink-1">{label}</label>
            <select disabled={readOnly}
              className="w-full px-3 py-2 text-sm text-ink-1 bg-surface-1 border border-kp-border rounded-lg focus:outline-none focus:ring-2 focus:ring-kp-accent/30 disabled:bg-surface-0"
              {...register(name)}>
              {opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        ))}
      </div>

      <Textarea label="Nistagmo" placeholder="Dirección, latencia, duración, fatiga…" rows={2}
        readOnly={readOnly} {...register("nistagmo")} />
      <Textarea label="Maniobras posicionales" placeholder="Epley, Semont, Brandt-Daroff…" rows={2}
        readOnly={readOnly} {...register("maniobras")} />
      <Textarea label="Observaciones" rows={3}
        readOnly={readOnly} {...register("observaciones")} />

      <SaveRow isSubmitting={isSubmitting} readOnly={readOnly} saved={saved} />
    </form>
  );
}

// ── PISO PÉLVICO ──────────────────────────────────────────────────────────

type PisoFormData = {
  oxford: number;
  diario_miccional: string;
  calidad_vida: string;
  observaciones: string;
};

function PisoPelvicoForm({ patientId, initialData, readOnly }: SubFormProps) {
  const [saved, setSaved] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const d = initialData as Partial<PisoFormData>;

  const { register, control, handleSubmit, formState: { isSubmitting } } =
    useForm<PisoFormData>({
      defaultValues: {
        oxford: (d.oxford as number) ?? 0,
        diario_miccional: (d.diario_miccional as string) ?? "",
        calidad_vida: (d.calidad_vida as string) ?? "",
        observaciones: (d.observaciones as string) ?? "",
      },
    });

  async function onSubmit(data: PisoFormData) {
    setServerError(null); setSaved(false);
    const result = await upsertEvaluacion(patientId, "kinesiologia", "piso_pelvico", data as Record<string, unknown>);
    if (!result.success) { setServerError(result.error); return; }
    setSaved(true);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {serverError && <AlertBanner variant="danger">{serverError}</AlertBanner>}

      <Controller name="oxford" control={control}
        render={({ field }) => (
          <ScaleSlider label="Escala de Oxford (fuerza suelo pélvico)" value={field.value}
            min={0} max={5} colorScale="red-green"
            labels={{ 0: "0 Sin contracción", 3: "3 Moderada", 5: "5 Fuerte" }}
            onChange={field.onChange} />
        )} />

      <Textarea label="Diario miccional" placeholder="Frecuencia, urgencia, episodios de pérdida…" rows={3}
        readOnly={readOnly} {...register("diario_miccional")} />
      <Textarea label="Calidad de vida" placeholder="Impacto en actividades cotidianas, relaciones…" rows={2}
        readOnly={readOnly} {...register("calidad_vida")} />
      <Textarea label="Observaciones" rows={3}
        readOnly={readOnly} {...register("observaciones")} />

      <SaveRow isSubmitting={isSubmitting} readOnly={readOnly} saved={saved} />
    </form>
  );
}

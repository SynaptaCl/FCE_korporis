"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  FileText,
  ClipboardList,
  Scissors,
  Pill,
  AlertTriangle,
  ShieldAlert,
  Leaf,
  Plus,
  Trash2,
} from "lucide-react";
import { anamnesisSchema, type AnamnesisSchemaType } from "@/lib/validations";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { AlertBanner } from "@/components/ui/AlertBanner";
import { RedFlagsChecklist } from "./RedFlagsChecklist";
import { upsertAnamnesis } from "@/app/actions/anamnesis";
import type { Anamnesis } from "@/types";

// ── FormSection helper ─────────────────────────────────────────────────────

function FormSection({
  title,
  icon,
  badge,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-kp-border pb-2">
        <div className="flex items-center gap-2">
          <span className="text-kp-accent">{icon}</span>
          <h3 className="text-xs font-semibold text-ink-2 uppercase tracking-widest">
            {title}
          </h3>
        </div>
        {badge}
      </div>
      {children}
    </div>
  );
}

// ── Props ──────────────────────────────────────────────────────────────────

interface AnamnesisFormProps {
  patientId: string;
  initialData?: Anamnesis | null;
}

// ── Valores por defecto ────────────────────────────────────────────────────

const DEFAULT_RED_FLAGS: AnamnesisSchemaType["red_flags"] = {
  marcapasos: false,
  embarazo: false,
  tvp: false,
  oncologico: false,
  fiebre: false,
  alergias_severas: false,
  infeccion_cutanea: false,
  fragilidad_capilar: false,
};

const DEFAULT_HABITOS: AnamnesisSchemaType["habitos"] = {
  tabaco: "no",
  alcohol: "no",
  ejercicio: "sedentario",
  sueno_horas: 8,
};

// ── Componente ─────────────────────────────────────────────────────────────

export function AnamnesisForm({ patientId, initialData }: AnamnesisFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<AnamnesisSchemaType>({
    resolver: zodResolver(anamnesisSchema),
    defaultValues: initialData
      ? {
          motivo_consulta: initialData.motivo_consulta,
          antecedentes_medicos: initialData.antecedentes_medicos ?? [],
          antecedentes_quirurgicos: initialData.antecedentes_quirurgicos ?? [],
          farmacologia: initialData.farmacologia ?? [],
          alergias: initialData.alergias ?? [],
          red_flags: initialData.red_flags ?? DEFAULT_RED_FLAGS,
          habitos: initialData.habitos ?? DEFAULT_HABITOS,
        }
      : {
          antecedentes_medicos: [],
          antecedentes_quirurgicos: [],
          farmacologia: [],
          alergias: [],
          red_flags: DEFAULT_RED_FLAGS,
          habitos: DEFAULT_HABITOS,
        },
  });

  // ── useFieldArray ──────────────────────────────────────────────────────

  const antMedicos = useFieldArray({ control, name: "antecedentes_medicos" });
  const antQuirurgicos = useFieldArray({ control, name: "antecedentes_quirurgicos" });
  const farmacologia = useFieldArray({ control, name: "farmacologia" });
  const alergias = useFieldArray({ control, name: "alergias" });

  const redFlags = watch("red_flags");
  const activeFlags = Object.values(redFlags).filter(Boolean).length;

  // ── Submit ─────────────────────────────────────────────────────────────

  async function onSubmit(data: AnamnesisSchemaType) {
    setServerError(null);
    const result = await upsertAnamnesis(patientId, data);
    if (!result.success) {
      setServerError(result.error);
      return;
    }
    router.refresh();
  }

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-8">
      {serverError && (
        <AlertBanner variant="danger" title="Error al guardar">
          {serverError}
        </AlertBanner>
      )}

      {/* ─── 1. Motivo de consulta ─── */}
      <FormSection
        title="Motivo de Consulta"
        icon={<FileText className="w-4 h-4" />}
      >
        <Textarea
          label="Describe el motivo de consulta"
          required
          placeholder="Paciente consulta por… (perspectiva biopsicosocial)"
          rows={4}
          error={errors.motivo_consulta?.message}
          {...register("motivo_consulta")}
        />
      </FormSection>

      {/* ─── 2. Antecedentes médicos ─── */}
      <FormSection
        title="Antecedentes Médicos"
        icon={<ClipboardList className="w-4 h-4" />}
        badge={
          antMedicos.fields.length > 0 ? (
            <Badge variant="teal">{antMedicos.fields.length}</Badge>
          ) : undefined
        }
      >
        {antMedicos.fields.length > 0 && (
          <div className="space-y-2">
            {antMedicos.fields.map((field, idx) => (
              <div
                key={field.id}
                className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-start"
              >
                <Input
                  placeholder="Patología (ej: HTA, DM2, asma…)"
                  error={errors.antecedentes_medicos?.[idx]?.patologia?.message}
                  {...register(`antecedentes_medicos.${idx}.patologia`)}
                />
                <Input
                  placeholder="Desde (año)"
                  className="w-24"
                  {...register(`antecedentes_medicos.${idx}.desde`)}
                />
                <label className="flex items-center gap-1.5 cursor-pointer mt-2 whitespace-nowrap text-sm text-ink-2">
                  <input
                    type="checkbox"
                    className="accent-kp-accent w-3.5 h-3.5"
                    {...register(`antecedentes_medicos.${idx}.controlado`)}
                  />
                  Controlado
                </label>
                <button
                  type="button"
                  onClick={() => antMedicos.remove(idx)}
                  className="mt-2 text-ink-3 hover:text-kp-danger transition-colors cursor-pointer"
                  aria-label="Eliminar"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() =>
            antMedicos.append({ patologia: "", desde: "", controlado: false })
          }
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          Agregar antecedente
        </Button>
      </FormSection>

      {/* ─── 3. Antecedentes quirúrgicos ─── */}
      <FormSection
        title="Antecedentes Quirúrgicos"
        icon={<Scissors className="w-4 h-4" />}
        badge={
          antQuirurgicos.fields.length > 0 ? (
            <Badge variant="teal">{antQuirurgicos.fields.length}</Badge>
          ) : undefined
        }
      >
        {antQuirurgicos.fields.length > 0 && (
          <div className="space-y-2">
            {antQuirurgicos.fields.map((field, idx) => (
              <div
                key={field.id}
                className="grid grid-cols-[1fr_auto_1fr_auto] gap-2 items-start"
              >
                <Input
                  placeholder="Tipo de cirugía"
                  error={errors.antecedentes_quirurgicos?.[idx]?.tipo?.message}
                  {...register(`antecedentes_quirurgicos.${idx}.tipo`)}
                />
                <Input
                  type="date"
                  className="w-36"
                  error={errors.antecedentes_quirurgicos?.[idx]?.fecha?.message}
                  {...register(`antecedentes_quirurgicos.${idx}.fecha`)}
                />
                <Input
                  placeholder="Hospital (opcional)"
                  {...register(`antecedentes_quirurgicos.${idx}.hospital`)}
                />
                <button
                  type="button"
                  onClick={() => antQuirurgicos.remove(idx)}
                  className="mt-2 text-ink-3 hover:text-kp-danger transition-colors cursor-pointer"
                  aria-label="Eliminar"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() =>
            antQuirurgicos.append({ tipo: "", fecha: "", hospital: "" })
          }
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          Agregar cirugía
        </Button>
      </FormSection>

      {/* ─── 4. Farmacología activa ─── */}
      <FormSection
        title="Farmacología Activa"
        icon={<Pill className="w-4 h-4" />}
        badge={
          farmacologia.fields.length > 0 ? (
            <Badge variant="teal">{farmacologia.fields.length}</Badge>
          ) : undefined
        }
      >
        {farmacologia.fields.length > 0 && (
          <div className="space-y-2">
            {farmacologia.fields.map((field, idx) => (
              <div
                key={field.id}
                className="grid grid-cols-[2fr_1fr_1fr_auto] gap-2 items-start"
              >
                <Input
                  placeholder="Medicamento"
                  error={errors.farmacologia?.[idx]?.medicamento?.message}
                  {...register(`farmacologia.${idx}.medicamento`)}
                />
                <Input
                  placeholder="Dosis (ej: 10mg)"
                  error={errors.farmacologia?.[idx]?.dosis?.message}
                  {...register(`farmacologia.${idx}.dosis`)}
                />
                <Input
                  placeholder="Frecuencia"
                  error={errors.farmacologia?.[idx]?.frecuencia?.message}
                  {...register(`farmacologia.${idx}.frecuencia`)}
                />
                <button
                  type="button"
                  onClick={() => farmacologia.remove(idx)}
                  className="mt-2 text-ink-3 hover:text-kp-danger transition-colors cursor-pointer"
                  aria-label="Eliminar"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() =>
            farmacologia.append({ medicamento: "", dosis: "", frecuencia: "" })
          }
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          Agregar medicamento
        </Button>
      </FormSection>

      {/* ─── 5. Alergias ─── */}
      <FormSection
        title="Alergias"
        icon={<AlertTriangle className="w-4 h-4" />}
        badge={
          alergias.fields.length > 0 ? (
            <Badge variant="warning">{alergias.fields.length}</Badge>
          ) : undefined
        }
      >
        {alergias.fields.length > 0 && (
          <div className="space-y-2">
            {alergias.fields.map((field, idx) => (
              <div
                key={field.id}
                className="grid grid-cols-[2fr_1.5fr_1fr_auto] gap-2 items-start"
              >
                <Input
                  placeholder="Sustancia alérgena"
                  error={errors.alergias?.[idx]?.sustancia?.message}
                  {...register(`alergias.${idx}.sustancia`)}
                />
                <Input
                  placeholder="Reacción observada"
                  error={errors.alergias?.[idx]?.reaccion?.message}
                  {...register(`alergias.${idx}.reaccion`)}
                />
                <Select
                  options={[
                    { value: "leve", label: "Leve" },
                    { value: "moderada", label: "Moderada" },
                    { value: "severa", label: "Severa" },
                  ]}
                  {...register(`alergias.${idx}.severidad`)}
                />
                <button
                  type="button"
                  onClick={() => alergias.remove(idx)}
                  className="mt-2 text-ink-3 hover:text-kp-danger transition-colors cursor-pointer"
                  aria-label="Eliminar"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() =>
            alergias.append({ sustancia: "", reaccion: "", severidad: "leve" })
          }
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          Agregar alergia
        </Button>
      </FormSection>

      {/* ─── 6. Red Flags ─── */}
      <FormSection
        title="Red Flags"
        icon={<ShieldAlert className="w-4 h-4" />}
        badge={
          activeFlags > 0 ? (
            <Badge variant="warning">{activeFlags} activa{activeFlags !== 1 ? "s" : ""}</Badge>
          ) : undefined
        }
      >
        <Controller
          name="red_flags"
          control={control}
          render={({ field }) => (
            <RedFlagsChecklist
              value={field.value}
              onChange={(flags) => setValue("red_flags", flags)}
            />
          )}
        />
      </FormSection>

      {/* ─── 7. Hábitos ─── */}
      <FormSection title="Hábitos" icon={<Leaf className="w-4 h-4" />}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Tabaco"
            options={[
              { value: "no", label: "No fuma" },
              { value: "ocasional", label: "Ocasional" },
              { value: "diario", label: "Fumador diario" },
            ]}
            {...register("habitos.tabaco")}
          />
          <Select
            label="Alcohol"
            options={[
              { value: "no", label: "No consume" },
              { value: "ocasional", label: "Ocasional" },
              { value: "frecuente", label: "Frecuente" },
            ]}
            {...register("habitos.alcohol")}
          />
          <Select
            label="Actividad física"
            options={[
              { value: "sedentario", label: "Sedentario" },
              { value: "leve", label: "Actividad leve (<2h/semana)" },
              { value: "moderado", label: "Moderado (3–5h/semana)" },
              { value: "intenso", label: "Intenso (>5h/semana)" },
            ]}
            {...register("habitos.ejercicio")}
          />
          <Input
            label="Horas de sueño (promedio)"
            type="number"
            min={1}
            max={24}
            placeholder="8"
            error={errors.habitos?.sueno_horas?.message}
            {...register("habitos.sueno_horas", { valueAsNumber: true })}
          />
        </div>
      </FormSection>

      {/* ─── Botones ─── */}
      <div className="flex items-center justify-between pt-4 border-t border-kp-border">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? "Guardando…"
            : initialData
              ? "Actualizar anamnesis"
              : "Guardar anamnesis"}
        </Button>
      </div>
    </form>
  );
}

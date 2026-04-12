"use client";

import { useState } from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2, PenLine, Lock, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { soapSchema } from "@/lib/validations";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { Input } from "@/components/ui/Input";
import { AlertBanner } from "@/components/ui/AlertBanner";
import { CifMapper } from "./CifMapper";
import { upsertSoapNote, signSoapNote } from "@/app/actions/soap";
import type { SoapNote, CifAssessment } from "@/types";

// ── Types ──────────────────────────────────────────────────────────────────

type SoapFormData = z.infer<typeof soapSchema>;

const EMPTY_CIF: CifAssessment = {
  funciones: [],
  actividades: [],
  participacion: [],
  contexto: [],
};

// ── Quadrant card ──────────────────────────────────────────────────────────

const QUADRANT_STYLES = {
  S: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    badge: "bg-blue-100 text-blue-800 border-blue-200",
    heading: "text-blue-900",
  },
  O: {
    bg: "bg-green-50",
    border: "border-green-200",
    badge: "bg-green-100 text-green-800 border-green-200",
    heading: "text-green-900",
  },
  A: {
    bg: "bg-violet-50",
    border: "border-violet-200",
    badge: "bg-violet-100 text-violet-800 border-violet-200",
    heading: "text-violet-900",
  },
  P: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    badge: "bg-amber-100 text-amber-800 border-amber-200",
    heading: "text-amber-900",
  },
} as const;

function QuadrantCard({
  letter,
  title,
  subtitle,
  children,
}: {
  letter: "S" | "O" | "A" | "P";
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const s = QUADRANT_STYLES[letter];
  return (
    <div className={cn("rounded-xl border-2 p-4 space-y-3", s.bg, s.border)}>
      <div className="flex items-center gap-2">
        <span className={cn(
          "w-7 h-7 rounded-lg border text-sm font-black flex items-center justify-center shrink-0",
          s.badge
        )}>
          {letter}
        </span>
        <div>
          <h4 className={cn("text-sm font-bold leading-tight", s.heading)}>{title}</h4>
          {subtitle && <p className="text-xs text-ink-3 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

// ── Props ──────────────────────────────────────────────────────────────────

interface SoapFormProps {
  patientId: string;
  initialNote?: SoapNote | null;
  objetivoHint?: string;
}

// ── Componente principal ───────────────────────────────────────────────────

export function SoapForm({ patientId, initialNote, objetivoHint }: SoapFormProps) {
  const [noteId, setNoteId] = useState<string | undefined>(
    initialNote?.id
  );
  const [serverError, setServerError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [signed, setSigned] = useState(initialNote?.firmado ?? false);
  const [signedAt, setSignedAt] = useState(initialNote?.firmado_at);
  const signedBy = initialNote?.firmado_por;
  const [signError, setSignError] = useState<string | null>(null);
  const [isSigning, setIsSigning] = useState(false);

  const readOnly = signed;

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SoapFormData>({
    resolver: zodResolver(soapSchema),
    defaultValues: initialNote
      ? {
          subjetivo: initialNote.subjetivo,
          objetivo: initialNote.objetivo,
          analisis_cif: (initialNote.analisis_cif as CifAssessment) ?? EMPTY_CIF,
          plan: initialNote.plan,
          intervenciones: initialNote.intervenciones ?? [],
          tareas_domiciliarias: initialNote.tareas_domiciliarias ?? "",
          proxima_sesion: initialNote.proxima_sesion ?? "",
        }
      : {
          subjetivo: "",
          objetivo: "",
          analisis_cif: EMPTY_CIF,
          plan: "",
          intervenciones: [],
          tareas_domiciliarias: "",
          proxima_sesion: "",
        },
  });

  const intervencionesFields = useFieldArray({ control, name: "intervenciones" });

  async function onSubmit(data: SoapFormData) {
    setServerError(null);
    setSaved(false);
    const result = await upsertSoapNote(
      patientId,
      data as Record<string, unknown>,
      noteId
    );
    if (!result.success) { setServerError(result.error); return; }
    setNoteId(result.data.id);
    setSaved(true);
  }

  async function handleSign() {
    if (!noteId) {
      setSignError("Guarda la nota antes de firmar.");
      return;
    }
    setSignError(null);
    setIsSigning(true);
    const result = await signSoapNote(noteId, patientId);
    setIsSigning(false);
    if (!result.success) { setSignError(result.error); return; }
    setSigned(true);
    setSignedAt(new Date().toISOString());
  }

  return (
    <div className="space-y-4">
      {signed && (
        <AlertBanner variant="success" title="Nota clínica firmada — documento inmutable">
          <span className="text-sm">
            Firmada por <strong>{signedBy}</strong> el{" "}
            {signedAt && new Date(signedAt).toLocaleDateString("es-CL", {
              day: "numeric", month: "long", year: "numeric",
              hour: "2-digit", minute: "2-digit",
            })}
          </span>
        </AlertBanner>
      )}

      {signed && (
        <div className="flex items-center gap-2 text-sm text-ink-3 bg-surface-0 rounded-lg px-4 py-2 border border-kp-border">
          <Lock className="w-4 h-4 shrink-0" />
          Todos los campos están bloqueados. Los documentos firmados son inmutables por ley (Decreto 41 MINSAL).
        </div>
      )}

      {serverError && <AlertBanner variant="danger">{serverError}</AlertBanner>}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">

        {/* S — Subjetivo */}
        <QuadrantCard letter="S" title="Subjetivo"
          subtitle="Relato del paciente — síntomas, dolor, contexto biopsicosocial">
          <Textarea
            placeholder="Paciente refiere… EVA X/10… desde hace…"
            required rows={4}
            readOnly={readOnly}
            error={errors.subjetivo?.message}
            {...register("subjetivo")}
          />
        </QuadrantCard>

        {/* O — Objetivo */}
        <QuadrantCard letter="O" title="Objetivo"
          subtitle="Hallazgos clínicos observables y medibles">
          {objetivoHint && !readOnly && !initialNote?.objetivo && (
            <p className="text-xs text-ink-3 bg-surface-1 border border-kp-border rounded px-2 py-1.5">
              💡 Evaluación disponible: {objetivoHint}
            </p>
          )}
          <Textarea
            placeholder="Signos vitales… ROM… fuerza Daniels… pruebas especiales…"
            required rows={4}
            readOnly={readOnly}
            error={errors.objetivo?.message}
            {...register("objetivo")}
          />
        </QuadrantCard>

        {/* A — Análisis CIF */}
        <QuadrantCard letter="A" title="Análisis CIF"
          subtitle="Clasificación Internacional del Funcionamiento — cuantificadores 0–4">
          <Controller
            name="analisis_cif"
            control={control}
            render={({ field }) => (
              <CifMapper
                value={(field.value as CifAssessment) ?? EMPTY_CIF}
                onChange={field.onChange}
                readOnly={readOnly}
              />
            )}
          />
        </QuadrantCard>

        {/* P — Plan */}
        <QuadrantCard letter="P" title="Plan"
          subtitle="Intervenciones, objetivos terapéuticos y tareas">
          <div className="space-y-4">
            <Textarea
              label="Plan terapéutico"
              placeholder="Objetivos a corto/mediano plazo, técnicas a utilizar…"
              required rows={3}
              readOnly={readOnly}
              error={errors.plan?.message}
              {...register("plan")}
            />

            {/* Intervenciones */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-ink-1">Intervenciones realizadas</span>
                {!readOnly && (
                  <Button type="button" variant="ghost" size="sm"
                    onClick={() => intervencionesFields.append({ tipo: "", descripcion: "", dosificacion: "" })}>
                    <Plus className="w-3.5 h-3.5 mr-1" />Agregar
                  </Button>
                )}
              </div>
              {intervencionesFields.fields.map((field, idx) => (
                <div key={field.id} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-start">
                  <Input placeholder="Tipo (ej: Electroterapia)" readOnly={readOnly}
                    {...register(`intervenciones.${idx}.tipo`)} />
                  <Input placeholder="Descripción" readOnly={readOnly}
                    {...register(`intervenciones.${idx}.descripcion`)} />
                  <Input placeholder="Dosificación (opcional)" readOnly={readOnly}
                    {...register(`intervenciones.${idx}.dosificacion`)} />
                  {!readOnly && (
                    <button type="button" onClick={() => intervencionesFields.remove(idx)}
                      className="mt-2 text-ink-3 hover:text-kp-danger transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              {intervencionesFields.fields.length === 0 && (
                <p className="text-xs text-ink-4 italic">Sin intervenciones registradas</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Textarea label="Tareas domiciliarias" placeholder="Ejercicios, cuidados en casa…"
                rows={2} readOnly={readOnly} {...register("tareas_domiciliarias")} />
              <Input label="Próxima sesión" type="date"
                readOnly={readOnly} {...register("proxima_sesion")} />
            </div>
          </div>
        </QuadrantCard>

        {/* Save button */}
        {!readOnly && (
          <div className="flex items-center justify-between pt-2 border-t border-kp-border">
            {saved && (
              <span className="text-sm text-kp-success font-medium flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Borrador guardado
              </span>
            )}
            {!saved && <span />}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Guardando…" : noteId ? "Actualizar borrador" : "Guardar borrador"}
            </Button>
          </div>
        )}
      </form>

      {/* Signature block */}
      {!signed && noteId && (
        <SignatureBlock
          onSign={handleSign}
          isSigning={isSigning}
          error={signError}
          saved={saved}
        />
      )}
    </div>
  );
}

// ── SignatureBlock ──────────────────────────────────────────────────────────

interface SignatureBlockProps {
  onSign: () => void;
  isSigning: boolean;
  error: string | null;
  saved: boolean;
}

function SignatureBlock({ onSign, isSigning, error, saved }: SignatureBlockProps) {
  const [confirmed, setConfirmed] = useState(false);

  return (
    <div className="rounded-xl border-2 border-kp-border bg-surface-0 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <PenLine className="w-4 h-4 text-kp-accent" />
        <h4 className="text-sm font-bold text-ink-1">Firma digital del profesional</h4>
      </div>

      <p className="text-xs text-ink-3">
        Al firmar, la nota queda cerrada e <strong>inmutable</strong>. El documento quedará
        registrado con tu nombre, fecha y hora. Esta acción no puede revertirse.
      </p>

      {!saved && (
        <p className="text-xs text-kp-warning font-medium flex items-center gap-1.5">
          ⚠ Guarda el borrador antes de firmar.
        </p>
      )}

      {error && <AlertBanner variant="danger">{error}</AlertBanner>}

      <label className="flex items-start gap-2.5 cursor-pointer">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="accent-kp-accent w-4 h-4 mt-0.5"
        />
        <span className="text-sm text-ink-2">
          Confirmo que he revisado el contenido de esta nota clínica y asumo responsabilidad
          profesional por su contenido.
        </span>
      </label>

      <div className="flex justify-end">
        <Button
          type="button"
          onClick={onSign}
          disabled={!confirmed || isSigning || !saved}
          variant="secondary"
        >
          <PenLine className="w-3.5 h-3.5 mr-1.5" />
          {isSigning ? "Firmando…" : "Firmar y cerrar nota"}
        </Button>
      </div>
    </div>
  );
}

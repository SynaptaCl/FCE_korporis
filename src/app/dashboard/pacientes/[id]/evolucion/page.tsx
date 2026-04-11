import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, FileText, Plus, Lock, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getPatientById } from "@/app/actions/patients";
import { getSoapNotes } from "@/app/actions/soap";
import { getEvaluaciones } from "@/app/actions/evaluacion";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { SoapForm } from "@/components/modules/SoapForm";
import { calculateAge, formatRut } from "@/lib/utils";
import type { SoapNote } from "@/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getPatientById(id);
  if (!result.success) return { title: "Evolución SOAP" };
  const p = result.data;
  return { title: `Evolución SOAP — ${p.apellido_paterno} ${p.nombre}` };
}

// ── Helper: resumen de última evaluación para pre-llenar O ─────────────────

async function buildObjetivoHint(patientId: string): Promise<string> {
  const result = await getEvaluaciones(patientId);
  if (!result.success || result.data.length === 0) return "";

  const latest = result.data[0];
  const date = new Date(latest.created_at).toLocaleDateString("es-CL", {
    day: "numeric", month: "short", year: "numeric",
  });

  const esp = latest.especialidad.charAt(0).toUpperCase() + latest.especialidad.slice(1);
  const area = latest.sub_area.replace(/_/g, " ");
  return `${esp} (${area}) — ${date}`;
}

export default async function EvolucionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ nueva?: string; nota?: string }>;
}) {
  const { id } = await params;
  const { nueva, nota: notaId } = await searchParams;

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  const [patientResult, notesResult, objetivoHint] = await Promise.all([
    getPatientById(id),
    getSoapNotes(id),
    buildObjetivoHint(id),
  ]);

  if (!patientResult.success) notFound();

  const p = patientResult.data;
  const allNotes = notesResult.success ? notesResult.data : [];

  const signedNotes = allNotes.filter((n) => n.firmado);
  const draftNotes = allNotes.filter((n) => !n.firmado);

  // Nota activa a mostrar en el form:
  // - Si viene ?nota=id → esa nota específica
  // - Si viene ?nueva → no hay nota inicial (form vacío)
  // - Por defecto: el último borrador
  let activeNote: SoapNote | null = null;
  if (notaId) {
    activeNote = allNotes.find((n) => n.id === notaId) ?? null;
  } else if (!nueva) {
    activeNote = draftNotes[0] ?? null;
  }

  const fullName = [p.nombre, p.apellido_paterno, p.apellido_materno].filter(Boolean).join(" ") || "Sin nombre";
  const age = calculateAge(p.fecha_nacimiento);

  return (
    <div className="max-w-3xl space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-ink-3">
        <Link href={`/dashboard/pacientes/${id}`}
          className="flex items-center gap-1 hover:text-kp-accent transition-colors">
          <ChevronLeft className="w-4 h-4" />
          {fullName}
        </Link>
        <span>/</span>
        <span className="text-ink-2 font-medium">M4 · Evolución SOAP</span>
      </div>

      {/* Patient summary */}
      <div className="bg-surface-1 rounded-xl border border-kp-border px-5 py-3 flex items-center gap-3">
        <div className="w-9 h-9 bg-kp-primary/10 border border-kp-accent/20 rounded-lg flex items-center justify-center text-kp-primary text-sm font-bold shrink-0">
          {`${p.nombre?.[0] ?? ""}${p.apellido_paterno?.[0] ?? ""}`.toUpperCase() || "?"}
        </div>
        <div>
          <p className="text-sm font-semibold text-ink-1">{fullName}</p>
          <p className="text-xs text-ink-3">{formatRut(p.rut)} · {age !== null ? `${age} años` : "Sin registro"}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {draftNotes.length > 0 && (
            <Badge variant="warning">{draftNotes.length} borrador{draftNotes.length !== 1 ? "es" : ""}</Badge>
          )}
          {signedNotes.length > 0 && (
            <Badge variant="teal">{signedNotes.length} firmada{signedNotes.length !== 1 ? "s" : ""}</Badge>
          )}
        </div>
      </div>

      {/* Action bar */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink-1">
          {activeNote
            ? activeNote.firmado
              ? "Nota firmada (solo lectura)"
              : "Editando borrador"
            : "Nueva nota SOAP"}
        </h3>
        <Link
          href={`/dashboard/pacientes/${id}/evolucion?nueva=1`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-kp-accent text-white hover:bg-kp-primary transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Nueva sesión SOAP
        </Link>
      </div>

      {/* SOAP Form */}
      <Card icon={<FileText className="w-4 h-4" />} title="Nota SOAP">
        <SoapForm
          patientId={id}
          initialNote={activeNote}
          objetivoHint={objetivoHint || undefined}
        />
      </Card>

      {/* Historial de notas firmadas */}
      {signedNotes.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-ink-3 uppercase tracking-widest flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            Historial — {signedNotes.length} nota{signedNotes.length !== 1 ? "s" : ""} firmada{signedNotes.length !== 1 ? "s" : ""}
          </h4>
          <div className="space-y-2">
            {signedNotes.map((note) => (
              <SignedNoteSummary key={note.id} note={note} patientId={id} />
            ))}
          </div>
        </div>
      )}

      {/* Borradores adicionales */}
      {draftNotes.length > 1 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-ink-3 uppercase tracking-widest">
            Otros borradores
          </h4>
          <div className="space-y-2">
            {draftNotes.slice(1).map((note) => (
              <DraftNoteSummary key={note.id} note={note} patientId={id} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Nota firmada (resumen) ────────────────────────────────────────────────

function SignedNoteSummary({ note, patientId }: { note: SoapNote; patientId: string }) {
  return (
    <Link
      href={`/dashboard/pacientes/${patientId}/evolucion?nota=${note.id}`}
      className="block bg-surface-1 border border-kp-border rounded-xl px-4 py-3 hover:border-kp-border-md transition-colors group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-kp-success shrink-0" />
            <span className="text-xs font-semibold text-ink-1 truncate">
              Nota del {new Date(note.created_at).toLocaleDateString("es-CL", {
                weekday: "long", day: "numeric", month: "long", year: "numeric",
              })}
            </span>
          </div>
          <p className="text-xs text-ink-3 line-clamp-2 ml-5">
            {note.subjetivo.slice(0, 120)}{note.subjetivo.length > 120 ? "…" : ""}
          </p>
        </div>
        <div className="shrink-0 text-right space-y-1">
          <Badge variant="teal">Firmada</Badge>
          <p className="text-[0.6rem] text-ink-4">{note.firmado_por}</p>
        </div>
      </div>
    </Link>
  );
}

// ── Borrador (resumen) ────────────────────────────────────────────────────

function DraftNoteSummary({ note, patientId }: { note: SoapNote; patientId: string }) {
  return (
    <Link
      href={`/dashboard/pacientes/${patientId}/evolucion?nota=${note.id}`}
      className="block bg-kp-warning-lt border border-amber-200 rounded-xl px-4 py-3 hover:border-amber-300 transition-colors"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="w-3.5 h-3.5 text-kp-warning shrink-0" />
          <span className="text-xs font-semibold text-amber-900 truncate">
            Borrador — {new Date(note.created_at).toLocaleDateString("es-CL", {
              day: "numeric", month: "short", year: "numeric",
            })}
          </span>
        </div>
        <Badge variant="warning">Borrador</Badge>
      </div>
    </Link>
  );
}

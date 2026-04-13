import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Stethoscope } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getPatientById } from "@/app/actions/patients";
import { getEvaluaciones } from "@/app/actions/evaluacion";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { KinesiologiaEval } from "@/components/modules/KinesiologiaEval";
import { FonoaudiologiaEval } from "@/components/modules/FonoaudiologiaEval";
import { MasoterapiaEval } from "@/components/modules/MasoterapiaEval";
import { calculateAge, formatRut } from "@/lib/utils";
import { ESPECIALIDAD_LABELS } from "@/lib/constants";
import type { Especialidad } from "@/lib/constants";
import type { Evaluation } from "@/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getPatientById(id);
  if (!result.success) return { title: "Evaluación" };
  const p = result.data;
  return { title: `Evaluación — ${p.apellido_paterno} ${p.nombre}` };
}

// ── Especialidad tabs ──────────────────────────────────────────────────────

const ESPECIALIDAD_TABS: { key: Especialidad; label: string }[] = [
  { key: "kinesiologia", label: "Kinesiología" },
  { key: "fonoaudiologia", label: "Fonoaudiología" },
  { key: "masoterapia", label: "Masoterapia" },
];

export default async function EvaluacionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ esp?: string }>;
}) {
  const { id } = await params;
  const { esp } = await searchParams;

  // Obtener sesión y especialidad del profesional
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  const { data: profesional } = await supabase
    .from("profesionales")
    .select("especialidad")
    .eq("auth_id", user.id)
    .maybeSingle();

  const rawEspecialidad = profesional?.especialidad ?? "kinesiologia";
  const isAdminUser = rawEspecialidad === "Administración Clínica";
  // Normalizar a Especialidad type: la DB guarda "Kinesiología" (con tilde/mayúscula),
  // el type espera "kinesiologia" (sin tilde, minúscula).
  const profEspecialidad: Especialidad = isAdminUser
    ? "kinesiologia"
    : (rawEspecialidad.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") as Especialidad);

  // Determinar tab activa (default: especialidad del profesional)
  const validEsp = ESPECIALIDAD_TABS.map((t) => t.key);
  const activeEsp: Especialidad = validEsp.includes(esp as Especialidad)
    ? (esp as Especialidad)
    : profEspecialidad;

  // Fetch data en paralelo
  const [patientResult, evalResult] = await Promise.all([
    getPatientById(id),
    getEvaluaciones(id),
  ]);

  if (!patientResult.success) notFound();

  const p = patientResult.data;
  const allEvals = evalResult.success ? evalResult.data : [];

  const evalsByEsp = (esp: string): Evaluation[] =>
    allEvals.filter((e) => e.especialidad === esp);

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
        <span className="text-ink-2 font-medium">M3 · Evaluación</span>
      </div>

      {/* Patient summary */}
      <div className="bg-surface-1 rounded-xl border border-kp-border px-5 py-3 flex items-center gap-3">
        <div className="w-9 h-9 bg-kp-primary/10 border border-kp-accent/20 rounded-lg flex items-center justify-center text-kp-primary text-sm font-bold shrink-0">
          {`${p.nombre?.[0] ?? ""}${p.apellido_paterno?.[0] ?? ""}`.toUpperCase() || "?"}
        </div>
        <div>
          <p className="text-sm font-semibold text-ink-1">{fullName}</p>
          <p className="text-xs text-ink-3">
            {formatRut(p.rut)} · {age !== null ? `${age} años` : "Sin registro"}
          </p>
        </div>
        <div className="ml-auto">
          <Badge variant="teal">
            {isAdminUser ? "Acceso completo — Admin" : `${ESPECIALIDAD_LABELS[profEspecialidad]} — edición activa`}
          </Badge>
        </div>
      </div>

      {/* Especialidad tabs */}
      <div className="flex gap-2 border-b border-kp-border pb-0">
        {ESPECIALIDAD_TABS.map((tab) => {
          const hasData = allEvals.some((e) => e.especialidad === tab.key);
          const isActive = activeEsp === tab.key;
          return (
            <Link
              key={tab.key}
              href={`/dashboard/pacientes/${id}/evaluacion?esp=${tab.key}`}
              className={[
                "px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap",
                isActive
                  ? "border-kp-accent text-kp-primary"
                  : "border-transparent text-ink-3 hover:text-ink-2 hover:border-kp-border",
              ].join(" ")}
            >
              {tab.label}
              {hasData && !isActive && (
                <span className="ml-1.5 text-[0.5rem] text-kp-accent">●</span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Specialty panel */}
      <Card
        title={`${ESPECIALIDAD_LABELS[activeEsp]}`}
        icon={<Stethoscope className="w-4 h-4" />}
      >
        {activeEsp === "kinesiologia" && (
          <KinesiologiaEval
            patientId={id}
            evaluaciones={evalsByEsp("kinesiologia")}
            readOnly={!isAdminUser && profEspecialidad !== "kinesiologia"}
          />
        )}
        {activeEsp === "fonoaudiologia" && (
          <FonoaudiologiaEval
            patientId={id}
            evaluaciones={evalsByEsp("fonoaudiologia")}
            readOnly={!isAdminUser && profEspecialidad !== "fonoaudiologia"}
          />
        )}
        {activeEsp === "masoterapia" && (
          <MasoterapiaEval
            patientId={id}
            evaluaciones={evalsByEsp("masoterapia")}
            readOnly={!isAdminUser && profEspecialidad !== "masoterapia"}
          />
        )}
      </Card>
    </div>
  );
}

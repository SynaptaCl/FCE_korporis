import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ClipboardList, Activity } from "lucide-react";
import { getPatientById } from "@/app/actions/patients";
import { getAnamnesis, getLatestVitalSigns } from "@/app/actions/anamnesis";
import { Card } from "@/components/ui/Card";
import { AnamnesisForm } from "@/components/modules/AnamnesisForm";
import { VitalSignsPanel } from "@/components/modules/VitalSignsPanel";
import { calculateAge, formatRut } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getPatientById(id);
  if (!result.success) return { title: "Anamnesis" };
  const p = result.data;
  return {
    title: `Anamnesis — ${p.apellido_paterno} ${p.nombre}`,
  };
}

export default async function AnamnesisPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [patientResult, anamnesisResult, vitalSignsResult] = await Promise.all([
    getPatientById(id),
    getAnamnesis(id),
    getLatestVitalSigns(id),
  ]);

  if (!patientResult.success) notFound();

  const p = patientResult.data;
  const anamnesis = anamnesisResult.success ? anamnesisResult.data : null;
  const latestVitalSigns = vitalSignsResult.success ? vitalSignsResult.data : null;

  const fullName = [p.nombre, p.apellido_paterno, p.apellido_materno].filter(Boolean).join(" ") || "Sin nombre";
  const age = calculateAge(p.fecha_nacimiento);

  return (
    <div className="max-w-3xl space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-ink-3">
        <Link
          href={`/dashboard/pacientes/${id}`}
          className="flex items-center gap-1 hover:text-kp-accent transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          {fullName}
        </Link>
        <span>/</span>
        <span className="text-ink-2 font-medium">M2 · Anamnesis</span>
      </div>

      {/* Patient summary */}
      <div className="bg-surface-1 rounded-xl border border-kp-border px-5 py-3 flex items-center gap-3">
        <div className="w-9 h-9 bg-kp-primary/10 border border-kp-accent/20 rounded-lg flex items-center justify-center text-kp-primary text-sm font-bold shrink-0">
          {`${p.nombre?.[0] ?? ""}${p.apellido_paterno?.[0] ?? ""}`.toUpperCase() || "?"}
        </div>
        <div>
          <p className="text-sm font-semibold text-ink-1">{fullName}</p>
          <p className="text-xs text-ink-3">
            {formatRut(p.rut)} · {age !== null ? `${age} años` : "Sin registro"} ·{" "}
            {p.sexo_registral === "M"
              ? "Masculino"
              : p.sexo_registral === "F"
                ? "Femenino"
                : "Otro"}
          </p>
        </div>
      </div>

      {/* Signos vitales */}
      <Card title="Signos Vitales" icon={<Activity className="w-4 h-4" />}>
        <VitalSignsPanel patientId={id} latestVitalSigns={latestVitalSigns} />
      </Card>

      {/* Anamnesis */}
      <Card
        title="M2 · Anamnesis"
        icon={<ClipboardList className="w-4 h-4" />}
      >
        <AnamnesisForm patientId={id} initialData={anamnesis} />
      </Card>
    </div>
  );
}

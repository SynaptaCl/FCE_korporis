import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Pencil } from "lucide-react";
import { getPatientById } from "@/app/actions/patients";
import { PatientForm } from "@/components/modules/PatientForm";
import { Card } from "@/components/ui/Card";
import { formatRun } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getPatientById(id);
  if (!result.success) return { title: "Editar Paciente" };
  const p = result.data;
  return { title: `Editar — ${p.apellido_paterno} ${p.nombre}` };
}

export default async function EditarPacientePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getPatientById(id);

  if (!result.success) notFound();

  const patient = result.data;
  const fullName = [patient.nombre, patient.apellido_paterno, patient.apellido_materno].filter(Boolean).join(" ") || "Sin nombre";

  return (
    <div className="max-w-2xl space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-ink-3">
        <Link
          href="/dashboard/pacientes"
          className="flex items-center gap-1 hover:text-kp-accent transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Pacientes
        </Link>
        <span>/</span>
        <Link
          href={`/dashboard/pacientes/${id}`}
          className="hover:text-kp-accent transition-colors truncate max-w-[160px]"
        >
          {fullName}
        </Link>
        <span>/</span>
        <span className="text-ink-2 font-medium">Editar M1</span>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-ink-1 flex items-center gap-2">
          <Pencil className="w-5 h-5 text-kp-accent" />
          Editar Ficha — M1
        </h2>
        <p className="text-sm text-ink-3 mt-0.5">
          RUN:{" "}
          <span className="font-mono font-semibold text-ink-2">
            {formatRun(patient.run)}
          </span>{" "}
          · {fullName}
        </p>
      </div>

      <Card>
        <PatientForm mode="edit" patientId={id} initialData={patient} />
      </Card>
    </div>
  );
}

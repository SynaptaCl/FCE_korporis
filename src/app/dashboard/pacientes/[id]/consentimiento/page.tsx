import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, FileSignature } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getPatientById } from "@/app/actions/patients";
import { getConsentimientos } from "@/app/actions/consentimiento";
import { Card } from "@/components/ui/Card";
import { ConsentManager } from "@/components/modules/ConsentManager";
import { calculateAge, formatRut } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getPatientById(id);
  if (!result.success) return { title: "Consentimiento" };
  const p = result.data;
  return { title: `Consentimiento — ${p.apellido_paterno} ${p.nombre}` };
}

export default async function ConsentimientoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  const [patientResult, consentResult] = await Promise.all([
    getPatientById(id),
    getConsentimientos(id),
  ]);

  if (!patientResult.success) notFound();

  const p = patientResult.data;
  const consentimientos = consentResult.success ? consentResult.data : [];
  const fullName =
    [p.nombre, p.apellido_paterno, p.apellido_materno]
      .filter(Boolean)
      .join(" ") || "Sin nombre";
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
        <span className="text-ink-2 font-medium">M5 · Consentimiento</span>
      </div>

      {/* Patient summary */}
      <div className="bg-surface-1 rounded-xl border border-kp-border px-5 py-4 flex items-center gap-4">
        <FileSignature className="w-8 h-8 text-kp-accent shrink-0" />
        <div>
          <h2 className="text-base font-bold text-ink-1">{fullName}</h2>
          <p className="text-xs text-ink-3">
            {formatRut(p.rut)} ·{" "}
            {age !== null ? `${age} años` : "Sin registro"}
          </p>
        </div>
      </div>

      {/* Módulo */}
      <Card className="p-6">
        <ConsentManager patientId={id} consentimientos={consentimientos} />
      </Card>
    </div>
  );
}

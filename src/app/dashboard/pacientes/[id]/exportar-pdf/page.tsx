import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getPdfPatientData } from "@/app/actions/exportar-pdf";
import { PdfExportView } from "@/components/modules/PdfExportView";

export const metadata = { title: "Exportar PDF — FCE Korporis" };

export default async function ExportarPdfPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");

  const result = await getPdfPatientData(id);
  if (!result.success) notFound();

  const generatedAt = new Date().toLocaleString("es-CL", { timeZone: "America/Santiago" });

  const patient = result.data.patient;
  const fullName =
    [patient.nombre, patient.apellido_paterno, patient.apellido_materno]
      .filter(Boolean)
      .join(" ") || "Paciente";

  return (
    <div>
      {/* Breadcrumb */}
      <div className="max-w-[860px] mx-auto mb-3 flex items-center gap-1.5 text-sm text-ink-3">
        <Link
          href={`/dashboard/pacientes/${id}`}
          className="flex items-center gap-1 hover:text-kp-accent transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Volver a ficha de {fullName}
        </Link>
      </div>
      <PdfExportView data={result.data} generatedAt={generatedAt} />
    </div>
  );
}

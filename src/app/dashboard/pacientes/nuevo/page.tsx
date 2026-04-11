import Link from "next/link";
import { ChevronLeft, FilePlus } from "lucide-react";
import { PatientForm } from "@/components/modules/PatientForm";
import { Card } from "@/components/ui/Card";

export const metadata = { title: "Nueva Ficha de Paciente" };

export default function NuevoPacientePage() {
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
        <span className="text-ink-2 font-medium">Nueva ficha</span>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-ink-1 flex items-center gap-2">
          <FilePlus className="w-6 h-6 text-kp-accent" />
          Nueva Ficha de Paciente
        </h2>
        <p className="text-sm text-ink-3 mt-0.5">
          Módulo M1 · Identificación y Perfil Sociodemográfico (Decreto 41 MINSAL)
        </p>
      </div>

      <Card>
        <PatientForm mode="create" />
      </Card>
    </div>
  );
}

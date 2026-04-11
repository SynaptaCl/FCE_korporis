import { getPatients } from "@/app/actions/patients";
import { PatientList } from "@/components/modules/PatientList";
import { AlertBanner } from "@/components/ui/AlertBanner";

export const metadata = { title: "Pacientes" };

export default async function PacientesPage() {
  const result = await getPatients();

  return (
    <div className="max-w-5xl space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-ink-1">Pacientes</h2>
        <p className="text-sm text-ink-3 mt-0.5">
          Registro de fichas clínicas activas
        </p>
      </div>

      {!result.success ? (
        <AlertBanner variant="danger" title="Error al cargar pacientes">
          {result.error}
        </AlertBanner>
      ) : (
        <PatientList patients={result.data} />
      )}
    </div>
  );
}

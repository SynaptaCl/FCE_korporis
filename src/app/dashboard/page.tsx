import { Calendar, Clock, Users, AlertCircle } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { CLINIC_FULL_NAME } from "@/lib/constants";

export const metadata = {
  title: "Dashboard",
};

export default function DashboardPage() {
  const hoy = formatDate(new Date());

  return (
    <div className="max-w-4xl space-y-6">
      {/* Encabezado */}
      <div>
        <h2 className="text-2xl font-bold text-ink-1">Agenda Diaria</h2>
        <p className="text-sm text-ink-3 mt-0.5 capitalize">{hoy}</p>
      </div>

      {/* Banner en desarrollo */}
      <div className="flex items-start gap-3 bg-kp-info-lt border border-kp-info/20 rounded-lg px-5 py-4">
        <AlertCircle className="w-5 h-5 text-kp-info mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-kp-info">
            Módulo en desarrollo
          </p>
          <p className="text-sm text-ink-2 mt-0.5">
            La agenda diaria se implementará en una fase posterior. Por ahora
            accede al módulo de pacientes desde el menú lateral.
          </p>
        </div>
      </div>

      {/* Cards resumen — placeholders */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard
          icon={<Calendar className="w-5 h-5 text-kp-accent" />}
          label="Citas hoy"
          value="—"
          bg="bg-kp-accent-xs"
        />
        <SummaryCard
          icon={<Users className="w-5 h-5 text-kp-secondary" />}
          label="Pacientes activos"
          value="—"
          bg="bg-kp-secondary-lt"
        />
        <SummaryCard
          icon={<Clock className="w-5 h-5 text-ink-3" />}
          label="Próxima cita"
          value="—"
          bg="bg-surface-0"
        />
      </div>

      <p className="text-xs text-ink-3">
        {CLINIC_FULL_NAME} · Ficha Clínica Electrónica
      </p>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  bg,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  bg: string;
}) {
  return (
    <div
      className={`${bg} rounded-xl border border-kp-border px-5 py-4 flex items-center gap-4`}
    >
      <div className="p-2 bg-surface-1 rounded-lg shadow-sm">{icon}</div>
      <div>
        <p className="text-xs text-ink-3 font-medium">{label}</p>
        <p className="text-2xl font-bold text-ink-1">{value}</p>
      </div>
    </div>
  );
}

import { Calendar, Clock, Users } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { CLINIC_FULL_NAME } from "@/lib/constants";
import { getAgendaDiaria } from "@/app/actions/patients";
import { AgendaTable } from "@/components/modules/AgendaTable";
import { AlertBanner } from "@/components/ui/AlertBanner";

export const metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const hoy = formatDate(new Date());
  const agendaResult = await getAgendaDiaria();
  const citas = agendaResult.success ? agendaResult.data : [];

  const citasHoy = citas.length;
  const proximaCita = citas.find((c) => c.estado === "confirmada");
  const proximaHora = proximaCita ? proximaCita.hora_inicio.slice(0, 5) : "—";

  return (
    <div className="max-w-4xl space-y-6">
      {/* Encabezado */}
      <div>
        <h2 className="text-2xl font-bold text-ink-1">Agenda Diaria</h2>
        <p className="text-sm text-ink-3 mt-0.5 capitalize">{hoy}</p>
      </div>

      {/* Error cargando agenda */}
      {!agendaResult.success && (
        <AlertBanner variant="danger" title="Error al cargar la agenda">
          {agendaResult.error}
        </AlertBanner>
      )}

      {/* Cards resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard
          icon={<Calendar className="w-5 h-5 text-kp-accent" />}
          label="Citas hoy"
          value={String(citasHoy)}
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
          value={proximaHora}
          bg="bg-surface-0"
        />
      </div>

      {/* Agenda */}
      <AgendaTable citas={citas} />

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

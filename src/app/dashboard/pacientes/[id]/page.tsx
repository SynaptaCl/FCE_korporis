import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ChevronLeft,
  Pencil,
  User,
  MapPin,
  Shield,
  Phone,
  ClipboardList,
  Stethoscope,
  FileSignature,
  FileText,
  ShieldCheck,
} from "lucide-react";
import { getPatientById } from "@/app/actions/patients";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { calculateAge, formatRut, cn } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getPatientById(id);
  if (!result.success) return { title: "Paciente" };
  const p = result.data;
  return {
    title: `${p.apellido_paterno} ${p.nombre}`,
  };
}

// ── Módulos disponibles ────────────────────────────────────────────────────

const MODULES = [
  {
    id: "m1",
    label: "M1 · Identificación",
    icon: <User className="w-5 h-5" />,
    href: null, // página actual
    available: true,
  },
  {
    id: "m2",
    label: "M2 · Anamnesis",
    icon: <ClipboardList className="w-5 h-5" />,
    href: "anamnesis",
    available: true,
  },
  {
    id: "m3",
    label: "M3 · Evaluación",
    icon: <Stethoscope className="w-5 h-5" />,
    href: "evaluacion",
    available: true,
  },
  {
    id: "m4",
    label: "M4 · Evolución SOAP",
    icon: <FileText className="w-5 h-5" />,
    href: "evolucion",
    available: true,
  },
  {
    id: "m5",
    label: "M5 · Consentimiento",
    icon: <FileSignature className="w-5 h-5" />,
    href: "consentimiento",
    available: false,
  },
  {
    id: "m6",
    label: "M6 · Auditoría",
    icon: <ShieldCheck className="w-5 h-5" />,
    href: "auditoria",
    available: false,
  },
] as const;

// ── Página ─────────────────────────────────────────────────────────────────

export default async function PatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getPatientById(id);

  if (!result.success) notFound();

  const p = result.data;
  const age = calculateAge(p.fecha_nacimiento);
  const fullName = [p.nombre, p.apellido_paterno, p.apellido_materno].filter(Boolean).join(" ") || "Sin nombre";
  const initials = `${p.nombre?.[0] ?? ""}${p.apellido_paterno?.[0] ?? ""}`.toUpperCase() || "?";

  const previsionLabel =
    p.prevision?.tipo === "FONASA"
      ? `FONASA ${p.prevision.tramo ?? ""}`.trim()
      : p.prevision?.tipo === "Isapre"
        ? p.prevision.isapre ?? "Isapre"
        : "Particular";

  return (
    <div className="max-w-4xl space-y-5">
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
        <span className="text-ink-2 font-medium truncate">{fullName}</span>
      </div>

      {/* Patient header */}
      <div className="bg-surface-1 rounded-xl border border-kp-border px-6 py-5 flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 bg-kp-primary/10 border-2 border-kp-accent/20 rounded-xl flex items-center justify-center text-kp-primary text-xl font-bold shrink-0">
            {initials}
          </div>
          <div>
            <h2 className="text-xl font-bold text-ink-1">{fullName}</h2>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-sm text-ink-2">
              <span>
                <span className="font-medium text-ink-1">RUT:</span>{" "}
                {formatRut(p.rut)}
              </span>
              <span>
                <span className="font-medium text-ink-1">Edad:</span>{" "}
                {age !== null ? `${age} años` : "Sin registro"}
              </span>
              <span>
                <span className="font-medium text-ink-1">Sexo:</span>{" "}
                {p.sexo_registral === "M"
                  ? "Masculino"
                  : p.sexo_registral === "F"
                    ? "Femenino"
                    : p.sexo_registral === "Otro"
                      ? "Otro"
                      : "Sin registro"}
              </span>
              <span>
                <span className="font-medium text-ink-1">Previsión:</span>{" "}
                {previsionLabel}
              </span>
            </div>
          </div>
        </div>
        <Button href={`/dashboard/pacientes/${id}/editar`} variant="secondary" size="sm">
          <Pencil className="w-3.5 h-3.5 mr-1.5" />
          Editar M1
        </Button>
      </div>

      {/* Módulos */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
        {MODULES.map((mod) => {
          const inner = (
            <>
              <div className="flex justify-center mb-1">{mod.icon}</div>
              <p className="text-[0.65rem] font-semibold leading-tight">
                {mod.label}
              </p>
              {!mod.available && (
                <p className="text-[0.6rem] text-ink-4 mt-0.5">Fase siguiente</p>
              )}
            </>
          );
          const cls = cn(
            "rounded-lg border p-3 text-center transition-colors",
            mod.available
              ? "bg-kp-accent-xs border-kp-accent/20 text-kp-primary"
              : "bg-surface-0 border-kp-border text-ink-4 opacity-60"
          );
          if (mod.available && mod.href) {
            return (
              <Link
                key={mod.id}
                href={`/dashboard/pacientes/${id}/${mod.href}`}
                className={cn(cls, "hover:border-kp-accent/50 hover:bg-kp-accent-lt")}
              >
                {inner}
              </Link>
            );
          }
          return (
            <div key={mod.id} className={cls}>
              {inner}
            </div>
          );
        })}
      </div>

      {/* Datos M1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Datos personales */}
        <Card title="Datos Personales" icon={<User className="w-4 h-4" />}>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
            <DataField label="RUT" value={formatRut(p.rut)} />
            <DataField
              label="Fecha nacimiento"
              value={
                p.fecha_nacimiento
                  ? `${new Date(p.fecha_nacimiento + "T12:00:00").toLocaleDateString("es-CL")}${age !== null ? ` (${age} años)` : ""}`
                  : "Sin registro"
              }
            />
            <DataField label="Nacionalidad" value={p.nacionalidad ?? "Sin registro"} />
            <DataField label="Ocupación" value={p.ocupacion ?? "Sin registro"} />
            <DataField label="Teléfono" value={p.telefono ?? "Sin registro"} />
            <DataField label="Email" value={p.email ?? "—"} />
            {p.identidad_genero && (
              <DataField
                label="Identidad de género"
                value={p.identidad_genero}
              />
            )}
          </dl>
        </Card>

        {/* Dirección */}
        <Card title="Dirección" icon={<MapPin className="w-4 h-4" />}>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
            <DataField label="Región" value={p.direccion?.region ?? "Sin registro"} />
            <DataField label="Comuna" value={p.direccion?.comuna ?? "Sin registro"} />
            <DataField
              label="Dirección"
              value={
                p.direccion?.calle
                  ? `${p.direccion.calle} ${p.direccion.numero ?? ""}`.trim()
                  : "Sin registro"
              }
              wide
            />
          </dl>
        </Card>

        {/* Previsión */}
        <Card title="Previsión" icon={<Shield className="w-4 h-4" />}>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
            <DataField label="Tipo" value={p.prevision?.tipo ?? "Sin registro"} />
            {p.prevision?.tipo === "FONASA" && p.prevision.tramo && (
              <DataField label="Tramo" value={p.prevision.tramo} />
            )}
            {p.prevision?.tipo === "Isapre" && p.prevision.isapre && (
              <DataField label="Isapre" value={p.prevision.isapre} />
            )}
          </dl>
          <div className="mt-3">
            <Badge
              variant={
                p.prevision?.tipo === "FONASA"
                  ? "info"
                  : p.prevision?.tipo === "Isapre"
                    ? "teal"
                    : "default"
              }
            >
              {previsionLabel}
            </Badge>
          </div>
        </Card>

        {/* Contacto emergencia */}
        <Card
          title="Contacto de Emergencia"
          icon={<Phone className="w-4 h-4" />}
        >
          <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
            <DataField
              label="Nombre"
              value={p.contacto_emergencia?.nombre ?? "Sin registro"}
              wide
            />
            <DataField
              label="Parentesco"
              value={p.contacto_emergencia?.parentesco ?? "Sin registro"}
            />
            <DataField
              label="Teléfono"
              value={p.contacto_emergencia?.telefono ?? "Sin registro"}
            />
          </dl>
        </Card>
      </div>
    </div>
  );
}

// ── Helper ─────────────────────────────────────────────────────────────────

function DataField({
  label,
  value,
  wide = false,
}: {
  label: string;
  value: string | null | undefined;
  wide?: boolean;
}) {
  return (
    <div className={cn(wide && "col-span-2")}>
      <dt className="text-[0.65rem] font-semibold text-ink-3 uppercase tracking-wide">
        {label}
      </dt>
      <dd className="text-sm text-ink-1 mt-0.5">{value ?? "—"}</dd>
    </div>
  );
}

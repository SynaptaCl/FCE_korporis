import Link from "next/link";
import {
  User,
  ClipboardList,
  Stethoscope,
  FileText,
  FileSignature,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  id: string;
  label: string;
  sublabel: string;
  icon: React.ReactNode;
  href: string;
  adminOnly?: boolean;
}

interface PatientNavProps {
  patientId: string;
  activeModule?: string;
  isAdmin: boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: "m1",
    label: "M1",
    sublabel: "Identificación",
    icon: <User className="w-4 h-4" />,
    href: "",
  },
  {
    id: "m2",
    label: "M2",
    sublabel: "Anamnesis",
    icon: <ClipboardList className="w-4 h-4" />,
    href: "anamnesis",
  },
  {
    id: "m3",
    label: "M3",
    sublabel: "Evaluación",
    icon: <Stethoscope className="w-4 h-4" />,
    href: "evaluacion",
  },
  {
    id: "m4",
    label: "M4",
    sublabel: "Evolución SOAP",
    icon: <FileText className="w-4 h-4" />,
    href: "evolucion",
  },
  {
    id: "m5",
    label: "M5",
    sublabel: "Consentimiento",
    icon: <FileSignature className="w-4 h-4" />,
    href: "consentimiento",
  },
  {
    id: "m6",
    label: "M6",
    sublabel: "Auditoría",
    icon: <ShieldCheck className="w-4 h-4" />,
    href: "auditoria",
    adminOnly: true,
  },
];

export function PatientNav({
  patientId,
  activeModule = "m1",
  isAdmin,
}: PatientNavProps) {
  const visibleItems = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);

  return (
    <nav className="bg-surface-1 rounded-xl border border-kp-border overflow-hidden">
      <div className="px-4 py-3 border-b border-kp-border">
        <p className="text-[0.6rem] font-bold text-ink-3 uppercase tracking-widest">
          Módulos
        </p>
      </div>
      <ul className="py-1">
        {visibleItems.map((item) => {
          const isActive = activeModule === item.id;
          const href = item.href
            ? `/dashboard/pacientes/${patientId}/${item.href}`
            : `/dashboard/pacientes/${patientId}`;

          return (
            <li key={item.id}>
              <Link
                href={href}
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5 transition-colors text-sm group",
                  isActive
                    ? "bg-kp-accent-xs text-kp-primary border-r-2 border-kp-accent"
                    : "text-ink-2 hover:bg-surface-0 hover:text-ink-1"
                )}
              >
                <span
                  className={cn(
                    "shrink-0 transition-colors",
                    isActive ? "text-kp-accent" : "text-ink-3 group-hover:text-kp-accent"
                  )}
                >
                  {item.icon}
                </span>
                <span className="min-w-0">
                  <span
                    className={cn(
                      "block text-[0.6rem] font-bold uppercase tracking-wide leading-none mb-0.5",
                      isActive ? "text-kp-accent" : "text-ink-4"
                    )}
                  >
                    {item.label}
                  </span>
                  <span className="block text-xs font-medium leading-none truncate">
                    {item.sublabel}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

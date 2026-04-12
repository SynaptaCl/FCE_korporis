"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Stethoscope,
  FileText,
  FileSignature,
  ShieldCheck,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PatientActionNavProps {
  patientId: string;
  isAdmin: boolean;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href: string;
  adminOnly?: boolean;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

type NavEntry = NavGroup | { item: NavItem };

function buildNav(patientId: string): NavEntry[] {
  const base = `/dashboard/pacientes/${patientId}`;
  return [
    {
      title: "Evaluación",
      items: [
        {
          id: "signos",
          label: "Signos Vitales",
          icon: <Activity className="w-4 h-4" />,
          href: `${base}/anamnesis`,
        },
        {
          id: "evaluacion",
          label: "Evaluación Kine/Fono/Maso",
          icon: <Stethoscope className="w-4 h-4" />,
          href: `${base}/evaluacion`,
        },
      ],
    },
    {
      title: "Evolución",
      items: [
        {
          id: "soap",
          label: "Notas SOAP",
          icon: <FileText className="w-4 h-4" />,
          href: `${base}/evolucion`,
        },
      ],
    },
    {
      item: {
        id: "consentimiento",
        label: "Consentimientos",
        icon: <FileSignature className="w-4 h-4" />,
        href: `${base}/consentimiento`,
      },
    },
    {
      item: {
        id: "auditoria",
        label: "Auditoría",
        icon: <ShieldCheck className="w-4 h-4" />,
        href: `${base}/auditoria`,
        adminOnly: true,
      },
    },
  ];
}

function NavLink({
  item,
  isActive,
}: {
  item: NavItem;
  isActive: boolean;
}) {
  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-2.5 px-3 py-2 min-h-[44px] rounded-lg text-sm transition-colors group",
        isActive
          ? "bg-kp-accent-xs text-kp-primary font-medium border border-kp-accent/30"
          : "text-ink-2 hover:bg-surface-0 hover:text-ink-1"
      )}
    >
      <span
        className={cn(
          "shrink-0 transition-colors",
          isActive
            ? "text-kp-accent"
            : "text-ink-3 group-hover:text-kp-accent"
        )}
      >
        {item.icon}
      </span>
      <span className="leading-tight text-xs font-medium">{item.label}</span>
    </Link>
  );
}

export function PatientActionNav({
  patientId,
  isAdmin,
}: PatientActionNavProps) {
  const pathname = usePathname();
  const entries = buildNav(patientId);

  function isActiveHref(href: string) {
    return pathname === href || pathname.startsWith(href + "?");
  }

  return (
    <nav className="bg-surface-1 rounded-xl border border-kp-border overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-kp-border flex items-center justify-between">
        <p className="text-[0.6rem] font-bold text-ink-3 uppercase tracking-widest">
          Acciones
        </p>
        <Link
          href={`/dashboard/pacientes/${patientId}/evolucion?nueva=1`}
          className="flex items-center gap-1 min-h-[44px] px-2 text-[0.65rem] font-semibold text-kp-accent hover:text-kp-primary transition-colors"
          title="Nueva nota SOAP"
        >
          <Plus className="w-3 h-3" />
          Nueva nota
        </Link>
      </div>

      {/* Nav entries */}
      <div className="p-2 space-y-1">
        {entries.map((entry, idx) => {
          if ("title" in entry) {
            // Grupo con sección
            return (
              <div key={entry.title}>
                {idx > 0 && <div className="my-1 border-t border-kp-border" />}
                <p className="px-3 pt-1 pb-0.5 text-[0.58rem] font-bold text-ink-4 uppercase tracking-wider">
                  {entry.title}
                </p>
                <div className="space-y-0.5">
                  {entry.items.map((item) => (
                    <NavLink
                      key={item.id}
                      item={item}
                      isActive={isActiveHref(item.href)}
                    />
                  ))}
                </div>
              </div>
            );
          }
          // Item standalone
          const { item } = entry;
          if (item.adminOnly && !isAdmin) return null;
          return (
            <div key={item.id}>
              <div className="my-1 border-t border-kp-border" />
              <NavLink item={item} isActive={isActiveHref(item.href)} />
            </div>
          );
        })}
      </div>
    </nav>
  );
}

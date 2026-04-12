"use client";

import { useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { createClient } from "@/lib/supabase/client";
import type { Especialidad, Rol } from "@/lib/constants";
import type { BrandingConfig } from "./BrandingInjector";

interface DashboardShellProps {
  children: React.ReactNode;
  practitionerName: string;
  practitionerInitials: string;
  especialidad: Especialidad;
  rol: Rol;
  branding: BrandingConfig | null;
}

const SECTION_TITLES: Record<string, string> = {
  agenda:    "Agenda Diaria",
  pacientes: "Pacientes",
  ficha:     "Ficha Clínica",
  fhir:      "Interoperabilidad FHIR",
  config:    "Configuración",
};

const PATH_TO_SECTION: Array<[string, string]> = [
  ["/dashboard/configuracion", "config"],
  ["/dashboard/pacientes",     "pacientes"],
  ["/dashboard",               "agenda"],
];

function getSectionFromPath(pathname: string): string {
  if (pathname.includes("/fhir")) return "fhir";
  for (const [prefix, section] of PATH_TO_SECTION) {
    if (pathname.startsWith(prefix)) return section;
  }
  return "agenda";
}

const SECTION_TO_PATH: Record<string, string> = {
  agenda:    "/dashboard",
  pacientes: "/dashboard/pacientes",
  config:    "/dashboard/configuracion",
  fhir:      "/dashboard/pacientes", // FHIR es por paciente; va a la lista
};

export function DashboardShell({
  children,
  practitionerName,
  practitionerInitials,
  especialidad,
  rol,
  branding,
}: DashboardShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const activeSection = getSectionFromPath(pathname);

  const handleNavigate = useCallback(
    (section: string) => {
      const path = SECTION_TO_PATH[section];
      if (path) router.push(path);
    },
    [router]
  );

  const handleLogout = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }, [router]);

  return (
    <div className="flex h-screen overflow-hidden bg-surface-0">
      <Sidebar
        practitionerName={practitionerName}
        practitionerInitials={practitionerInitials}
        especialidad={especialidad}
        rol={rol}
        activeSection={activeSection}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
        branding={branding}
      />

      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <TopBar title={SECTION_TITLES[activeSection] ?? "FCE Korporis"} />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}

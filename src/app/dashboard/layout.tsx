import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/layout/DashboardShell";
import type { Especialidad, Rol } from "@/lib/constants";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  // Verificar sesión — siempre getUser(), nunca getSession() en Server
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  // Obtener datos del profesional desde la tabla `profesionales`
  const { data: profesional } = await supabase
    .from("profesionales")
    .select("nombres, apellidos, especialidad, rol")
    .eq("id", user.id)
    .single();

  // Fallback si aún no tiene registro en profesionales
  const nombres = profesional?.nombres ?? user.email?.split("@")[0] ?? "Usuario";
  const apellidos = profesional?.apellidos ?? "";
  const especialidad = (profesional?.especialidad as Especialidad) ?? "kinesiologia";
  const rol = (profesional?.rol as Rol) ?? "profesional";

  const practitionerName = apellidos
    ? `${nombres} ${apellidos}`
    : nombres;

  // Iniciales: primera letra de nombres + primera letra de apellidos
  const initials = [nombres[0], apellidos[0]]
    .filter(Boolean)
    .join("")
    .toUpperCase() || "U";

  return (
    <DashboardShell
      practitionerName={practitionerName}
      practitionerInitials={initials}
      especialidad={especialidad}
      rol={rol}
    >
      {children}
    </DashboardShell>
  );
}

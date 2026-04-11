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
    .select("nombre, apellidos, especialidad, rol")
    .eq("id", user.id)
    .single();

  // Fallback si aún no tiene registro en profesionales
  const nombre = profesional?.nombre ?? user.email?.split("@")[0] ?? "Usuario";
  const apellidos = profesional?.apellidos ?? "";
  const especialidad = (profesional?.especialidad as Especialidad) ?? "kinesiologia";
  const rol = (profesional?.rol as Rol) ?? "profesional";

  const practitionerName = apellidos
    ? `${nombre} ${apellidos}`
    : nombre;

  // Iniciales: primera letra de nombre + primera letra de apellidos
  const initials = [nombre[0], apellidos[0]]
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

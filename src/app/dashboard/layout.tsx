import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { BrandingInjector, type BrandingConfig } from "@/components/layout/BrandingInjector";
import type { Especialidad, Rol } from "@/lib/constants";
import { canAccessFCE } from "@/lib/permissions";
import type { UserContext } from "@/lib/permissions";

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

  // Fetch profesional + admin_user en paralelo
  const [profesionalRes, adminRes] = await Promise.all([
    supabase
      .from("profesionales")
      .select("nombre, apellidos, especialidad, rol")
      .eq("auth_id", user.id)
      .maybeSingle(),
    supabase
      .from("admin_users")
      .select("id_clinica")
      .eq("auth_id", user.id)
      .maybeSingle(),
  ]);

  const profesional = profesionalRes.data;
  const idClinica = adminRes.data?.id_clinica ?? null;

  // Fetch branding si hay clínica asociada
  let branding: BrandingConfig | null = null;
  if (idClinica) {
    const { data: clinica } = await supabase
      .from("clinicas")
      .select("config")
      .eq("id", idClinica)
      .single();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    branding = (clinica?.config as any)?.branding ?? null;
  }

  const nombre    = profesional?.nombre   ?? user.email?.split("@")[0] ?? "Usuario";
  const apellidos = profesional?.apellidos ?? "";
  const especialidad = (profesional?.especialidad as Especialidad) ?? "kinesiologia";
  const rol          = (profesional?.rol          as Rol)          ?? "profesional";

  // Bloquear recepcionistas — no tienen acceso a la FCE
  const userCtx: UserContext = {
    userId: user.id,
    idClinica,
    rol,
    idProfesional: null,
    especialidad: null,
  };
  if (!canAccessFCE(userCtx)) {
    redirect("/login");
  }

  const practitionerName = apellidos ? `${nombre} ${apellidos}` : nombre;
  const initials = [nombre[0], apellidos[0]].filter(Boolean).join("").toUpperCase() || "U";

  return (
    <>
      <BrandingInjector branding={branding} />
      <DashboardShell
        practitionerName={practitionerName}
        practitionerInitials={initials}
        especialidad={especialidad}
        rol={rol}
        branding={branding}
      >
        {children}
      </DashboardShell>
    </>
  );
}

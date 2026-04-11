"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Activity, Lock, Mail, ShieldCheck, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { CLINIC_FULL_NAME } from "@/lib/constants";

const loginSchema = z.object({
  email: z.string().email("Ingresa un email válido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(data: LoginFormData) {
    setServerError(null);
    const supabase = createClient();

    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error) {
      setServerError(
        error.message === "Invalid login credentials"
          ? "Email o contraseña incorrectos."
          : "Error al iniciar sesión. Intenta de nuevo."
      );
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-kp-primary-deep flex flex-col items-center justify-center px-4">
      {/* Card */}
      <div className="w-full max-w-sm bg-surface-1 rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-kp-primary px-8 py-7">
          <div className="flex items-center gap-3 mb-1">
            <Activity className="w-7 h-7 text-kp-accent-lt" />
            <span className="text-white font-bold tracking-widest text-sm uppercase">
              FCE
            </span>
          </div>
          <h1 className="text-white text-xl font-bold leading-tight">
            {CLINIC_FULL_NAME}
          </h1>
          <p className="text-kp-accent-lt/70 text-xs mt-1">
            Ficha Clínica Electrónica — Acceso profesional
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="px-8 py-7 space-y-5"
          noValidate
        >
          {/* Error de servidor */}
          {serverError && (
            <div className="flex items-start gap-2.5 bg-kp-danger-lt border border-kp-danger/20 text-kp-danger rounded-lg px-4 py-3 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{serverError}</span>
            </div>
          )}

          {/* Email */}
          <div className="space-y-1.5">
            <label
              htmlFor="email"
              className="text-xs font-semibold text-ink-2 uppercase tracking-wide"
            >
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-4 pointer-events-none" />
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="profesional@korporis.cl"
                {...register("email")}
                className="w-full pl-10 pr-4 py-2.5 text-sm border border-kp-border rounded-lg bg-surface-0 text-ink-1 placeholder:text-ink-4 focus:outline-none focus:ring-2 focus:ring-kp-accent focus:border-transparent transition-colors"
              />
            </div>
            {errors.email && (
              <p className="text-xs text-kp-danger">{errors.email.message}</p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label
              htmlFor="password"
              className="text-xs font-semibold text-ink-2 uppercase tracking-wide"
            >
              Contraseña
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-4 pointer-events-none" />
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                {...register("password")}
                className="w-full pl-10 pr-4 py-2.5 text-sm border border-kp-border rounded-lg bg-surface-0 text-ink-1 placeholder:text-ink-4 focus:outline-none focus:ring-2 focus:ring-kp-accent focus:border-transparent transition-colors"
              />
            </div>
            {errors.password && (
              <p className="text-xs text-kp-danger">{errors.password.message}</p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-kp-accent hover:bg-kp-accent-md text-white font-semibold py-2.5 rounded-lg transition-colors text-sm cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed mt-1"
          >
            {isSubmitting ? "Iniciando sesión…" : "Iniciar sesión"}
          </button>
        </form>

        {/* Footer */}
        <div className="px-8 pb-6 flex items-center justify-center gap-1.5 text-xs text-ink-3">
          <ShieldCheck className="w-3.5 h-3.5 text-kp-success" />
          <span>Conexión segura · TLS 1.3</span>
        </div>
      </div>

      <p className="mt-6 text-xs text-white/30">
        Acceso restringido a personal autorizado de {CLINIC_FULL_NAME}
      </p>
    </div>
  );
}

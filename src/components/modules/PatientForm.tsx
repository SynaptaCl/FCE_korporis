"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle, XCircle, User, MapPin, Shield, Phone } from "lucide-react";
import { patientSchema } from "@/lib/validations";
import type { z } from "zod";
import { cleanRun, formatRun, validateRun } from "@/lib/run-validator";
import { calculateAge, cn } from "@/lib/utils";
import { REGIONES_CHILE } from "@/lib/constants";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { AlertBanner } from "@/components/ui/AlertBanner";
import { createPatient, updatePatient } from "@/app/actions/patients";
import type { Patient } from "@/types";

// ── Helpers ────────────────────────────────────────────────────────────────

function FormSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 border-b border-kp-border pb-2">
        <span className="text-kp-accent">{icon}</span>
        <h3 className="text-xs font-semibold text-ink-2 uppercase tracking-widest">
          {title}
        </h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>
    </div>
  );
}

// ── Props ──────────────────────────────────────────────────────────────────

interface PatientFormProps {
  mode: "create" | "edit";
  patientId?: string;
  initialData?: Patient;
}

// ── Componente ─────────────────────────────────────────────────────────────

export function PatientForm({ mode, patientId, initialData }: PatientFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const defaultValues: Partial<z.input<typeof patientSchema>> = initialData
    ? {
        run: cleanRun(initialData.run),
        nombres: initialData.nombres,
        apellido_paterno: initialData.apellido_paterno,
        apellido_materno: initialData.apellido_materno,
        fecha_nacimiento: initialData.fecha_nacimiento,
        sexo_registral: initialData.sexo_registral,
        identidad_genero: initialData.identidad_genero ?? "",
        nacionalidad: initialData.nacionalidad,
        telefono: initialData.telefono,
        email: initialData.email ?? "",
        direccion: initialData.direccion,
        ocupacion: initialData.ocupacion,
        prevision: initialData.prevision,
        contacto_emergencia: initialData.contacto_emergencia,
      }
    : {
        nacionalidad: "Chilena",
        sexo_registral: "M",
        prevision: { tipo: "Particular" },
      };

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof patientSchema>, unknown, z.output<typeof patientSchema>>({
    resolver: zodResolver(patientSchema),
    defaultValues,
  });

  const previsionTipo = watch("prevision.tipo");
  const fechaNacimiento = watch("fecha_nacimiento");
  const edad =
    fechaNacimiento && fechaNacimiento.length === 10
      ? calculateAge(fechaNacimiento)
      : null;

  async function onSubmit(data: z.output<typeof patientSchema>) {
    setServerError(null);

    if (mode === "create") {
      const result = await createPatient(data);
      if (!result.success) {
        setServerError(result.error);
        return;
      }
      router.push(`/dashboard/pacientes/${result.data.id}`);
    } else {
      const result = await updatePatient(patientId!, data);
      if (!result.success) {
        setServerError(result.error);
        return;
      }
      router.push(`/dashboard/pacientes/${patientId}`);
    }
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-8">
      {serverError && (
        <AlertBanner variant="danger" title="Error al guardar">
          {serverError}
        </AlertBanner>
      )}

      {/* ── Sección 1: Datos Personales ── */}
      <FormSection
        title="Datos Personales"
        icon={<User className="w-4 h-4" />}
      >
        {/* RUN — validación en tiempo real */}
        <Controller
          name="run"
          control={control}
          render={({ field }) => {
            const isValid =
              field.value && field.value.length >= 2
                ? validateRun(field.value)
                : null;
            const display = field.value
              ? formatRun(field.value)
              : "";

            return (
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-ink-1">
                  RUN <span className="text-kp-danger">*</span>
                </label>
                <div className="relative">
                  <input
                    value={display}
                    onChange={(e) =>
                      field.onChange(cleanRun(e.target.value))
                    }
                    onBlur={field.onBlur}
                    placeholder="12.345.678-K"
                    autoComplete="off"
                    className={cn(
                      "w-full px-3 py-2 pr-10 text-sm text-ink-1 bg-surface-1 border rounded-lg",
                      "placeholder:text-ink-4 outline-none transition-colors",
                      "focus:ring-2 focus:ring-kp-accent/30 focus:border-kp-accent",
                      errors.run ? "border-kp-danger" : "border-kp-border"
                    )}
                  />
                  {isValid !== null && (
                    <span
                      className={cn(
                        "absolute right-3 top-1/2 -translate-y-1/2",
                        isValid ? "text-kp-success" : "text-kp-danger"
                      )}
                    >
                      {isValid ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        <XCircle className="w-4 h-4" />
                      )}
                    </span>
                  )}
                </div>
                {errors.run && (
                  <p className="text-xs text-kp-danger">{errors.run.message}</p>
                )}
              </div>
            );
          }}
        />

        {/* Nombres — span 2 */}
        <div className="sm:col-span-2">
          <Input
            label="Nombres"
            required
            placeholder="María Fernanda"
            error={errors.nombres?.message}
            {...register("nombres")}
          />
        </div>

        <Input
          label="Apellido paterno"
          required
          placeholder="González"
          error={errors.apellido_paterno?.message}
          {...register("apellido_paterno")}
        />

        <Input
          label="Apellido materno"
          required
          placeholder="López"
          error={errors.apellido_materno?.message}
          {...register("apellido_materno")}
        />

        {/* Fecha de nacimiento con edad calculada */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-ink-1">
            Fecha de nacimiento <span className="text-kp-danger">*</span>
          </label>
          <div className="flex gap-2 items-center">
            <input
              type="date"
              max={new Date().toISOString().split("T")[0]}
              className={cn(
                "flex-1 px-3 py-2 text-sm text-ink-1 bg-surface-1 border rounded-lg",
                "outline-none transition-colors",
                "focus:ring-2 focus:ring-kp-accent/30 focus:border-kp-accent",
                errors.fecha_nacimiento ? "border-kp-danger" : "border-kp-border"
              )}
              {...register("fecha_nacimiento")}
            />
            {edad !== null && (
              <span className="text-xs text-kp-accent font-semibold whitespace-nowrap">
                {edad} años
              </span>
            )}
          </div>
          {errors.fecha_nacimiento && (
            <p className="text-xs text-kp-danger">
              {errors.fecha_nacimiento.message}
            </p>
          )}
        </div>

        <Select
          label="Sexo registral"
          required
          error={errors.sexo_registral?.message}
          options={[
            { value: "M", label: "Masculino" },
            { value: "F", label: "Femenino" },
            { value: "Otro", label: "Otro" },
          ]}
          {...register("sexo_registral")}
        />

        <Input
          label="Identidad de género"
          placeholder="Opcional"
          {...register("identidad_genero")}
        />

        <Input
          label="Nacionalidad"
          required
          placeholder="Chilena"
          error={errors.nacionalidad?.message}
          {...register("nacionalidad")}
        />

        <Input
          label="Ocupación"
          required
          placeholder="Profesional de salud, estudiante…"
          error={errors.ocupacion?.message}
          {...register("ocupacion")}
        />

        <Input
          label="Teléfono"
          required
          placeholder="+56 9 1234 5678"
          type="tel"
          error={errors.telefono?.message}
          {...register("telefono")}
        />

        <Input
          label="Email"
          placeholder="paciente@email.com"
          type="email"
          error={errors.email?.message}
          {...register("email")}
        />
      </FormSection>

      {/* ── Sección 2: Dirección ── */}
      <FormSection title="Dirección" icon={<MapPin className="w-4 h-4" />}>
        <Select
          label="Región"
          required
          placeholder="Seleccionar región"
          error={errors.direccion?.region?.message}
          options={REGIONES_CHILE.map((r) => ({ value: r, label: r }))}
          {...register("direccion.region")}
        />

        <Input
          label="Comuna"
          required
          placeholder="San Joaquín"
          error={errors.direccion?.comuna?.message}
          {...register("direccion.comuna")}
        />

        <Input
          label="Calle"
          required
          placeholder="Juan Sebastián Bach"
          error={errors.direccion?.calle?.message}
          {...register("direccion.calle")}
        />

        <Input
          label="Número"
          required
          placeholder="208"
          error={errors.direccion?.numero?.message}
          {...register("direccion.numero")}
        />
      </FormSection>

      {/* ── Sección 3: Previsión ── */}
      <FormSection title="Previsión" icon={<Shield className="w-4 h-4" />}>
        <Select
          label="Tipo de previsión"
          required
          error={errors.prevision?.tipo?.message}
          options={[
            { value: "FONASA", label: "FONASA" },
            { value: "Isapre", label: "Isapre" },
            { value: "Particular", label: "Particular" },
          ]}
          {...register("prevision.tipo")}
        />

        {previsionTipo === "FONASA" && (
          <Select
            label="Tramo FONASA"
            required
            placeholder="Seleccionar tramo"
            error={errors.prevision?.tramo?.message}
            options={[
              { value: "A", label: "Tramo A" },
              { value: "B", label: "Tramo B" },
              { value: "C", label: "Tramo C" },
              { value: "D", label: "Tramo D" },
            ]}
            {...register("prevision.tramo")}
          />
        )}

        {previsionTipo === "Isapre" && (
          <Input
            label="Nombre Isapre"
            required
            placeholder="Banmédica, Colmena…"
            error={errors.prevision?.isapre?.message}
            {...register("prevision.isapre")}
          />
        )}
      </FormSection>

      {/* ── Sección 4: Contacto de Emergencia ── */}
      <FormSection
        title="Contacto de Emergencia"
        icon={<Phone className="w-4 h-4" />}
      >
        <Input
          label="Nombre completo"
          required
          placeholder="Carlos González"
          error={errors.contacto_emergencia?.nombre?.message}
          {...register("contacto_emergencia.nombre")}
        />

        <Input
          label="Parentesco"
          required
          placeholder="Cónyuge, hijo/a, madre…"
          error={errors.contacto_emergencia?.parentesco?.message}
          {...register("contacto_emergencia.parentesco")}
        />

        <Input
          label="Teléfono de contacto"
          required
          placeholder="+56 9 1234 5678"
          type="tel"
          error={errors.contacto_emergencia?.telefono?.message}
          {...register("contacto_emergencia.telefono")}
        />
      </FormSection>

      {/* ── Botones ── */}
      <div className="flex items-center justify-between pt-4 border-t border-kp-border">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? mode === "create"
              ? "Guardando…"
              : "Actualizando…"
            : mode === "create"
              ? "Crear ficha"
              : "Guardar cambios"}
        </Button>
      </div>
    </form>
  );
}

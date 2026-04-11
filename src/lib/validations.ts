import { z } from "zod";
import { validateRut } from "./run-validator";

// ── Patient ──

export const addressSchema = z.object({
  region: z.string().min(1, "Región es obligatoria"),
  comuna: z.string().min(1, "Comuna es obligatoria"),
  calle: z.string().min(1, "Calle es obligatoria"),
  numero: z.string().min(1, "Número es obligatorio"),
});

export const emergencyContactSchema = z.object({
  nombre: z.string().min(2, "Nombre del contacto es obligatorio"),
  parentesco: z.string().min(1, "Parentesco es obligatorio"),
  telefono: z.string().min(8, "Teléfono inválido"),
});

export const previsionSchema = z.object({
  tipo: z.enum(["FONASA", "Isapre", "Particular"]),
  tramo: z.enum(["A", "B", "C", "D"]).optional(),
  isapre: z.string().optional(),
});

export const patientSchema = z.object({
  rut: z.string()
    .min(1, "RUT es obligatorio")
    .refine(validateRut, "RUT inválido (dígito verificador no coincide)"),
  nombre: z.string().min(2, "Nombre es obligatorio"),
  apellido_paterno: z.string().min(2, "Apellido paterno es obligatorio"),
  apellido_materno: z.string().min(2, "Apellido materno es obligatorio"),
  fecha_nacimiento: z.string().min(1, "Fecha de nacimiento es obligatoria"),
  sexo_registral: z.enum(["M", "F", "Otro"]),
  identidad_genero: z.string().optional(),
  nacionalidad: z.string().default("Chilena"),
  telefono: z.string().min(8, "Teléfono inválido"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  direccion: addressSchema,
  ocupacion: z.string().min(1, "Ocupación es obligatoria"),
  prevision: previsionSchema,
  contacto_emergencia: emergencyContactSchema,
});

export type PatientSchemaType = z.infer<typeof patientSchema>;

// ── Vital Signs ──

export const vitalSignsSchema = z.object({
  presion_arterial: z.string().regex(/^\d{2,3}\/\d{2,3}$/, "Formato: 120/80"),
  frecuencia_cardiaca: z.number().min(30).max(250),
  spo2: z.number().min(50).max(100),
  temperatura: z.number().min(34).max(42),
  frecuencia_respiratoria: z.number().min(5).max(60),
});

// ── SOAP ──

export const soapSchema = z.object({
  subjetivo: z.string().min(1, "El campo Subjetivo es obligatorio"),
  objetivo: z.string().min(1, "El campo Objetivo es obligatorio"),
  analisis_cif: z.object({
    funciones: z.array(z.any()),
    actividades: z.array(z.any()),
    participacion: z.array(z.any()),
    contexto: z.array(z.any()),
  }),
  plan: z.string().min(1, "El campo Plan es obligatorio"),
  intervenciones: z.array(z.object({
    tipo: z.string(),
    descripcion: z.string(),
    dosificacion: z.string().optional(),
  })),
  tareas_domiciliarias: z.string().optional(),
  proxima_sesion: z.string().optional(),
});

// ── Anamnesis ──

export const anamnesisSchema = z.object({
  motivo_consulta: z.string().min(5, "Describe el motivo de consulta (mínimo 5 caracteres)"),
  antecedentes_medicos: z.array(
    z.object({
      patologia: z.string().min(1, "Patología es obligatoria"),
      desde: z.string().optional(),
      controlado: z.boolean(),
    })
  ),
  antecedentes_quirurgicos: z.array(
    z.object({
      tipo: z.string().min(1, "Tipo de cirugía es obligatorio"),
      fecha: z.string().min(1, "Fecha es obligatoria"),
      hospital: z.string().optional(),
    })
  ),
  farmacologia: z.array(
    z.object({
      medicamento: z.string().min(1, "Medicamento es obligatorio"),
      dosis: z.string().min(1, "Dosis es obligatoria"),
      frecuencia: z.string().min(1, "Frecuencia es obligatoria"),
    })
  ),
  alergias: z.array(
    z.object({
      sustancia: z.string().min(1, "Sustancia es obligatoria"),
      severidad: z.enum(["leve", "moderada", "severa"]),
      reaccion: z.string().min(1, "Describe la reacción"),
    })
  ),
  red_flags: z.object({
    marcapasos: z.boolean(),
    embarazo: z.boolean(),
    tvp: z.boolean(),
    oncologico: z.boolean(),
    fiebre: z.boolean(),
    alergias_severas: z.boolean(),
    infeccion_cutanea: z.boolean(),
    fragilidad_capilar: z.boolean(),
  }),
  habitos: z.object({
    tabaco: z.enum(["no", "ocasional", "diario"]),
    alcohol: z.enum(["no", "ocasional", "frecuente"]),
    ejercicio: z.enum(["sedentario", "leve", "moderado", "intenso"]),
    sueno_horas: z.number().min(1, "Min. 1 hora").max(24, "Max. 24 horas"),
  }),
});

export type AnamnesisSchemaType = z.infer<typeof anamnesisSchema>;

// ── Vital Signs (panel independiente) ──
export type VitalSignsSchemaType = z.infer<typeof vitalSignsSchema>;

// ── Masoterapia Contraindicaciones (hard-stop) ──

export const masoContraindicacionesSchema = z.object({
  tvp: z.literal(false, { message: "Contraindicación activa: TVP" }),
  oncologico_activo: z.literal(false, { message: "Contraindicación activa: oncológico" }),
  infeccion_cutanea: z.literal(false, { message: "Contraindicación activa: infección cutánea" }),
  fragilidad_capilar: z.literal(false, { message: "Contraindicación activa: fragilidad capilar" }),
  fiebre_aguda: z.literal(false, { message: "Contraindicación activa: fiebre" }),
});

// ── Consentimiento ──

export const consentSchema = z.object({
  tipo: z.enum(["general", "menores", "teleconsulta"]),
  contenido: z.string().min(10, "Contenido es obligatorio"),
  firma_paciente_data_url: z.string().min(1, "La firma del paciente es obligatoria"),
});

export type ConsentSchemaType = z.infer<typeof consentSchema>;

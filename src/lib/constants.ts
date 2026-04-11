// ── Datos confirmados de Korporis Centro de Salud ──

export const CLINIC_NAME = "Korporis";
export const CLINIC_FULL_NAME = "Korporis Centro de Salud";
export const ADDRESS = "Juan Sebastián Bach 208, San Joaquín, RM";
export const WHATSAPP_NUMBER = "56937277066";
export const SITE_URL = "https://korporis.cl";
export const FCE_URL = "https://fce.korporis.cl";

export const HORARIOS = {
  lunes: "10:00 – 20:00",
  martes: "10:00 – 20:00",
  miercoles: "10:00 – 20:00",
  jueves: "10:00 – 20:00",
  viernes: "10:00 – 19:00",
  sabado: "10:00 – 17:00",
  domingo: "Cerrado",
} as const;

export const ESPECIALIDADES = [
  "kinesiologia",
  "fonoaudiologia",
  "masoterapia",
] as const;

export type Especialidad = (typeof ESPECIALIDADES)[number];

export const ESPECIALIDAD_LABELS: Record<Especialidad, string> = {
  kinesiologia: "Kinesiología",
  fonoaudiologia: "Fonoaudiología",
  masoterapia: "Masoterapia",
};

export const ROLES = [
  "profesional",
  "recepcion",
  "admin",
] as const;

export type Rol = (typeof ROLES)[number];

export const ROL_LABELS: Record<Rol, string> = {
  profesional: "Profesional Clínico",
  recepcion: "Recepción",
  admin: "Administrador",
};

export const PREVISIONES = [
  "FONASA A",
  "FONASA B",
  "FONASA C",
  "FONASA D",
  "Isapre",
  "Particular",
] as const;

export const REGIONES_CHILE = [
  "Región Metropolitana",
  "Arica y Parinacota",
  "Tarapacá",
  "Antofagasta",
  "Atacama",
  "Coquimbo",
  "Valparaíso",
  "O'Higgins",
  "Maule",
  "Ñuble",
  "Biobío",
  "Araucanía",
  "Los Ríos",
  "Los Lagos",
  "Aysén",
  "Magallanes",
] as const;

import type { CifAssessment } from "./cif";

export interface Intervention {
  tipo: string;
  descripcion: string;
  dosificacion?: string;
}

export interface SoapNote {
  id: string;
  id_encuentro: string;
  id_paciente: string;
  subjetivo: string;
  objetivo: string;
  analisis_cif: CifAssessment;
  plan: string;
  intervenciones: Intervention[];
  tareas_domiciliarias?: string;
  proxima_sesion?: string;
  firmado: boolean;
  firmado_at?: string;
  firmado_por?: string;
  created_at: string;
}

export type SoapSection = "subjetivo" | "objetivo" | "analisis" | "plan";

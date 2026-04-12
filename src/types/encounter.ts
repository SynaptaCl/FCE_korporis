import type { Especialidad } from "@/lib/constants";

export type EncounterStatus = "planificado" | "en_progreso" | "finalizado" | "cancelado";
export type Modalidad = "presencial" | "domicilio" | "virtual";

export interface Encounter {
  id: string;
  id_paciente: string;
  id_profesional: string;
  especialidad: Especialidad;
  modalidad: Modalidad;
  status: EncounterStatus;
  started_at?: string;
  ended_at?: string;
  created_at: string;
}

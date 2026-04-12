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

export interface CitaAgenda {
  id_cita: string;
  estado: "confirmada" | "completada";
  fecha: string;
  hora_inicio: string;    // "HH:MM:SS"
  hora_fin: string;       // "HH:MM:SS"
  id_paciente: string;
  paciente_nombre: string;
  paciente_apellido: string;
  paciente_rut: string | null;
  id_profesional: string;
  profesional_nombre: string;
  profesional_especialidad: string | null;
  color_agenda: string | null;
  notas_cita: string | null;
  id_encuentro: string | null;
  encuentro_status: EncounterStatus | null;
  id_clinica: string;
}

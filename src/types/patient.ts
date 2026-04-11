export interface Address {
  region: string;
  comuna: string;
  calle: string;
  numero: string;
}

export interface EmergencyContact {
  nombre: string;
  parentesco: string;
  telefono: string;
}

export interface Prevision {
  tipo: "FONASA" | "Isapre" | "Particular";
  tramo?: "A" | "B" | "C" | "D";
  isapre?: string;
}

export interface Patient {
  id: string;
  run: string | null;
  nombre: string | null;
  apellido_paterno: string | null;
  apellido_materno: string | null;
  fecha_nacimiento: string | null;
  sexo_registral: "M" | "F" | "Otro" | null;
  identidad_genero?: string | null;
  nacionalidad: string | null;
  telefono: string | null;
  email?: string | null;
  direccion: Address | null;
  ocupacion: string | null;
  prevision: Prevision | null;
  contacto_emergencia: EmergencyContact | null;
  created_at: string;
  updated_at: string;
}

export type PatientFormData = Omit<Patient, "id" | "created_at" | "updated_at">;

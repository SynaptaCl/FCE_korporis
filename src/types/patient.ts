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
  run: string;
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string;
  fecha_nacimiento: string;
  sexo_registral: "M" | "F" | "Otro";
  identidad_genero?: string;
  nacionalidad: string;
  telefono: string;
  email?: string;
  direccion: Address;
  ocupacion: string;
  prevision: Prevision;
  contacto_emergencia: EmergencyContact;
  created_at: string;
  updated_at: string;
}

export type PatientFormData = Omit<Patient, "id" | "created_at" | "updated_at">;

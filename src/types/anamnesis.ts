export interface MedicalHistory {
  patologia: string;
  desde?: string;
  controlado: boolean;
}

export interface SurgicalHistory {
  tipo: string;
  fecha: string;
  hospital?: string;
}

export interface Medication {
  medicamento: string;
  dosis: string;
  frecuencia: string;
}

export interface Allergy {
  sustancia: string;
  severidad: "leve" | "moderada" | "severa";
  reaccion: string;
}

export interface RedFlags {
  marcapasos: boolean;
  embarazo: boolean;
  tvp: boolean;
  oncologico: boolean;
  fiebre: boolean;
  alergias_severas: boolean;
  infeccion_cutanea: boolean;
  fragilidad_capilar: boolean;
}

export interface Habits {
  tabaco: "no" | "ocasional" | "diario";
  alcohol: "no" | "ocasional" | "frecuente";
  ejercicio: "sedentario" | "leve" | "moderado" | "intenso";
  sueno_horas: number;
}

export interface Anamnesis {
  id: string;
  id_paciente: string;
  motivo_consulta: string;
  antecedentes_medicos: MedicalHistory[];
  antecedentes_quirurgicos: SurgicalHistory[];
  farmacologia: Medication[];
  alergias: Allergy[];
  red_flags: RedFlags;
  habitos: Habits;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface VitalSigns {
  id: string;
  id_paciente: string;
  id_encuentro: string | null;
  presion_arterial: string;
  frecuencia_cardiaca: number;
  spo2: number;
  temperatura: number;
  frecuencia_respiratoria: number;
  recorded_by: string;
  recorded_at: string;
}

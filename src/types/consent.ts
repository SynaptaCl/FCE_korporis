export type ConsentType = "general" | "menores" | "teleconsulta";

export interface SignatureData {
  data_url: string; // base64 canvas image
  timestamp: string;
}

export interface ProfessionalSignature {
  practitioner_id: string;
  timestamp: string;
  hash: string;
}

export interface Consent {
  id: string;
  patient_id: string;
  tipo: ConsentType;
  version: number;
  contenido: string;
  firma_paciente?: SignatureData;
  firma_profesional?: ProfessionalSignature;
  firmado: boolean;
  created_at: string;
}

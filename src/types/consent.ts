export type ConsentType = "general" | "menores" | "teleconsulta";

export interface SignatureData {
  data_url: string; // base64 canvas image
  timestamp: string;
}

export interface ProfessionalSignature {
  id_profesional: string;
  timestamp: string;
  hash: string;
}

export interface Consent {
  id: string;
  id_paciente: string;
  id_clinica?: string | null;
  tipo: ConsentType;
  version: number;
  contenido: string;
  firma_paciente?: SignatureData;
  firma_profesional?: ProfessionalSignature;
  firmado: boolean;
  firmado_at?: string | null;
  created_by: string;
  created_at: string;
}

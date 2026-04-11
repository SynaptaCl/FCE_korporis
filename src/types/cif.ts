/**
 * Clasificación Internacional del Funcionamiento, de la Discapacidad y de la Salud (CIF)
 * Cuantificadores: 0 = sin problema, 1 = leve, 2 = moderado, 3 = grave, 4 = completo
 */

export type CifQuantifier = 0 | 1 | 2 | 3 | 4;

export const CIF_QUANTIFIER_LABELS: Record<CifQuantifier, string> = {
  0: "Sin problema (0–4%)",
  1: "Leve (5–24%)",
  2: "Moderado (25–49%)",
  3: "Grave (50–95%)",
  4: "Completo (96–100%)",
};

export type CifDomainType =
  | "funciones_corporales"
  | "estructuras_corporales"
  | "actividades"
  | "participacion"
  | "factores_ambientales"
  | "factores_personales";

export const CIF_DOMAIN_LABELS: Record<CifDomainType, string> = {
  funciones_corporales: "Funciones Corporales",
  estructuras_corporales: "Estructuras Corporales",
  actividades: "Actividades",
  participacion: "Participación",
  factores_ambientales: "Factores Ambientales",
  factores_personales: "Factores Personales",
};

export interface CifItem {
  id: string;
  domain: CifDomainType;
  code: string;
  description: string;
  quantifier: CifQuantifier;
  is_facilitator?: boolean; // for contextual factors
  notes?: string;
}

export interface CifAssessment {
  funciones: CifItem[];
  actividades: CifItem[];
  participacion: CifItem[];
  contexto: CifItem[];
}

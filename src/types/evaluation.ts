import type { Especialidad } from "@/lib/constants";

// ── Kinesiología ──

export type KineSubArea =
  | "musculoesqueletica"
  | "respiratoria"
  | "geriatrica"
  | "infantil"
  | "neurologica"
  | "vestibular"
  | "piso_pelvico";

export interface GoniometryEntry {
  articulacion: string;
  movimiento: string;
  rom_activo: number;
  rom_pasivo: number;
  dolor: boolean;
}

export interface KineMusculoesqueleticaData {
  goniometria: GoniometryEntry[];
  fuerza_daniels: Record<string, number>; // 0-5
  pruebas_especiales: string;
  dolor_eva: number; // 0-10
  trigger_points: string[];
  observaciones: string;
}

export interface KineRespiratoriaData {
  auscultacion: string;
  patron_respiratorio: string;
  spo2_reposo: number;
  spo2_esfuerzo?: number;
  escala_mmrc: number; // 0-4
  escala_borg: number; // 0-10
  test_marcha_6min?: number; // metros
  observaciones: string;
}

export interface KineGeriatricaData {
  timed_up_and_go: number; // segundos
  indice_barthel: number; // 0-100
  berg_balance?: number; // 0-56
  velocidad_marcha?: number; // m/s
  observaciones: string;
}

export interface KineInfantilData {
  hitos_motores: string;
  desarrollo_psicomotor: string;
  integracion_sensorial: string;
  observaciones: string;
}

// ── Fonoaudiología ──

export type FonoSubArea = "vocal" | "deglucion" | "desarrollo_fonologico" | "lenguaje_adulto";

export interface FonoVocalData {
  grbas: { g: number; r: number; b: number; a: number; s: number }; // 0-3 each
  conductas_fonotraumaticas: string[];
  modo_aparicion_fatiga: "subita" | "progresiva" | "matutina" | "vespertina";
  sintomas_rinofaringeos: string;
  observaciones: string;
}

export interface FonoDeglucionData {
  inspeccion_orofacial: string;
  simetria_labial: boolean;
  movilidad_lingual: string;
  movilidad_palatina: string;
  signos_aspiracion: {
    tos: boolean;
    voz_humeda: boolean;
    asfixia: boolean;
    regurgitacion_nasal: boolean;
  };
  consistencias_evaluadas: string[];
  observaciones: string;
}

export interface FonoDesarrolloData {
  teprosif_r?: {
    puntaje_bruto: number;
    desviacion_estandar: number;
    clasificacion: "normal" | "riesgo" | "deficit";
  };
  screening_tea: string;
  evaluacion_discurso: string;
  observaciones: string;
}

// ── Masoterapia ──

export interface MasoContraindicaciones {
  tvp: boolean;
  oncologico_activo: boolean;
  infeccion_cutanea: boolean;
  fragilidad_capilar: boolean;
  fiebre_aguda: boolean;
  certificado_por: string;
  certificado_at: string;
}

export interface MasoTisularData {
  zonas_tension: string[];
  nodulos_miofasciales: string;
  temperatura_tejido: string;
  movilidad_tejidos: string;
  observaciones: string;
}

export interface MasoPostCirugiaData {
  perimetria_edema: string;
  prueba_fovea: string;
  estado_cicatrizal: {
    coloracion: string;
    adherencias: boolean;
    queloides: boolean;
  };
  observaciones: string;
}

// ── Evaluation container ──

export interface Evaluation {
  id: string;
  encounter_id: string;
  patient_id: string;
  especialidad: Especialidad;
  sub_area: string;
  data: Record<string, unknown>;
  created_by: string;
  created_at: string;
}

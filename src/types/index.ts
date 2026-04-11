export type { Patient, PatientFormData, Address, EmergencyContact, Prevision } from "./patient";
export type { Practitioner } from "./practitioner";
export type { Encounter, EncounterStatus, Modalidad } from "./encounter";
export type {
  Evaluation,
  KineSubArea,
  KineMusculoesqueleticaData,
  KineRespiratoriaData,
  KineGeriatricaData,
  KineInfantilData,
  GoniometryEntry,
  FonoSubArea,
  FonoVocalData,
  FonoDeglucionData,
  FonoDesarrolloData,
  MasoContraindicaciones,
  MasoTisularData,
  MasoPostCirugiaData,
} from "./evaluation";
export type { SoapNote, SoapSection, Intervention } from "./soap";
export type {
  CifQuantifier,
  CifDomainType,
  CifItem,
  CifAssessment,
} from "./cif";
export { CIF_QUANTIFIER_LABELS, CIF_DOMAIN_LABELS } from "./cif";
export type { Consent, ConsentType, SignatureData, ProfessionalSignature } from "./consent";
export type { AuditEntry, AuditAction, AuditActorTipo } from "./audit";
export type {
  Anamnesis,
  VitalSigns,
  RedFlags,
  Habits,
  MedicalHistory,
  SurgicalHistory,
  Medication,
  Allergy,
} from "./anamnesis";

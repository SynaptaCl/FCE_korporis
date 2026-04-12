/**
 * FHIR R4 CL Core Mapper
 * Mapea registros de korporis-fce a recursos HL7 FHIR R4 (perfil CL Core).
 * Funciones puras — sin efectos secundarios, sin llamadas a DB.
 *
 * Referencia: Guía de Implementación FHIR Chile Core
 * https://hl7chile.cl/fhir/ig/clcore/
 */

import type { Patient } from "@/types";
import type { VitalSigns } from "@/types";

// ── Tipos FHIR R4 mínimos ─────────────────────────────────────────────────────

export interface FhirPatient {
  resourceType: "Patient";
  meta: { profile: string[] };
  identifier: Array<{ system: string; value: string; use?: string }>;
  name: Array<{ use: string; family?: string; given?: string[] }>;
  gender?: string;
  birthDate?: string;
  telecom?: Array<{ system: string; value: string; use?: string }>;
  address?: Array<{
    use?: string;
    text?: string;
    line?: string[];
    city?: string;
    state?: string;
    country?: string;
  }>;
  extension?: Array<{
    url: string;
    valueString?: string;
    valueCode?: string;
  }>;
}

export interface FhirEncounter {
  resourceType: "Encounter";
  meta: { profile: string[] };
  status: string;
  class: { system: string; code: string; display: string };
  subject: { reference: string; display?: string };
  participant?: Array<{ individual?: { reference: string } }>;
  period?: { start?: string; end?: string };
  serviceType?: {
    coding: Array<{ system: string; code: string; display: string }>;
  };
}

export interface FhirObservation {
  resourceType: "Observation";
  meta: { profile: string[] };
  status: "final" | "preliminary";
  category: Array<{
    coding: Array<{ system: string; code: string; display: string }>;
  }>;
  code: { coding: Array<{ system: string; code: string; display: string }> };
  subject: { reference: string };
  effectiveDateTime?: string;
  valueQuantity?: {
    value: number;
    unit: string;
    system: string;
    code: string;
  };
  valueString?: string;
}

export interface FhirCondition {
  resourceType: "Condition";
  meta: { profile: string[] };
  clinicalStatus: {
    coding: Array<{ system: string; code: string }>;
  };
  category: Array<{
    coding: Array<{ system: string; code: string; display: string }>;
  }>;
  code?: {
    text: string;
    coding?: Array<{ system: string; code: string; display: string }>;
  };
  subject: { reference: string };
  note?: Array<{ text: string }>;
}

export interface FhirCarePlan {
  resourceType: "CarePlan";
  meta: { profile: string[] };
  status: "active" | "completed" | "draft";
  intent: "plan";
  subject: { reference: string };
  description?: string;
  activity?: Array<{
    detail: {
      kind?: string;
      description?: string;
      status: "in-progress" | "completed" | "not-started";
    };
  }>;
  note?: Array<{ text: string }>;
}

// ── Constantes ────────────────────────────────────────────────────────────────

const FHIR_BASE = "https://hl7chile.cl/fhir/ig/clcore/StructureDefinition";
const RUT_SYSTEM = "https://www.registrocivil.cl/run";
const SNOMED = "http://snomed.info/sct";
const LOINC = "http://loinc.org";
const ENCOUNTER_CLASS_SYSTEM = "http://terminology.hl7.org/CodeSystem/v3-ActCode";
const VITAL_CATEGORY = "http://terminology.hl7.org/CodeSystem/observation-category";
const CONDITION_CATEGORY = "http://terminology.hl7.org/CodeSystem/condition-category";
const CIF_SYSTEM = "http://www.who.int/classifications/icf";
const CONDITION_CLINICAL = "http://terminology.hl7.org/CodeSystem/condition-clinical";

// ── mapPatientToFhir ──────────────────────────────────────────────────────────

export function mapPatientToFhir(patient: Patient): FhirPatient {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dir = patient.direccion as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prev = patient.prevision as any;

  const identifiers: FhirPatient["identifier"] = [];
  if (patient.rut) {
    identifiers.push({ system: RUT_SYSTEM, value: patient.rut, use: "official" });
  }

  const gender =
    patient.sexo_registral === "M"
      ? "male"
      : patient.sexo_registral === "F"
      ? "female"
      : "other";

  const address: FhirPatient["address"] = dir
    ? [
        {
          use: "home",
          line: [dir.calle, dir.numero].filter(Boolean) as string[],
          city: dir.comuna ?? undefined,
          state: dir.region ?? undefined,
          country: "CL",
          text: [dir.calle, dir.numero, dir.comuna, dir.region]
            .filter(Boolean)
            .join(", "),
        },
      ]
    : undefined;

  const telecom: FhirPatient["telecom"] = [];
  if (patient.telefono)
    telecom.push({ system: "phone", value: patient.telefono, use: "mobile" });
  if (patient.email) telecom.push({ system: "email", value: patient.email });

  const extensions: NonNullable<FhirPatient["extension"]> = [];
  if (patient.identidad_genero) {
    extensions.push({
      url: `${FHIR_BASE}/IdentidadDeGenero`,
      valueString: patient.identidad_genero,
    });
  }
  if (patient.nacionalidad) {
    extensions.push({
      url: `${FHIR_BASE}/CodigoPaises`,
      valueString: patient.nacionalidad,
    });
  }
  if (prev?.tipo) {
    extensions.push({
      url: `${FHIR_BASE}/PrevisionSalud`,
      valueString: prev.tipo,
    });
  }

  return {
    resourceType: "Patient",
    meta: { profile: [`${FHIR_BASE}/CorePacienteCl`] },
    identifier: identifiers,
    name: [
      {
        use: "official",
        family:
          [patient.apellido_paterno, patient.apellido_materno]
            .filter(Boolean)
            .join(" ") || undefined,
        given: patient.nombre ? [patient.nombre] : undefined,
      },
    ],
    gender,
    birthDate: patient.fecha_nacimiento?.toString().slice(0, 10) ?? undefined,
    telecom: telecom.length ? telecom : undefined,
    address,
    extension: extensions.length ? extensions : undefined,
  };
}

// ── mapEncounterToFhir ────────────────────────────────────────────────────────

export interface DbEncounter {
  id: string;
  id_paciente: string;
  id_profesional?: string | null;
  especialidad?: string | null;
  modalidad?: string | null;
  status?: string | null;
  started_at?: string | null;
  ended_at?: string | null;
}

export function mapEncounterToFhir(enc: DbEncounter): FhirEncounter {
  const classCode = enc.modalidad === "virtual" ? "VR" : "AMB";
  const classDisplay = enc.modalidad === "virtual" ? "Virtual" : "Ambulatory";

  const serviceCode =
    enc.especialidad === "kinesiologia"
      ? { code: "228", display: "Physiotherapy" }
      : enc.especialidad === "fonoaudiologia"
      ? { code: "310", display: "Speech Therapy" }
      : enc.especialidad === "masoterapia"
      ? { code: "310", display: "Massage therapy" }
      : { code: "999", display: enc.especialidad ?? "General" };

  const fhirStatus =
    enc.status === "finalizado"
      ? "finished"
      : enc.status === "en_progreso"
      ? "in-progress"
      : enc.status === "planificado"
      ? "planned"
      : "unknown";

  return {
    resourceType: "Encounter",
    meta: { profile: [`${FHIR_BASE}/EncounterCL`] },
    status: fhirStatus,
    class: {
      system: ENCOUNTER_CLASS_SYSTEM,
      code: classCode,
      display: classDisplay,
    },
    subject: { reference: `Patient/${enc.id_paciente}` },
    participant: enc.id_profesional
      ? [{ individual: { reference: `Practitioner/${enc.id_profesional}` } }]
      : undefined,
    period: {
      start: enc.started_at ?? undefined,
      end: enc.ended_at ?? undefined,
    },
    serviceType: {
      coding: [
        {
          system: SNOMED,
          code: serviceCode.code,
          display: serviceCode.display,
        },
      ],
    },
  };
}

// ── mapVitalsToFhir ───────────────────────────────────────────────────────────

export function mapVitalsToFhir(
  vitals: VitalSigns,
  patientId: string
): FhirObservation[] {
  const base: Omit<FhirObservation, "code" | "valueQuantity" | "valueString"> = {
    resourceType: "Observation",
    meta: { profile: [`${FHIR_BASE}/CoreObservacionCL`] },
    status: "final",
    category: [
      {
        coding: [
          {
            system: VITAL_CATEGORY,
            code: "vital-signs",
            display: "Vital Signs",
          },
        ],
      },
    ],
    subject: { reference: `Patient/${patientId}` },
    effectiveDateTime: vitals.recorded_at ?? undefined,
  };

  const observations: FhirObservation[] = [];

  if (vitals.frecuencia_cardiaca != null) {
    observations.push({
      ...base,
      code: {
        coding: [{ system: LOINC, code: "8867-4", display: "Heart rate" }],
      },
      valueQuantity: {
        value: vitals.frecuencia_cardiaca,
        unit: "/min",
        system: "http://unitsofmeasure.org",
        code: "/min",
      },
    });
  }
  if (vitals.spo2 != null) {
    observations.push({
      ...base,
      code: {
        coding: [
          {
            system: LOINC,
            code: "59408-5",
            display: "Oxygen saturation in Arterial blood by Pulse oximetry",
          },
        ],
      },
      valueQuantity: {
        value: vitals.spo2,
        unit: "%",
        system: "http://unitsofmeasure.org",
        code: "%",
      },
    });
  }
  if (vitals.temperatura != null) {
    observations.push({
      ...base,
      code: {
        coding: [{ system: LOINC, code: "8310-5", display: "Body temperature" }],
      },
      valueQuantity: {
        value: Number(vitals.temperatura),
        unit: "°C",
        system: "http://unitsofmeasure.org",
        code: "Cel",
      },
    });
  }
  if (vitals.frecuencia_respiratoria != null) {
    observations.push({
      ...base,
      code: {
        coding: [{ system: LOINC, code: "9279-1", display: "Respiratory rate" }],
      },
      valueQuantity: {
        value: vitals.frecuencia_respiratoria,
        unit: "/min",
        system: "http://unitsofmeasure.org",
        code: "/min",
      },
    });
  }
  if (vitals.presion_arterial) {
    observations.push({
      ...base,
      code: {
        coding: [
          {
            system: LOINC,
            code: "55284-4",
            display: "Blood pressure systolic and diastolic",
          },
        ],
      },
      valueString: vitals.presion_arterial,
    });
  }

  return observations;
}

// ── DbSoapNote ────────────────────────────────────────────────────────────────

export interface DbSoapNote {
  id: string;
  id_paciente: string;
  id_encuentro?: string | null;
  subjetivo?: string | null;
  objetivo?: string | null;
  analisis_cif?: {
    funciones?: Array<{
      code?: string;
      descripcion?: string;
      cuantificador?: number;
    }>;
    actividades?: Array<{
      code?: string;
      descripcion?: string;
      cuantificador?: number;
    }>;
    participacion?: Array<{
      code?: string;
      descripcion?: string;
      cuantificador?: number;
    }>;
    contexto?: Array<{
      code?: string;
      descripcion?: string;
      cuantificador?: number;
    }>;
  } | null;
  plan?: string | null;
  intervenciones?: Array<{ tipo?: string; descripcion?: string }> | null;
  tareas_domiciliarias?: string | null;
  proxima_sesion?: string | null;
  firmado?: boolean;
  firmado_at?: string | null;
  created_at: string;
}

// ── mapSoapToConditions ───────────────────────────────────────────────────────

export function mapSoapToConditions(soap: DbSoapNote): FhirCondition[] {
  const cif = soap.analisis_cif;
  if (!cif) return [];

  const allItems = [
    ...(cif.funciones ?? []).map((i) => ({
      ...i,
      domain: "Funciones/Estructuras Corporales",
    })),
    ...(cif.actividades ?? []).map((i) => ({ ...i, domain: "Actividades" })),
    ...(cif.participacion ?? []).map((i) => ({ ...i, domain: "Participación" })),
    ...(cif.contexto ?? []).map((i) => ({ ...i, domain: "Factores Contextuales" })),
  ];

  return allItems.map((item) => ({
    resourceType: "Condition" as const,
    meta: { profile: [`${FHIR_BASE}/CoreDiagnosticoCl`] },
    clinicalStatus: {
      coding: [
        {
          system: CONDITION_CLINICAL,
          code: "active",
        },
      ],
    },
    category: [
      {
        coding: [
          {
            system: CONDITION_CATEGORY,
            code: "encounter-diagnosis",
            display: item.domain,
          },
        ],
      },
    ],
    code: item.code
      ? {
          text: item.descripcion ?? item.code,
          coding: [
            {
              system: CIF_SYSTEM,
              code: item.code,
              display: item.descripcion ?? item.code,
            },
          ],
        }
      : { text: item.descripcion ?? "Sin descripción" },
    subject: { reference: `Patient/${soap.id_paciente}` },
    note:
      item.cuantificador != null
        ? [{ text: `Cuantificador CIF: ${item.cuantificador}/4` }]
        : undefined,
  }));
}

// ── mapSoapToCarePlan ─────────────────────────────────────────────────────────

export function mapSoapToCarePlan(soap: DbSoapNote): FhirCarePlan {
  const intervenciones = soap.intervenciones ?? [];

  return {
    resourceType: "CarePlan",
    meta: { profile: [`${FHIR_BASE}/CarePlan`] },
    status: soap.firmado ? "completed" : "active",
    intent: "plan",
    subject: { reference: `Patient/${soap.id_paciente}` },
    description: soap.plan ?? undefined,
    activity: intervenciones.map((inv) => ({
      detail: {
        kind: inv.tipo ?? undefined,
        description: inv.descripcion ?? undefined,
        status: "completed" as const,
      },
    })),
    note: [
      ...(soap.tareas_domiciliarias
        ? [{ text: `Tareas domiciliarias: ${soap.tareas_domiciliarias}` }]
        : []),
      ...(soap.proxima_sesion
        ? [{ text: `Próxima sesión: ${soap.proxima_sesion}` }]
        : []),
    ],
  };
}

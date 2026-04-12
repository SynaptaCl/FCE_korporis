import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Share2, Info } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getPatientById } from "@/app/actions/patients";
import {
  mapPatientToFhir,
  mapEncounterToFhir,
  mapVitalsToFhir,
  mapSoapToConditions,
  mapSoapToCarePlan,
  type DbEncounter,
  type DbSoapNote,
} from "@/lib/fhir-mapper";
import { FhirPreview } from "@/components/modules/FhirPreview";
import type { VitalSigns } from "@/types";

export const metadata = { title: "FHIR Preview — FCE Korporis" };

export default async function FhirPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");

  const patientResult = await getPatientById(id);
  if (!patientResult.success) notFound();

  const patient = patientResult.data;

  // Fetch último encuentro, últimos signos vitales, última nota SOAP — en paralelo
  const [encounterRes, vitalsRes, soapRes] = await Promise.all([
    supabase
      .from("fce_encuentros")
      .select(
        "id, id_paciente, id_profesional, especialidad, modalidad, status, started_at, ended_at"
      )
      .eq("id_paciente", id)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("fce_signos_vitales")
      .select("*")
      .eq("id_paciente", id)
      .order("recorded_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("fce_notas_soap")
      .select(
        "id, id_paciente, id_encuentro, subjetivo, objetivo, analisis_cif, plan, intervenciones, tareas_domiciliarias, proxima_sesion, firmado, firmado_at, created_at"
      )
      .eq("id_paciente", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  // Mapear a FHIR
  const fhirPatient      = mapPatientToFhir(patient);
  const fhirEncounter    = encounterRes.data
    ? mapEncounterToFhir(encounterRes.data as DbEncounter)
    : null;
  const fhirObservations = vitalsRes.data
    ? mapVitalsToFhir(vitalsRes.data as VitalSigns, id)
    : [];
  const fhirConditions   = soapRes.data
    ? mapSoapToConditions(soapRes.data as DbSoapNote)
    : [];
  const fhirCarePlan     = soapRes.data
    ? mapSoapToCarePlan(soapRes.data as DbSoapNote)
    : null;

  const fullName =
    [patient.nombre, patient.apellido_paterno, patient.apellido_materno]
      .filter(Boolean)
      .join(" ") || "Paciente";

  return (
    <div className="space-y-4 max-w-4xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-ink-3">
        <Link
          href={`/dashboard/pacientes/${id}`}
          className="flex items-center gap-1 hover:text-kp-accent transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          {fullName}
        </Link>
        <span>/</span>
        <span className="text-ink-2 font-medium">FHIR Preview</span>
      </div>

      {/* Page header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-kp-accent-xs border border-kp-accent/20 flex items-center justify-center shrink-0">
            <Share2 className="w-5 h-5 text-kp-accent" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-ink-1">Interoperabilidad FHIR</h1>
            <p className="text-xs text-ink-3 mt-0.5">
              Vista de recursos HL7 FHIR R4 — {fullName}
            </p>
          </div>
        </div>
        {/* Badge */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-kp-accent-xs border border-kp-accent/30 shrink-0">
          <Share2 className="w-3 h-3 text-kp-accent" />
          <span className="text-[0.65rem] font-bold text-kp-primary tracking-wide">
            FHIR R4 · CL Core
          </span>
        </div>
      </div>

      {/* Banner informativo */}
      <div className="flex gap-2.5 p-3.5 rounded-lg bg-kp-info-lt border border-kp-info/20">
        <Info className="w-4 h-4 text-kp-info shrink-0 mt-0.5" />
        <p className="text-xs leading-relaxed text-kp-info">
          <strong>Vista de interoperabilidad — Preview.</strong>{" "}
          La transmisión activa de datos FHIR se habilitará con el reglamento de la{" "}
          <span className="font-semibold">Ley 21.668</span>.
          Los recursos mostrados siguen la Guía de Implementación{" "}
          <span className="font-semibold">HL7 FHIR CL Core</span> del CENS/MINSAL.
        </p>
      </div>

      {/* Resource grid — leyenda */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {[
          { label: "Patient",     desc: "PacienteCL · RUN identifier" },
          { label: "Encounter",   desc: "EncounterCL · Último encuentro" },
          { label: "Condition",   desc: "Diagnósticos CIF del SOAP" },
          { label: "Observation", desc: "CoreObservacionCL · Signos vitales" },
          { label: "CarePlan",    desc: "Plan e intervenciones SOAP" },
        ].map(({ label, desc }) => (
          <div
            key={label}
            className="p-2.5 rounded-lg bg-surface-0 border border-kp-border"
          >
            <div className="text-[0.65rem] font-bold font-mono text-kp-accent">
              {label}
            </div>
            <div className="text-[0.6rem] text-ink-3 mt-0.5 leading-tight">{desc}</div>
          </div>
        ))}
      </div>

      {/* JSON Viewer con tabs */}
      <FhirPreview
        patient={fhirPatient}
        encounter={fhirEncounter}
        observations={fhirObservations}
        conditions={fhirConditions}
        carePlan={fhirCarePlan}
      />
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { PdfPatientData } from "@/app/actions/exportar-pdf";
import { calculateAge } from "@/lib/utils";

interface PdfExportViewProps {
  data: PdfPatientData;
}

const RED_FLAG_LABELS: Record<string, string> = {
  marcapasos: "Marcapasos",
  embarazo: "Embarazo",
  tvp: "TVP",
  oncologico: "Oncológico activo",
  fiebre: "Fiebre",
  alergias_severas: "Alergias severas",
  infeccion_cutanea: "Infección cutánea",
  fragilidad_capilar: "Fragilidad capilar",
};

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return format(new Date(iso), "dd MMM yyyy", { locale: es });
  } catch {
    return String(iso);
  }
}

export function PdfExportView({ data }: PdfExportViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"idle" | "generating" | "done" | "error">("idle");

  const {
    patient,
    anamnesis,
    vitales,
    evaluaciones,
    soaps,
    consentimientos,
    branding,
    clinicName,
  } = data;

  const fullName =
    [patient.nombre, patient.apellido_paterno, patient.apellido_materno]
      .filter(Boolean)
      .join(" ") || "Sin nombre";
  const age = calculateAge(patient.fecha_nacimiento);
  const ageStr = age !== null ? `${age} años` : "—";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const previsionTipo = (patient.prevision as any)?.tipo ?? "—";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dir = patient.direccion as any;
  const direccionStr = dir
    ? [dir.calle, dir.numero, dir.comuna, dir.region].filter(Boolean).join(", ")
    : "—";

  const activeRedFlags = anamnesis?.red_flags
    ? Object.entries(anamnesis.red_flags)
        .filter(([, v]) => Boolean(v))
        .map(([k]) => RED_FLAG_LABELS[k] ?? k)
    : [];

  const generatedAt = format(new Date(), "dd 'de' MMMM 'de' yyyy 'a las' HH:mm", {
    locale: es,
  });

  async function generatePdf() {
    if (!containerRef.current) return;
    setStatus("generating");
    try {
      const html2pdf = (await import("html2pdf.js")).default;
      await html2pdf()
        .set({
          margin: [12, 10, 14, 10],
          filename: `ficha-${patient.rut ?? patient.id}-${format(new Date(), "yyyyMMdd")}.pdf`,
          image: { type: "jpeg", quality: 0.97 },
          html2canvas: { scale: 2, useCORS: true, logging: false },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        })
        .from(containerRef.current)
        .save();
      setStatus("done");
    } catch (err) {
      console.error("PDF generation failed:", err);
      setStatus("error");
    }
  }

  // Auto-generate al montar
  useEffect(() => {
    generatePdf();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-surface-0 p-6">
      {/* Barra de controles */}
      <div className="max-w-[860px] mx-auto mb-4 flex items-center justify-between">
        <div className="text-sm text-ink-2">
          {status === "generating" && (
            <span className="text-kp-accent font-medium">Generando PDF…</span>
          )}
          {status === "done" && (
            <span className="text-kp-success font-medium">✓ PDF descargado correctamente</span>
          )}
          {status === "error" && (
            <span className="text-kp-danger font-medium">Error al generar PDF. Intenta de nuevo.</span>
          )}
          {status === "idle" && <span className="text-ink-3">Preparando…</span>}
        </div>
        <button
          onClick={generatePdf}
          disabled={status === "generating"}
          className="px-4 py-2 bg-kp-accent text-white text-sm font-semibold rounded-lg
                     hover:bg-kp-primary transition-colors disabled:opacity-60 cursor-pointer
                     disabled:cursor-not-allowed"
        >
          {status === "generating" ? "Generando…" : "↓ Descargar PDF"}
        </button>
      </div>

      {/* ── TEMPLATE PDF ──────────────────────────────────────────────────────── */}
      <div
        ref={containerRef}
        className="max-w-[860px] mx-auto bg-white shadow-sm"
        style={{ fontFamily: "Arial, sans-serif", fontSize: "10pt", color: "#1E293B" }}
      >
        {/* HEADER */}
        <div
          style={{
            background: "#004545",
            color: "white",
            padding: "20px 24px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {branding?.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={branding.logo_url}
                alt="logo"
                style={{ height: 40, objectFit: "contain" }}
              />
            ) : (
              <div
                style={{
                  width: 40,
                  height: 40,
                  background: "#00B0A8",
                  borderRadius: 8,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 16,
                  fontWeight: 700,
                  color: "white",
                }}
              >
                {branding?.clinic_initials ?? "KP"}
              </div>
            )}
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: "0.05em" }}>
                {clinicName.toUpperCase()}
              </div>
              <div style={{ fontSize: 9, opacity: 0.75, marginTop: 2 }}>
                FICHA CLÍNICA ELECTRÓNICA
              </div>
            </div>
          </div>
          <div style={{ textAlign: "right", fontSize: 8, opacity: 0.8 }}>
            <div>Generado: {generatedAt}</div>
            <div style={{ marginTop: 2 }}>Decreto 41 MINSAL · Ley 20.584</div>
          </div>
        </div>

        {/* BANNER PACIENTE */}
        <div
          style={{
            background: "#E6FAF9",
            padding: "12px 24px",
            borderBottom: "1px solid #D5F5F4",
            display: "flex",
            gap: 32,
            flexWrap: "wrap",
          }}
        >
          {[
            ["Paciente", fullName],
            ["RUT", patient.rut ?? "—"],
            ["Edad", ageStr],
            ["Previsión", previsionTipo],
          ].map(([label, value]) => (
            <div key={label}>
              <div
                style={{
                  fontSize: 8,
                  fontWeight: 700,
                  color: "#006B6B",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  marginBottom: 2,
                }}
              >
                {label}
              </div>
              <div style={{ fontWeight: 600, fontSize: label === "Paciente" ? 13 : 10, color: "#004545" }}>
                {value}
              </div>
            </div>
          ))}
        </div>

        <div style={{ padding: "16px 24px" }}>

          {/* M1 — IDENTIFICACIÓN */}
          <SectionTitle>M1 — Identificación</SectionTitle>
          <TwoCol
            items={[
              ["Nombre completo", fullName],
              ["RUT", patient.rut ?? "—"],
              ["Fecha nacimiento", formatDate(patient.fecha_nacimiento)],
              ["Edad", ageStr],
              ["Sexo registral", patient.sexo_registral ?? "—"],
              ["Nacionalidad", patient.nacionalidad ?? "Chilena"],
              ["Teléfono", patient.telefono ?? "—"],
              ["Email", patient.email ?? "—"],
              ["Ocupación", patient.ocupacion ?? "—"],
              ["Previsión", previsionTipo],
              ["Dirección", direccionStr],
            ]}
          />

          {/* M2 — ANAMNESIS */}
          {anamnesis && (
            <>
              <SectionTitle>M2 — Anamnesis</SectionTitle>
              {anamnesis.motivo_consulta && (
                <Field label="Motivo de consulta" value={anamnesis.motivo_consulta} />
              )}
              {activeRedFlags.length > 0 && (
                <div
                  style={{
                    background: "#FEE2E2",
                    border: "1px solid #FCA5A5",
                    borderRadius: 4,
                    padding: "6px 10px",
                    marginBottom: 8,
                  }}
                >
                  <span
                    style={{
                      fontWeight: 700,
                      color: "#DC2626",
                      fontSize: 9,
                      textTransform: "uppercase",
                    }}
                  >
                    ⚠ Red Flags Activos:{" "}
                  </span>
                  <span style={{ color: "#991B1B" }}>{activeRedFlags.join(" · ")}</span>
                </div>
              )}
            </>
          )}

          {/* SIGNOS VITALES */}
          {vitales && (
            <>
              <SectionTitle>
                Últimos Signos Vitales — {formatDate(vitales.recorded_at)}
              </SectionTitle>
              <TwoCol
                items={[
                  ["Presión arterial", vitales.presion_arterial ?? "—"],
                  ["Frec. cardíaca", vitales.frecuencia_cardiaca ? `${vitales.frecuencia_cardiaca} bpm` : "—"],
                  ["SpO₂", vitales.spo2 ? `${vitales.spo2}%` : "—"],
                  ["Temperatura", vitales.temperatura ? `${vitales.temperatura} °C` : "—"],
                  ["Frec. respiratoria", vitales.frecuencia_respiratoria ? `${vitales.frecuencia_respiratoria} rpm` : "—"],
                ]}
              />
            </>
          )}

          {/* EVALUACIONES */}
          {evaluaciones.length > 0 && (
            <>
              <SectionTitle>Evaluaciones por Especialidad</SectionTitle>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 9,
                  marginBottom: 12,
                }}
              >
                <thead>
                  <tr style={{ background: "#F1F5F9" }}>
                    {["Fecha", "Especialidad", "Área"].map((h) => (
                      <th
                        key={h}
                        style={{
                          textAlign: "left",
                          padding: "4px 8px",
                          fontWeight: 700,
                          color: "#006B6B",
                          fontSize: 8,
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {evaluaciones.map((ev, i) => (
                    <tr key={ev.id} style={{ background: i % 2 === 0 ? "white" : "#F8FAFC" }}>
                      <td style={{ padding: "4px 8px" }}>{formatDate(ev.created_at)}</td>
                      <td style={{ padding: "4px 8px", textTransform: "capitalize" }}>
                        {ev.especialidad ?? "—"}
                      </td>
                      <td style={{ padding: "4px 8px", textTransform: "capitalize" }}>
                        {ev.sub_area?.replace(/_/g, " ") ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {/* NOTAS SOAP */}
          {soaps.length > 0 && (
            <>
              <SectionTitle>
                Evolución Clínica — Notas SOAP (últimas {soaps.length})
              </SectionTitle>
              {soaps.map((soap) => (
                <div
                  key={soap.id}
                  style={{
                    border: "1px solid #E2E8F0",
                    borderRadius: 6,
                    marginBottom: 10,
                    overflow: "hidden",
                    pageBreakInside: "avoid",
                  }}
                >
                  <div
                    style={{
                      background: "#F1F5F9",
                      padding: "5px 10px",
                      fontSize: 8,
                      fontWeight: 700,
                      color: "#475569",
                      display: "flex",
                      justifyContent: "space-between",
                    }}
                  >
                    <span>SOAP — {formatDate(soap.created_at)}</span>
                    {soap.firmado && (
                      <span style={{ color: "#16A34A" }}>
                        ✓ FIRMADO {formatDate(soap.firmado_at)}
                      </span>
                    )}
                  </div>
                  <div style={{ padding: "8px 10px" }}>
                    {soap.subjetivo && <Field label="S — Subjetivo" value={soap.subjetivo} />}
                    {soap.objetivo && <Field label="O — Objetivo" value={soap.objetivo} />}
                    {soap.plan && <Field label="P — Plan" value={soap.plan} />}
                    {soap.tareas_domiciliarias && (
                      <Field label="Tareas domiciliarias" value={soap.tareas_domiciliarias} />
                    )}
                    {soap.proxima_sesion && (
                      <Field label="Próxima sesión" value={formatDate(soap.proxima_sesion)} />
                    )}
                  </div>
                </div>
              ))}
            </>
          )}

          {/* CONSENTIMIENTOS */}
          {consentimientos.length > 0 && (
            <>
              <SectionTitle>Consentimientos</SectionTitle>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 9,
                  marginBottom: 12,
                }}
              >
                <thead>
                  <tr style={{ background: "#F1F5F9" }}>
                    {["Tipo", "Estado", "Fecha"].map((h) => (
                      <th
                        key={h}
                        style={{
                          textAlign: "left",
                          padding: "4px 8px",
                          fontWeight: 700,
                          color: "#006B6B",
                          fontSize: 8,
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {consentimientos.map((c, i) => (
                    <tr key={c.id} style={{ background: i % 2 === 0 ? "white" : "#F8FAFC" }}>
                      <td style={{ padding: "4px 8px", textTransform: "capitalize" }}>
                        {c.tipo}
                      </td>
                      <td
                        style={{
                          padding: "4px 8px",
                          color: c.firmado ? "#16A34A" : "#F59E0B",
                          fontWeight: 600,
                        }}
                      >
                        {c.firmado ? "✓ Firmado" : "Pendiente"}
                      </td>
                      <td style={{ padding: "4px 8px" }}>
                        {formatDate(c.firmado_at ?? c.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

        </div>

        {/* FOOTER */}
        <div
          style={{
            borderTop: "1px solid #E2E8F0",
            background: "#F8FAFC",
            padding: "8px 24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ fontSize: 7.5, color: "#94A3B8" }}>
            Documento generado electrónicamente — Ley 20.584, Decreto 41 MINSAL
          </div>
          <div style={{ fontSize: 7.5, color: "#94A3B8" }}>
            {clinicName} · {generatedAt}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sub-componentes helper ────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ borderLeft: "3px solid #00B0A8", paddingLeft: 8, marginBottom: 8, marginTop: 14 }}>
      <div
        style={{
          fontSize: 9,
          fontWeight: 700,
          color: "#006B6B",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ marginBottom: 5 }}>
      <span
        style={{
          fontSize: 8,
          fontWeight: 700,
          color: "#94A3B8",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          marginRight: 6,
        }}
      >
        {label}:
      </span>
      <span style={{ fontSize: 9 }}>{value}</span>
    </div>
  );
}

function TwoCol({ items }: { items: Array<[string, string]> }) {
  const half = Math.ceil(items.length / 2);
  const left = items.slice(0, half);
  const right = items.slice(half);
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "0 24px",
        marginBottom: 10,
      }}
    >
      <div>
        {left.map(([l, v]) => (
          <Field key={l} label={l} value={v} />
        ))}
      </div>
      <div>
        {right.map(([l, v]) => (
          <Field key={l} label={l} value={v} />
        ))}
      </div>
    </div>
  );
}

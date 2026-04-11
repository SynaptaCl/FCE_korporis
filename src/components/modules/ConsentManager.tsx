"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { FileSignature, Plus, CheckCircle2, Clock, PenLine, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { AlertBanner } from "@/components/ui/AlertBanner";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { createConsentimiento, signConsentimiento } from "@/app/actions/consentimiento";
import type { Consent, ConsentType } from "@/types";

// ── Templates legales ──────────────────────────────────────────────────────

const CONSENT_TEMPLATES: Record<ConsentType, { label: string; texto: string }> = {
  general: {
    label: "Consentimiento General de Tratamiento",
    texto: `CONSENTIMIENTO INFORMADO PARA TRATAMIENTO DE SALUD

Yo, el/la paciente (o su representante legal), declaro haber sido informado/a de manera comprensible sobre la naturaleza, objetivos, métodos, posibles riesgos y beneficios del tratamiento propuesto en Korporis Centro de Salud (kinesiología, fonoaudiología y/o masoterapia), ubicado en San Joaquín, Santiago de Chile.

En virtud de lo dispuesto en la Ley N° 20.584 sobre derechos y deberes de los pacientes, y el Decreto N° 41 del Ministerio de Salud (MINSAL), manifiesto mi consentimiento libre, voluntario e informado para:

1. Recibir los tratamientos y procedimientos clínicos indicados por el profesional de salud a cargo.
2. Que los datos relativos a mi salud sean registrados en la Ficha Clínica Electrónica (FCE) del establecimiento, con fines exclusivamente clínicos y de continuidad asistencial.
3. Que dicha información sea compartida entre los profesionales del equipo clínico de Korporis, siempre bajo deber de confidencialidad.

Declaro haber recibido información sobre mi derecho a revocar este consentimiento en cualquier momento, sin que ello perjudique la atención recibida hasta ese instante.

Korporis Centro de Salud — San Joaquín, Santiago`,
  },
  menores: {
    label: "Consentimiento para Menores de Edad / Personas en Situación de Vulnerabilidad",
    texto: `CONSENTIMIENTO INFORMADO — REPRESENTANTE LEGAL

Yo, el/la suscrito/a, en calidad de padre/madre/tutor/a legal del/la menor o persona en situación de vulnerabilidad que se identifica en la ficha clínica, declaro haber sido debidamente informado/a sobre:

1. La naturaleza del tratamiento propuesto (kinesiología, fonoaudiología y/o masoterapia) a realizarse en Korporis Centro de Salud.
2. Los objetivos terapéuticos, métodos empleados, posibles riesgos, beneficios esperados y alternativas disponibles.
3. El derecho del/la representado/a a recibir información adecuada a su grado de madurez y a ser escuchado/a en el proceso de atención (Ley N° 20.584, Art. 16).

Autorizo expresamente la realización de los procedimientos clínicos indicados por el equipo profesional de Korporis, y el registro de los datos de salud en la Ficha Clínica Electrónica del establecimiento.

Declaro que la información entregada fue clara, comprensible y suficiente para tomar esta decisión de forma libre e informada.

Parentesco con el/la paciente: ______________________
RUT del representante legal: ______________________`,
  },
  teleconsulta: {
    label: "Consentimiento para Atención por Teleconsulta",
    texto: `CONSENTIMIENTO INFORMADO PARA TELECONSULTA / ATENCIÓN A DISTANCIA

Yo, el/la paciente (o su representante legal), declaro haber sido informado/a sobre la modalidad de atención a distancia (teleconsulta) ofrecida por Korporis Centro de Salud, y acepto voluntariamente recibirla bajo las siguientes condiciones:

1. Comprendo que la teleconsulta se realiza mediante plataforma digital con video y audio en tiempo real, y que presenta diferencias respecto a la atención presencial.
2. Acepto que el profesional podrá evaluar mis condiciones de salud de forma remota, con las limitaciones inherentes a la modalidad (imposibilidad de exploración física directa).
3. Autorizo que la sesión pueda ser registrada únicamente con fines clínicos y de seguimiento, previa información en cada sesión.
4. Reconozco mi responsabilidad de disponer de un entorno adecuado (privacidad, conexión estable, dispositivo con cámara y micrófono) para el desarrollo de la sesión.
5. Puedo revocar este consentimiento en cualquier momento y solicitar atención presencial como alternativa.

Este consentimiento se rige por la Ley N° 20.584, el Decreto N° 41 MINSAL y la normativa vigente sobre telecomunicaciones en salud en Chile.`,
  },
};

// ── SignatureCanvas ────────────────────────────────────────────────────────

function SignatureCanvas({
  onSign,
  onClear,
}: {
  onSign: (dataUrl: string) => void;
  onClear: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const [hasStrokes, setHasStrokes] = useState(false);

  const startDraw = useCallback((x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    isDrawingRef.current = true;
    ctx.beginPath();
    ctx.moveTo(x, y);
  }, []);

  const draw = useCallback((x: number, y: number) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasStrokes((prev) => prev ? prev : true);  // only triggers re-render once
  }, []);

  const endDraw = useCallback(() => {
    isDrawingRef.current = false;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.strokeStyle = "#1E293B";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const onMouseDown = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      startDraw(e.clientX - rect.left, e.clientY - rect.top);
    };
    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      draw(e.clientX - rect.left, e.clientY - rect.top);
    };
    const onMouseUp = () => endDraw();
    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const t = e.touches[0];
      startDraw(t.clientX - rect.left, t.clientY - rect.top);
    };
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const t = e.touches[0];
      draw(t.clientX - rect.left, t.clientY - rect.top);
    };
    const onTouchEnd = () => endDraw();

    canvas.addEventListener("mousedown", onMouseDown);
    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mouseup", onMouseUp);
    canvas.addEventListener("mouseleave", onMouseUp);
    canvas.addEventListener("touchstart", onTouchStart, { passive: false });
    canvas.addEventListener("touchmove", onTouchMove, { passive: false });
    canvas.addEventListener("touchend", onTouchEnd);

    return () => {
      canvas.removeEventListener("mousedown", onMouseDown);
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("mouseup", onMouseUp);
      canvas.removeEventListener("mouseleave", onMouseUp);
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("touchend", onTouchEnd);
    };
  }, [startDraw, draw, endDraw]);

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasStrokes(false);
    onClear();
  };

  const handleConfirm = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasStrokes) return;
    onSign(canvas.toDataURL("image/png"));
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-ink-3 font-medium">Firma del paciente (dibuje con mouse o dedo)</p>
      <div className="border-2 border-dashed border-kp-border rounded-xl bg-white overflow-hidden">
        <canvas
          ref={canvasRef}
          width={600}
          height={180}
          className="w-full touch-none cursor-crosshair"
          style={{ display: "block" }}
        />
      </div>
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" type="button" onClick={handleClear}>
          <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
          Limpiar
        </Button>
        <Button
          variant="primary"
          size="sm"
          type="button"
          onClick={handleConfirm}
          disabled={!hasStrokes}
        >
          <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
          Confirmar firma
        </Button>
      </div>
    </div>
  );
}

// ── ConsentCard ────────────────────────────────────────────────────────────

function ConsentCard({ consent }: { consent: Consent }) {
  const template = CONSENT_TEMPLATES[consent.tipo];
  const date = new Date(consent.created_at).toLocaleDateString("es-CL", {
    day: "numeric", month: "long", year: "numeric",
  });
  return (
    <Card className="p-4 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-ink-1">{template.label}</p>
          <p className="text-xs text-ink-3 mt-0.5">v{consent.version} · {date}</p>
        </div>
        {consent.firmado ? (
          <Badge variant="success" className="shrink-0">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Firmado
          </Badge>
        ) : (
          <Badge variant="warning" className="shrink-0">
            <Clock className="w-3 h-3 mr-1" />
            Pendiente
          </Badge>
        )}
      </div>
      {consent.firmado && consent.firma_profesional && (
        <p className="text-xs text-ink-3 border-t border-kp-border pt-2">
          Hash: <span className="font-mono">{consent.firma_profesional.hash}</span>
          {" · "}
          {new Date(consent.firma_profesional.timestamp).toLocaleString("es-CL")}
        </p>
      )}
    </Card>
  );
}

// ── Module-level constants ─────────────────────────────────────────────────

const TIPOS: { key: ConsentType; label: string; desc: string }[] = [
  { key: "general", label: "General", desc: "Tratamiento estándar de salud" },
  { key: "menores", label: "Menores / Vulnerables", desc: "Representante legal firma" },
  { key: "teleconsulta", label: "Teleconsulta", desc: "Atención a distancia" },
];

// ── ConsentManager ─────────────────────────────────────────────────────────

interface ConsentManagerProps {
  patientId: string;
  consentimientos: Consent[];
}

type Step = "list" | "select-type" | "preview" | "sign";

export function ConsentManager({ patientId, consentimientos }: ConsentManagerProps) {
  const [step, setStep] = useState<Step>("list");
  const [selectedType, setSelectedType] = useState<ConsentType>("general");
  const [pendingConsentId, setPendingConsentId] = useState<string | null>(null);
  const [firmaDataUrl, setFirmaDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const template = CONSENT_TEMPLATES[selectedType];

  const resetFlow = () => {
    setStep("list");
    setError(null);
    setFirmaDataUrl(null);
    setPendingConsentId(null);
    setSuccess(null);
  };

  const handleCreate = async () => {
    setLoading(true);
    setError(null);
    const result = await createConsentimiento(patientId, {
      tipo: selectedType,
      contenido: template.texto,
      // firma_paciente_data_url removed — not needed at creation time
    });
    setLoading(false);
    if (!result.success) { setError(result.error); return; }
    setPendingConsentId(result.data.id);
    setStep("sign");
  };

  const handleSign = async () => {
    if (!firmaDataUrl || !pendingConsentId) {
      setError("Error: no hay firma o consentimiento pendiente. Intente nuevamente.");
      return;
    }
    setLoading(true);
    setError(null);
    const result = await signConsentimiento(pendingConsentId, patientId, firmaDataUrl);
    setLoading(false);
    if (!result.success) { setError(result.error); return; }
    setSuccess("Consentimiento firmado y guardado correctamente.");
    resetFlow();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileSignature className="w-5 h-5 text-kp-accent" />
          <h3 className="text-base font-bold text-ink-1">Consentimientos Informados</h3>
        </div>
        {step === "list" ? (
          <Button variant="primary" size="sm" onClick={() => setStep("select-type")}>
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Nuevo consentimiento
          </Button>
        ) : (
          <Button variant="ghost" size="sm" onClick={resetFlow}>Cancelar</Button>
        )}
      </div>

      {error && (
        <AlertBanner variant="danger">
          {error}
        </AlertBanner>
      )}
      {success && (
        <AlertBanner variant="success">
          {success}
        </AlertBanner>
      )}

      {/* Step: Lista */}
      {step === "list" && (
        <div className="space-y-3">
          {consentimientos.length === 0 ? (
            <div className="text-center py-10 text-ink-3">
              <FileSignature className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No hay consentimientos registrados.</p>
              <p className="text-xs mt-1">Crea uno con el botón &quot;Nuevo consentimiento&quot;.</p>
            </div>
          ) : (
            consentimientos.map((c) => <ConsentCard key={c.id} consent={c} />)
          )}
        </div>
      )}

      {/* Step: Seleccionar tipo */}
      {step === "select-type" && (
        <div className="space-y-4">
          <p className="text-sm text-ink-2 font-medium">Selecciona el tipo de consentimiento:</p>
          <div className="grid gap-3">
            {TIPOS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => { setSelectedType(t.key); setStep("preview"); }}
                className={cn(
                  "text-left p-4 rounded-xl border-2 transition-colors",
                  selectedType === t.key
                    ? "border-kp-accent bg-kp-accent-xs"
                    : "border-kp-border bg-surface-1 hover:border-kp-accent-md"
                )}
              >
                <p className="text-sm font-semibold text-ink-1">{t.label}</p>
                <p className="text-xs text-ink-3 mt-0.5">{t.desc}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step: Preview template */}
      {step === "preview" && (
        <div className="space-y-4">
          <div className="bg-surface-0 border border-kp-border rounded-xl p-5">
            <h4 className="text-sm font-bold text-ink-1 mb-3">{template.label}</h4>
            <pre className="text-xs text-ink-2 whitespace-pre-wrap font-sans leading-relaxed max-h-72 overflow-y-auto">
              {template.texto}
            </pre>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" size="sm" onClick={() => setStep("select-type")}>
              Cambiar tipo
            </Button>
            <Button variant="primary" size="sm" onClick={handleCreate} disabled={loading}>
              <PenLine className="w-3.5 h-3.5 mr-1.5" />
              {loading ? "Guardando..." : "Proceder a firmar"}
            </Button>
          </div>
        </div>
      )}

      {/* Step: Firma canvas */}
      {step === "sign" && (
        <div className="space-y-5">
          <div className="bg-kp-accent-xs border border-kp-accent/20 rounded-xl p-4">
            <p className="text-xs text-ink-2 leading-relaxed">
              El paciente ha leído y acepta el <strong>{template.label}</strong>.
              Solicitar al paciente que firme en el recuadro a continuación.
            </p>
          </div>

          {firmaDataUrl ? (
            <div className="space-y-3">
              <p className="text-xs text-kp-primary font-medium flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                Firma capturada
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={firmaDataUrl} alt="Firma paciente" className="border border-kp-border rounded-lg max-h-40" />
              <div className="flex gap-3">
                <Button variant="ghost" size="sm" onClick={() => setFirmaDataUrl(null)}>
                  <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                  Repetir firma
                </Button>
                <Button variant="primary" size="sm" onClick={handleSign} disabled={loading}>
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                  {loading ? "Firmando..." : "Firmar y guardar"}
                </Button>
              </div>
            </div>
          ) : (
            <SignatureCanvas
              onSign={(dataUrl) => setFirmaDataUrl(dataUrl)}
              onClear={() => setFirmaDataUrl(null)}
            />
          )}
        </div>
      )}
    </div>
  );
}

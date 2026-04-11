"use client";

import { cn } from "@/lib/utils";

// ── Zonas anatómicas ───────────────────────────────────────────────────────

const BODY_ZONES: { group: string; zones: { key: string; label: string }[] }[] = [
  {
    group: "Cabeza y cuello",
    zones: [
      { key: "cabeza", label: "Cabeza" },
      { key: "cuello", label: "Cuello" },
      { key: "cervical", label: "Cervical" },
    ],
  },
  {
    group: "Tronco superior",
    zones: [
      { key: "hombro_d", label: "Hombro D" },
      { key: "hombro_i", label: "Hombro I" },
      { key: "torax", label: "Tórax" },
      { key: "dorsal", label: "Dorsal" },
    ],
  },
  {
    group: "Extremidades superiores",
    zones: [
      { key: "codo_d", label: "Codo D" },
      { key: "codo_i", label: "Codo I" },
      { key: "muneca_d", label: "Muñeca D" },
      { key: "muneca_i", label: "Muñeca I" },
      { key: "mano_d", label: "Mano D" },
      { key: "mano_i", label: "Mano I" },
    ],
  },
  {
    group: "Tronco inferior",
    zones: [
      { key: "lumbar", label: "Lumbar" },
      { key: "sacro", label: "Sacro/Cóccix" },
      { key: "abdomen", label: "Abdomen" },
      { key: "pelvis", label: "Pelvis" },
    ],
  },
  {
    group: "Extremidades inferiores",
    zones: [
      { key: "cadera_d", label: "Cadera D" },
      { key: "cadera_i", label: "Cadera I" },
      { key: "rodilla_d", label: "Rodilla D" },
      { key: "rodilla_i", label: "Rodilla I" },
      { key: "tobillo_d", label: "Tobillo D" },
      { key: "tobillo_i", label: "Tobillo I" },
      { key: "pie_d", label: "Pie D" },
      { key: "pie_i", label: "Pie I" },
    ],
  },
];

// ── Props ──────────────────────────────────────────────────────────────────

interface BodyMapProps {
  value: string[];
  onChange: (zones: string[]) => void;
  readOnly?: boolean;
  label?: string;
}

// ── Componente ─────────────────────────────────────────────────────────────

export function BodyMap({ value, onChange, readOnly = false, label = "Zonas de dolor / tensión" }: BodyMapProps) {
  function toggle(key: string) {
    if (readOnly) return;
    if (value.includes(key)) {
      onChange(value.filter((z) => z !== key));
    } else {
      onChange([...value, key]);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-ink-1">{label}</span>
        {value.length > 0 && (
          <span className="text-xs text-kp-accent font-semibold">
            {value.length} zona{value.length !== 1 ? "s" : ""} seleccionada{value.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      <div className="space-y-3">
        {BODY_ZONES.map((group) => (
          <div key={group.group}>
            <p className="text-[0.65rem] font-semibold text-ink-3 uppercase tracking-wide mb-1.5">
              {group.group}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {group.zones.map(({ key, label: zoneLabel }) => {
                const active = value.includes(key);
                return (
                  <button
                    key={key}
                    type="button"
                    disabled={readOnly}
                    onClick={() => toggle(key)}
                    className={cn(
                      "px-2.5 py-1 text-xs rounded-md border transition-all font-medium",
                      "disabled:cursor-default",
                      active
                        ? "bg-kp-danger-lt border-kp-danger/40 text-red-800"
                        : "bg-surface-0 border-kp-border text-ink-2 hover:border-kp-border-md"
                    )}
                  >
                    {zoneLabel}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {value.length === 0 && (
        <p className="text-xs text-ink-4 italic">Ninguna zona seleccionada</p>
      )}
    </div>
  );
}

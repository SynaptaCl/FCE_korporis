"use client";

import { useState } from "react";
import { Plus, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScaleSlider } from "@/components/shared/ScaleSlider";
import type { CifItem, CifAssessment, CifDomainType, CifQuantifier } from "@/types";
import { CIF_QUANTIFIER_LABELS } from "@/types";

// ── Tabs ───────────────────────────────────────────────────────────────────

const TABS: { key: keyof CifAssessment; label: string; domain: CifDomainType; codeHint: string }[] = [
  { key: "funciones", label: "Funciones Corporales", domain: "funciones_corporales", codeHint: "b280" },
  { key: "actividades", label: "Actividades", domain: "actividades", codeHint: "d450" },
  { key: "participacion", label: "Participación", domain: "participacion", codeHint: "d640" },
  { key: "contexto", label: "Factores Contextuales", domain: "factores_ambientales", codeHint: "e115" },
];

// ── Props ──────────────────────────────────────────────────────────────────

interface CifMapperProps {
  value: CifAssessment;
  onChange: (value: CifAssessment) => void;
  readOnly?: boolean;
}

// ── Componente ─────────────────────────────────────────────────────────────

export function CifMapper({ value, onChange, readOnly = false }: CifMapperProps) {
  const [activeTab, setActiveTab] = useState<keyof CifAssessment>("funciones");

  const totalItems =
    value.funciones.length +
    value.actividades.length +
    value.participacion.length +
    value.contexto.length;

  function addItem(section: keyof CifAssessment, domain: CifDomainType) {
    const newItem: CifItem = {
      id: crypto.randomUUID(),
      domain,
      code: "",
      description: "",
      quantifier: 0,
      is_facilitator: false,
      notes: "",
    };
    onChange({ ...value, [section]: [...value[section], newItem] });
  }

  function removeItem(section: keyof CifAssessment, id: string) {
    onChange({ ...value, [section]: value[section].filter((item) => item.id !== id) });
  }

  function updateItem(section: keyof CifAssessment, id: string, patch: Partial<CifItem>) {
    onChange({
      ...value,
      [section]: value[section].map((item) =>
        item.id === id ? { ...item, ...patch } : item
      ),
    });
  }

  const activeTabDef = TABS.find((t) => t.key === activeTab)!;
  const items = value[activeTab];

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-ink-3">
          {totalItems === 0
            ? "Sin ítems CIF registrados"
            : `${totalItems} ítem${totalItems !== 1 ? "s" : ""} registrado${totalItems !== 1 ? "s" : ""}`}
        </span>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1.5 border-b border-kp-border pb-2">
        {TABS.map((tab) => {
          const count = value[tab.key].length;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-lg transition-colors",
                activeTab === tab.key
                  ? "bg-violet-100 text-violet-800 border border-violet-200"
                  : "bg-surface-0 border border-kp-border text-ink-2 hover:border-kp-border-md"
              )}
            >
              {tab.label}
              {count > 0 && (
                <span className={cn(
                  "ml-1.5 text-[0.65rem] font-bold rounded-full px-1",
                  activeTab === tab.key ? "text-violet-600" : "text-kp-accent"
                )}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Items list */}
      <div className="space-y-2">
        {items.length === 0 && (
          <p className="text-xs text-ink-4 italic py-2 text-center">
            Sin ítems en {activeTabDef.label.toLowerCase()}
          </p>
        )}

        {items.map((item) => (
          <CifItemRow
            key={item.id}
            item={item}
            showFacilitator={activeTab === "contexto"}
            readOnly={readOnly}
            onUpdate={(patch) => updateItem(activeTab, item.id, patch)}
            onRemove={() => removeItem(activeTab, item.id)}
            codeHint={activeTabDef.codeHint}
          />
        ))}
      </div>

      {/* Add button */}
      {!readOnly && (
        <button
          type="button"
          onClick={() => addItem(activeTab, activeTabDef.domain)}
          className="flex items-center gap-1.5 text-xs text-kp-accent font-medium hover:text-kp-primary transition-colors py-1"
        >
          <Plus className="w-3.5 h-3.5" />
          Agregar ítem — {activeTabDef.label}
        </button>
      )}
    </div>
  );
}

// ── CifItemRow ─────────────────────────────────────────────────────────────

interface CifItemRowProps {
  item: CifItem;
  showFacilitator: boolean;
  readOnly: boolean;
  onUpdate: (patch: Partial<CifItem>) => void;
  onRemove: () => void;
  codeHint: string;
}

function CifItemRow({ item, showFacilitator, readOnly, onUpdate, onRemove, codeHint }: CifItemRowProps) {
  const [expanded, setExpanded] = useState(false);

  const quantifierColor =
    item.quantifier === 0
      ? "text-kp-success"
      : item.quantifier <= 1
        ? "text-kp-success"
        : item.quantifier === 2
          ? "text-kp-warning"
          : "text-kp-danger";

  return (
    <div className={cn(
      "rounded-lg border transition-colors",
      item.quantifier >= 3
        ? "border-red-200 bg-kp-danger-lt/40"
        : item.quantifier === 2
          ? "border-amber-200 bg-kp-warning-lt/40"
          : "border-kp-border bg-surface-1"
    )}>
      {/* Compact row */}
      <div className="flex items-center gap-2 px-3 py-2">
        {/* Expand toggle */}
        <button
          type="button"
          onClick={() => setExpanded((p) => !p)}
          className="text-ink-4 hover:text-ink-2 shrink-0"
        >
          {expanded
            ? <ChevronDown className="w-3.5 h-3.5" />
            : <ChevronRight className="w-3.5 h-3.5" />}
        </button>

        {/* Code */}
        <input
          type="text"
          placeholder={codeHint}
          readOnly={readOnly}
          value={item.code}
          onChange={(e) => onUpdate({ code: e.target.value })}
          className="w-16 px-2 py-1 text-xs font-mono text-kp-primary bg-kp-accent-xs border border-kp-accent/20 rounded focus:outline-none focus:ring-1 focus:ring-kp-accent/40 disabled:bg-surface-0"
          disabled={readOnly}
        />

        {/* Description */}
        <input
          type="text"
          placeholder="Descripción del ítem CIF…"
          readOnly={readOnly}
          value={item.description}
          onChange={(e) => onUpdate({ description: e.target.value })}
          className="flex-1 px-2 py-1 text-xs text-ink-1 bg-surface-0 border border-kp-border rounded focus:outline-none focus:ring-1 focus:ring-kp-accent/40 disabled:bg-surface-0"
          disabled={readOnly}
        />

        {/* Quantifier badge */}
        <span className={cn("text-xs font-bold tabular-nums w-4 text-center shrink-0", quantifierColor)}>
          {item.quantifier}
        </span>

        {/* Is facilitator (only for contexto) */}
        {showFacilitator && (
          <label className="flex items-center gap-1 text-[0.6rem] text-ink-3 cursor-pointer whitespace-nowrap shrink-0">
            <input
              type="checkbox"
              disabled={readOnly}
              checked={item.is_facilitator ?? false}
              onChange={(e) => onUpdate({ is_facilitator: e.target.checked })}
              className="accent-kp-accent w-3 h-3"
            />
            Facilitador
          </label>
        )}

        {/* Remove */}
        {!readOnly && (
          <button
            type="button"
            onClick={onRemove}
            className="text-ink-4 hover:text-kp-danger shrink-0 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Expanded: quantifier slider + notes */}
      {expanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-kp-border/50 pt-3">
          <ScaleSlider
            label={`Cuantificador CIF — ${CIF_QUANTIFIER_LABELS[item.quantifier as CifQuantifier]}`}
            value={item.quantifier}
            min={0}
            max={4}
            colorScale="green-red"
            labels={{
              0: "0 Sin",
              1: "1 Leve",
              2: "2 Mod.",
              3: "3 Grave",
              4: "4 Total",
            }}
            onChange={(v) => onUpdate({ quantifier: v as CifQuantifier })}
          />
          <div className="space-y-1">
            <label className="text-xs font-medium text-ink-2">Notas (opcional)</label>
            <input
              type="text"
              placeholder="Observaciones sobre este ítem…"
              readOnly={readOnly}
              value={item.notes ?? ""}
              onChange={(e) => onUpdate({ notes: e.target.value })}
              className="w-full px-2 py-1.5 text-xs text-ink-1 bg-surface-0 border border-kp-border rounded focus:outline-none focus:ring-1 focus:ring-kp-accent/40 disabled:bg-surface-0"
              disabled={readOnly}
            />
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type {
  FhirPatient,
  FhirEncounter,
  FhirObservation,
  FhirCondition,
  FhirCarePlan,
} from "@/lib/fhir-mapper";

type TabId = "patient" | "encounter" | "condition" | "observation" | "careplan";

interface Tab {
  id: TabId;
  label: string;
}

interface FhirPreviewProps {
  patient: FhirPatient;
  encounter: FhirEncounter | null;
  observations: FhirObservation[];
  conditions: FhirCondition[];
  carePlan: FhirCarePlan | null;
}

const TABS: Tab[] = [
  { id: "patient",     label: "Patient" },
  { id: "encounter",   label: "Encounter" },
  { id: "condition",   label: "Condition" },
  { id: "observation", label: "Observation" },
  { id: "careplan",    label: "CarePlan" },
];

/**
 * Syntax highlighting sin dependencias externas.
 * Colorea keys, strings, números, booleans y null.
 */
function highlight(json: string): string {
  return json
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
      (match) => {
        // Key (string seguido de ":")
        if (/^"/.test(match) && /:$/.test(match)) {
          return `<span style="color:#79c0ff">${match}</span>`;
        }
        // String value
        if (/^"/.test(match)) {
          return `<span style="color:#a5d6ff">${match}</span>`;
        }
        // Boolean
        if (/true|false/.test(match)) {
          return `<span style="color:#ffab70">${match}</span>`;
        }
        // Null
        if (/null/.test(match)) {
          return `<span style="color:#ff7b72">${match}</span>`;
        }
        // Number
        return `<span style="color:#79c0ff">${match}</span>`;
      }
    );
}

function JsonBlock({ data }: { data: unknown }) {
  if (data === null || data === undefined) {
    return (
      <div className="p-10 text-center text-ink-3 text-sm">
        No hay datos disponibles para este recurso en este paciente.
      </div>
    );
  }
  // Array vacío
  if (Array.isArray(data) && data.length === 0) {
    return (
      <div className="p-10 text-center text-ink-3 text-sm">
        No hay registros de este tipo para este paciente.
      </div>
    );
  }
  const json = JSON.stringify(data, null, 2);
  return (
    <pre
      className="p-5 text-xs leading-relaxed overflow-auto max-h-[560px] font-mono"
      style={{ margin: 0 }}
      dangerouslySetInnerHTML={{ __html: highlight(json) }}
    />
  );
}

export function FhirPreview({
  patient,
  encounter,
  observations,
  conditions,
  carePlan,
}: FhirPreviewProps) {
  const [activeTab, setActiveTab] = useState<TabId>("patient");

  const tabData: Record<TabId, unknown> = {
    patient:     patient,
    encounter:   encounter,
    observation: observations.length > 0 ? observations : null,
    condition:   conditions.length > 0 ? conditions : null,
    careplan:    carePlan,
  };

  const tabCounts: Partial<Record<TabId, number>> = {
    observation: observations.length,
    condition:   conditions.length,
  };

  return (
    <div className="bg-surface-1 rounded-xl border border-kp-border overflow-hidden">
      {/* Tab bar */}
      <div className="flex overflow-x-auto border-b border-kp-border bg-surface-0">
        {TABS.map((tab) => {
          const count = tabCounts[tab.id];
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-1.5 px-5 py-3 text-xs font-mono font-semibold",
                "whitespace-nowrap transition-colors cursor-pointer border-b-2 shrink-0",
                isActive
                  ? "border-kp-accent text-kp-accent bg-surface-1"
                  : "border-transparent text-ink-3 hover:text-ink-1 hover:bg-kp-border/20"
              )}
            >
              {tab.label}
              {count !== undefined && (
                <span
                  className={cn(
                    "text-[0.6rem] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center",
                    isActive
                      ? "bg-kp-accent text-white"
                      : "bg-kp-border-md text-ink-3"
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* JSON viewer — fondo GitHub dark */}
      <div style={{ background: "#0d1117" }}>
        <JsonBlock data={tabData[activeTab]} />
      </div>
    </div>
  );
}

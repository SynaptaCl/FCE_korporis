import { Activity } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-1 items-center justify-center bg-surface-0">
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-3">
          <Activity className="w-8 h-8 text-kp-accent" />
          <h1 className="text-3xl font-bold text-ink-1 font-[family-name:var(--font-outfit)]">
            Korporis FCE
          </h1>
        </div>
        <p className="text-ink-3">
          Ficha Clínica Electrónica — En desarrollo
        </p>
      </div>
    </div>
  );
}

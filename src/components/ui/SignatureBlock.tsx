"use client";

import { ShieldCheck, CheckCircle, Save } from "lucide-react";
import { Button } from "./Button";
import { cn } from "@/lib/utils";

interface SignatureBlockProps {
  isSigned: boolean;
  onSign: () => void;
  signerName?: string;
  signedAt?: string;
  disabled?: boolean;
  className?: string;
}

export function SignatureBlock({
  isSigned,
  onSign,
  signerName,
  signedAt,
  disabled = false,
  className,
}: SignatureBlockProps) {
  return (
    <div className={cn("border border-kp-border rounded-xl bg-surface-0 p-6", className)}>
      <h4 className="text-sm font-bold text-ink-1 mb-4 flex items-center gap-2">
        <ShieldCheck className="w-5 h-5 text-kp-accent" />
        Firma Electrónica Avanzada
      </h4>

      <div className="flex items-center justify-between">
        <p className="text-xs text-ink-3 max-w-2xl">
          Al firmar este documento, certifico que la información documentada es veraz y completa
          (Ley 20.584, Decreto 41 MINSAL). El documento quedará inmutable tras la firma.
        </p>

        {!isSigned ? (
          <Button
            variant="primary"
            onClick={onSign}
            disabled={disabled}
          >
            <Save className="w-4 h-4 mr-2" />
            Firmar Documento
          </Button>
        ) : (
          <div className="bg-kp-success-lt text-green-800 font-semibold py-2 px-5 rounded-lg border border-green-300 flex items-center text-sm">
            <CheckCircle className="w-4 h-4 mr-2" />
            Firmado
          </div>
        )}
      </div>

      {isSigned && signerName && (
        <p className="text-xs text-ink-3 mt-3 border-t border-kp-border pt-3">
          Firmado por <span className="font-medium text-ink-2">{signerName}</span>
          {signedAt && <> · {signedAt}</>}
        </p>
      )}
    </div>
  );
}

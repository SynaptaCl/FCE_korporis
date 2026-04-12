"use client";

import { useEffect } from "react";

export interface BrandingConfig {
  primary?: string;
  navy?: string;
  navy_deep?: string;
  accent?: string;
  light_bg?: string;
  logo_url?: string;
  clinic_short_name?: string;
  clinic_initials?: string;
}

interface BrandingInjectorProps {
  branding: BrandingConfig | null;
}

export function BrandingInjector({ branding }: BrandingInjectorProps) {
  useEffect(() => {
    if (!branding) return;
    const root = document.documentElement;
    if (branding.primary)   root.style.setProperty("--clinic-primary",  branding.primary);
    if (branding.navy)      root.style.setProperty("--clinic-navy",      branding.navy);
    if (branding.navy_deep) root.style.setProperty("--clinic-navy-deep", branding.navy_deep);
    if (branding.accent)    root.style.setProperty("--clinic-accent",    branding.accent);
    if (branding.light_bg)  root.style.setProperty("--clinic-light-bg",  branding.light_bg);
  }, [branding]);

  // Renders nothing — only side-effect
  return null;
}

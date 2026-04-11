/**
 * Validación de RUN chileno usando algoritmo Módulo 11.
 * El RUN (Rol Único Nacional) es el identificador civil obligatorio en Chile.
 */

export function cleanRun(run: string): string {
  return run.replace(/[^0-9kK]/g, "").toUpperCase();
}

export function calculateDV(body: string): string {
  const digits = body.split("").reverse().map(Number);
  const multipliers = [2, 3, 4, 5, 6, 7];
  let sum = 0;

  for (let i = 0; i < digits.length; i++) {
    sum += digits[i] * multipliers[i % multipliers.length];
  }

  const remainder = 11 - (sum % 11);

  if (remainder === 11) return "0";
  if (remainder === 10) return "K";
  return remainder.toString();
}

export function validateRun(run: string): boolean {
  const clean = cleanRun(run);
  if (clean.length < 2) return false;

  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);

  // Body must be all digits
  if (!/^\d+$/.test(body)) return false;

  // Body must be between 1.000.000 and 99.999.999
  const numBody = parseInt(body, 10);
  if (numBody < 1000000 || numBody > 99999999) return false;

  return calculateDV(body) === dv;
}

export function formatRun(run: string): string {
  const clean = cleanRun(run);
  if (clean.length < 2) return clean;

  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);
  const formatted = body.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  return `${formatted}-${dv}`;
}

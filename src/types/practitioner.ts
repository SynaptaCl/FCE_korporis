import type { Especialidad, Rol } from "@/lib/constants";

export interface Practitioner {
  id: string;
  rut: string;
  nombres: string;
  apellidos: string;
  especialidad: Especialidad;
  rol: Rol;
  registro_superintendencia?: string;
  activo: boolean;
  created_at: string;
}

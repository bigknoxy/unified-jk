/**
 * Manifest Registry Types
 */

import { z } from 'zod';

export const AppManifestSchema = z.object({
  id: z.string().min(1).regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  url: z.string().url(),
  icon: z.string().max(50).optional(),
  permissions: z.array(z.string()).min(1),
  category: z.string().max(50).optional(),
  order: z.number().int().min(0).optional(),
  version: z.string().regex(/^\d+\.\d+\.\d+$/)
});

export type AppManifest = z.infer<typeof AppManifestSchema>;

export interface RegistryResponse {
  manifests: AppManifest[];
  total: number;
}

export interface RegistryError {
  error: string;
  message: string;
  details?: z.ZodError[];
}

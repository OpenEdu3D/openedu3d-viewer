import type { ModelAnnotation } from './types';

export function createId() {
  return globalThis.crypto?.randomUUID?.() ?? `oe3d-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Filters unsafe data without modifying the host's array or objects. */
export function validAnnotations(input: unknown, modelId: string, paths: string[]) {
  const ids = new Set<string>();
  const vector = (value: unknown): value is [number, number, number] =>
    Array.isArray(value) && value.length === 3 && value.every((entry) => typeof entry === 'number' && Number.isFinite(entry));
  if (!Array.isArray(input)) return { values: [], rejected: true };
  const values = input.filter((entry): entry is ModelAnnotation => {
    if (!entry || typeof entry.id !== 'string' || !entry.id || ids.has(entry.id) || entry.modelId !== modelId ||
        typeof entry.title !== 'string' || !entry.title.trim() || typeof entry.description !== 'string' ||
        !entry.anchor || !paths.includes(entry.anchor.nodePath) || !vector(entry.anchor.position) ||
        !vector(entry.anchor.normal) || Math.hypot(...entry.anchor.normal) < 1e-10) return false;
    ids.add(entry.id);
    return true;
  });
  return { values, rejected: values.length !== input.length };
}

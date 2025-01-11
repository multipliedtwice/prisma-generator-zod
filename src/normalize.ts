import { AllowedPathType, FieldConfigType } from './types';

export function normalizeKey(key: string): string {
  return key.replace(/\[\]/g, '');
}

export function normalizePath(path: AllowedPathType): string {
  return ((path as FieldConfigType).name || (path as string))
    .split('.')
    .map(normalizeKey)
    .join('.');
}

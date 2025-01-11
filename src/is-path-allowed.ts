import { normalizePath } from './normalize';
import { IsPathAllowedParams } from './types';

export function isPathAllowed({
  allowedPaths,
  fullPath,
}: IsPathAllowedParams): boolean {
  const normalizedFullPath = normalizePath(fullPath);

  const isAllowed = allowedPaths.some((allowedPath) => {
    const normalizedAllowedPath = normalizePath(allowedPath);

    if (normalizedAllowedPath === normalizedFullPath) {
      return true;
    }

    const allowedSegments = normalizedAllowedPath.split('.');
    const fullPathSegments = normalizedFullPath.split('.');

    return (
      allowedSegments.length > fullPathSegments.length &&
      allowedSegments.slice(0, fullPathSegments.length).join('.') ===
        fullPathSegments.join('.')
    );
  });
  return isAllowed;
}

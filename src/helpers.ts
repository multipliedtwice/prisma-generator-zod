export function isObject(obj: any): boolean {
  return obj && typeof obj === 'object' && !Array.isArray(obj);
}

export function deepMerge(target: any, source: any): any {
  if (Array.isArray(target) && Array.isArray(source)) {
    return target.concat(source);
  } else if (isObject(target) && isObject(source)) {
    const merged: any = { ...target };
    for (const key of Object.keys(source)) {
      if (key in target) {
        merged[key] = deepMerge(target[key], source[key]);
      } else {
        merged[key] = source[key];
      }
    }
    return merged;
  } else {
    return source;
  }
}

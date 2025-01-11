import { resolveModelName } from './generate-zod';
import { logger } from './logger';
import { ModelMapType, SynonymsType } from './types';

export function findActualModelName({
  splitPaths,
  modelMap,
  synonyms,
}: {
  splitPaths: string[];
  modelMap: ModelMapType;
  synonyms: SynonymsType;
}) {
  for (let i = splitPaths.length - 1; i >= 0; i--) {
    const pathSegment = splitPaths[i];
    logger.debug('modelMap[pathSegment] :>> ', {
      pathSegment,
      modelMap: modelMap[pathSegment],
    });
    if (modelMap[pathSegment]) {
      return pathSegment;
    } else {
      const resolvedModel = resolveModelName({
        modelName: pathSegment,
        synonyms,
      });
      logger.debug('resolvedModel :>> ', resolvedModel);
      if (resolvedModel && modelMap[resolvedModel]) {
        return resolvedModel;
      }
    }
  }
}

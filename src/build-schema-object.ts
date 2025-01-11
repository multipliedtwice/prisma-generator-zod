import { findActualModelName } from './find-actual-model-name';
import {
  addToSchemaObject,
  objectToZodCode,
  resolveModelName,
} from './generate-zod';
import { deepMerge } from './helpers';
import { isQueryOperator } from './is-query-operator';
import { logger } from './logger';
import { normalizeKey } from './normalize';
import { BuildSchemaObjectParams, ModelMapType, SynonymsType } from './types';

export function buildSchemaObject({
  processedModels,
  allowedPaths,
  modelName,
  modelMap,
  enumMap,
  synonyms,
}: BuildSchemaObjectParams): any {
  logger.debug('buildSchemaObject');
  if (!modelMap[modelName]) {
    console.warn(
      `Model ${modelName} not found in modelMap, returning empty schema object`
    );
    return {};
  }

  const schemaObject = allowedPaths.reduce((accumulator, fieldDef) => {
    const fieldName =
      typeof fieldDef === 'string' ? fieldDef : fieldDef?.name || null;

    if (!fieldName) {
      console.warn(`Skipping invalid fieldDef: ${JSON.stringify(fieldDef)}`);
      return accumulator;
    }

    const keys = fieldName.split('.');
    const fieldConfig = typeof fieldDef === 'object' ? fieldDef : {};

    if (
      !isPathValid({
        keys,
        synonyms,
        modelName:
          findActualModelName({
            splitPaths: keys,
            modelMap,
            synonyms,
          }) || modelName,
        modelMap,
        enumMap,
      })
    ) {
      console.warn(`Skipping invalid path: ${fieldName}`);
      return accumulator;
    }

    const fieldSchema = addToSchemaObject({
      fieldConfig,
      processedModels: new Set(processedModels),
      allowedPaths,
      currentPath: '',
      modelName,
      modelMap,
      enumMap,
      synonyms,
      keys,
      index: 0,
    });
    logger.debug('fieldSchema :>> ', fieldSchema);
    return deepMerge(accumulator, fieldSchema);
  }, {});
  logger.debug('schemaObject :>> ', schemaObject);
  if (!schemaObject) return {};
  const finalSchemaObject = Object.fromEntries(
    Object.entries(schemaObject).map(([key, value]) => [
      key,
      objectToZodCode(value),
    ])
  );

  return finalSchemaObject;
}

export function isPathValid({
  keys,
  synonyms,
  modelName,
  modelMap,
  enumMap,
}: {
  keys: string[];
  synonyms: SynonymsType;
  modelName: string;
  enumMap: Record<string, string[]> | undefined;
  modelMap: ModelMapType;
}): boolean {
  let fieldType: string | undefined;
  let parentModel: string | undefined;
  return keys.every((key) => {
    const normalizedKey = normalizeKey(key);
    const isQuery = isQueryOperator(normalizedKey);
    const resolvedModelName = resolveModelName({
      modelName,
      synonyms,
      normalizedKey,
    });

    if (modelMap?.[modelName!]?.[key]?.fieldType)
      fieldType = modelMap?.[modelName!]?.[key]?.fieldType;
    if (!isQuery && modelMap?.[resolvedModelName!])
      parentModel = resolvedModelName;

    logger.debug('resolvedModelName :>> ', {
      resolvedModelName,
      parentModel,
      key,
      modelName,
      synonyms,
      normalizedKey,
      fieldType,
      enumMap,
      isQuery,
    });
    return (
      isQuery ||
      modelMap?.[normalizedKey] ||
      modelMap?.[resolvedModelName!] ||
      modelMap?.[modelName!]?.[key] ||
      modelMap?.[parentModel!]?.[key] ||
      enumMap?.[fieldType!] ||
      modelMap?.[fieldType!]
    );
  });
}

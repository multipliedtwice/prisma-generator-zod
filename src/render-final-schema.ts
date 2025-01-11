import { buildSchemaObject } from './build-schema-object';
import { objectToZodCode } from './generate-zod';
import { logger } from './logger';
import { renderFinalSchemaParams } from './types';

export function renderFinalSchema({
  allowedPaths,
  modelFields,
  modelName,
  modelMap,
  enumMap,
  synonyms,
}: renderFinalSchemaParams): string {
  logger.debug('renderFinalSchema');
  logger.debug('renderFinalSchema :>> ', {
    allowedPaths,
    modelFields,
    modelName,
    modelMap,
    enumMap,
    synonyms,
  });

  const schemaObject = buildSchemaObject({
    processedModels: new Set(),
    allowedPaths,
    modelFields,
    modelName,
    modelMap,
    enumMap,
    synonyms,
  });

  logger.debug('renderFinalSchema schemaObject:', schemaObject);

  const schemaCode = objectToZodCode(schemaObject);

  logger.debug('schemaCode:', modelName, schemaCode);

  const code = `
  import { z } from 'zod';
  
  export const ${modelName}Schema = ${schemaCode};
  
  export type ${modelName}Type = z.infer<typeof ${modelName}Schema>;
  `;

  return code;
}

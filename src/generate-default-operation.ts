import {
  resolveModelName,
  mapPrismaTypeToZodType,
  generateRelatedModelSchema,
} from './generate-zod';

import { isScalarType } from './is-scalar-type';
import { logger } from './logger';
import { GenerateDefaultOperationSchemaParams, PrismaField } from './types';

export function generateDefaultOperationSchema({
  operation,
  modelName,
  modelMap,
  enumMap,
  synonyms,
  allowedPaths,
  processedModels,
  fieldIsList,
  currentPath,
}: GenerateDefaultOperationSchemaParams): string {
  const resolvedModelName =
    resolveModelName({
      modelName,
      synonyms,
    }) || modelName;
  logger.debug('resolvedModelName :>> ', resolvedModelName);
  if (!resolvedModelName) return '';
  const modelFields = modelMap[resolvedModelName] as Record<
    string,
    PrismaField
  >;

  const uniqueFieldEntry = Object.entries(modelFields).find(
    ([, field]) =>
      isScalarType(field.fieldType) && (field.isUnique || field.isId)
  );

  if (!uniqueFieldEntry) {
    console.warn(
      `No unique scalar field found for model: ${resolvedModelName}`
    );
    return 'z.any()';
  }

  const [uniqueFieldName, uniqueField] = uniqueFieldEntry;
  const uniqueFieldType = mapPrismaTypeToZodType({
    prismaType: uniqueField.fieldType,
    processedModels,
    allowedPaths,
    currentPath: `${currentPath}.${operation}.where.${uniqueFieldName}`,
    synonyms,
    modelMap,
    enumMap,
  });

  let relatedModelSchema: string;
  let dataPath: string;
  logger.debug('operation :>> ', operation);
  switch (operation) {
    case 'connect':
      const connectSchema = `z.object({ ${uniqueFieldName}: ${uniqueFieldType} })`;
      return connectSchema;

    case 'connectOrCreate':
      dataPath = `${currentPath}.${operation}.create`;
      relatedModelSchema = generateRelatedModelSchema({
        modelName: resolvedModelName,
        modelMap,
        enumMap,
        allowedPaths,
        processedModels,
        synonyms,
        currentPath: dataPath,
      });
      const connectOrCreateSchema = `z.object({
            where: z.object({ ${uniqueFieldName}: ${uniqueFieldType} }),
            create: ${relatedModelSchema}
          })`;
      return connectOrCreateSchema;

    case 'create':
      dataPath = `${currentPath}.${operation}`;
      relatedModelSchema = generateRelatedModelSchema({
        modelName: resolvedModelName,
        modelMap,
        enumMap,
        allowedPaths,
        processedModels,
        synonyms,
        currentPath: dataPath,
      });
      return relatedModelSchema;

    case 'createMany':
      dataPath = `${currentPath}.${operation}.data`;
      relatedModelSchema = generateRelatedModelSchema({
        modelName: resolvedModelName,
        modelMap,
        enumMap,
        allowedPaths,
        processedModels,
        synonyms,
        currentPath: dataPath,
      });
      const createManySchema = `z.object({
            data: z.array(${relatedModelSchema}),
            skipDuplicates: z.boolean().nullish()
          }).nullish()`;
      return createManySchema;

    case 'update':
      if (fieldIsList) {
        dataPath = `${currentPath}.${operation}[]`;
        relatedModelSchema = `z.array(z.object({
              where: z.object({ ${uniqueFieldName}: ${uniqueFieldType} }),
              data: ${generateRelatedModelSchema({
                modelName: resolvedModelName,
                modelMap,
                enumMap,
                allowedPaths,
                processedModels,
                synonyms,
                currentPath: `${dataPath}.data`,
              })}
            }))`;
      } else {
        dataPath = `${currentPath}.${operation}.data`;
        relatedModelSchema = generateRelatedModelSchema({
          modelName: resolvedModelName,
          modelMap,
          enumMap,
          allowedPaths,
          processedModels,
          synonyms,
          currentPath: dataPath,
        });
        relatedModelSchema = `z.object({
              data: ${relatedModelSchema}
            })`;
      }
      return `z.object({ update: ${relatedModelSchema} }).nullish()`;

    case 'updateMany':
      dataPath = `${currentPath}.${operation}.data`;
      relatedModelSchema = generateRelatedModelSchema({
        modelName: resolvedModelName,
        modelMap,
        enumMap,
        allowedPaths,
        processedModels,
        synonyms,
        currentPath: dataPath,
      });
      const updateManySchema = `z.object({
            where: z.object({}).nullish(),
            data: ${relatedModelSchema}
          }).nullish()`;
      return updateManySchema;

    case 'upsert':
      const createDataPath = `${currentPath}.${operation}.create`;
      const updateDataPath = `${currentPath}.${operation}.update`;
      const createRelatedModelSchema = generateRelatedModelSchema({
        modelName: resolvedModelName,
        modelMap,
        enumMap,
        allowedPaths,
        processedModels,
        synonyms,
        currentPath: createDataPath,
      });
      const updateRelatedModelSchema = generateRelatedModelSchema({
        modelName: resolvedModelName,
        modelMap,
        enumMap,
        allowedPaths,
        processedModels,
        synonyms,
        currentPath: updateDataPath,
      });
      const upsertSchema = `z.object({
            where: z.object({ ${uniqueFieldName}: ${uniqueFieldType} }),
            create: ${createRelatedModelSchema},
            update: ${updateRelatedModelSchema}
          })`;
      return upsertSchema;

    case 'delete':
      if (fieldIsList) {
        const deleteSchema = `z.array(z.object({ ${uniqueFieldName}: ${uniqueFieldType} }))`;
        return `z.object({ delete: ${deleteSchema} }).nullish()`;
      } else {
        return `z.object({ delete: z.boolean() }).nullish()`;
      }

    case 'deleteMany':
      const deleteManySchema = `z.object({
            where: z.object({}).nullish()
          }).nullish()`;
      return deleteManySchema;

    case 'disconnect':
      if (fieldIsList) {
        const disconnectSchema = `z.array(z.object({ ${uniqueFieldName}: ${uniqueFieldType} }))`;
        return `z.object({ disconnect: ${disconnectSchema} }).nullish()`;
      } else {
        return `z.object({ disconnect: z.boolean() }).nullish()`;
      }

    case 'set':
      const setSchema = fieldIsList
        ? `z.array(z.object({ ${uniqueFieldName}: ${uniqueFieldType} }))`
        : `z.object({ ${uniqueFieldName}: ${uniqueFieldType} })`;
      return `z.object({ set: ${setSchema} }).nullish()`;

    default:
      return 'z.any()';
  }
}

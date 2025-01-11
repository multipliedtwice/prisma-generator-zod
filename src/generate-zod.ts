import { getNewPath } from './parse-prisma';
import { handleRelationField, relationOperations } from './handlers';
import {
  AddToSchemaObjectParams,
  GenerateRelatedModelSchemaParams,
  GetZodTypeForFieldParams,
  MapPrismaTypeToZodTypeParams,
  PrismaField,
  ResolveModelNameParams,
} from './types';
import { handleScalarField } from './handlers';
import { isScalarType } from './is-scalar-type';
import { generateDefaultOperationSchema } from './generate-default-operation';
import { normalizePath } from './normalize';
import { isPathAllowed } from './is-path-allowed';
import { findActualModelName } from './find-actual-model-name';
import { deepMerge } from './helpers';
import { logger } from './logger';

const stringOperators = ['contains', 'startsWith', 'endsWith', 'search'];
const arrayOperators = ['in', 'notIn'];
const scalarOperators = ['equals', 'lt', 'lte', 'gt', 'gte', 'not'];
const logicalOperators = ['AND', 'OR', 'NOT'];
const numberOperators = ['take', 'skip', 'limit'];
const relationalOperators = ['some', 'every', 'none'];

export function addToSchemaObject({
  fieldConfig = {},
  processedModels,
  allowedPaths,
  currentPath,
  modelName,
  modelMap,
  enumMap,
  synonyms,
  keys,
  index = 0,
}: AddToSchemaObjectParams): any {
  if (index >= keys.length) {
    return undefined;
  }
  logger.debug('addToSchemaObject');

  const currentKey = keys[index];
  const isArray = currentKey.endsWith('[]');
  const normalizedKey = isArray ? currentKey.slice(0, -2) : currentKey;
  const newPath = getNewPath(currentPath, normalizedKey);
  const splitPaths = currentPath.split('.');
  const updatedModelName =
    findActualModelName({ splitPaths, modelMap, synonyms }) || modelName;

  logger.debug('updatedModelName', { updatedModelName });

  if (!isPathAllowed({ fullPath: newPath, allowedPaths })) {
    logger.debug('not allowed');
    return undefined;
  }

  logger.debug('addToSchemaObject: ', {
    currentKey,
    isArray,
    normalizedKey,
    newPath,
    updatedModelName,
    isPathAllowed: isPathAllowed({ fullPath: newPath, allowedPaths }),
    fullPath: newPath,
    allowedPaths,
  });

  if (logicalOperators.includes(normalizedKey)) {
    const remainingKeys = keys.slice(index + 1);

    logger.debug('logicalOperators :>> ', { remainingKeys, normalizedKey });

    const childSchema = addToSchemaObject({
      fieldConfig,
      processedModels,
      allowedPaths,
      currentPath: newPath,
      modelName: updatedModelName,
      modelMap,
      enumMap,
      synonyms,
      keys: remainingKeys,
      index: 0,
    });

    return {
      [normalizedKey]: [childSchema],
    };
  }
  logger.debug('normalizedKey :>> ', normalizedKey);
  if (relationalOperators.includes(normalizedKey)) {
    logger.debug('keys :>> ', keys);
    logger.debug('index :>> ', index);
    const parentFieldName = keys[index - 1];
    logger.debug('parentFieldName :>> ', parentFieldName);
    const parentField =
      modelMap[updatedModelName]?.[parentFieldName] ||
      modelMap[updatedModelName];
    logger.debug('updatedModelName :>> ', updatedModelName);
    logger.debug('parentField :>> ', parentField);
    if (!parentField) {
      logger.debug('relationalOperators no parent field');
      return undefined;
    }

    const relatedModelName = parentField.fieldType;
    const remainingKeys = keys.slice(index + 1);

    logger.debug('relationalOperators: ', {
      normalizedKey,
      parentFieldName,
      parentField,
      remainingKeys,
      relatedModelName,
    });

    const childSchema = addToSchemaObject({
      fieldConfig,
      processedModels,
      allowedPaths,
      currentPath: newPath,
      modelName: relatedModelName,
      modelMap,
      enumMap,
      synonyms,
      keys: remainingKeys,
      index: 0,
    });

    return {
      [normalizedKey]: childSchema,
    };
  }

  if (numberOperators.includes(normalizedKey)) {
    return { [normalizedKey]: 'z.number()' };
  } else if (stringOperators.includes(normalizedKey)) {
    return { [normalizedKey]: 'z.string()' };
  } else if (arrayOperators.includes(normalizedKey)) {
    const parentFieldName = keys[index - 1];
    const parentField = modelMap[updatedModelName]?.[parentFieldName];
    const normalizedNewPath = normalizePath(newPath);
    const normalizedNewPathParts = normalizedNewPath.split('.');

    const enumValues = allowedPaths
      .map((path) => normalizePath(path))
      .filter((normalizedPath) => normalizedPath.startsWith(normalizedNewPath))
      .map((normalizedPath) => {
        const normalizedPathParts = normalizedPath.split('.');
        const remainingParts = normalizedPathParts.slice(
          normalizedNewPathParts.length
        );

        const enumValue = remainingParts.join('.');
        return enumValue;
      })
      .filter((value) => value);

    if (parentField) {
      const zodType = mapPrismaTypeToZodType({
        prismaType: parentField.fieldType,
        processedModels,
        allowedPaths,
        currentPath: newPath,
        synonyms,
        modelMap,
        enumMap,
        allowedEnumValues: enumValues.length > 0 ? enumValues : undefined,
      });
      return { [normalizedKey]: `z.array(${zodType})` };
    } else {
      return { [normalizedKey]: 'z.any()' };
    }
  } else if (scalarOperators.includes(normalizedKey)) {
    const parentFieldName = keys[index - 1];
    const parentField = modelMap[updatedModelName]?.[parentFieldName];
    logger.debug('scalarOperators parentField :>> ', parentField);
    if (parentField) {
      const zodType = mapPrismaTypeToZodType({
        prismaType: parentField.fieldType,
        processedModels,
        allowedPaths,
        currentPath: newPath,
        synonyms,
        modelMap,
        enumMap,
      });
      return { [normalizedKey]: zodType };
    } else {
      return undefined;
    }
  }

  if (index === keys.length - 1) {
    logger.debug('updatedModelName :>> ', updatedModelName);
    logger.debug('normalizedKey :>> ', normalizedKey);
    logger.debug('modelMap[updatedModelName] :>> ', modelMap[updatedModelName]);
    const field = modelMap[updatedModelName]?.[normalizedKey];
    logger.debug('index === keys.length - 1', { field });
    const currentEnum = enumMap
      ? findEnumKeyInEnumMap({ keys: keys.slice(index), enumMap })
      : null;

    if (!field && !currentEnum) {
      return undefined;
    }

    let fieldSchema;

    if (isScalarType(field?.fieldType) || currentEnum) {
      const scalarFieldResult = handleScalarField({
        key: normalizedKey,
        field,
        newPath,
        processedModels,
        allowedPaths,
        fieldConfig,
        modelName: updatedModelName,
        modelMap,
        currentEnum,
        enumMap,
        synonyms,
        isArray,
      });
      fieldSchema = scalarFieldResult?.[normalizedKey];
    } else {
      const relationFieldResult = handleRelationField({
        processedModels,
        allowedPaths,
        currentPath: newPath,
        modelName: field?.fieldType || '',
        modelMap,
        enumMap,
        synonyms,
        newPath,
        field,
        key: normalizedKey,
        index,
      });
      fieldSchema = relationFieldResult[normalizedKey];
    }

    return {
      [normalizedKey]: isArray ? [fieldSchema] : fieldSchema,
    };
  } else {
    logger.debug('childSchema');
    const childSchema = addToSchemaObject({
      fieldConfig,
      processedModels,
      allowedPaths,
      currentPath: newPath,
      modelName: updatedModelName,
      modelMap,
      enumMap,
      synonyms,
      keys,
      index: index + 1,
    });

    if (childSchema === undefined) {
      return undefined;
    }

    return {
      [normalizedKey]: isArray ? [childSchema] : childSchema,
    };
  }
}

export function getZodTypeForField({
  processedModels,
  allowedPaths,
  currentPath,
  fieldName,
  modelName,
  modelMap,
  enumMap,
  synonyms,
}: GetZodTypeForFieldParams): string | undefined {
  logger.debug('getZodTypeForField');
  logger.debug('getZodTypeForField :>> ', {
    processedModels,
    allowedPaths,
    currentPath,
    fieldName,
    modelName,
    enumMap,
    synonyms,
  });

  const modelFields = modelMap[modelName];
  if (!modelFields || !modelFields[fieldName]) {
    console.warn(
      `getZodTypeForField: Field ${fieldName} not found in model ${modelName}`
    );
    return undefined;
  }

  const field: PrismaField = modelFields[fieldName];
  logger.debug(`getZodTypeForField: Field found: ${JSON.stringify(field)}`);
  logger.debug('isScalarType(prismaType) :>> ', isScalarType(field.fieldType));
  if (isScalarType(field.fieldType) || enumMap?.[field.fieldType]) {
    let zodType = mapPrismaTypeToZodType({
      prismaType: field.fieldType,
      processedModels,
      allowedPaths,
      currentPath,
      synonyms,
      modelMap,
      enumMap,
    });

    if (field.isOptional && !zodType.includes('.nullish()')) {
      zodType += '.nullish()';
    }

    logger.debug(
      `getZodTypeForField: Generated Zod type for field: ${fieldName} -> ${zodType}`
    );
    return zodType;
  } else {
    logger.debug(
      `getZodTypeForField: Handling relation field for ${fieldName}`
    );
    const operationSchemas = relationOperations.reduce(
      (acc, operation) => {
        const operationPath = `${currentPath}.${operation}`;
        if (isPathAllowed({ fullPath: operationPath, allowedPaths })) {
          logger.debug('generateDefaultOperationSchema: Operation', operation);
          logger.debug(
            'generateDefaultOperationSchema: Model Name',
            field.fieldType
          );

          acc[operation] = generateDefaultOperationSchema({
            operation,
            modelName: field.fieldType,
            modelMap,
            enumMap,
            synonyms,
            allowedPaths,
            processedModels,
            fieldIsList: field.isList,
            currentPath,
          });
          logger.debug(
            'generateDefaultOperationSchema: Result',
            acc[operation]
          );
        }

        return acc;
      },
      {} as Record<string, string>
    );

    logger.debug(
      `getZodTypeForField: Generated relation operation schemas: ${JSON.stringify(
        operationSchemas
      )}`
    );

    if (Object.keys(operationSchemas).length > 0) {
      const fieldSchema = `z.object({ ${Object.entries(operationSchemas)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ')} })`;

      return `${fieldSchema}${field.isOptional ? '.nullish()' : ''}`;
    } else {
      logger.debug(
        `getZodTypeForField: No valid operations for ${fieldName}, returning z.any()`
      );
      return 'z.any()';
    }
  }
}

export function mapPrismaTypeToZodType({
  processedModels,
  allowedPaths,
  currentPath,
  prismaType,
  synonyms,
  modelMap,
  enumMap,
  allowedEnumValues,
}: MapPrismaTypeToZodTypeParams): string {
  logger.debug('mapPrismaTypeToZodType');
  logger.debug('isScalarType(prismaType) :>> ', isScalarType(prismaType));
  if (isScalarType(prismaType) || enumMap?.[prismaType]) {
    if (allowedEnumValues || enumMap?.[prismaType]) {
      const enumValues = allowedEnumValues || enumMap?.[prismaType];
      return `z.enum(${JSON.stringify(enumValues)})`;
    }

    switch (prismaType) {
      case 'String':
        return 'z.string()';
      case 'Int':
        return 'z.number().int()';
      case 'Float':
        return 'z.number()';
      case 'Boolean':
        return 'z.boolean()';
      case 'DateTime':
        return 'z.date()';
      case 'Json':
        return 'z.any()';
      case 'BigInt':
        return 'z.bigint()';
      case 'Decimal':
        return 'z.string()';
      case 'Bytes':
        return 'z.instanceof(Buffer)';
      default:
        return 'z.any()';
    }
  } else {
    const relatedModelName = resolveModelName({
      modelName: prismaType,
      synonyms,
    });
    if (!relatedModelName) return '';
    if (
      !isPathAllowed({
        fullPath: currentPath,
        allowedPaths,
      })
    ) {
      logger.debug(
        `mapPrismaTypeToZodType: Path not allowed for relation: ${currentPath}, using z.any()`
      );
      return 'z.any()';
    }

    return generateRelatedModelSchema({
      modelName: relatedModelName,
      processedModels,
      allowedPaths,
      currentPath,
      modelMap,
      enumMap,
      synonyms,
    });
  }
}

export function resolveModelName({
  modelName,
  normalizedKey,
  synonyms,
}: ResolveModelNameParams): string | undefined {
  for (const [key, synonymList] of Object.entries(synonyms)) {
    if (synonymList.includes(normalizedKey || modelName)) {
      return key;
    }
  }

  return undefined;
}

export function generateRelatedModelSchema({
  processedModels,
  allowedPaths,
  currentPath,
  modelName,
  modelMap,
  enumMap,
  synonyms,
}: GenerateRelatedModelSchemaParams): string {
  logger.debug('generateRelatedModelSchema');
  if (processedModels.has(modelName)) {
    return 'z.any()';
  }

  processedModels.add(modelName);

  const modelFields = modelMap[modelName];
  if (!modelFields) {
    console.warn(`Model ${modelName} not found for relation generation`);
    processedModels.delete(modelName);
    return 'z.any()';
  }

  const schemaFields: Record<string, string> = {};

  for (const [fieldName, field] of Object.entries(modelFields)) {
    const fieldPath = `${currentPath}.${fieldName}`;

    if (!isPathAllowed({ fullPath: fieldPath, allowedPaths })) {
      logger.debug(`Path not allowed: ${fieldPath}, skipping field`);
      continue;
    }

    let fieldZodType: string;

    if (isScalarType(field.fieldType)) {
      fieldZodType = mapPrismaTypeToZodType({
        prismaType: field.fieldType,
        currentPath: fieldPath,
        processedModels,
        allowedPaths,
        synonyms,
        modelMap,
        enumMap,
      });
    } else {
      fieldZodType = generateRelatedModelSchema({
        modelName: field.fieldType,
        currentPath: fieldPath,
        processedModels,
        allowedPaths,
        modelMap,
        enumMap,
        synonyms,
      });
    }

    if (field.isOptional && !fieldZodType.includes('.nullish()')) {
      fieldZodType += '.nullish()';
    }

    schemaFields[fieldName] = fieldZodType;
  }

  processedModels.delete(modelName);

  if (Object.keys(schemaFields).length === 0) {
    return 'z.object({})';
  }

  const entries = Object.entries(schemaFields).map(
    ([key, value]) => `${key}: ${value}`
  );
  return `z.object({ ${entries.join(', ')} })`;
}

export function objectToZodCode(schemaObject: any): string {
  logger.debug('objectToZodCode');
  logger.debug('schemaObject :>> ', JSON.stringify(schemaObject));
  if (Array.isArray(schemaObject)) {
    const mergedObject = schemaObject.reduce(
      (acc: any, item: any) => deepMerge(acc, item),
      {}
    );
    const itemCode = objectToZodCode(mergedObject);
    return `z.array(${itemCode})`;
  } else if (typeof schemaObject === 'string') {
    logger.debug("typeof schemaObject === 'string'");
    return schemaObject;
  } else if (typeof schemaObject === 'object') {
    logger.debug('Returning primitive Zod type:', JSON.stringify(schemaObject));
    const isOptional = schemaObject._isOptional;
    const entries = Object.entries(schemaObject)
      .filter(([key]) => key !== '_isOptional')
      .map(([key, value]) => {
        logger.debug(`Handling object: ${key}`);
        const validIdentifier = /^[a-zA-Z_$][0-9a-zA-Z_$]*$/.test(key);
        const keyString = validIdentifier ? key : `'${key}'`;
        logger.debug('value :>> ', value);
        const valueCode = objectToZodCode(value);
        return `${keyString}: ${valueCode}`;
      });
    logger.debug('entries :>> ', entries);
    let code = `z.object({ ${entries.join(', ')} })`;
    if (isOptional) {
      code += `.nullish()`;
    }
    return code;
  } else {
    return 'z.any()';
  }
}

function findEnumKeyInEnumMap({
  keys,
  enumMap,
}: {
  keys: string[];
  enumMap: Record<string, string[]>;
}) {
  logger.debug('findEnumKeyInEnumMap');
  return keys.find((key) => enumMap[key]) || null;
}

import {
  getZodTypeForField,
  resolveModelName,
  addToSchemaObject,
  mapPrismaTypeToZodType,
} from './generate-zod';
import { deepMerge } from './helpers';
import { logger } from './logger';

import {
  HandleScalarFieldParams,
  HandleQueryOperatorParams,
  FieldConfigType,
} from './types';

import { HandleRelationFieldParams } from './types';

export const relationOperations = [
  'connect',
  'connectOrCreate',
  'create',
  'createMany',
  'delete',
  'deleteMany',
  'disconnect',
  'set',
  'update',
  'updateMany',
  'upsert',
];

export function handleRelationField({
  processedModels,
  allowedPaths,
  modelMap,
  enumMap,
  synonyms,
  newPath,
  field,
  key,
}: HandleRelationFieldParams): Record<string, any> {
  logger.debug('handleRelationField');
  logger.debug('handleRelationField :>> ', {
    processedModels,
    allowedPaths,
    modelMap,
    enumMap,
    synonyms,
    newPath,
    field,
    key,
  });

  if (!field) {
    return { [key]: 'z.any()' };
  }

  const nextModelName = resolveModelName({
    modelName: field.fieldType,
    synonyms,
  });

  const nestedAllowedPaths = allowedPaths.filter((path) => {
    const pathName = typeof path === 'string' ? path : path.name;
    return pathName?.startsWith(`${newPath}.`);
  });

  if (nestedAllowedPaths.length > 0 && nextModelName) {
    logger.debug('handleRelationField nestedAllowedPaths');
    const nestedSchemaObj = nestedAllowedPaths.reduce(
      (accumulator, nestedPath) => {
        const pathName =
          typeof nestedPath === 'string' ? nestedPath : nestedPath.name;
        const fieldConfig = typeof nestedPath === 'object' ? nestedPath : {};
        const pathParts = pathName?.split('.').slice(newPath.split('.').length);

        const fieldSchema = addToSchemaObject({
          fieldConfig,
          processedModels: new Set(processedModels),
          allowedPaths,
          currentPath: newPath,
          modelName: nextModelName,
          modelMap,
          enumMap,
          synonyms,
          keys: pathParts!,
          index: 0,
        });

        return deepMerge(accumulator, fieldSchema);
      },
      {}
    );

    const schema = field.isList ? [nestedSchemaObj] : nestedSchemaObj;

    if (field.isOptional) {
      if (typeof schema === 'object') {
        (schema as FieldConfigType)._isOptional = true;
      }
    }

    return { [key]: schema };
  } else {
    return { [key]: 'z.any()' };
  }
}

export function handleScalarField({
  key,
  field,
  newPath,
  fieldConfig = {},
  processedModels,
  allowedPaths,
  modelName,
  modelMap,
  enumMap,
  synonyms,
  isArray,
}: HandleScalarFieldParams): Record<string, string> | undefined {
  logger.debug('handleScalarField');
  logger.debug(
    `handleScalarField: key: ${key}, field: ${JSON.stringify(field)}`
  );

  let zodField: string | undefined;

  if (fieldConfig.type) {
    logger.debug(
      `handleScalarField: Using fieldConfig type: ${fieldConfig.type}`
    );
    zodField = mapCustomTypeToZodType(fieldConfig.type);
  } else {
    logger.debug(`handleScalarField: Using getZodTypeForField for key: ${key}`);
    zodField = getZodTypeForField({
      currentPath: newPath,
      processedModels,
      fieldName: key,
      allowedPaths,
      modelName,
      modelMap,
      enumMap,
      synonyms,
    });
  }

  if (fieldConfig.message) {
    logger.debug(
      `handleScalarField: Adding custom message: ${fieldConfig.message}`
    );
    zodField += `.refine((val) => true, { message: "${fieldConfig.message}" })`;
  }

  if (field?.isOptional && !zodField?.includes('.nullish()')) {
    logger.debug(`handleScalarField: Marking field as optional`);
    zodField += '.nullish()';
  }

  if (isArray) {
    logger.debug(`handleScalarField: Wrapping field in z.array`);
    zodField = `z.array(${zodField})`;
  }

  logger.debug(`handleScalarField: Final zodField for key ${key}: ${zodField}`);
  return zodField ? { [key]: zodField } : undefined;
}

export function handleQueryOperator({
  key,
  keys,
  index,
  processedModels,
  allowedPaths,
  modelName,
  modelMap,
  enumMap,
  synonyms,
  newPath,
  isArray,
}: HandleQueryOperatorParams): Record<string, any> {
  logger.debug('handleQueryOperator');
  logger.debug(`handleQueryOperator: key: ${key}`);

  if (['where', 'AND', 'OR', 'NOT'].includes(key)) {
    logger.debug(
      `handleQueryOperator: Handling complex query operator: ${key}`
    );

    const nestedObj = addToSchemaObject({
      currentPath: newPath,
      index: index + 1,
      processedModels,
      allowedPaths,
      modelName,
      modelMap,
      enumMap,
      synonyms,
      keys,
    });

    return {
      [key]: isArray ? [nestedObj] : nestedObj,
    };
  }

  const parentFieldName = keys[index - 1];
  const field = modelMap[modelName]?.[parentFieldName];

  if (!field) {
    console.warn(
      `handleQueryOperator: Field ${parentFieldName} not found in model ${modelName}`
    );
    return { [key]: 'z.any()' };
  }

  if (key === 'in' || key === 'notIn') {
    logger.debug(`handleQueryOperator: Handling 'in' or 'notIn' operator`);

    const fieldTypeZod = mapPrismaTypeToZodType({
      prismaType: field.fieldType,
      currentPath: newPath,
      processedModels,
      allowedPaths,
      synonyms,
      modelMap,
      enumMap,
    });

    const zodArrayType = `z.array(${fieldTypeZod})`;

    return { [key]: zodArrayType };
  }

  if ((key === 'in' || key === 'notIn') && enumMap?.[field.fieldType]) {
    logger.debug(
      `handleQueryOperator: Handling enum type for operator: ${key}`
    );
    const enumType = `z.enum(${JSON.stringify(enumMap[field.fieldType])})`;
    return { [key]: `z.array(${enumType})` };
  }

  if (['limit', 'take', 'skip'].includes(key)) {
    return { [key]: 'z.number()' };
  }

  if (['contains', 'startsWith', 'endsWith', 'search'].includes(key)) {
    return { [key]: 'z.string()' };
  }

  const nestedObj = addToSchemaObject({
    currentPath: newPath,
    index: index + 1,
    processedModels,
    allowedPaths,
    modelName,
    modelMap,
    enumMap,
    synonyms,
    keys,
  });

  return {
    [key]: isArray ? [nestedObj] : nestedObj,
  };
}

export function mapCustomTypeToZodType(type: any): string {
  logger.debug('mapCustomTypeToZodType');
  let zodType = 'z.any()';

  if (typeof type === 'string') {
    const isOptional = type.endsWith('?');
    const baseTypeStr = isOptional ? type.slice(0, -1) : type;

    if (baseTypeStr.startsWith('length')) {
      zodType = handleLength(baseTypeStr);
    } else if (baseTypeStr.startsWith('regex')) {
      zodType = handleRegex(baseTypeStr);
    } else if (baseTypeStr.startsWith('min') || baseTypeStr.startsWith('max')) {
      zodType = handleMinMax(baseTypeStr);
    } else {
      switch (baseTypeStr) {
        case 'email':
          zodType = 'z.string().email()';
          break;
        case 'uuid':
          zodType = 'z.string().uuid()';
          break;
        case 'url':
          zodType = 'z.string().url()';
          break;
        case 'currency':
          zodType = 'z.string().regex(/^[A-Z]{3}$/)';
          break;
        case 'nonempty':
          zodType = 'z.string().min(1)';
          break;
        case 'string':
          zodType = 'z.string()';
          break;
        case 'number':
          zodType = 'z.number()';
          break;
        case 'boolean':
          zodType = 'z.boolean()';
          break;
        default:
          zodType = 'z.any()';
      }
    }

    if (isOptional) {
      zodType += '.nullish()';
    }
  } else if (typeof type === 'object' && type !== null) {
    zodType = handleObjectType(type);
  }

  return zodType;
}

function handleObjectType(type: any): string {
  logger.debug('handleObjectType');
  if (Array.isArray(type)) {
    return `z.array(${handleObjectType(type[0])})`;
  }

  const entries = Object.entries(type).map(([key, value]) => {
    const zodValue =
      typeof value === 'string' || (typeof value === 'object' && value !== null)
        ? mapCustomTypeToZodType(value)
        : 'z.any()';

    return `${key}: ${zodValue}`;
  });

  return `z.object({ ${entries.join(', ')} })`;
}

function handleLength(typeStr: string): string {
  logger.debug('handleLength');
  const match = typeStr.match(/length\((\d+),(\d+)\)/);
  if (match) {
    const min = match[1];
    const max = match[2];
    return `z.string().min(${min}).max(${max})`;
  }
  return 'z.any()';
}

function handleRegex(typeStr: string): string {
  logger.debug('handleRegex');
  const match = typeStr.match(/regex\((\/.*\/)\)/);
  if (match) {
    const pattern = match[1];
    return `z.string().regex(${pattern})`;
  }
  return 'z.any()';
}

function handleMinMax(typeStr: string): string {
  logger.debug('handleMinMax');
  const match = typeStr.match(/(min|max)\((\d+)\)/);
  if (match) {
    const method = match[1];
    const value = match[2];
    return `z.number().${method}(${value})`;
  }
  return 'z.any()';
}

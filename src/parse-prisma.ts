import { getSchema } from '@mrleebo/prisma-ast';
import * as fs from 'fs';
import { ModelMapType, ParsePrismaSchemaResult } from './types';
import { logger } from './logger';

export function parsePrismaSchema(
  schemaPrismaPath: string
): ParsePrismaSchemaResult {
  logger.debug('parsePrismaSchema');
  const schemaContent = fs.readFileSync(schemaPrismaPath, 'utf-8');
  const schema = getSchema(schemaContent);

  const modelMap: ModelMapType = {};
  const enumMap: Record<string, string[]> = {};

  for (const declaration of schema.list) {
    if (declaration.type === 'model') {
      const modelName = declaration.name;
      const fields: Record<string, any> = {};

      for (const field of declaration.properties) {
        if (field.type === 'field') {
          fields[field.name] = {
            fieldType: field.fieldType,
            isOptional: field.optional,
            isList: field.array,
            isUnique: field.attributes?.some(
              (attr: any) => attr.type === 'attribute' && attr.name === 'unique'
            ),
            isId: field.attributes?.some(
              (attr: any) => attr.type === 'attribute' && attr.name === 'id'
            ),
          };
        }
      }

      modelMap[modelName] = fields;
    } else if (declaration.type === 'enum') {
      const enumName = declaration.name;

      const enumValues = declaration.enumerators
        .filter((prop: any) => prop.type === 'enumerator')
        .map((prop: any) => prop.name);
      enumMap[enumName] = enumValues;
    }
  }
  logger.debug('modelMap :>> ', modelMap);
  return { modelMap, enumMap };
}

export function getNewPath(currentPath: string, key: string): string {
  logger.debug('getNewPath');
  return currentPath ? `${currentPath}.${key}` : key;
}

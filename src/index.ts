import * as glob from 'glob';
import * as path from 'path';
import { saveSchemaToFile, runEslintOnFile } from './file-utils';
import { parsePrismaSchema } from './parse-prisma';
import { AllowedPathsType, ModelMapType, SchemaToRegenerate } from './types';

import { extractAllowSchemas } from './allow-files-lookup/exract-allow-schemas';
import { renderFinalSchema } from './render-final-schema';
import { logger } from './logger';

interface GenerateSchemasOptions {
  projectRoot?: string;
  searchDir?: string;
  schemaName?: string;
  allowedPaths?: AllowedPathsType;
}

async function processSchemasToRegenerate({
  modelMap,
  enumMap,
  schemas,
}: {
  schemas: SchemaToRegenerate[];
  modelMap: ModelMapType;
  enumMap?: Record<string, string[]>;
}) {
  logger.debug('processSchemasToRegenerate');
  for (const schemaInfo of schemas) {
    logger.debug(`Processing schema for model: ${schemaInfo.modelName}`);

    try {
      const modelFields = modelMap[schemaInfo.modelName];

      if (!modelFields) {
        console.error(
          `Model ${schemaInfo.modelName} not found in Prisma schema`
        );
        continue;
      }

      const zodSchemaCode = renderFinalSchema({
        allowedPaths: schemaInfo.allowedPaths,
        modelName: schemaInfo.modelName,
        synonyms: schemaInfo.synonyms,
        modelFields,
        modelMap,
        enumMap,
      });

      const outputFilePath = saveSchemaToFile({
        zodSchemaCode,
        schemaOutputPath: schemaInfo.outputPath,
      });

      runEslintOnFile(outputFilePath);
    } catch (error) {
      console.error(
        `Error processing schema for model ${schemaInfo.modelName}:`,
        error
      );
    }
  }
}

export async function generateSchemas({
  projectRoot = process.cwd(),
  searchDir = path.resolve(process.cwd(), 'src'),
  schemaName,
  allowedPaths = [],
}: GenerateSchemasOptions) {
  logger.debug('generateSchemas');
  const schemaPrismaPath = findSchemaPrisma(projectRoot);

  if (!schemaPrismaPath) {
    throw new Error('schema.prisma not found');
  }

  const { modelMap, enumMap } = parsePrismaSchema(schemaPrismaPath);

  const files = findFilesToProcess(searchDir);

  const schemasToRegenerate = await extractAllowSchemas(files);
  logger.debug('schemasToRegenerate :>> ', schemasToRegenerate);
  const filteredSchemas = schemasToRegenerate.filter((schema) => {
    if (schemaName && schema.modelName !== schemaName) return false;

    if (allowedPaths.length > 0) {
      return allowedPaths.some((path) => {
        if (typeof path === 'string') {
          return schema.allowedPaths.includes(path);
        } else if (typeof path === 'object' && path.name) {
          return schema.allowedPaths.includes(path.name);
        }
        return false;
      });
    }

    return true;
  });

  if (filteredSchemas.length === 0) {
    logger.debug('No schemas to regenerate found');
    return;
  }

  await processSchemasToRegenerate({
    schemas: filteredSchemas,
    modelMap,
    enumMap,
  });
}

export function findFilesToProcess(searchDir: string): string[] {
  logger.debug('findFilesToProcess');
  const ignorePatterns = ['**/node_modules/**'];
  const tsFiles = glob.sync('**/*.ts', {
    ignore: ignorePatterns,
    cwd: searchDir,
    absolute: true,
  });
  logger.debug(`Found ${tsFiles.length} TypeScript files in ${searchDir}`);
  return tsFiles;
}

export function findSchemaPrisma(projectRoot: string): string | null {
  logger.debug('findSchemaPrisma');
  const schemaFiles = glob.sync('**/schema.prisma', {
    ignore: ['**/node_modules/**'],
    cwd: projectRoot,
    absolute: true,
  });

  if (schemaFiles.length > 0) {
    logger.debug(`Found schema.prisma at ${schemaFiles[0]}`);
    return schemaFiles[0];
  } else {
    console.error('schema.prisma not found in the project');
    return null;
  }
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const customSearchDir = args[0];
  const schemaName = args[1];
  const allowedPaths = args.slice(2);

  const demoDir = customSearchDir || path.resolve(process.cwd(), 'demo');

  generateSchemas({
    searchDir: demoDir,
    schemaName,
    allowedPaths,
  }).catch((error) => {
    console.error('Error in schema generation:', error);
    process.exit(1);
  });
}

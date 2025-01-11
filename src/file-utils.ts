import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { logger } from './logger';

type SaveSchemaToFileParams = {
  zodSchemaCode: string;
  schemaOutputPath: string;
};

export function saveSchemaToFile({
  zodSchemaCode,
  schemaOutputPath,
}: SaveSchemaToFileParams) {
  const exportName = path.basename(schemaOutputPath, '.ts');
  const outputDir = path.dirname(schemaOutputPath);
  const outputFilePath = path.resolve(outputDir, `${exportName}ZodSchema.ts`);

  fs.writeFileSync(outputFilePath, zodSchemaCode);
  logger.debug(`Schema written to: ${outputFilePath}`);

  return outputFilePath;
}

export function runEslintOnFile(outputFilePath: string) {
  try {
    execSync(`npx eslint --fix ${outputFilePath}`, { stdio: 'inherit' });
    logger.debug(`ESLint fixes applied to: ${outputFilePath}`);
  } catch (error) {
    console.error(`Error running ESLint on ${outputFilePath}:`, error);
  }
}

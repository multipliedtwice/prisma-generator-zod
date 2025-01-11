import { Project, Node } from 'ts-morph';
import { logger } from '../logger';
import { hasAllowData } from './has-allow-data';
import { SchemaToRegenerate, SynonymsType } from '../types';
import { extractAllowedPaths } from './extract-allowed-paths';

export async function extractAllowSchemas(
  files: string[]
): Promise<SchemaToRegenerate[]> {
  logger.debug('extractAllowSchemas');
  const project = new Project();
  const schemasToRegenerate: SchemaToRegenerate[] = [];

  files.forEach((filePath) => {
    if (filePath.endsWith('.spec.ts') || filePath.endsWith('.test.ts')) {
      return;
    }

    const sourceFile = project.addSourceFileAtPath(filePath);

    if (hasAllowData(sourceFile)) {
      logger.debug(`extractAllowSchemas: Processing file: ${filePath}`);
      let allowedPaths: string[] = [];
      let schemaName = '';
      let outputName = '';
      const synonyms: SynonymsType = {};

      sourceFile.forEachDescendant((node) => {
        if (Node.isVariableDeclaration(node) && node.getName() === 'schema') {
          const initializer = node.getInitializer();
          if (Node.isObjectLiteralExpression(initializer)) {
            allowedPaths = extractAllowedPaths(initializer);
            logger.debug(
              `extractAllowSchemas: Extracted allowed paths for ${filePath}:`,
              allowedPaths
            );

            const schemaProperty = initializer.getProperty('model');
            if (schemaProperty && Node.isPropertyAssignment(schemaProperty)) {
              const schemaInitializer = schemaProperty.getInitializer();
              if (
                schemaInitializer &&
                Node.isStringLiteral(schemaInitializer)
              ) {
                schemaName = schemaInitializer.getLiteralValue();
                logger.debug(
                  `extractAllowSchemas: Extracted schema name: ${schemaName}`
                );
              }
            }

            const outputNameProperty = initializer.getProperty('outputName');
            if (
              outputNameProperty &&
              Node.isPropertyAssignment(outputNameProperty)
            ) {
              const outputNameInitializer = outputNameProperty.getInitializer();
              if (
                outputNameInitializer &&
                Node.isStringLiteral(outputNameInitializer)
              ) {
                outputName = outputNameInitializer.getLiteralValue();
                logger.debug(
                  `extractAllowSchemas: Extracted output name: ${outputName}`
                );
              }
            }

            const synonymsProperty = initializer.getProperty('synonyms');
            if (
              synonymsProperty &&
              Node.isPropertyAssignment(synonymsProperty)
            ) {
              const synonymsInitializer = synonymsProperty.getInitializer();
              if (
                synonymsInitializer &&
                Node.isObjectLiteralExpression(synonymsInitializer)
              ) {
                synonymsInitializer.getProperties().forEach((synonym) => {
                  if (Node.isPropertyAssignment(synonym)) {
                    const key = synonym.getName();
                    const valueNode = synonym.getInitializer();
                    if (valueNode && Node.isStringLiteral(valueNode)) {
                      synonyms[key].push(valueNode.getLiteralValue());
                      logger.debug(
                        `extractAllowSchemas: Added synonym ${key}: ${valueNode.getLiteralValue()}`
                      );
                    }
                  }
                });
              }
            }
          }
        }
      });

      if (allowedPaths.length > 0) {
        schemasToRegenerate.push({
          synonyms,
          allowedPaths,
          outputPath: filePath,
          modelName: schemaName || 'unknownModel',
        });
        logger.debug(
          `extractAllowSchemas: Added schema to regenerate: ${
            schemaName || 'unknownModel'
          }`
        );
      }
    }
  });

  return schemasToRegenerate;
}

import { Node } from 'ts-morph';
import { logger } from '../logger';

export function hasAllowData(sourceFile: any): boolean {
  logger.debug('hasAllowData');
  let containsSchema = false;

  sourceFile.forEachDescendant((node: Node) => {
    if (Node.isVariableDeclaration(node)) {
      const name = node.getName();
      if (name === 'schema') {
        logger.debug(
          "hasAllowData: Found 'schema' object declaration in the file"
        );
        containsSchema = true;
      }
    }
  });

  return containsSchema;
}

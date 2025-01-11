import { Node } from 'ts-morph';
import { logger } from '../logger';

export function extractFromObjectLiteral(node: Node): any {
  logger.debug('extractFromObjectLiteral');
  const obj: any = {};
  if (Node.isObjectLiteralExpression(node)) {
    node.getProperties().forEach((prop) => {
      if (Node.isPropertyAssignment(prop)) {
        const propName = prop.getName();
        const propInitializer = prop.getInitializer();

        if (Node.isStringLiteral(propInitializer)) {
          obj[propName] = propInitializer.getLiteralValue();
          logger.debug(
            `extractFromObjectLiteral: Added string property ${propName}: ${propInitializer.getLiteralValue()}`
          );
        } else if (Node.isObjectLiteralExpression(propInitializer)) {
          obj[propName] = extractFromObjectLiteral(propInitializer);
          logger.debug(
            `extractFromObjectLiteral: Parsed nested object for property ${propName}`
          );
        }
      }
    });
  }
  return obj;
}

import { Node } from 'ts-morph';
import { logger } from '../logger';
import { extractFromObjectLiteral } from './extract-from-object-literal';

export function extractAllowedPaths(node: Node): any[] {
  logger.debug('extractAllowedPaths');
  const fields: any[] = [];

  if (Node.isObjectLiteralExpression(node)) {
    node.getProperties().forEach((prop) => {
      if (Node.isPropertyAssignment(prop) && prop.getName() === 'fields') {
        const initializer = prop.getInitializer();
        if (Node.isArrayLiteralExpression(initializer)) {
          initializer.getElements().forEach((el) => {
            if (Node.isStringLiteral(el)) {
              fields.push(el.getLiteralValue());
              logger.debug(
                'extractAllowedPaths: Added string literal field:',
                el.getLiteralValue()
              );
            } else if (Node.isObjectLiteralExpression(el)) {
              const fieldObj: any = {};
              el.getProperties().forEach((fieldProp) => {
                if (Node.isPropertyAssignment(fieldProp)) {
                  const propName = fieldProp.getName();
                  const propInitializer = fieldProp.getInitializer();

                  if (Node.isStringLiteral(propInitializer)) {
                    fieldObj[propName] = propInitializer.getLiteralValue();
                    logger.debug(
                      `extractAllowedPaths: Added string field in object: ${propName} - ${propInitializer.getLiteralValue()}`
                    );
                  } else if (Node.isObjectLiteralExpression(propInitializer)) {
                    fieldObj[propName] =
                      extractFromObjectLiteral(propInitializer);
                    logger.debug(
                      `extractAllowedPaths: Parsed object for field ${propName}`
                    );
                  } else if (Node.isArrayLiteralExpression(propInitializer)) {
                    fieldObj[propName] = propInitializer
                      .getElements()
                      .map((element) => {
                        if (Node.isStringLiteral(element)) {
                          logger.debug(
                            'extractAllowedPaths: Added array element:',
                            element.getLiteralValue()
                          );
                          return element.getLiteralValue();
                        } else if (Node.isObjectLiteralExpression(element)) {
                          logger.debug(
                            'extractAllowedPaths: Parsing nested object in array'
                          );
                          return extractFromObjectLiteral(element);
                        }
                        return null;
                      });
                  } else {
                    logger.debug(
                      'extractAllowedPaths: propInitializer is not a StringLiteral, ObjectLiteralExpression, or ArrayLiteralExpression'
                    );
                  }
                }
              });
              fields.push(fieldObj);
              logger.debug(
                'extractAllowedPaths: Added object field:',
                fieldObj
              );
            }
          });
        } else {
          logger.debug(
            "extractAllowedPaths: 'fields' is not an array literal."
          );
        }
      } else {
        logger.debug('extractAllowedPaths: Property is not named "fields".');
      }
    });
  } else {
    logger.debug(
      'extractAllowedPaths: Node is not an ObjectLiteralExpression.'
    );
  }
  logger.debug('extractAllowedPaths: Final extracted fields:', fields);
  return fields;
}

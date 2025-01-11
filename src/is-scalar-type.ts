import { logger } from './logger';

export function isScalarType(type: string): boolean {
  logger.debug('isScalarType');
  const scalarTypes = [
    'String',
    'Int',
    'Float',
    'Boolean',
    'DateTime',
    'Json',
    'BigInt',
    'Decimal',
    'Bytes',
  ];
  return scalarTypes.includes(type);
}

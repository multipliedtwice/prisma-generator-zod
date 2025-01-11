import { logger } from './logger';

export function isQueryOperator(key: string): boolean {
  logger.debug('isQueryOperator');
  const operators = [
    'include',
    'orderBy',
    'select',
    'where',
    'take',
    'skip',
    'AND',
    'NOT',
    'OR',
    'some',
    'every',
    'none',
    'equals',
    'contains',
    'startsWith',
    'endsWith',
    'in',
    'notIn',
    'lt',
    'lte',
    'gt',
    'gte',
    'search',
    'mode',
    'not',
  ];
  return operators.includes(key);
}

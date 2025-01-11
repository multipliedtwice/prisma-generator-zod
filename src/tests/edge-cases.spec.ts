/* eslint-disable security-node/detect-unhandled-async-errors */
/* eslint-disable security-node/detect-crlf */

import { buildSchemaObject } from '../build-schema-object';
import {
  addToSchemaObject,
  generateRelatedModelSchema,
  getZodTypeForField,
  mapPrismaTypeToZodType,
  objectToZodCode,
} from '../generate-zod';
import { logger } from '../logger';
import { renderFinalSchema } from '../render-final-schema';
import { AllowedPathsType } from '../types';

describe('Prisma Client API edge cases', () => {
  const modelMap = {
    user: {
      id: { fieldType: 'String', isOptional: false, isList: false },
      name: { fieldType: 'String', isOptional: false, isList: false },
      email: { fieldType: 'String', isOptional: false, isList: false },
      age: { fieldType: 'Int', isOptional: false, isList: false },
      posts: { fieldType: 'post', isOptional: true, isList: true },
      profile: { fieldType: 'profile', isOptional: true, isList: false },
      status: { fieldType: 'userStatus', isOptional: false, isList: false },
    },
    post: {
      id: { fieldType: 'String', isOptional: false, isList: false },
      title: { fieldType: 'String', isOptional: false, isList: false },
      content: { fieldType: 'String', isOptional: true, isList: false },
      createdAt: { fieldType: 'DateTime', isOptional: false, isList: false },
      author: { fieldType: 'profile', isOptional: false, isList: false },
    },
    profile: {
      id: { fieldType: 'String', isOptional: false, isList: false },
      bio: { fieldType: 'String', isOptional: true, isList: false },
      user: { fieldType: 'user', isOptional: false, isList: false },
    },
  };

  const synonyms = {
    post: ['posts'],
    profile: ['author'],
  };

  describe('handle where clauses', () => {
    it('should build schema with simple where clause', () => {
      const allowedPaths: AllowedPathsType = ['where.id'];
      const schemaObject = buildSchemaObject({
        modelMap,
        modelFields: modelMap['user'],
        allowedPaths,
        processedModels: new Set(),
        modelName: 'user',
        synonyms,
        enumMap: {},
      });

      const expected = 'z.object({ id: z.string() })';

      logger.debug('schemaObject :>> ', schemaObject);
      expect(schemaObject.where).toEqual(expected);
    });

    it('should handle nested where clauses with AND/OR/NOT', () => {
      const allowedPaths: AllowedPathsType = [
        'where.AND[].age',
        'where.AND[].status.in',
        'where.OR[].name',
        'where.NOT[].email',
      ];

      const schemaObject = buildSchemaObject({
        modelMap,
        modelFields: modelMap['user'],
        allowedPaths,
        processedModels: new Set(),
        modelName: 'user',
        synonyms,
        enumMap: {
          userStatus: ['ACTIVE', 'INACTIVE', 'SUSPENDED'],
        },
      });

      const expected =
        'z.object({ AND: z.array(z.object({ age: z.number().int(), status: z.object({ in: z.array(z.enum(["ACTIVE","INACTIVE","SUSPENDED"])) }) })), OR: z.array(z.object({ name: z.string() })), NOT: z.array(z.object({ email: z.string() })) })';

      expect(schemaObject.where).toEqual(expected);
    });

    it('should handle relational filters in where clause', () => {
      const allowedPaths: AllowedPathsType = [
        'where.posts.some.title',
        'where.posts.every.id',
      ];
      const schemaObject = buildSchemaObject({
        modelMap,
        modelFields: modelMap['user'],
        allowedPaths,
        processedModels: new Set(),
        modelName: 'user',
        synonyms,
        enumMap: {},
      });

      const expected =
        'z.object({ posts: z.object({ some: z.object({ title: z.string() }), every: z.object({ id: z.string() }) }) })';

      expect(schemaObject.where).toEqual(expected);
    });
  });

  describe('handle orderBy clauses', () => {
    it('should build schema with orderBy clause', () => {
      const allowedPaths: AllowedPathsType = ['orderBy.name', 'orderBy.age'];
      const schemaObject = buildSchemaObject({
        modelMap,
        modelFields: modelMap['user'],
        allowedPaths,
        processedModels: new Set(),
        modelName: 'user',
        synonyms,
        enumMap: {},
      });

      const expected = 'z.object({ name: z.string(), age: z.number().int() })';

      logger.debug('schemaObject :>> ', schemaObject);
      expect(schemaObject.orderBy).toEqual(expected);
    });

    it('should handle nested orderBy clauses', () => {
      const allowedPaths: AllowedPathsType = ['orderBy.posts.title'];
      const schemaObject = buildSchemaObject({
        modelMap,
        modelFields: modelMap['post'],
        allowedPaths,
        processedModels: new Set(),
        modelName: 'post',
        synonyms,
        enumMap: {},
      });

      const expected = 'z.object({ posts: z.object({ title: z.string() }) })';

      logger.debug('schemaObject :>> ', schemaObject);
      expect(schemaObject.orderBy).toEqual(expected);
    });
  });

  describe('handle take and skip', () => {
    it('should build schema with take and skip', () => {
      const allowedPaths: AllowedPathsType = ['take', 'skip'];
      const schemaObject = buildSchemaObject({
        modelMap,
        modelFields: modelMap['user'],
        allowedPaths,
        processedModels: new Set(),
        modelName: 'user',
        synonyms,
        enumMap: {},
      });

      const expected = {
        take: 'z.number()',
        skip: 'z.number()',
      };

      logger.debug('schemaObject :>> ', schemaObject);
      expect(schemaObject).toEqual(expected);
    });
  });

  describe('handle nested relations and where clauses', () => {
    it('should handle nested where within relations', () => {
      const allowedPaths: AllowedPathsType = [
        'where.posts.some.author.user.name',
      ];
      const schemaObject = buildSchemaObject({
        modelMap,
        modelFields: modelMap['user'],
        allowedPaths,
        processedModels: new Set(),
        modelName: 'user',
        synonyms,
        enumMap: {},
      });

      const expected =
        'z.object({ posts: z.object({ some: z.object({ author: z.object({ user: z.object({ name: z.string() }) }) }) }) })';

      logger.debug('schemaObject :>> ', schemaObject);
      expect(schemaObject.where).toEqual(expected);
    });

    it('should handle multiple nested relations', () => {
      const allowedPaths: AllowedPathsType = ['where.posts.some.author.bio'];
      const schemaObject = buildSchemaObject({
        modelMap,
        modelFields: modelMap['user'],
        allowedPaths,
        processedModels: new Set(),
        modelName: 'user',
        synonyms,
        enumMap: {},
      });

      const expected =
        'z.object({ posts: z.object({ some: z.object({ author: z.object({ bio: z.string().nullish() }) }) }) })';

      logger.debug('schemaObject :>> ', schemaObject);
      expect(schemaObject.where).toEqual(expected);
    });
  });

  describe('handle edge cases from Prisma Client API', () => {
    it('should handle filtering by null', () => {
      const allowedPaths: AllowedPathsType = ['where.name'];
      modelMap['user']['name'].isOptional = true;

      const schemaObject = buildSchemaObject({
        modelMap,
        modelFields: modelMap['user'],
        allowedPaths,
        processedModels: new Set(),
        modelName: 'user',
        synonyms,
        enumMap: {},
      });

      const expected = 'z.object({ name: z.string().nullish() })';

      logger.debug('schemaObject :>> ', schemaObject);
      expect(schemaObject.where).toEqual(expected);
    });

    it("should handle 'in' and 'notIn' filters", () => {
      const allowedPaths: AllowedPathsType = [
        'where.age.in',
        'where.age.notIn',
      ];
      const schemaObject = buildSchemaObject({
        modelMap,
        modelFields: modelMap['user'],
        allowedPaths,
        processedModels: new Set(),
        modelName: 'user',
        synonyms,
        enumMap: {},
      });

      const expected =
        'z.object({ age: z.object({ in: z.array(z.number().int()), notIn: z.array(z.number().int()) }) })';

      logger.debug('schemaObject :>> ', schemaObject);
      expect(schemaObject.where).toEqual(expected);
    });

    it("should handle 'contains' and 'startsWith' filters", () => {
      const allowedPaths: AllowedPathsType = [
        'where.email.contains',
        'where.email.startsWith',
        'where.email.endsWith',
      ];
      const schemaObject = buildSchemaObject({
        modelMap,
        modelFields: modelMap['user'],
        allowedPaths,
        processedModels: new Set(),
        modelName: 'user',
        synonyms,
        enumMap: {},
      });

      const expected =
        'z.object({ email: z.object({ contains: z.string(), startsWith: z.string(), endsWith: z.string() }) })';

      logger.debug('schemaObject :>> ', schemaObject);
      expect(schemaObject.where).toEqual(expected);
    });
  });

  describe('handle full-text search filters', () => {
    it("should handle 'search' filter", () => {
      const allowedPaths: AllowedPathsType = ['where.posts.content.search'];
      const schemaObject = buildSchemaObject({
        modelMap,
        modelFields: modelMap['post'],
        allowedPaths,
        processedModels: new Set(),
        modelName: 'post',
        synonyms,
        enumMap: {},
      });
      logger.debug('schemaObject :>> ', schemaObject);
      expect(schemaObject).toEqual({
        where:
          'z.object({ posts: z.object({ content: z.object({ search: z.string() }) }) })',
      });
    });
  });

  describe('handle enums and enum filters', () => {
    it('should handle enum fields and filters', () => {
      const allowedPaths: AllowedPathsType = [
        'where.status.in[].ACTIVE',
        'where.status.notIn[].SUSPENDED',
      ];

      const enumMap = {
        userStatus: ['ACTIVE', 'INACTIVE', 'SUSPENDED'],
      };

      const nestedRelationResult = buildSchemaObject({
        processedModels: new Set(),
        allowedPaths,
        modelFields: modelMap['user'],
        modelName: 'user',
        modelMap,
        enumMap,
        synonyms: {},
      });
      logger.debug(
        'nestedRelationResult :>> ',
        JSON.stringify(nestedRelationResult)
      );
      expect(nestedRelationResult.where).toContain(
        'z.object({ status: z.object({ in: z.array(z.enum(["ACTIVE"])), notIn: z.array(z.enum(["SUSPENDED"])) }) })'
      );
    });
  });

  describe('coverage cases', () => {
    it('should return undefined when index exceeds keys length', () => {
      const result = addToSchemaObject({
        fieldConfig: {},
        processedModels: new Set(),
        allowedPaths: [],
        currentPath: '',
        modelName: 'user',
        modelMap,
        enumMap: {},
        synonyms,
        keys: ['id'],
        index: 1,
      });

      expect(result).toBeUndefined();
    });

    it('should return empty object when trying to allow unknown field', () => {
      const allowedPaths: AllowedPathsType = ['where.posts.some.unknownField'];
      const schemaObject = buildSchemaObject({
        modelMap,
        modelFields: modelMap['user'],
        allowedPaths,
        processedModels: new Set(),
        modelName: 'user',
        synonyms,
        enumMap: {},
      });

      expect(schemaObject).toEqual({});
    });

    it('should generate Zod schema code for a simple model', () => {
      const allowedPaths: AllowedPathsType = ['select.id', 'select.name'];
      const modelFields = modelMap['user'];

      const zodSchemaCode = renderFinalSchema({
        allowedPaths,
        modelFields,
        modelName: 'user',
        modelMap,
        enumMap: {},
        synonyms,
      });

      expect(zodSchemaCode).toContain('export const userSchema = z.object');
      expect(zodSchemaCode).toContain('id: z.string()');
      expect(zodSchemaCode).toContain('name: z.string()');
    });

    it('should return z.any() when parentField is undefined in arrayOperators', () => {
      const allowedPaths: AllowedPathsType = ['where.unknownField.in'];
      const schemaObject = buildSchemaObject({
        modelMap,
        modelFields: modelMap['user'],
        allowedPaths,
        processedModels: new Set(),
        modelName: 'user',
        synonyms,
        enumMap: {},
      });

      expect(schemaObject).toEqual({});
    });

    it('should return empty object when parentField is undefined in scalarOperators', () => {
      const allowedPaths: AllowedPathsType = ['where.unknownField.equals'];
      const schemaObject = buildSchemaObject({
        modelMap,
        modelFields: modelMap['user'],
        allowedPaths,
        processedModels: new Set(),
        modelName: 'user',
        synonyms,
        enumMap: {},
      });

      expect(schemaObject).toEqual({});
    });

    it('should return undefined when childSchema is undefined', () => {
      const result = addToSchemaObject({
        fieldConfig: {},
        processedModels: new Set(),
        allowedPaths: ['select.id'],
        currentPath: '',
        modelName: 'user',
        modelMap,
        enumMap: {},
        synonyms,
        keys: ['select', 'nonExistentField'],
        index: 1,
      });

      expect(result).toBeUndefined();
    });

    it('should handle relation fields correctly', () => {
      const allowedPaths: AllowedPathsType = ['select.profile'];
      const schemaObject = buildSchemaObject({
        modelMap,
        modelFields: modelMap['user'],
        allowedPaths,
        processedModels: new Set(),
        modelName: 'user',
        synonyms,
        enumMap: {},
      });

      expect(schemaObject).toEqual({
        select: 'z.object({ profile: z.any() })',
      });
    });

    it('should return z.any() when no valid operations are found', () => {
      const result = getZodTypeForField({
        processedModels: new Set(),
        allowedPaths: ['select.nonExistentField'],
        currentPath: 'select.nonExistentField',
        fieldName: 'nonExistentField',
        modelName: 'user',
        modelMap,
        enumMap: {},
        synonyms,
      });

      expect(result).toBeUndefined();
    });

    it('should return z.any() for unknown Prisma types', () => {
      const result = mapPrismaTypeToZodType({
        processedModels: new Set(),
        allowedPaths: [],
        currentPath: '',
        prismaType: 'UnknownType',
        synonyms: {},
        modelMap: {},
        enumMap: {},
      });

      expect(result).toBe('');
    });

    it('should return z.any() when path is not allowed in mapPrismaTypeToZodType', () => {
      const result = mapPrismaTypeToZodType({
        processedModels: new Set(),
        allowedPaths: [],
        currentPath: 'some.disallowed.path',
        prismaType: 'User',
        synonyms: {},
        modelMap,
        enumMap: {},
      });

      expect(result).toBe('');
    });

    it('should prevent infinite recursion in generateRelatedModelSchema', () => {
      const processedModels = new Set<string>(['user']);
      const result = generateRelatedModelSchema({
        processedModels,
        allowedPaths: ['select.profile'],
        currentPath: 'select.profile',
        modelName: 'user',
        modelMap,
        enumMap: {},
        synonyms: {},
      });

      expect(result).toBe('z.any()');
    });

    it('should return z.any() when model is not found in generateRelatedModelSchema', () => {
      const result = generateRelatedModelSchema({
        processedModels: new Set(),
        allowedPaths: ['select.nonExistentModel'],
        currentPath: 'select.nonExistentModel',
        modelName: 'nonExistentModel',
        modelMap: {},
        enumMap: {},
        synonyms: {},
      });

      expect(result).toBe('z.any()');
    });

    it('should generate schema for non-scalar fields in generateRelatedModelSchema', () => {
      const modelMapWithRelations = {
        user: {
          id: { fieldType: 'String', isOptional: false, isList: false },
          profile: { fieldType: 'profile', isOptional: true, isList: false },
        },
        profile: {
          bio: { fieldType: 'String', isOptional: true, isList: false },
        },
      };

      const result = generateRelatedModelSchema({
        processedModels: new Set(),
        allowedPaths: ['select.profile.bio'],
        currentPath: 'select.profile',
        modelName: 'profile',
        modelMap: modelMapWithRelations,
        enumMap: {},
        synonyms: {},
      });

      expect(result).toContain('bio: z.string().nullish()');
    });

    it('should handle optional fields in objectToZodCode', () => {
      const schemaObject = {
        _isOptional: true,
        name: 'z.string()',
      };

      const result = objectToZodCode(schemaObject);
      expect(result).toBe('z.object({ name: z.string() }).nullish()');
    });

    it('should return z.any() for unknown schemaObject types in objectToZodCode', () => {
      const result = objectToZodCode(undefined);
      expect(result).toBe('z.any()');
    });
  });
});

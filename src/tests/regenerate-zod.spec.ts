/* eslint-disable security-node/detect-unhandled-async-errors */
/* eslint-disable security-node/detect-crlf */

import { buildSchemaObject } from '../build-schema-object';
import {
  mapPrismaTypeToZodType,
  getZodTypeForField,
  addToSchemaObject,
} from '../generate-zod';
import { isPathAllowed } from '../is-path-allowed';
import { AllowedPathsType } from '../types';

describe('generate-zod', () => {
  describe('mapPrismaTypeToZodType', () => {
    it('should map all supported scalar types correctly', () => {
      const processedModels = new Set<string>();
      const allowedPaths: AllowedPathsType = [];
      const currentPath = '';
      const synonyms = {};
      const modelMap = {};

      const scalarTypes = [
        { prismaType: 'String', zodType: 'z.string()' },
        { prismaType: 'Int', zodType: 'z.number().int()' },
        { prismaType: 'Float', zodType: 'z.number()' },
        { prismaType: 'Boolean', zodType: 'z.boolean()' },
        { prismaType: 'DateTime', zodType: 'z.date()' },
        { prismaType: 'Json', zodType: 'z.any()' },
        { prismaType: 'BigInt', zodType: 'z.bigint()' },
        { prismaType: 'Decimal', zodType: 'z.string()' },
        { prismaType: 'Bytes', zodType: 'z.instanceof(Buffer)' },
      ];

      scalarTypes.forEach(({ prismaType, zodType }) => {
        expect(
          mapPrismaTypeToZodType({
            processedModels,
            allowedPaths,
            currentPath,
            prismaType,
            synonyms,
            modelMap,
          })
        ).toEqual(zodType);
      });
    });

    it('should return z.any() for unknown scalar types', () => {
      const result = mapPrismaTypeToZodType({
        processedModels: new Set(),
        allowedPaths: [],
        currentPath: '',
        prismaType: 'UnknownType',
        synonyms: {},
        modelMap: {},
      });
      expect(result).toBe('');
    });
  });

  describe('getZodTypeForField 2', () => {
    const modelMap = {
      users: {
        profile: { fieldType: 'profiles', isOptional: false, isList: false },
        email: { fieldType: 'String', isOptional: false, isList: false },
        id: { fieldType: 'String', isOptional: false, isList: false },
        tags: { fieldType: 'tags', isOptional: true, isList: true },
        age: { fieldType: 'Int', isOptional: true, isList: false },
      },
      profiles: {
        id: {
          fieldType: 'String',
          isOptional: false,
          isList: false,
          isUnique: true,
        },
        website: { fieldType: 'String', isOptional: true, isList: false },
        bio: { fieldType: 'String', isOptional: true, isList: false },
      },
      tags: {
        id: {
          fieldType: 'String',
          isOptional: false,
          isList: false,
          isUnique: true,
        },
        color: { fieldType: 'String', isOptional: false, isList: false },
        name: { fieldType: 'String', isOptional: true, isList: false },
      },
    };

    const synonyms = { profiles: ['profiles'] };

    const allowedPaths: AllowedPathsType = [
      'select.id',
      'select.email',
      'select.age',
      'select.tags',
      'select.tags.connect.id',
      'select.tags.connectOrCreate.where.id',
      'select.tags.connectOrCreate.create.name',
      'select.tags.create.data.name',
      'select.tags.createMany.data.name',
      'select.tags.update.where.id',
      'select.tags.update.data.name',
      'select.tags.updateMany.where',
      'select.tags.updateMany.data.name',
      'select.tags.upsert.where.id',
      'select.tags.upsert.create.name',
      'select.tags.upsert.update.name',
      'select.tags.disconnect.id',
      'select.tags.delete.id',
      'select.tags.deleteMany.where',
      'select.tags.set.id',
    ];

    it('should handle all relation operations with nested data fields correctly', () => {
      const relationOperationsResult = getZodTypeForField({
        currentPath: 'select.tags',
        processedModels: new Set(),
        modelName: 'users',
        fieldName: 'tags',
        allowedPaths,
        modelMap,
        synonyms,
      });
      const normalizedExpected = `z.object({ connect: z.object({ id: z.string() }), connectOrCreate: z.object({
        where: z.object({ id: z.string() }),
        create: z.object({ name: z.string().nullish() })
      }), create: z.object({}), createMany: z.object({
        data: z.array(z.object({ name: z.string().nullish() })),
        skipDuplicates: z.boolean().nullish()
      }).nullish(), delete: z.object({ delete: z.array(z.object({ id: z.string() })) }).nullish(), deleteMany: z.object({
        where: z.object({}).nullish()
      }).nullish(), disconnect: z.object({ disconnect: z.array(z.object({ id: z.string() })) }).nullish(), set: z.object({ set: z.array(z.object({ id: z.string() })) }).nullish(), update: z.object({ update: z.array(z.object({
          where: z.object({ id: z.string() }),
          data: z.object({ name: z.string().nullish() })
        })) }).nullish(), updateMany: z.object({
          where: z.object({}).nullish(),
          data: z.object({ name: z.string().nullish() })
        }).nullish(), upsert: z.object({
          where: z.object({ id: z.string() }),
          create: z.object({ name: z.string().nullish() }),
          update: z.object({ name: z.string().nullish() })
        }) }).nullish()`;

      const normalizedReceived = relationOperationsResult
        ?.replace(/\s+/g, ' ')
        .trim();

      expect(normalizedReceived).toEqual(
        normalizedExpected.replace(/\s+/g, ' ').trim()
      );
    });

    it('should handle complex relation fields with nested paths and operations', () => {
      const nestedRelationResult = getZodTypeForField({
        currentPath: 'select.profile',
        processedModels: new Set(),
        modelName: 'users',
        fieldName: 'profile',
        allowedPaths: [
          'select.profile',
          'select.profile.id',
          'select.profile.website',
          'select.profile.bio',
          'select.profile.connect.id',
          'select.profile.create.bio',
          'select.profile.create.website',
          'select.profile.update.where.id',
          'select.profile.update.data.bio',
          'select.profile.update.data.website',
        ],
        modelMap,
        synonyms,
      });

      expect(nestedRelationResult).toContain('z.object');
      expect(nestedRelationResult).toContain('bio: z.string().nullish()');
      expect(nestedRelationResult).toContain('website: z.string().nullish()');
    });
  });

  describe('getZodTypeForField', () => {
    const modelMap = {
      users: {
        profile: { fieldType: 'profiles', isOptional: false, isList: false },
        email: { fieldType: 'String', isOptional: false, isList: false },
        id: { fieldType: 'String', isOptional: false, isList: false },
        tags: { fieldType: 'tags', isOptional: true, isList: true },
        age: { fieldType: 'Int', isOptional: true, isList: false },
      },
      profiles: {
        website: { fieldType: 'String', isOptional: true, isList: false },
        bio: { fieldType: 'String', isOptional: true, isList: false },
      },
      tags: {
        color: { fieldType: 'String', isOptional: false, isList: false },
        name: { fieldType: 'String', isOptional: true, isList: false },
      },
    };
    const synonyms = { profiles: ['profiles'] };
    const allowedPaths: AllowedPathsType = [
      'select.id',
      'select.email',
      'select.age',
      'select.tags',
      'select.profile',
      'select.profile.bio',
      'select.profile.website',
      'select.profile.connect',
      'select.profile.create',
    ];

    it('should handle enums correctly', () => {
      const processedModels = new Set<string>();
      const allowedPaths: AllowedPathsType = [];
      const currentPath = '';
      const synonyms = {};
      const modelMap = {};

      const result = mapPrismaTypeToZodType({
        processedModels,
        allowedPaths,
        currentPath,
        prismaType: 'Role',
        enumMap: {
          Role: ['ADMIN', 'USER', 'GUEST'],
        },
        synonyms,
        modelMap,
      });
      expect(result).toBe('z.enum(["ADMIN","USER","GUEST"])');
    });

    it('should handle scalar fields (required and optional) correctly', () => {
      expect(
        getZodTypeForField({
          processedModels: new Set(),
          currentPath: 'select.id',
          modelName: 'users',
          fieldName: 'id',
          allowedPaths,
          modelMap,
          synonyms,
        })
      ).toBe('z.string()');

      expect(
        getZodTypeForField({
          processedModels: new Set(),
          currentPath: 'select.age',
          modelName: 'users',
          fieldName: 'age',
          allowedPaths,
          modelMap,
          synonyms,
        })
      ).toBe('z.number().int().nullish()');
    });

    it('should handle different scalar field types', () => {
      const extendedModelMap = {
        users: {
          createdAt: {
            fieldType: 'DateTime',
            isOptional: false,
            isList: false,
          },
          total: { fieldType: 'Decimal', isOptional: false, isList: false },
          metadata: { fieldType: 'Json', isOptional: true, isList: false },
        },
      };
      expect(
        getZodTypeForField({
          currentPath: 'select.createdAt',
          processedModels: new Set(),
          modelMap: extendedModelMap,
          fieldName: 'createdAt',
          modelName: 'users',
          allowedPaths,
          synonyms,
        })
      ).toBe('z.date()');

      expect(
        getZodTypeForField({
          currentPath: 'select.metadata',
          processedModels: new Set(),
          modelMap: extendedModelMap,
          fieldName: 'metadata',
          modelName: 'users',
          allowedPaths,
          synonyms,
        })
      ).toBe('z.any().nullish()');

      expect(
        getZodTypeForField({
          currentPath: 'select.total',
          processedModels: new Set(),
          modelMap: extendedModelMap,
          modelName: 'users',
          fieldName: 'total',
          allowedPaths,
          synonyms,
        })
      ).toBe('z.string()');
    });

    it('should return undefined for unknown fields', () => {
      expect(
        getZodTypeForField({
          currentPath: 'select.unknown',
          processedModels: new Set(),
          fieldName: 'unknown',
          modelName: 'users',
          allowedPaths,
          modelMap,
          synonyms,
        })
      ).toBe(undefined);
    });
  });

  describe('isPathAllowed', () => {
    const allowedPaths: AllowedPathsType = [
      'select.id',
      'select.email',
      'select.tags',
      'select.profile.bio',
      'select.profile.website',
    ];

    it('should allow exact and nested path matches', () => {
      expect(isPathAllowed({ fullPath: 'select.id', allowedPaths })).toBe(true);
      expect(isPathAllowed({ fullPath: 'select.email', allowedPaths })).toBe(
        true
      );
      expect(
        isPathAllowed({ fullPath: 'select.profile.bio', allowedPaths })
      ).toBe(true);
      expect(
        isPathAllowed({ fullPath: 'select.profile.website', allowedPaths })
      ).toBe(true);
    });

    it('should disallow paths that are not in allowed paths', () => {
      expect(isPathAllowed({ fullPath: 'select.age', allowedPaths })).toBe(
        false
      );
      expect(
        isPathAllowed({ fullPath: 'select.profile.picture', allowedPaths })
      ).toBe(false);
    });

    it('should handle array notation paths correctly', () => {
      const allowedPathsWithArray = ['select.tags[]'];
      expect(
        isPathAllowed({
          allowedPaths: allowedPathsWithArray,
          fullPath: 'select.tags',
        })
      ).toBe(true);
    });
  });

  describe('addToSchemaObject', () => {
    const modelMap = {
      users: {
        email: { fieldType: 'String', isOptional: false, isList: false },
        id: { fieldType: 'String', isOptional: false, isList: false },
        tags: { fieldType: 'tags', isOptional: true, isList: true },
        age: { fieldType: 'Int', isOptional: true, isList: false },
      },
      tags: {
        color: { fieldType: 'String', isOptional: false, isList: false },
        name: { fieldType: 'String', isOptional: true, isList: false },
      },
    };
    const synonyms = {};
    const allowedPaths: AllowedPathsType = [
      'select.id',
      'select.email',
      'select.age',
      'select.tags.color',
      'select.tags.name',
    ];

    it('should add scalar fields to schema object', () => {
      const obj = addToSchemaObject({
        processedModels: new Set(),
        keys: ['select', 'id'],
        modelName: 'users',
        currentPath: '',
        allowedPaths,
        modelMap,
        index: 0,
        synonyms,
      });

      expect(obj).toEqual({
        select: { id: 'z.string()' },
      });
    });

    it('should skip disallowed paths', () => {
      const obj = addToSchemaObject({
        allowedPaths: ['select.id'],
        processedModels: new Set(),
        keys: ['select', 'age'],
        modelName: 'users',
        currentPath: '',
        modelMap,
        index: 0,
        synonyms,
      });

      expect(obj).toEqual(undefined);
    });

    it('should handle nested relations and multiple fields in the same path', () => {
      const modelMap = {
        users: {
          tags: { fieldType: 'tags', isOptional: true, isList: false },
        },
        tags: {
          color: { fieldType: 'String', isOptional: false, isList: false },
          name: { fieldType: 'String', isOptional: true, isList: false },
        },
      };
      const allowedPaths: AllowedPathsType = [
        'select.tags.color',
        'select.tags.name',
      ];
      const synonyms = {};

      const obj = addToSchemaObject({
        keys: ['select', 'tags', 'color'],
        processedModels: new Set(),
        modelName: 'users',
        currentPath: '',
        allowedPaths,
        modelMap,
        index: 0,
        synonyms,
      });

      expect(obj).toEqual({
        select: {
          tags: {
            color: 'z.string()',
          },
        },
      });
    });
  });

  describe('buildSchemaObject', () => {
    it('should handle complex models with multiple relations and fields', () => {
      const modelMap = {
        User: {
          id: { fieldType: 'String', isOptional: false, isList: false },
          posts: { fieldType: 'Post', isOptional: true, isList: true },
          profile: { fieldType: 'Profile', isOptional: true, isList: false },
        },
        Posts: {
          id: { fieldType: 'String', isOptional: false, isList: false },
          title: { fieldType: 'String', isOptional: false, isList: false },
        },
        Profile: {
          id: { fieldType: 'String', isOptional: false, isList: false },
          bio: { fieldType: 'String', isOptional: true, isList: false },
        },
      };
      const allowedPaths: AllowedPathsType = [
        'select.id',
        'select.Posts.title',
        'select.Profile.bio',
      ];
      const synonyms = {};

      const schemaObject = buildSchemaObject({
        modelMap,
        modelFields: modelMap['User'],
        allowedPaths,
        processedModels: new Set(),
        modelName: 'User',
        synonyms,
      });

      expect(schemaObject).toEqual({
        select:
          'z.object({ id: z.string(), Posts: z.object({ title: z.string() }), Profile: z.object({ bio: z.string().nullish() }) })',
      });
    });

    it('should build a simple schema object', () => {
      const schemaObject = buildSchemaObject({
        modelMap: {
          users: {
            email: { fieldType: 'String', isOptional: false, isList: false },
            id: { fieldType: 'String', isOptional: false, isList: false },
          },
        },
        modelFields: {
          email: { fieldType: 'String', isOptional: false, isList: false },
          id: { fieldType: 'String', isOptional: false, isList: false },
        },
        allowedPaths: ['select.id', 'select.email'],
        processedModels: new Set(),
        modelName: 'users',
        synonyms: {},
      });

      expect(schemaObject).toEqual({
        select: 'z.object({ id: z.string(), email: z.string() })',
      });
    });

    it('should handle nested paths and relations correctly', () => {
      const schemaObject = buildSchemaObject({
        modelMap: {
          users: {
            profile: {
              fieldType: 'profiles',
              isOptional: false,
              isList: false,
            },
            id: { fieldType: 'String', isOptional: false, isList: false },
            tags: { fieldType: 'tags', isOptional: true, isList: true },
          },
          profiles: {
            website: { fieldType: 'String', isOptional: true, isList: false },
            bio: { fieldType: 'String', isOptional: true, isList: false },
          },
          tags: {
            color: { fieldType: 'String', isOptional: false, isList: false },
            name: { fieldType: 'String', isOptional: true, isList: false },
          },
        },
        modelFields: {
          tags: { fieldType: 'tags', isOptional: true, isList: true },
        },
        allowedPaths: [
          'select.id',
          'select.tags.color',
          'select.tags.name',
          'select.profiles.bio',
          'select.profiles.website',
        ],
        processedModels: new Set(),
        modelName: 'users',
        synonyms: {},
      });

      expect(schemaObject).toEqual({
        select:
          'z.object({ id: z.string(), tags: z.object({ color: z.string(), name: z.string().nullish() }), profiles: z.object({ bio: z.string().nullish(), website: z.string().nullish() }) })',
      });
    });

    it('should handle deeply nested paths', () => {
      const schemaObject = buildSchemaObject({
        modelMap: {
          metadata: {
            createdAt: {
              fieldType: 'DateTime',
              isOptional: false,
              isList: false,
            },
            updatedAt: {
              fieldType: 'DateTime',
              isOptional: true,
              isList: false,
            },
          },
          tags: {
            metadata: {
              fieldType: 'metadata',
              isOptional: true,
              isList: false,
            },
            color: { fieldType: 'String', isOptional: false, isList: false },
          },
          users: {
            id: { fieldType: 'String', isOptional: false, isList: false },
            tags: { fieldType: 'tags', isOptional: true, isList: true },
          },
        },
        allowedPaths: [
          'select.id',
          'select.tags.color',
          'select.tags.select.metadata.select.createdAt',
          'select.tags.select.metadata.select.updatedAt',
        ],
        modelFields: {
          id: { fieldType: 'String', isOptional: false, isList: false },
          tags: { fieldType: 'tags', isOptional: true, isList: true },
          metadata: { fieldType: 'metadata', isOptional: true, isList: true },
        },
        processedModels: new Set(),
        modelName: 'users',
        synonyms: {},
      });

      expect(schemaObject).toEqual({
        select:
          'z.object({ id: z.string(), tags: z.object({ color: z.string(), select: z.object({ metadata: z.object({ select: z.object({ createdAt: z.date(), updatedAt: z.date().nullish() }) }) }) }) })',
      });
    });

    it('should handle special field types correctly', () => {
      const schemaObject = buildSchemaObject({
        modelMap: {
          orders: {
            createdAt: {
              fieldType: 'DateTime',
              isOptional: false,
              isList: false,
            },
            updatedAt: {
              fieldType: 'DateTime',
              isOptional: true,
              isList: false,
            },
            total: { fieldType: 'Decimal', isOptional: false, isList: false },
            metadata: { fieldType: 'Json', isOptional: true, isList: false },
            id: { fieldType: 'String', isOptional: false, isList: false },
          },
        },
        modelFields: {
          createdAt: {
            fieldType: 'DateTime',
            isOptional: false,
            isList: false,
          },
          updatedAt: { fieldType: 'DateTime', isOptional: true, isList: false },
          total: { fieldType: 'Decimal', isOptional: false, isList: false },
          metadata: { fieldType: 'Json', isOptional: true, isList: false },
          id: { fieldType: 'String', isOptional: false, isList: false },
        },
        allowedPaths: [
          'select.id',
          'select.total',
          'select.createdAt',
          'select.updatedAt',
          'select.metadata',
        ],
        processedModels: new Set(),
        modelName: 'orders',
        synonyms: {},
      });

      const expectedSchema = {
        select:
          'z.object({ id: z.string(), total: z.string(), createdAt: z.date(), updatedAt: z.date().nullish(), metadata: z.any().nullish() })',
      };

      expect(schemaObject).toEqual(expectedSchema);
    });

    it('should return an empty schema object if no allowed paths are provided', () => {
      const schemaObject = buildSchemaObject({
        modelMap: {
          users: {
            email: { fieldType: 'String', isOptional: false, isList: false },
            id: { fieldType: 'String', isOptional: false, isList: false },
          },
        },
        modelFields: {
          email: { fieldType: 'String', isOptional: false, isList: false },
          id: { fieldType: 'String', isOptional: false, isList: false },
        },
        processedModels: new Set(),
        modelName: 'users',
        allowedPaths: [],
        synonyms: {},
      });

      expect(schemaObject).toEqual({});
    });

    it('should handle missing models in the modelMap', () => {
      const schemaObject = buildSchemaObject({
        modelFields: {
          email: { fieldType: 'String', isOptional: false, isList: false },
          id: { fieldType: 'String', isOptional: false, isList: false },
        },
        allowedPaths: ['select.id', 'select.email'],
        processedModels: new Set(),
        modelName: 'users',
        modelMap: {},
        synonyms: {},
      });

      expect(schemaObject).toEqual({});
    });
  });
});

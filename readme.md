[![npm version](https://badge.fury.io/js/prisma-generator-zod.svg)](https://badge.fury.io/js/prisma-generator-zod)
[![npm](https://img.shields.io/npm/dt/prisma-generator-zod.svg)](https://www.npmjs.com/package/prisma-generator-zod)
[![HitCount](https://hits.dwyl.com/multipliedtwice/prisma-generator-zod.svg?style=flat)](http://hits.dwyl.com/multipliedtwice/prisma-generator-zod)
[![Coverage](https://img.shields.io/codecov/c/github/multipliedtwice/prisma-generator-zod/main.svg)](https://codecov.io/gh/multipliedtwice/prisma-generator-zod)
[![npm](https://img.shields.io/npm/l/prisma-generator-zod.svg)](LICENSE)

# Prisma Generator Zod

A TypeScript utility to generate lean Zod schemas from your Prisma models based on specified allowed paths. Generates only what's requested.

## Features
- Parses your Prisma schema to determine types and enums.
- Generates only what's specified.
- Supports custom synonyms for model names.

## Installation
You can install this package via npm:

```bash
npm install prisma-generator-zod
```

Or with Yarn:

```bash
yarn add prisma-generator-zod
```

## Usage
### __Step 1__: Prepare Your Prisma Schema
Ensure you have a schema.prisma file in your project root or specify its location when running the generator.

### __Step 2__: Define Allowed Paths and Synonyms
In your TypeScript files where you want to generate schemas, define an object with the allowed paths and synonyms. For example:

```typescript
const schema = {
  schema: 'Task',
  allowedPaths: [
    // Scalar field selection
    "select.id",

    // Nested relation
    "select.user_assignments.select.user",

    // Filtering condition
    "where.status",

    // Array filtering with logical operators
    "where.AND[].OR[].is_archived",

    // Ordering and pagination
    "orderBy.created_at",
    "take",

    // Relation selection with filters
    "select.attachments.where.is_image",

    // Advanced configuration for a specific field
    {
      type: "string",
      message: "Must be a valid string",
      name: "description",
    },
    {
      type: "boolean",
      message: "Must be a boolean",
      name: "isCompleted",
    },
  ],
  synonyms: {
    user: "users",
    tag: "tags",
    attachment: "attachments",
  },
};

```

schema: The name of the Prisma model you want to generate a Zod schema for.
fields: An array of strings specifying the paths to the fields you want to include.
synonyms: (Optional) A mapping of custom field types to Prisma model names.

### __Step 3__: Run the Generator
You can run the generator using the following command:

```bash
npx prisma-generator-zod [search-directory]
```
search-directory: (Optional) The directory where your TypeScript files with the schema definitions are located. Defaults to src.

### __Step 4__: Import the Generated Schemas
After running the generator, it will create new TypeScript files with the Zod schemas in the same directory as your schema definitions. You can import and use them as follows:

```typescript
import { UserSchema, UserType } from './UserZodSchema';

const userData: unknown = /* some data */;
const parsedData = UserSchema.parse(userData);
// Now `parsedData` is of type `UserType`
```

## Configuration
You can customize the behavior of the generator by modifying the following:

Allowed Paths: Specify which fields and nested relations to include in the generated schema.
Synonyms: Map custom field types to Prisma model names if you have aliasing in your models.
Example
Given a Prisma schema:

```prisma
model User {
  id      Int      @id @default(autoincrement())
  email   String   @unique
  profile Profile?
  posts   Post[]
}

model Profile {
  id     Int     @id @default(autoincrement())
  name   String
  userId Int     @unique
  user   User    @relation(fields: [userId], references: [id])
}

model Post {
  id        Int      @id @default(autoincrement())
  title     String
  content   String?
  authorId  Int
  author    User     @relation(fields: [authorId], references: [id])
}
```
And a TypeScript file with the schema definition:

```typescript
const schema = {
  schema: 'User',
  fields: [
    'id',
    'email',
    'profile.name',
    'posts[].title',
  ],
  synonyms: {},
};
```
Running the generator will create a UserZodSchema.ts file:

```typescript
import { z } from 'zod';

export const UserSchema = z.object({
  id: z.number().int(),
  email: z.string(),
  profile: z.object({
    name: z.string(),
  }).optional(),
  posts: z.array(
    z.object({
      title: z.string(),
    })
  ).optional(),
});

export type UserType = z.infer<typeof UserSchema>;
```

## API Reference
Functions
parsePrismaSchema(schemaPrismaPath: string): ParsePrismaSchemaResult

Parses the Prisma schema file and returns a model and enum map.

buildZodSchema(params: BuildZodSchemaParams): string

Builds the Zod schema code for a given model based on allowed paths.

extractSchemasToRegenerate(files: string[]): Promise<SchemaToRegenerate[]>

Extracts schema definitions from TypeScript files to determine which schemas need regeneration.

saveSchemaToFile(params: SaveSchemaToFileParams): string

Saves the generated Zod schema code to a TypeScript file.

## Types
SchemaToRegenerate

```typescript
interface SchemaToRegenerate {
  synonyms: Record<string, string>;
  allowedPaths: string[];
  outputPath: string;
  modelName: string;
}
```
BuildZodSchemaParams

```typescript
type BuildZodSchemaParams = {
  modelMap: Record<string, Record<string, PrismaField>>;
  enumMap?: Record<string, string[]>;
  synonyms: Record<string, string>;
  modelFields: Record<string, PrismaField>;
  allowedPaths: string[];
  modelName: string;
};
```

### Contributing
Contributions are welcome! Please follow these steps:

Fork the repository.
Create a new branch: git checkout -b feature/your-feature-name.
Make your changes.
Commit your changes: git commit -m 'Add some feature'.
Push to the branch: git push origin feature/your-feature-name.
Open a pull request.

### License
This project is licensed under the MIT License.
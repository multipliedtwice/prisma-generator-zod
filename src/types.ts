export type FieldConfigType = {
  type?: string;
  message?: string;
  name?: string;
  _isOptional?: boolean;
};
export type AllowedPathType = string | FieldConfigType;
export type AllowedPathsType = AllowedPathType[];

export type SynonymsType = {
  [modelName: string]: string[];
};

export type ModelMapType = Record<string, Record<string, PrismaField>>;
export interface BaseModelParams {
  modelMap: ModelMapType;
  enumMap?: Record<string, string[]>;
  allowedPaths: AllowedPathsType;
  synonyms: SynonymsType;
}

export type renderFinalSchemaParams = BaseModelParams & {
  modelFields: Record<string, PrismaField>;
  allowedPaths: AllowedPathsType;
  modelName: string;
};

export type BuildSchemaObjectParams = BaseModelParams & {
  modelFields: Record<string, any>;
  processedModels: Set<string>;
  modelName: string;
};

export type AddToSchemaObjectParams = BaseModelParams & {
  processedModels: Set<string>;
  allowedPaths: AllowedPathsType;
  currentPath: string;
  fieldConfig?: FieldConfigType;
  modelName: string;
  keys: string[];
  index: number;
};

export type GetZodTypeForFieldParams = BaseModelParams & {
  processedModels: Set<string>;
  allowedPaths: AllowedPathsType;
  currentPath: string;
  fieldName: string;
  modelName: string;
};

export type MapPrismaTypeToZodTypeParams = BaseModelParams & {
  processedModels: Set<string>;
  allowedPaths: AllowedPathsType;
  currentPath: string;
  prismaType: string;
  allowedEnumValues?: string[];
};

export type GenerateRelatedModelSchemaParams = BaseModelParams & {
  processedModels: Set<string>;
  allowedPaths: AllowedPathsType;
  currentPath: string;
  modelName: string;
};

export type ResolveModelNameParams = {
  synonyms: SynonymsType;
  normalizedKey?: string;
  modelName: string;
};

export type ScalarTypes =
  | 'String'
  | 'Int'
  | 'Float'
  | 'Boolean'
  | 'DateTime'
  | 'Json'
  | 'BigInt'
  | 'Decimal'
  | 'Bytes';

export interface SchemaToRegenerate {
  synonyms: SynonymsType;
  allowedPaths: string[] | any[];
  outputPath: string;
  modelName: string;
}

export interface PrismaField {
  isOptional: boolean;
  isUnique?: boolean;
  fieldType: string;
  isList: boolean;
  isId?: boolean;
}

export type HandleRelationFieldParams = BaseModelParams & {
  processedModels: Set<string>;
  allowedPaths: AllowedPathsType;
  currentPath: string;
  field: PrismaField;
  modelName: string;
  newPath: string;
  keys?: string[];
  index: number;
  key: string;
  obj?: any;
};

export type ParsePrismaSchemaResult = {
  modelMap: Record<string, any>;
  enumMap?: Record<string, string[]>;
};

export type HandleScalarFieldParams = BaseModelParams & {
  obj?: any;
  key: string;
  field: PrismaField;
  newPath: string;
  currentEnum: string | null | undefined;
  processedModels: Set<string>;
  allowedPaths: AllowedPathsType;
  modelName: string;
  isArray: boolean;
  fieldConfig?: FieldConfigType;
};

export type HandleQueryOperatorParams = BaseModelParams & {
  processedModels: Set<string>;
  allowedPaths: AllowedPathsType;
  modelName: string;
  newPath: string;
  isArray: boolean;
  index: number;
  keys: string[];
  key: string;
  obj: any;
};

export type GenerateDefaultOperationSchemaParams = BaseModelParams & {
  operation: string;
  modelName: string;
  allowedPaths: AllowedPathsType;
  processedModels: Set<string>;
  fieldIsList: boolean;
  currentPath: string;
};

export type IsPathAllowedParams = {
  allowedPaths: AllowedPathsType;
  fullPath: string;
};

export type NormalizeKeyParams = (key: string) => string;

export type NormalizePathParams = (path: string) => string;

export type GetNewPathParams = (currentPath: string, key: string) => string;

export type HandleDisallowedPathParams = {
  obj: any;
  key: string;
  newPath: string;
};

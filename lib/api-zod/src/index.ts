/**
 * This index resolves naming conflicts between Zod schemas and Typescript types
 * by exporting schemas directly and types under a specialized namespace.
 */
export * from "./generated/api";
// We don't do export * from "./generated/types" here to avoid name collisions 
// between the Zod schemas and the inferred Typescript types.

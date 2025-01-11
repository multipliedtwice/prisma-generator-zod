
  import { z } from 'zod';
  
  export const userSchema = z.object({ where: z.object({ posts: z.object({ some: z.object({ title: z.string() }), every: z.object({ id: z.string() }), content: z.object({ search: z.string() }) }), profile: z.object({ bio: z.string().nullish() }), AND: z.array(z.object({ age: z.number().int() })), OR: z.array(z.object({ name: z.string() })), NOT: z.array(z.object({ email: z.string() })), status: z.object({ in: z.array(z.enum(["ACTIVE"])), notIn: z.array(z.enum(["SUSPENDED"])) }), email: z.object({ contains: z.string(), startsWith: z.string(), endsWith: z.string() }) }) });
  
  export type userType = z.infer<typeof userSchema>;
  
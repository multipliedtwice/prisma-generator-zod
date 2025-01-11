
  import { z } from 'zod';
  
  export const postSchema = z.object({ where: z.object({ OR: z.array(z.object({ title: z.string(), content: z.string().nullish() })), NOT: z.array(z.object({ createdAt: z.date() })), content: z.object({ contains: z.string(), startsWith: z.string(), endsWith: z.string(), search: z.string() }) }) });
  
  export type postType = z.infer<typeof postSchema>;
  
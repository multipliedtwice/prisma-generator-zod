
  import { z } from 'zod';
  
  export const profileSchema = z.object({ select: z.object({ id: z.string(), bio: z.string().nullish(), website: z.string().nullish(), user: z.object({ select: z.object({ id: z.string(), name: z.string() }) }) }), where: z.object({ user: z.object({ name: z.string(), email: z.string() }), AND: z.array(z.object({ bio: z.string().nullish() })), OR: z.array(z.object({ website: z.string().nullish() })), NOT: z.array(z.object({ bio: z.string().nullish() })) }) });
  
  export type profileType = z.infer<typeof profileSchema>;
  
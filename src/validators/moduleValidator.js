import z from "zod";

export const createModuleSchema = z.object({
    title: z.string().trim().min(3, 'Title must contain at least 3 characters')
        .max(100, 'Title cannot exceed 100 characters'),
    description: z.string().trim().min(10, 'Description must contain at least 10 characters'),
    order: z.number().min(1, 'order must be at least 1'),
    duration: z.number().min(1, 'Duration must be at least 1'),

})

export const updateModuleSchema = createModuleSchema.partial()
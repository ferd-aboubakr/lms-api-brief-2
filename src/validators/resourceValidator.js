import {z} from "zod";

export const createResourceSchema = z.object({
    title: z.string().trim().min(3, 'Title must contain at least 3 characters')
        .max(100, 'Title cannot exceed 100 characters'),
    type: z.enum(
        ['video', 'pdf', 'article', 'link', 'exercise'],
        { message: 'Type must be video, pdf, article, link or exercise' }
    ),
    description: z.string().trim().min(10, 'Description must contain at least 10 characters'),
    order: z.number().min(1, 'order must be at least 1'),

})

export const updateResourceSchema = createResourceSchema.partial()
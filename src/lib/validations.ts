import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export const signupSchema = z
  .object({
    fullName: z
      .string()
      .min(2, 'Full name must be at least 2 characters')
      .max(50, 'Full name must be under 50 characters'),
    email: z.string().min(1, 'Email is required').email('Invalid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export const profileSchema = z.object({
  fullName: z
    .string()
    .min(2, 'Full name must be at least 2 characters')
    .max(50, 'Full name must be under 50 characters'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be under 20 characters')
    .regex(/^[a-z0-9_]+$/, 'Username can only contain lowercase letters, numbers, and underscores')
    .optional()
    .or(z.literal('')),
  bio: z.string().max(200, 'Bio must be under 200 characters').optional().or(z.literal('')),
  heightCm: z
    .number({ error: 'Enter a valid height' })
    .min(100, 'Height must be at least 100cm')
    .max(250, 'Height must be under 250cm')
    .optional(),
  weightKg: z
    .number({ error: 'Enter a valid weight' })
    .min(30, 'Weight must be at least 30kg')
    .max(300, 'Weight must be under 300kg')
    .optional(),
})

export const wardrobeItemSchema = z.object({
  name: z.string().min(1, 'Name is required').max(80, 'Name must be under 80 characters'),
  category: z.string().min(1, 'Category is required'),
  subcategory: z.string().optional().or(z.literal('')),
  brand: z.string().max(50, 'Brand must be under 50 characters').optional().or(z.literal('')),
  size: z.string().optional().or(z.literal('')),
  notes: z.string().max(500, 'Notes must be under 500 characters').optional().or(z.literal('')),
})

export type LoginFormData = z.infer<typeof loginSchema>
export type SignupFormData = z.infer<typeof signupSchema>
export type ProfileFormData = z.infer<typeof profileSchema>
export type WardrobeItemFormData = z.infer<typeof wardrobeItemSchema>

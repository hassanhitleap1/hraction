import { PrismaClient } from '@prisma/client'

// One PrismaClient for the whole server (reused across hot reloads in dev).
const globalForPrisma = globalThis as unknown as { __prisma?: PrismaClient }

export const prisma = globalForPrisma.__prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.__prisma = prisma

import { PrismaClient } from '@prisma/client'
import { createClient } from '@libsql/client'

const { PrismaLibSql } = require('@prisma/adapter-libsql')

const libsql = createClient({
  url: process.env.DATABASE_URL || 'file:./prisma/dev.db',
})

const adapter = new PrismaLibSql(libsql)

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

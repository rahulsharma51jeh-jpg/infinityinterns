import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { createClient } from '@libsql/client'
import bcrypt from 'bcryptjs'
import path from 'path'

const { PrismaLibSql } = require('@prisma/adapter-libsql')

const dbPath = path.join(process.cwd(), 'prisma', 'dev.db')
const libsql = createClient({
  url: `file:${dbPath}`,
})

const adapter = new PrismaLibSql(libsql)
const prisma = new PrismaClient({ adapter })

async function main() {
  // Create default admin user
  const hashedPassword = await bcrypt.hash('admin123', 10)
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@infinityinterns.com' },
    update: {},
    create: {
      email: 'admin@infinityinterns.com',
      password: hashedPassword,
      name: 'Admin User',
      role: 'ADMIN',
    },
  })

  console.log('✅ Admin user created:', admin.email)
  console.log('📧 Email: admin@infinityinterns.com')
  console.log('🔑 Password: admin123')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

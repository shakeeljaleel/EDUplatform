const fs = require('fs')
const path = require('path')

const dbUrl =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL ||
  process.env.VERCEL_POSTGRES_URL ||
  'postgres://postgres:postgres@localhost:5432/eduplatform'

console.log('Preparing build environment variables...')

const envContent = `DATABASE_URL="${dbUrl}"\nPOSTGRES_PRISMA_URL="${dbUrl}"\n`
const envPath = path.join(__dirname, '..', '.env')

fs.writeFileSync(envPath, envContent)
console.log('Successfully configured build .env file for Prisma.')

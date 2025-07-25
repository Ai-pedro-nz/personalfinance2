import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const categories = [
    { name: 'Income', type: 'income', color: '#10B981' },
    { name: 'Housing', type: 'expense', color: '#EF4444' },
    { name: 'Transportation', type: 'expense', color: '#F59E0B' },
    { name: 'Food', type: 'expense', color: '#8B5CF6' },
    { name: 'Healthcare', type: 'expense', color: '#06B6D4' },
    { name: 'Entertainment', type: 'expense', color: '#EC4899' },
    { name: 'Shopping', type: 'expense', color: '#F97316' },
    { name: 'Utilities', type: 'expense', color: '#6366F1' },
    { name: 'Miscellaneous', type: 'expense', color: '#6B7280' }
  ]

  console.log('Seeding categories...')
  
  for (const category of categories) {
    await prisma.category.upsert({
      where: { name: category.name },
      update: {},
      create: category
    })
  }

  console.log('Categories seeded successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
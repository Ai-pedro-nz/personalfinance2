import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Starting database migration...')
    
    // Run Prisma db push to create tables
    const { stdout, stderr } = await execAsync('npx prisma db push --accept-data-loss')
    
    console.log('Migration stdout:', stdout)
    if (stderr) console.log('Migration stderr:', stderr)
    
    return NextResponse.json({ 
      success: true, 
      message: 'Database migration completed successfully!',
      output: stdout
    })
  } catch (error: any) {
    console.error('Migration failed:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      details: error.stdout || error.stderr
    }, { status: 500 })
  }
}
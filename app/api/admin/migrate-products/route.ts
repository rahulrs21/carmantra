import { NextRequest, NextResponse } from 'next/server';
import { migrateExistingProducts } from '@/lib/firestore/migrateExistingProducts';

/**
 * POST /api/admin/migrate-products
 * Migration endpoint to populate existing categories and products
 * 
 * Usage:
 * const response = await fetch('/api/admin/migrate-products', { method: 'POST' });
 */
export async function POST(request: NextRequest) {
  try {
    const result = await migrateExistingProducts();

    return NextResponse.json({
      success: true,
      message: 'Migration completed successfully',
      data: result,
    }, { status: 200 });
  } catch (error: any) {
    console.error('Migration API error:', error);
    return NextResponse.json(
      { error: error.message || 'Migration failed' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json(
    { error: 'Use POST method to run migration' },
    { status: 405 }
  );
}

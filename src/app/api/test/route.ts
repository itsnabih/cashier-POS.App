import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const data = await query('SELECT count(*) FROM suppliers');
    return NextResponse.json({ success: true, count: data[0].count });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message });
  }
}

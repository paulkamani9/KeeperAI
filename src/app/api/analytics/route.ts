/**
 * Analytics API Route
 * 
 * Handles anonymous analytics tracking for search queries and user interactions.
 * All data is anonymized and used only for improving the search experience.
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // For MVP, just log analytics events
    // In production, this would send to analytics service or Convex
    console.log('Analytics event:', {
      timestamp: new Date().toISOString(),
      ...body
    });
    
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to process analytics' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ message: 'Analytics endpoint' }, { status: 200 });
}
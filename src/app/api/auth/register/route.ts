import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name, phone, businessName, districtId, districtName, address, gstin } = body;

    if (!email || !password || !name) {
      return NextResponse.json(
        { success: false, message: 'Name, email, and password are required' },
        { status: 400 }
      );
    }

    const result = await auth.register({
      email,
      password,
      name,
      phone,
      businessName: businessName || `${name} Enterprise`,
      districtId,
      districtName,
      address,
      gstin,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      distributorCode: result.distributorCode,
    });
  } catch (error) {
    console.error('Registration API error:', error);
    return NextResponse.json(
      { success: false, message: 'Server error processing registration' },
      { status: 500 }
    );
  }
}
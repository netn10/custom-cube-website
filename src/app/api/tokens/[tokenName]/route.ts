import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = 'https://netn10-custom-cube-backend-31fb1edb5cb3.herokuapp.com';

export async function GET(
  request: NextRequest,
  { params }: { params: { tokenName: string } }
) {
  const tokenName = params.tokenName;
  const searchParams = request.nextUrl.searchParams;
  const queryString = searchParams.toString();
  
  // Debug logging
  console.log('Token API - Original URL:', request.url);
  console.log('Token API - Token name param:', tokenName);
  
  const url = `${BACKEND_URL}/api/tokens/${tokenName}${queryString ? '?' + queryString : ''}`;
  console.log('Token API - Final backend URL:', url);
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Forward any authorization headers
        ...(request.headers.get('authorization') && {
          'authorization': request.headers.get('authorization')!
        })
      },
    });
    
    const data = await response.text();
    
    return new NextResponse(data, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('content-type') || 'application/json',
        // Handle CORS
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  } catch (error) {
    console.error('Token API Proxy error:', error);
    return NextResponse.json({ error: 'Proxy error' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const imageUrl = searchParams.get('url');
    
    if (!imageUrl) {
      return new NextResponse('No URL provided', { status: 400 });
    }

    // Add headers to avoid rate limiting and mimic a browser
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Referer': 'https://scryfall.com/',
    };

    // Make a request to the image URL
    const response = await fetch(imageUrl, {
      headers,
      // Add a reasonable timeout
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      // Return a placeholder SVG instead of an error
      const placeholderSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="265" height="370" viewBox="0 0 265 370">
          <rect width="265" height="370" fill="#eee"/>
          <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="14" text-anchor="middle" fill="#888">
            Image Not Available
          </text>
        </svg>
      `;
      
      return new NextResponse(placeholderSvg, {
        status: 200,
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
        },
      });
    }

    // Get the content type from the response
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    
    // Get the image data
    const imageBuffer = await response.arrayBuffer();

    // Return the image with appropriate headers
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });

  } catch (error) {
    console.error('Image proxy error:', error);
    
    // Return a placeholder SVG for any errors
    const placeholderSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="265" height="370" viewBox="0 0 265 370">
        <rect width="265" height="370" fill="#eee"/>
        <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="14" text-anchor="middle" fill="#888">
          Image Not Available
        </text>
      </svg>
    `;
    
    return new NextResponse(placeholderSvg, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });
  }
}
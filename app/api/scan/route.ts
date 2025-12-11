import { NextRequest, NextResponse } from 'next/server';
import { parseProductText, parseProductImage } from '@/lib/productParser';
import { fileToBase64 } from '@/lib/imageUtils';

interface ApiError extends Error {
  status?: number;
  code?: string;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('image') as File;
    const ocrText = formData.get('ocrText') as string | null;

    // Get OpenRouter API key from environment
    const openrouterApiKey = process.env.OPENROUTER_API_KEY || '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';

    // Strategy 1: If OCR text is provided (from client-side), parse it directly
    if (ocrText && ocrText.trim().length > 0) {
      if (!openrouterApiKey) {
        // Return raw OCR text if no API key
        return NextResponse.json({
          success: true,
          data: {
            name: undefined,
            company: undefined,
            rawText: ocrText.substring(0, 1000), // Limit raw text length
          },
          message: 'OpenRouter API key not configured. Add OPENROUTER_API_KEY for AI parsing.',
        });
      }

      try {
        console.log('Parsing OCR text from client...');
        const productData = await parseProductText(ocrText, openrouterApiKey);
        return NextResponse.json({ success: true, data: productData });
      } catch (error) {
        const apiError = error as ApiError;
        // If quota exceeded, return raw OCR text as fallback (don't try Vision API - it will also fail)
        if (apiError.status === 429 || apiError.code === 'insufficient_quota') {
          console.log('OpenRouter quota exceeded, returning raw OCR text...');
          return NextResponse.json({
            success: true,
            data: {
              name: undefined,
              company: undefined,
              rawText: ocrText.substring(0, 1000),
            },
            message: 'OpenRouter API quota exceeded. Showing raw OCR text. Please check your billing or try again later.',
            code: 'quota_exceeded',
          });
        }
        
        // For other errors, log and rethrow to fall through to Vision API if file is available
        console.error('Error parsing OCR text:', error);
        // Only fall through if we have a file to try Vision API
        if (!file) {
          throw error;
        }
      }
    }

    // Strategy 2: Use OpenRouter Vision API directly (if image provided)
    if (file) {
      if (!openrouterApiKey) {
        return NextResponse.json(
          { 
            error: 'OpenRouter API key not configured. Please add OPENROUTER_API_KEY to your environment variables.',
            requiresApiKey: true
          },
          { status: 400 }
        );
      }

      try {
        console.log('Attempting OpenRouter Vision API...');
        const base64 = await fileToBase64(file);
        const mimeType = file.type;
        
        const productData = await parseProductImage(base64, mimeType, openrouterApiKey);
        
        // Check if we got meaningful data
        const hasData = Object.values(productData).some(
          (value) => value !== undefined && value !== null && value !== ''
        );

        if (hasData) {
          return NextResponse.json({ success: true, data: productData });
        }
      } catch (error) {
        const apiError = error as ApiError;
        console.error('OpenRouter Vision API failed:', error);
        
        // Return helpful error message
        if (apiError.status === 429 || apiError.code === 'insufficient_quota') {
          return NextResponse.json(
            { 
              error: 'OpenRouter API quota exceeded. Please check your billing or try again later.',
              code: 'quota_exceeded'
            },
            { status: 429 }
          );
        }
        
        throw error;
      }
    }

    return NextResponse.json(
      { error: 'No image file or OCR text provided' },
      { status: 400 }
    );
  } catch (error) {
    const apiError = error as ApiError;
    console.error('API error:', error);
    
    // Handle specific OpenRouter errors
    if (apiError.status === 429 || apiError.code === 'insufficient_quota') {
      return NextResponse.json(
        { 
          error: 'OpenRouter API quota exceeded. Please check your billing or try again later.',
          code: 'quota_exceeded'
        },
        { status: 429 }
      );
    }
    
    return NextResponse.json(
      { error: apiError.message || 'Internal server error' },
      { status: 500 }
    );
  }
}


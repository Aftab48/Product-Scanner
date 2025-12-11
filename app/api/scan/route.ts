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

    // Get Gemini API key from environment
    const geminiApiKey = process.env.GEMINI_API_KEY;
    
    // Debug: Log if API key exists (but not the actual key)
    if (!geminiApiKey) {
      console.log('⚠️  GEMINI_API_KEY not found in environment variables');
    } else {
      console.log('✓ GEMINI_API_KEY found (length:', geminiApiKey.length, ')');
    }
    
    // Strategy 1: If OCR text is provided (from client-side), parse it directly
    if (ocrText && ocrText.trim().length > 0) {
      if (!geminiApiKey) {
        // Return raw OCR text if no API key
        return NextResponse.json({
          success: true,
          data: {
            name: undefined,
            company: undefined,
            rawText: ocrText.substring(0, 1000), // Limit raw text length
          },
          message: 'Gemini API key not configured. Add GEMINI_API_KEY for AI parsing.',
        });
      }

      try {
        console.log('Parsing OCR text from client...');
        const productData = await parseProductText(ocrText, geminiApiKey);
        return NextResponse.json({ success: true, data: productData });
      } catch (error) {
        const apiError = error as ApiError;
        console.error('Error parsing OCR text:', error);
        
        // Handle model not found errors (404)
        if (apiError.status === 404) {
          console.log('Gemini API model not found, returning raw OCR text...');
          console.log('Error details:', apiError.message);
          return NextResponse.json({
            success: true,
            data: {
              name: undefined,
              company: undefined,
              rawText: ocrText.substring(0, 1000),
            },
            message: 'Gemini API model not found. The model name may be incorrect. Showing raw OCR text. Please check the model configuration.',
            code: 'model_not_found',
          });
        }
        
        // Handle authentication errors (401/403)
        if (apiError.status === 401 || apiError.status === 403) {
          console.log('Gemini API authentication failed, returning raw OCR text...');
          console.log('API Key present:', !!geminiApiKey, 'Length:', geminiApiKey?.length);
          return NextResponse.json({
            success: true,
            data: {
              name: undefined,
              company: undefined,
              rawText: ocrText.substring(0, 1000),
            },
            message: 'Gemini API authentication failed. The API key may be invalid or expired. Showing raw OCR text. Please verify your API key at https://makersuite.google.com/app/apikey',
            code: 'auth_failed',
          });
        }
        
        // If quota exceeded, return raw OCR text as fallback
        if (apiError.status === 429 || apiError.code === 'insufficient_quota' || apiError.code === 'RESOURCE_EXHAUSTED') {
          console.log('Gemini API quota exceeded, returning raw OCR text...');
          return NextResponse.json({
            success: true,
            data: {
              name: undefined,
              company: undefined,
              rawText: ocrText.substring(0, 1000),
            },
            message: 'Gemini API quota exceeded. Showing raw OCR text. Please check your billing or try again later.',
            code: 'quota_exceeded',
          });
        }
        
        // For other errors, return raw OCR text instead of failing completely
        console.log('Gemini API error, returning raw OCR text as fallback...');
        return NextResponse.json({
          success: true,
          data: {
            name: undefined,
            company: undefined,
            rawText: ocrText.substring(0, 1000),
          },
          message: 'AI parsing failed. Showing raw OCR text.',
          code: 'parsing_failed',
        });
      }
    }

    // Strategy 2: Use Gemini Vision API directly (if image provided)
    if (file) {
      if (!geminiApiKey) {
        return NextResponse.json(
          { 
            error: 'Gemini API key not configured. Please add GEMINI_API_KEY to your environment variables.',
            requiresApiKey: true
          },
          { status: 400 }
        );
      }

      try {
        console.log('Attempting Gemini Vision API...');
        const base64 = await fileToBase64(file);
        const mimeType = file.type;
        
        const productData = await parseProductImage(base64, mimeType, geminiApiKey);
        
        // Check if we got meaningful data
        const hasData = Object.values(productData).some(
          (value) => value !== undefined && value !== null && value !== ''
        );

        if (hasData) {
          return NextResponse.json({ success: true, data: productData });
        }
      } catch (error) {
        const apiError = error as ApiError;
        console.error('Gemini Vision API failed:', error);
        
        // Handle authentication errors (401/403)
        if (apiError.status === 401 || apiError.status === 403) {
          return NextResponse.json(
            { 
              error: 'Gemini API authentication failed. Please check your API key.',
              code: 'auth_failed'
            },
            { status: 401 }
          );
        }
        
        // Return helpful error message for quota errors
        if (apiError.status === 429 || apiError.code === 'insufficient_quota' || apiError.code === 'RESOURCE_EXHAUSTED') {
          return NextResponse.json(
            { 
              error: 'Gemini API quota exceeded. Please check your billing or try again later.',
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
    
    // Handle authentication errors (401/403)
    if (apiError.status === 401 || apiError.status === 403) {
      return NextResponse.json(
        { 
          error: 'Gemini API authentication failed. Please check your API key.',
          code: 'auth_failed'
        },
        { status: 401 }
      );
    }
    
    // Handle quota errors
    if (apiError.status === 429 || apiError.code === 'insufficient_quota' || apiError.code === 'RESOURCE_EXHAUSTED') {
      return NextResponse.json(
        { 
          error: 'Gemini API quota exceeded. Please check your billing or try again later.',
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


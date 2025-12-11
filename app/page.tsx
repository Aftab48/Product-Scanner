'use client';

import { useState, Suspense, useEffect } from 'react';
import { ProductData } from '@/lib/productParser';
import { compressImage } from '@/lib/imageUtils';
import { extractText, cleanupOCRWorker } from '@/lib/ocr';
import dynamic from 'next/dynamic';

// Lazy load camera component for better performance
const CameraCapture = dynamic(() => import('@/components/CameraCapture'), {
  ssr: false,
  loading: () => (
    <div className="w-full p-8 bg-gray-100 rounded-lg text-center">
      <p className="text-gray-600">Loading camera...</p>
    </div>
  ),
});

import ImageUpload from '@/components/ImageUpload';
import ProductResults from '@/components/ProductResults';

type ViewMode = 'camera' | 'upload';

export default function Home() {
  const [viewMode, setViewMode] = useState<ViewMode>('camera');
  const [isScanning, setIsScanning] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [productData, setProductData] = useState<ProductData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Cleanup OCR worker on unmount
  useEffect(() => {
    return () => {
      cleanupOCRWorker();
    };
  }, []);

  const handleImageCapture = async (file: File) => {
    await processImage(file);
  };

  const handleImageUpload = async (file: File) => {
    await processImage(file);
  };

  const processImage = async (file: File) => {
    setIsScanning(true);
    setError(null);
    setProductData(null);
    setOcrProgress(0);

    try {
      // Compress image for mobile optimization
      const compressedFile = await compressImage(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      });

      // Strategy 1: Try client-side OCR first (lightweight, free)
      let ocrText: string | null = null;
      try {
        setOcrProgress(10);
        ocrText = await extractText(compressedFile);
        setOcrProgress(50);
        
        if (ocrText && ocrText.trim().length > 0) {
          // Send OCR text AND image to server for AI parsing (image needed for fallback)
          const formData = new FormData();
          formData.append('ocrText', ocrText);
          formData.append('image', compressedFile); // Include image for Vision API fallback
          
          setOcrProgress(60);
          const response = await fetch('/api/scan', {
            method: 'POST',
            body: formData,
          });

          if (response.ok) {
            const result = await response.json();
            if (result.success) {
              setOcrProgress(100);
              setProductData(result.data);
              // Show warning if quota exceeded
              if (result.code === 'quota_exceeded' && result.message) {
                setError(result.message);
              }
              return;
            }
          } else {
            const errorData = await response.json();
            // If quota exceeded, fall through to Vision API
            if (errorData.code !== 'quota_exceeded') {
              throw new Error(errorData.error || 'Failed to parse product data');
            }
          }
        }
      } catch (ocrError) {
        console.log('Client-side OCR failed or insufficient, trying Vision API:', ocrError);
        // Fall through to Vision API
      }

      // Strategy 2: Fallback to OpenAI Vision API (more accurate)
      setOcrProgress(60);
      const formData = new FormData();
      formData.append('image', compressedFile);

      const response = await fetch('/api/scan', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to scan product');
      }

      const result = await response.json();
      setOcrProgress(100);
      
      if (result.success) {
        setProductData(result.data);
      } else {
        throw new Error(result.error || 'Failed to extract product information');
      }
    } catch (err) {
      console.error('Error processing image:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to process image. Please try again.'
      );
    } finally {
      setIsScanning(false);
      setOcrProgress(0);
    }
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
  };

  const resetScan = () => {
    setProductData(null);
    setError(null);
    setIsScanning(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            AI Product Scanner
          </h1>
          <p className="text-gray-600">
            Scan product labels to extract detailed information instantly
          </p>
        </div>

        {/* Mode Toggle */}
        {!productData && (
          <div className="flex gap-4 mb-6 justify-center">
            <button
              onClick={() => {
                setViewMode('camera');
                resetScan();
              }}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                viewMode === 'camera'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              📷 Camera
            </button>
            <button
              onClick={() => {
                setViewMode('upload');
                resetScan();
              }}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                viewMode === 'upload'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              📤 Upload Image
            </button>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
            <button
              onClick={resetScan}
              className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Scanner Components */}
        {!productData && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            {viewMode === 'camera' ? (
              <Suspense
                fallback={
                  <div className="w-full p-8 bg-gray-100 rounded-lg text-center">
                    <p className="text-gray-600">Loading camera...</p>
                  </div>
                }
              >
                <CameraCapture
                  onCapture={handleImageCapture}
                  onError={handleError}
                />
              </Suspense>
            ) : (
              <ImageUpload onUpload={handleImageUpload} onError={handleError} />
            )}
          </div>
        )}

        {/* Loading State */}
        {isScanning && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <ProductResults data={{}} isLoading={true} />
            {ocrProgress > 0 && (
              <div className="mt-4">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Processing...</span>
                  <span>{ocrProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${ocrProgress}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Results */}
        {productData && !isScanning && (
          <div className="space-y-4">
            <ProductResults data={productData} />
            <div className="flex gap-4 justify-center">
              <button
                onClick={resetScan}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Scan Another Product
              </button>
            </div>
          </div>
        )}

        {/* Info Footer */}
        <div className="mt-12 text-center text-sm text-gray-500">
          <p>
            Point your camera at the back of a product or upload an image to
            extract product details
          </p>
        </div>
      </main>
    </div>
  );
}

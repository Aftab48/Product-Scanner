/**
 * Client-side OCR utilities using Tesseract.js
 * This runs in the browser for better performance
 */

import Tesseract from 'tesseract.js';

// Cache worker for better performance
let worker: Tesseract.Worker | null = null;

/**
 * Initialize Tesseract worker
 */
export async function initOCRWorker(): Promise<Tesseract.Worker> {
  if (!worker) {
    worker = await Tesseract.createWorker('eng', 1, {
      logger: (m) => {
        // Only log progress for debugging
        if (process.env.NODE_ENV === 'development') {
          if (m.status === 'recognizing text') {
            console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
          }
        }
      },
    });
  }
  return worker;
}

/**
 * Extract text from image using Tesseract.js
 * @param imageFile - Image file to process
 * @returns Extracted text
 */
export async function extractText(imageFile: File): Promise<string> {
  try {
    const worker = await initOCRWorker();
    
    const {
      data: { text },
    } = await worker.recognize(imageFile);

    return text.trim();
  } catch (error) {
    console.error('OCR extraction failed:', error);
    throw new Error('Failed to extract text from image');
  }
}

/**
 * Cleanup OCR worker (call when done)
 */
export async function cleanupOCRWorker() {
  if (worker) {
    await worker.terminate();
    worker = null;
  }
}

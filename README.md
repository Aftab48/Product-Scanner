# AI Product Scanner

A lightweight, mobile-optimized AI-powered product scanner that extracts detailed information from product labels. Simply point your camera at the back of a product or upload an image to get instant product details including name, company, ingredients, expiry date, MRP, and more.

## Features

- 📷 **Camera Capture** - Take photos directly from your device camera
- 📤 **Image Upload** - Upload images from your device
- 🤖 **AI-Powered OCR** - Hybrid approach using Tesseract.js and OpenAI Vision API
- 📱 **Mobile Optimized** - Lightweight and works on low-end mobile devices
- ⚡ **Fast Processing** - Image compression and optimized workflows
- 🎯 **Structured Data** - Extracts product name, company, ingredients, expiry, MRP, and more

## Getting Started

### Prerequisites

- Node.js 18+ and pnpm (or npm/yarn)
- OpenAI API key (optional but recommended for better accuracy)

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd ai-product-scanner
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables (optional):
```bash
# Create .env.local file
echo "OPENROUTER_API_KEY=your_openrouter_api_key_here" > .env.local
```

**Note:** The app uses OpenRouter with GPT-4o mini by default. An API key is already configured, but you can override it by setting `OPENROUTER_API_KEY` in your `.env.local` file. Get your API key from [OpenRouter](https://openrouter.ai/keys).

### Running the Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Building for Production

```bash
pnpm build
pnpm start
```

## How It Works

1. **Image Capture/Upload**: User takes a photo or uploads an image of a product label
2. **Image Compression**: Image is compressed on the client side for faster processing
3. **OCR Processing**: 
   - Primary: Client-side Tesseract.js OCR (lightweight, free, runs in browser)
   - Fallback: OpenAI Vision API (if API key is configured) - most accurate
4. **AI Parsing**: Extracted text is sent to server and parsed using OpenAI GPT-4 to extract structured product data
5. **Results Display**: Product information is displayed in a clean, organized format

**Note**: OpenRouter API key is used for AI parsing (default key is configured). The app will use client-side OCR first, then send the extracted text to the server for AI parsing via OpenRouter's GPT-4o mini. If OCR fails or quota is exceeded, it falls back to OpenRouter Vision API.

## Mobile Optimizations

- Image compression before upload (reduces file size)
- Lazy loading for camera components
- Progressive image loading
- Touch-friendly UI with proper tap targets
- Responsive design for all screen sizes
- Minimal bundle size with code splitting

## Project Structure

```
app/
  page.tsx                    # Main scanner UI
  api/
    scan/
      route.ts               # API endpoint for image processing
lib/
  productParser.ts           # AI text parsing logic
  imageUtils.ts              # Image compression/processing utilities
components/
  CameraCapture.tsx          # Camera component
  ImageUpload.tsx            # Upload component
  ProductResults.tsx         # Results display component
```

## Technologies Used

- **Next.js 16** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Tesseract.js** - OCR text extraction
- **OpenRouter** - GPT-4o mini for AI parsing (via OpenAI-compatible API)
- **browser-image-compression** - Client-side image compression

## Environment Variables

- `OPENROUTER_API_KEY` - Your OpenRouter API key (optional, defaults to configured key)

## License

MIT

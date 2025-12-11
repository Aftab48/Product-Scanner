import OpenAI from 'openai';
import { z } from 'zod';

// Helper function to flatten nested data structure from AI
function flattenNestedData(data: Record<string, unknown>): Record<string, unknown> {
  // If data is already flat (has top-level 'name' or 'company'), return as-is
  if (data.name || data.company || (!data['Basic Information'] && !data['Dates & Batch'])) {
    return data;
  }
  
  // Flatten nested structure
  const flattened: Record<string, unknown> = {};
  
  // Basic Information
  if (data['Basic Information']) {
    Object.assign(flattened, data['Basic Information']);
  }
  
  // Dates & Batch
  if (data['Dates & Batch']) {
    Object.assign(flattened, data['Dates & Batch']);
  }
  
  // Ingredients & Nutrition
  const ingredientsNutrition = data['Ingredients & Nutrition'] as Record<string, unknown> | undefined;
  if (ingredientsNutrition) {
    if (ingredientsNutrition.ingredients) {
      flattened.ingredients = ingredientsNutrition.ingredients as string[];
    }
    if (ingredientsNutrition.nutritionalInfo) {
      flattened.nutritionalInfo = ingredientsNutrition.nutritionalInfo as ProductData['nutritionalInfo'];
    }
  }
  
  // Manufacturing & Regulatory
  const manufacturing = data['Manufacturing & Regulatory'] as Record<string, unknown> | undefined;
  if (manufacturing) {
    if (manufacturing.manufacturingAddresses) {
      flattened.manufacturingAddresses = manufacturing.manufacturingAddresses as string[];
    }
    if (manufacturing.fssaiLicense) {
      // Handle array or single value
      flattened.fssaiLicense = Array.isArray(manufacturing.fssaiLicense)
        ? (manufacturing.fssaiLicense as string[]).join(', ')
        : String(manufacturing.fssaiLicense);
    }
    if (manufacturing.vegetarian) {
      flattened.vegetarian = String(manufacturing.vegetarian);
    }
  }
  
  // Contact Information
  const contactInfo = data['Contact Information'] as Record<string, unknown> | undefined;
  if (contactInfo && contactInfo.consumerContact) {
    flattened.consumerContact = contactInfo.consumerContact as ProductData['consumerContact'];
  }
  
  // Other Details
  const otherDetails = data['Other Details'] as Record<string, unknown> | undefined;
  if (otherDetails && otherDetails.otherDetails) {
    flattened.otherDetails = otherDetails.otherDetails as Record<string, string>;
  }
  
  return flattened;
}

// Schema for product data structure
// Using nullish().transform() to accept null/undefined and normalize to undefined
const nullishString = () => z.string().nullish().transform(val => val ?? undefined);
const nullishArray = () => z.array(z.string()).nullish().transform(val => val ?? undefined);
const nullishRecord = () => z.record(z.string(), z.string()).nullish().transform(val => val ?? undefined);

export const ProductSchema = z.object({
  name: nullishString(),
  company: nullishString(),
  manufacturer: nullishString(),
  ingredients: nullishArray(),
  expiryDate: nullishString(),
  bestBefore: nullishString(),
  mrp: nullishString(),
  price: nullishString(),
  netWeight: nullishString(),
  batchNumber: nullishString(),
  manufacturingDate: nullishString(),
  barcode: nullishString(),
  // Nutritional information
  nutritionalInfo: z.object({
    energy: nullishString(),
    protein: nullishString(),
    totalCarbohydrate: nullishString(),
    sugars: nullishString(),
    totalFat: nullishString(),
    saturatedFat: nullishString(),
    transFat: nullishString(),
    sodium: nullishString(),
    servingSize: nullishString(),
  }).nullish().transform(val => val ?? undefined),
  // Manufacturing and regulatory
  manufacturingAddresses: nullishArray(),
  fssaiLicense: nullishString(),
  // Contact information
  consumerContact: z.object({
    phone: nullishString(),
    email: nullishString(),
    address: nullishString(),
    website: nullishString(),
  }).nullish().transform(val => val ?? undefined),
  // Additional details
  vegetarian: nullishString(), // "Yes" or "No" or vegetarian symbol info
  trademark: nullishString(),
  otherDetails: nullishRecord(),
});

export type ProductData = z.infer<typeof ProductSchema>;


/**
 * Parse OCR text using OpenRouter (GPT-4o mini) to extract structured product information
 */
export async function parseProductText(
  ocrText: string,
  apiKey?: string
): Promise<ProductData> {
  if (!apiKey) {
    throw new Error('OpenRouter API key is required');
  }

  const openai = new OpenAI({
    apiKey: apiKey,
    baseURL: 'https://openrouter.ai/api/v1',
    defaultHeaders: {
      'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'https://localhost:3000',
    },
  });

  const prompt = `Extract comprehensive product information from the following text extracted from a product label. 
Return a JSON object with the following fields (use null for missing values):

**Basic Information:**
- name: Product name
- company: Company or brand name
- manufacturer: Manufacturer name (if different from company)
- trademark: Trademark information
- barcode: Barcode or product code
- netWeight: Net weight/quantity
- mrp: Maximum Retail Price (MRP)
- price: Current price if different from MRP

**Dates & Batch:**
- expiryDate: Expiry date in YYYY-MM-DD format if available
- bestBefore: Best before information (e.g., "SIX MONTHS FROM MANUFACTURE")
- manufacturingDate: Manufacturing date in YYYY-MM-DD format if available
- batchNumber: Batch or lot number

**Ingredients & Nutrition:**
- ingredients: Array of all ingredient names
- nutritionalInfo: Object with nutritional values:
  - energy: Energy value (e.g., "555 kcal")
  - protein: Protein content
  - totalCarbohydrate: Total carbohydrates
  - sugars: Sugar content
  - totalFat: Total fat content
  - saturatedFat: Saturated fat
  - transFat: Trans fat
  - sodium: Sodium content
  - servingSize: Serving size (e.g., "Per 100g")

**Manufacturing & Regulatory:**
- manufacturingAddresses: Array of manufacturing unit addresses
- fssaiLicense: FSSAI license number(s)
- vegetarian: Vegetarian status ("Yes", "No", or description)

**Contact Information:**
- consumerContact: Object with:
  - phone: Consumer helpline/phone number
  - email: Consumer email address
  - address: Consumer service address
  - website: Company website URL

**Other Details:**
- otherDetails: Object with any other relevant information (key-value pairs)

Extract ALL available information from the text. Be thorough and include nutritional facts, addresses, contact details, and any regulatory information.

Text to parse:
${ocrText}

Return ONLY valid JSON, no additional text or markdown formatting.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'openai/gpt-4o-mini', // OpenRouter model format
      messages: [
        {
          role: 'system',
          content:
            'You are a product information extraction assistant. Extract structured data from product labels and return valid JSON only.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenRouter');
    }

    // Parse JSON response
    const parsed = JSON.parse(content);
    
    // Log the raw parsed data for debugging
    console.log('Raw parsed data from AI:', JSON.stringify(parsed, null, 2));
    
    // Flatten nested structure if AI returned categorized data
    const flattened = flattenNestedData(parsed);
    
    // Use safeParse to handle validation errors gracefully
    const validationResult = ProductSchema.safeParse(flattened);
    
    if (validationResult.success) {
      return validationResult.data;
    } else {
      // Log validation errors but still return partial data
      console.warn('Schema validation warnings:', validationResult.error.issues);
      
      // Return flattened data with defaults for missing fields
      // Cast flattened to ProductData to access properties safely
      const flat = flattened as Partial<ProductData>;
      return {
        name: (flat.name as string | undefined) ?? undefined,
        company: (flat.company as string | undefined) ?? undefined,
        manufacturer: (flat.manufacturer as string | undefined) ?? undefined,
        ingredients: (flat.ingredients as string[] | undefined) ?? undefined,
        expiryDate: (flat.expiryDate as string | undefined) ?? undefined,
        bestBefore: (flat.bestBefore as string | undefined) ?? undefined,
        mrp: (flat.mrp as string | undefined) ?? undefined,
        price: (flat.price as string | undefined) ?? undefined,
        netWeight: (flat.netWeight as string | undefined) ?? undefined,
        batchNumber: (flat.batchNumber as string | undefined) ?? undefined,
        manufacturingDate: (flat.manufacturingDate as string | undefined) ?? undefined,
        barcode: (flat.barcode as string | undefined) ?? undefined,
        nutritionalInfo: flat.nutritionalInfo,
        manufacturingAddresses: (flat.manufacturingAddresses as string[] | undefined) ?? undefined,
        fssaiLicense: (flat.fssaiLicense as string | undefined) ?? undefined,
        consumerContact: flat.consumerContact,
        vegetarian: (flat.vegetarian as string | undefined) ?? undefined,
        trademark: (flat.trademark as string | undefined) ?? undefined,
        otherDetails: (flat.otherDetails as Record<string, string> | undefined) ?? undefined,
      };
    }
  } catch (error) {
    console.error('Error parsing product text:', error);
    
    // Return empty structure if parsing fails
    return {
      name: undefined,
      company: undefined,
      manufacturer: undefined,
      ingredients: undefined,
      expiryDate: undefined,
      bestBefore: undefined,
      mrp: undefined,
      price: undefined,
      netWeight: undefined,
      batchNumber: undefined,
      manufacturingDate: undefined,
      barcode: undefined,
      nutritionalInfo: undefined,
      manufacturingAddresses: undefined,
      fssaiLicense: undefined,
      consumerContact: undefined,
      vegetarian: undefined,
      trademark: undefined,
      otherDetails: undefined,
    };
  }
}

/**
 * Alternative: Parse using OpenRouter Vision API directly from image
 * This can be used as a fallback or primary method
 */
export async function parseProductImage(
  imageBase64: string,
  mimeType: string,
  apiKey?: string
): Promise<ProductData> {
  if (!apiKey) {
    throw new Error('OpenRouter API key is required');
  }

  const openai = new OpenAI({
    apiKey: apiKey,
    baseURL: 'https://openrouter.ai/api/v1',
    defaultHeaders: {
      'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'https://localhost:3000',
    },
  });

  try {
    const response = await openai.chat.completions.create({
      model: 'openai/gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are a product information extraction assistant. Analyze product label images and extract structured data. Return valid JSON only.',
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Extract comprehensive product information from this product label image. 
Return a JSON object with ALL available information including:
- Basic: name, company, manufacturer, trademark, barcode, netWeight, mrp, price
- Dates: expiryDate, bestBefore, manufacturingDate, batchNumber
- Ingredients: ingredients (array)
- Nutrition: nutritionalInfo object (energy, protein, totalCarbohydrate, sugars, totalFat, saturatedFat, transFat, sodium, servingSize)
- Manufacturing: manufacturingAddresses (array), fssaiLicense, vegetarian
- Contact: consumerContact object (phone, email, address, website)
- Other: otherDetails (object)

Extract ALL visible information including nutritional facts, addresses, contact details, and regulatory information. Use null for missing values. Return ONLY valid JSON.`,
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${imageBase64}`,
              },
            },
          ],
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 1000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenRouter');
    }

    const parsed = JSON.parse(content);
    
    // Log the raw parsed data for debugging
    console.log('Raw parsed data from AI (Vision):', JSON.stringify(parsed, null, 2));
    
    // Flatten nested structure if AI returned categorized data
    const flattened = flattenNestedData(parsed);
    
    // Use safeParse to handle validation errors gracefully
    const validationResult = ProductSchema.safeParse(flattened);
    
    if (validationResult.success) {
      return validationResult.data;
    } else {
      // Log validation errors but still return partial data
      console.warn('Schema validation warnings (Vision):', validationResult.error.issues);
      
      // Return flattened data with defaults for missing fields
      // Cast flattened to ProductData to access properties safely
      const flat = flattened as Partial<ProductData>;
      return {
        name: (flat.name as string | undefined) ?? undefined,
        company: (flat.company as string | undefined) ?? undefined,
        manufacturer: (flat.manufacturer as string | undefined) ?? undefined,
        ingredients: (flat.ingredients as string[] | undefined) ?? undefined,
        expiryDate: (flat.expiryDate as string | undefined) ?? undefined,
        bestBefore: (flat.bestBefore as string | undefined) ?? undefined,
        mrp: (flat.mrp as string | undefined) ?? undefined,
        price: (flat.price as string | undefined) ?? undefined,
        netWeight: (flat.netWeight as string | undefined) ?? undefined,
        batchNumber: (flat.batchNumber as string | undefined) ?? undefined,
        manufacturingDate: (flat.manufacturingDate as string | undefined) ?? undefined,
        barcode: (flat.barcode as string | undefined) ?? undefined,
        nutritionalInfo: flat.nutritionalInfo,
        manufacturingAddresses: (flat.manufacturingAddresses as string[] | undefined) ?? undefined,
        fssaiLicense: (flat.fssaiLicense as string | undefined) ?? undefined,
        consumerContact: flat.consumerContact,
        vegetarian: (flat.vegetarian as string | undefined) ?? undefined,
        trademark: (flat.trademark as string | undefined) ?? undefined,
        otherDetails: (flat.otherDetails as Record<string, string> | undefined) ?? undefined,
      };
    }
  } catch (error) {
    console.error('Error parsing product image:', error);
    return {
      name: undefined,
      company: undefined,
      manufacturer: undefined,
      ingredients: undefined,
      expiryDate: undefined,
      bestBefore: undefined,
      mrp: undefined,
      price: undefined,
      netWeight: undefined,
      batchNumber: undefined,
      manufacturingDate: undefined,
      barcode: undefined,
      nutritionalInfo: undefined,
      manufacturingAddresses: undefined,
      fssaiLicense: undefined,
      consumerContact: undefined,
      vegetarian: undefined,
      trademark: undefined,
      otherDetails: undefined,
    };
  }
}


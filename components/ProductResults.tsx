'use client';

import { ProductData } from '@/lib/productParser';

interface ProductResultsData extends ProductData {
  rawText?: string;
}

interface ProductResultsProps {
  data: ProductResultsData;
  isLoading?: boolean;
}

export default function ProductResults({ data, isLoading }: ProductResultsProps) {
  if (isLoading) {
    return (
      <div className="w-full p-8 bg-white rounded-lg shadow-md">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="ml-4 text-gray-600">Scanning product...</p>
        </div>
      </div>
    );
  }

  const hasData = Object.values(data).some(
    (value) => value !== undefined && value !== null && value !== ''
  );

  // Check if we have rawText (from OCR when quota exceeded)
  const rawText = data.rawText;

  if (!hasData && !rawText) {
    return (
      <div className="w-full p-8 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-yellow-800 text-center">
          No product information could be extracted. Please try again with a clearer image.
        </p>
      </div>
    );
  }

  // Show raw OCR text if that's all we have
  if (rawText && !hasData) {
    return (
      <div className="w-full bg-white rounded-lg shadow-md overflow-hidden">
        <div className="bg-yellow-600 text-white px-6 py-4">
          <h2 className="text-xl font-semibold">Raw OCR Text</h2>
          <p className="text-sm mt-1 opacity-90">
            OpenRouter API quota exceeded. Showing raw extracted text.
          </p>
        </div>
        <div className="p-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono">
              {rawText}
            </pre>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-white rounded-lg shadow-md overflow-hidden">
      <div className="bg-blue-600 text-white px-6 py-4">
        <h2 className="text-xl font-semibold">Product Information</h2>
      </div>

      <div className="p-6 space-y-4">
        {data.name && (
          <div>
            <h3 className="text-sm font-medium text-gray-500 uppercase">Product Name</h3>
            <p className="text-lg font-semibold text-gray-900 mt-1">{data.name}</p>
          </div>
        )}

        {(data.company || data.manufacturer) && (
          <div>
            <h3 className="text-sm font-medium text-gray-500 uppercase">
              {data.company ? 'Company' : 'Manufacturer'}
            </h3>
            <p className="text-lg text-gray-900 mt-1">
              {data.company || data.manufacturer}
            </p>
          </div>
        )}

        {data.mrp && (
          <div>
            <h3 className="text-sm font-medium text-gray-500 uppercase">MRP</h3>
            <p className="text-lg font-semibold text-green-600 mt-1">{data.mrp}</p>
          </div>
        )}

        {data.price && data.price !== data.mrp && (
          <div>
            <h3 className="text-sm font-medium text-gray-500 uppercase">Price</h3>
            <p className="text-lg text-gray-900 mt-1">{data.price}</p>
          </div>
        )}

        {data.netWeight && (
          <div>
            <h3 className="text-sm font-medium text-gray-500 uppercase">Net Weight</h3>
            <p className="text-lg text-gray-900 mt-1">{data.netWeight}</p>
          </div>
        )}

        {data.expiryDate && (
          <div>
            <h3 className="text-sm font-medium text-gray-500 uppercase">Expiry Date</h3>
            <p className="text-lg text-gray-900 mt-1">{data.expiryDate}</p>
          </div>
        )}

        {data.manufacturingDate && (
          <div>
            <h3 className="text-sm font-medium text-gray-500 uppercase">
              Manufacturing Date
            </h3>
            <p className="text-lg text-gray-900 mt-1">{data.manufacturingDate}</p>
          </div>
        )}

        {data.batchNumber && (
          <div>
            <h3 className="text-sm font-medium text-gray-500 uppercase">Batch Number</h3>
            <p className="text-lg text-gray-900 mt-1">{data.batchNumber}</p>
          </div>
        )}

        {data.barcode && (
          <div>
            <h3 className="text-sm font-medium text-gray-500 uppercase">Barcode</h3>
            <p className="text-lg text-gray-900 mt-1 font-mono">{data.barcode}</p>
          </div>
        )}

        {data.trademark && (
          <div>
            <h3 className="text-sm font-medium text-gray-500 uppercase">Trademark</h3>
            <p className="text-lg text-gray-900 mt-1">{data.trademark}</p>
          </div>
        )}

        {data.bestBefore && (
          <div>
            <h3 className="text-sm font-medium text-gray-500 uppercase">Best Before</h3>
            <p className="text-lg text-gray-900 mt-1">{data.bestBefore}</p>
          </div>
        )}

        {data.vegetarian && (
          <div>
            <h3 className="text-sm font-medium text-gray-500 uppercase">Vegetarian</h3>
            <p className="text-lg text-gray-900 mt-1">{data.vegetarian}</p>
          </div>
        )}

        {data.ingredients && data.ingredients.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-500 uppercase">Ingredients</h3>
            <ul className="mt-2 space-y-1">
              {data.ingredients.map((ingredient, index) => (
                <li key={index} className="text-gray-900">
                  • {ingredient}
                </li>
              ))}
            </ul>
          </div>
        )}

        {data.nutritionalInfo && (
          <div>
            <h3 className="text-sm font-medium text-gray-500 uppercase">Nutritional Information</h3>
            <div className="mt-2 space-y-2 bg-gray-50 rounded-lg p-4">
              {data.nutritionalInfo.energy && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Energy:</span>
                  <span className="text-gray-900 font-medium">{data.nutritionalInfo.energy}</span>
                </div>
              )}
              {data.nutritionalInfo.protein && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Protein:</span>
                  <span className="text-gray-900 font-medium">{data.nutritionalInfo.protein}</span>
                </div>
              )}
              {data.nutritionalInfo.totalCarbohydrate && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Carbohydrate:</span>
                  <span className="text-gray-900 font-medium">{data.nutritionalInfo.totalCarbohydrate}</span>
                </div>
              )}
              {data.nutritionalInfo.sugars && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Sugars:</span>
                  <span className="text-gray-900 font-medium">{data.nutritionalInfo.sugars}</span>
                </div>
              )}
              {data.nutritionalInfo.totalFat && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Fat:</span>
                  <span className="text-gray-900 font-medium">{data.nutritionalInfo.totalFat}</span>
                </div>
              )}
              {data.nutritionalInfo.saturatedFat && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Saturated Fat:</span>
                  <span className="text-gray-900 font-medium">{data.nutritionalInfo.saturatedFat}</span>
                </div>
              )}
              {data.nutritionalInfo.transFat && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Trans Fat:</span>
                  <span className="text-gray-900 font-medium">{data.nutritionalInfo.transFat}</span>
                </div>
              )}
              {data.nutritionalInfo.sodium && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Sodium:</span>
                  <span className="text-gray-900 font-medium">{data.nutritionalInfo.sodium}</span>
                </div>
              )}
              {data.nutritionalInfo.servingSize && (
                <div className="text-xs text-gray-500 mt-2">
                  {data.nutritionalInfo.servingSize}
                </div>
              )}
            </div>
          </div>
        )}

        {data.manufacturingAddresses && data.manufacturingAddresses.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-500 uppercase">Manufacturing Addresses</h3>
            <ul className="mt-2 space-y-2">
              {data.manufacturingAddresses.map((address, index) => (
                <li key={index} className="text-gray-900 text-sm">
                  {index + 1}. {address}
                </li>
              ))}
            </ul>
          </div>
        )}

        {data.fssaiLicense && (
          <div>
            <h3 className="text-sm font-medium text-gray-500 uppercase">FSSAI License</h3>
            <p className="text-lg text-gray-900 mt-1 font-mono">{data.fssaiLicense}</p>
          </div>
        )}

        {data.consumerContact && (
          <div>
            <h3 className="text-sm font-medium text-gray-500 uppercase">Consumer Contact</h3>
            <div className="mt-2 space-y-2">
              {data.consumerContact.phone && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Phone:</span>
                  <span className="text-gray-900 font-medium">{data.consumerContact.phone}</span>
                </div>
              )}
              {data.consumerContact.email && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Email:</span>
                  <span className="text-gray-900 font-medium">{data.consumerContact.email}</span>
                </div>
              )}
              {data.consumerContact.website && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Website:</span>
                  <a href={data.consumerContact.website.startsWith('http') ? data.consumerContact.website : `https://${data.consumerContact.website}`} 
                     target="_blank" 
                     rel="noopener noreferrer"
                     className="text-blue-600 hover:underline font-medium">
                    {data.consumerContact.website}
                  </a>
                </div>
              )}
              {data.consumerContact.address && (
                <div className="mt-2">
                  <span className="text-gray-600 block mb-1">Address:</span>
                  <p className="text-gray-900 text-sm">{data.consumerContact.address}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {data.otherDetails && Object.keys(data.otherDetails).length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-500 uppercase">Other Details</h3>
            <div className="mt-2 space-y-2">
              {(Object.entries(data.otherDetails) as [string, string][]).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="text-gray-600 capitalize">{key}:</span>
                  <span className="text-gray-900 font-medium">{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


import React, { useState, useRef } from 'react';
import { useSearchParams, useNavigate, useParams } from 'react-router-dom';
import { apiClient } from '../lib/api';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/gif'];

export default function DesignEditorPage() {
  const [searchParams] = useSearchParams();
  const { designId: routeDesignId } = useParams();
  const navigate = useNavigate();
  const productId = searchParams.get('productId');
  const variantId = searchParams.get('variantId');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [designName, setDesignName] = useState('My Design');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [design, setDesign] = useState<any>(null);
  const [mockup, setMockup] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [generatingMockup, setGeneratingMockup] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mockupRetries, setMockupRetries] = useState(0);
  const [storeId] = useState('default');
  const [assets, setAssets] = useState<any[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  React.useEffect(() => {
    (async () => {
      if (!routeDesignId) return;
      try {
        const existing = await apiClient.getDesign(routeDesignId);
        setDesign(existing);
        setDesignName(existing.name || 'My Design');
        const list = await apiClient.listDesignAssets(routeDesignId);
        setAssets(list || []);
        if (list?.[0]?.url) setUploadedImage(list[0].url);
      } catch {
        // keep editor usable for new design flow
      }
    })();
  }, [routeDesignId]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validation
    if (file.size > MAX_FILE_SIZE) {
      setError(`File too large. Maximum size is 5MB (got ${(file.size / 1024 / 1024).toFixed(2)}MB)`);
      return;
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError(`Invalid file type. Allowed: PNG, JPG, GIF (got ${file.type})`);
      return;
    }

    setError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadedImage(event.target?.result as string);
    };
    reader.onerror = () => {
      setError('Failed to read file');
    };
    reader.readAsDataURL(file);
    setSelectedFile(file);
  };

  const handleSaveDesign = async () => {
    if (!uploadedImage) {
      setError('Please upload an image first');
      return;
    }

    if (!designName.trim()) {
      setError('Please enter a design name');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const existingId = routeDesignId || design?.id;
      const saved = existingId
        ? await apiClient.updateDesign(existingId, { layers: [], canvas: { width: 800, height: 600 } }, designName.trim())
        : await apiClient.createDesign({
            name: designName.trim(),
            description: 'Custom design',
            content: { layers: [], canvas: { width: 800, height: 600 } },
          });
      setDesign(saved);

      if (selectedFile) {
        await apiClient.uploadDesignAsset(saved.id, storeId, selectedFile);
        const list = await apiClient.listDesignAssets(saved.id);
        setAssets(list || []);
        if (list?.[0]?.url) setUploadedImage(list[0].url);
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to save design. Please try again.');
      console.error('Design save error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateMockup = async (retryCount = 0) => {
    if (!design?.id || !variantId) {
      setError('Design or variant not found');
      return;
    }
    
    setGeneratingMockup(true);
    setError(null);
    try {
      const newMockup = await apiClient.renderDesignMockup(design.id, variantId);
      setMockup(newMockup);
      setMockupRetries(0);
    } catch (err: any) {
      const errorMsg = err?.response?.data?.error || 'Failed to generate mockup';
      setError(`${errorMsg}. ${retryCount < 3 ? 'Click retry to try again.' : ''}`);
      setMockupRetries(retryCount);
      console.error('Mockup generation error:', err);
    } finally {
      setGeneratingMockup(false);
    }
  };

  const handleRetry = () => {
    if (mockupRetries < 3) {
      handleGenerateMockup(mockupRetries + 1);
    } else {
      setError('Max retries reached. Please contact support.');
    }
  };

  const handleAddToCart = async () => {
    if (!design?.id || !variantId || !mockup?.id) {
      setError('Design or mockup not ready');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Add to cart
      navigate(`/cart?message=Added+to+cart`);
    } catch (err: any) {
      setError('Failed to add to cart');
      console.error('Add to cart error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Design Your Product</h1>
      <div className="grid grid-cols-3 gap-8">
        <div className="col-span-2">
          <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg h-96 flex items-center justify-center">
            {uploadedImage ? (
              <img src={uploadedImage} alt="Design" className="max-h-full max-w-full" />
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg"
              >
                Upload Image
              </button>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
        </div>
        <div className="space-y-4">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
              {error}
              {mockupRetries > 0 && mockupRetries < 3 && (
                <button
                  onClick={handleRetry}
                  className="ml-2 underline font-semibold"
                >
                  Retry
                </button>
              )}
            </div>
          )}
          <input
            type="text"
            value={designName}
            onChange={(e) => setDesignName(e.target.value)}
            placeholder="Design name"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          />
          <button
            onClick={handleSaveDesign}
            disabled={loading || !uploadedImage}
            className="w-full bg-green-600 text-white py-2 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Design'}
          </button>
          {design && (
            <>
              <button
                onClick={() => handleGenerateMockup(0)}
                disabled={generatingMockup}
                className="w-full bg-purple-600 text-white py-2 rounded-lg font-semibold hover:bg-purple-700 disabled:opacity-50"
              >
                {generatingMockup ? 'Generating mockup...' : 'Generate Mockup'}
              </button>
              {mockup && (
                <button
                  onClick={handleAddToCart}
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Adding...' : 'Add to Cart'}
                </button>
              )}
            </>
          )}
          {assets.length > 0 && (
            <div className="rounded border border-slate-200 p-2 text-xs">
              <div className="font-medium mb-1">Assets</div>
              {assets.map((asset) => (
                <a key={asset.id} href={asset.url} target="_blank" rel="noreferrer" className="block text-blue-600 underline">
                  {asset.fileName}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

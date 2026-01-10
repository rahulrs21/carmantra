'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { addProduct, updateProduct, Product } from '@/lib/firestore/products';
import { safeConsoleError } from '@/lib/safeConsole';
import { ChevronLeft } from 'lucide-react';

export default function ProductEditPage() {
  const params = useParams();
  const router = useRouter();
  const categoryId = params?.categoryId as string;
  const productId = params?.productId as string;
  const isNew = productId === 'new';

  const [formData, setFormData] = useState<Omit<Product, 'id' | 'createdAt' | 'updatedAt'>>({
    categoryId,
    name: '',
    description: '',
    price: '',
    warranty: '',
    duration: '',
  });
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isNew) {
      loadProduct();
    }
  }, [productId, isNew]);

  const loadProduct = async () => {
    try {
      setLoading(true);
      const docSnap = await getDoc(doc(db, 'products', productId));
      if (docSnap.exists()) {
        const data = docSnap.data() as Product;
        setFormData({
          categoryId: data.categoryId,
          name: data.name,
          description: data.description,
          price: data.price,
          warranty: data.warranty,
          duration: data.duration,
        });
      } else {
        setError('Product not found');
      }
    } catch (err: any) {
      safeConsoleError('Error loading product:', err);
      setError('Failed to load product');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.price || !formData.duration || !formData.warranty) {
      setError('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      if (isNew) {
        await addProduct(formData);
      } else {
        await updateProduct(productId, formData);
      }
      router.push(`/admin/products/categories/${categoryId}/detail`);
    } catch (err: any) {
      safeConsoleError('Error saving product:', err);
      setError('Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <Card className="p-8 text-center">
          <div className="inline-block">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
          <p className="mt-4 text-gray-600">Loading product...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Header */}
      <button
        onClick={() => router.push(`/admin/products/categories/${categoryId}/detail`)}
        className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4"
      >
        <ChevronLeft size={20} />
        Back to Category
      </button>

      <div className="mb-6">
        <h1 className="text-3xl font-bold">{isNew ? 'Create Product' : 'Edit Product'}</h1>
        <p className="text-gray-600 mt-1">Manage product details and pricing</p>
      </div>

      {error && (
        <Card className="p-4 mb-6 bg-red-50 border-red-200">
          <p className="text-red-800">{error}</p>
        </Card>
      )}

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Product Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Premium PPF Installation"
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Detailed description of the service"
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-vertical"
              rows={4}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Price (AED) *</label>
              <input
                type="text"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="e.g., 500"
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Duration *</label>
              <input
                type="text"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                placeholder="e.g., 2-3 hours"
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Warranty *</label>
              <input
                type="text"
                value={formData.warranty}
                onChange={(e) => setFormData({ ...formData, warranty: e.target.value })}
                placeholder="e.g., 2 years"
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <Button
              type="submit"
              disabled={saving}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {saving ? 'Saving...' : isNew ? 'Create Product' : 'Update Product'}
            </Button>
            <Button
              type="button"
              onClick={() => router.push(`/admin/products/categories/${categoryId}/detail`)}
              variant="outline"
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

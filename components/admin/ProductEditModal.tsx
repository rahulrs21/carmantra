'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { updateProduct, addProduct, Product } from '@/lib/firestore/products';
import { safeConsoleError } from '@/lib/safeConsole';
import { X } from 'lucide-react';

interface ProductEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  categoryId: string;
  productId?: string;
}

export default function ProductEditModal({
  isOpen,
  onClose,
  onSuccess,
  categoryId,
  productId,
}: ProductEditModalProps) {
  const isNew = !productId;

  const [formData, setFormData] = useState<Omit<Product, 'id' | 'createdAt' | 'updatedAt'>>({
    categoryId,
    name: '',
    description: '',
    price: '',
    warranty: '',
    duration: '',
  });
  const [loading, setLoading] = useState(!isNew && isOpen);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && !isNew && productId) {
      loadProduct();
    } else if (isOpen && isNew) {
      setFormData({
        categoryId,
        name: '',
        description: '',
        price: '',
        warranty: '',
        duration: '',
      });
      setError(null);
    }
  }, [isOpen, productId, isNew, categoryId]);

  const loadProduct = async () => {
    try {
      setLoading(true);
      setError(null);
      const docSnap = await getDoc(doc(db, 'products', productId!));
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
    setError(null);
    try {
      if (isNew) {
        await addProduct(formData);
      } else {
        await updateProduct(productId!, formData);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      safeConsoleError('Error saving product:', err);
      setError('Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b p-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">
              {isNew ? 'Add New Product' : 'Edit Product'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
              title="Close modal"
            >
              <X size={20} className="text-gray-600" />
            </button>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            {loading ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Elite Wrap – Matte"
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Product description"
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-vertical"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Price (AED) *
                    </label>
                    <input
                      type="text"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      placeholder="e.g., 7000"
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Duration *
                    </label>
                    <input
                      type="text"
                      value={formData.duration}
                      onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                      placeholder="e.g., 2-3 days"
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Warranty *
                  </label>
                  <input
                    type="text"
                    value={formData.warranty}
                    onChange={(e) => setFormData({ ...formData, warranty: e.target.value })}
                    placeholder="e.g., 10 Years Warranty"
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                {/* Footer */}
                <div className="flex gap-3 pt-4 border-t mt-6">
                  <Button
                    type="submit"
                    disabled={saving}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Saving...' : isNew ? 'Create Product' : 'Update Product'}
                  </Button>
                  <Button
                    type="button"
                    onClick={onClose}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </>
            )}
          </form>
        </Card>
      </div>
    </>
  );
}

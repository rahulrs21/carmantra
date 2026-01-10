'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getProductsByCategory, deleteProduct, Category, Product } from '@/lib/firestore/products';
import { safeConsoleError } from '@/lib/safeConsole';
import { Edit2, Trash2, Plus, ChevronLeft } from 'lucide-react';
import ProductEditModal from '@/components/admin/ProductEditModal';

export default function CategoryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const categoryId = params?.categoryId as string;

  const [category, setCategory] = useState<Category | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, [categoryId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const categoryDoc = await getDoc(doc(db, 'products-categories', categoryId));
      if (categoryDoc.exists()) {
        setCategory(categoryDoc.data() as Category);
      }
      const prods = await getProductsByCategory(categoryId);
      setProducts(prods);
    } catch (err: any) {
      safeConsoleError('Error loading data:', err);
      setError('Failed to load category data');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    setDeleting(true);
    try {
      await deleteProduct(productId);
      setProducts(products.filter(p => p.id !== productId));
      setDeleteConfirm(null);
    } catch (err: any) {
      safeConsoleError('Error deleting product:', err);
      setError('Failed to delete product');
    } finally {
      setDeleting(false);
    }
  };

  const handleEditProduct = (productId: string) => {
    setEditingProductId(productId);
    setIsEditModalOpen(true);
  };

  const handleEditSuccess = async () => {
    // Reload products after successful edit
    await loadData();
  };

  if (loading) {
    return (
      <div className="p-6">
        <Card className="p-8 text-center">
          <div className="inline-block">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
          <p className="mt-4 text-gray-600">Loading category...</p>
        </Card>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="p-6">
        <Card className="p-8 text-center bg-red-50 border-red-200">
          <p className="text-red-800">Category not found</p>
          <Button onClick={() => router.push('/admin/products')} className="mt-4">
            Back to Products
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push('/admin/products')}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4"
        >
          <ChevronLeft size={20} />
          Back to Products
        </button>
        <h1 className="text-3xl font-bold">{category.name}</h1>
        <p className="text-gray-600 mt-1">{category.description}</p>
        <Badge variant="secondary" className="mt-2">{category.slug}</Badge>
      </div>

      {error && (
        <Card className="p-4 mb-6 bg-red-50 border-red-200">
          <p className="text-red-800">{error}</p>
        </Card>
      )}

      {/* Add Product Button */}
      <div className="mb-6">
        <Button
          onClick={() => {
            setEditingProductId(null);
            setIsEditModalOpen(true);
          }}
          className="bg-green-600 hover:bg-green-700 gap-2"
        >
          <Plus size={20} />
          Add Product
        </Button>
      </div>

      {/* Products List */}
      <div className="space-y-4">
        {products.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-gray-600">No products in this category yet</p>
            <Button
              onClick={() => router.push(`/admin/products/categories/${categoryId}/products/new`)}
              variant="outline"
              className="mt-4"
            >
              Create First Product
            </Button>
          </Card>
        ) : (
          products.map(product => (
            <Card key={product.id} className="p-4 hover:bg-gray-50 transition">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">{product.name}</h3>
                  <p className="text-gray-600 text-sm mt-1">{product.description}</p>
                  <div className="flex gap-4 mt-3 flex-wrap">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Price</p>
                      <p className="text-lg font-bold text-green-600">AED {product.price}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Duration</p>
                      <p className="text-sm font-medium text-gray-900">{product.duration}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Warranty</p>
                      <p className="text-sm font-medium text-gray-900">{product.warranty}</p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => handleEditProduct(product.id!)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                    title="Edit product"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(product.id!)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                    title="Delete product"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              {/* Delete Confirmation */}
              {deleteConfirm === product.id && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800 mb-3">
                    Are you sure you want to delete "{product.name}"? This action cannot be undone.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleDeleteProduct(product.id!)}
                      disabled={deleting}
                      className="bg-red-600 hover:bg-red-700"
                      size="sm"
                    >
                      {deleting ? 'Deleting...' : 'Delete'}
                    </Button>
                    <Button
                      onClick={() => setDeleteConfirm(null)}
                      variant="outline"
                      size="sm"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          ))
        )}
      </div>

      {/* Product Edit Modal */}
      <ProductEditModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingProductId(null);
        }}
        onSuccess={handleEditSuccess}
        categoryId={categoryId}
        productId={editingProductId || undefined}
      />
    </div>
  );
}

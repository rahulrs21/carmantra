'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getCategories, deleteCategory, Category } from '@/lib/firestore/products';
import { safeConsoleError } from '@/lib/safeConsole';
import { Plus, Edit, Trash2, ChevronRight, Download } from 'lucide-react';

export default function ProductsPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [migrating, setMigrating] = useState(false);
  const [migrationSuccess, setMigrationSuccess] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const data = await getCategories();
      setCategories(data);
    } catch (err: any) {
      safeConsoleError('Error loading categories:', err);
      setError('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (categoryId: string) => {
    if (window.confirm('Are you sure you want to delete this category and all its products?')) {
      try {
        await deleteCategory(categoryId);
        setCategories(categories.filter(c => c.id !== categoryId));
        setDeleteId(null);
      } catch (err: any) {
        safeConsoleError('Error deleting category:', err);
        alert('Failed to delete category');
      }
    }
  };

  const handleMigration = async () => {
    if (categories.length > 0) {
      if (!window.confirm('Categories already exist. This will add the existing service data. Continue?')) {
        return;
      }
    }

    setMigrating(true);
    try {
      const response = await fetch('/api/admin/migrate-products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Migration failed');
      }

      const data = await response.json();
      setMigrationSuccess(true);
      setError(null);
      
      // Reload categories
      await loadCategories();

      // Reset success message after 5 seconds
      setTimeout(() => setMigrationSuccess(false), 5000);
    } catch (err: any) {
      safeConsoleError('Error during migration:', err);
      setError('Migration failed: ' + err.message);
    } finally {
      setMigrating(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Products Management</h1>
          <p className="text-gray-600 mt-1">Manage service categories and products</p>
        </div>
        <Button 
          onClick={() => router.push('/admin/products/categories/new')}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Category
        </Button>
      </div>

      {migrationSuccess && (
        <Card className="p-4 mb-6 bg-green-50 border-green-200">
          <p className="text-green-800 font-semibold">✅ Migration successful! Existing categories and products have been added.</p>
        </Card>
      )}

      {error && (
        <Card className="p-4 mb-6 bg-red-50 border-red-200">
          <p className="text-red-800">{error}</p>
        </Card>
      )}

      {/* Migration Helper - Show only if no categories exist */}
      {categories.length === 0 && !loading && (
        <Card className="p-6 mb-6 bg-blue-50 border-blue-200">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold text-blue-900 mb-2">Migrate Existing Categories</h3>
              <p className="text-blue-800 mb-4">
                We detected existing service categories (PPF Wrapping, Ceramic Coating, Car Tinting, Car Wash, Car Polishing). 
                Click below to automatically populate them with their products.
              </p>
            </div>
            <Button
              onClick={handleMigration}
              disabled={migrating}
              className="bg-green-600 hover:bg-green-700 whitespace-nowrap ml-4"
            >
              <Download className="mr-2 h-4 w-4" />
              {migrating ? 'Migrating...' : 'Migrate Now'}
            </Button>
          </div>
        </Card>
      )}

      {loading ? (
        <Card className="p-8 text-center">
          <div className="inline-block">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
          <p className="mt-4 text-gray-600">Loading categories...</p>
        </Card>
      ) : categories.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-gray-600 mb-4">No categories created yet</p>
          <Button 
            onClick={() => router.push('/admin/products/categories/new')}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create First Category
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map(category => (
            <Card key={category.id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900">{category.name}</h3>
                  <p className="text-xs text-gray-500 mt-1">slug: {category.slug}</p>
                  {category.description && (
                    <p className="text-sm text-gray-600 mt-2">{category.description}</p>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => router.push(`/admin/products/categories/${category.id}/detail`)}
                  variant="outline"
                  className="flex-1 text-sm"
                >
                  <ChevronRight className="mr-2 h-4 w-4" />
                  View Products
                </Button>
                <Button
                  onClick={() => router.push(`/admin/products/categories/${category.id}`)}
                  variant="outline"
                  className="flex-1 text-sm"
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Button>
                <Button
                  onClick={() => handleDelete(category.id!)}
                  variant="outline"
                  className="flex-1 text-sm text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

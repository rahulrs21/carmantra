'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { addCategory, updateCategory, Category } from '@/lib/firestore/products';
import { safeConsoleError } from '@/lib/safeConsole';
import { AlertCircle, CheckCircle, Loader } from 'lucide-react';

// Slug validation rules
const SLUG_RULES = [
  { label: 'Lowercase letters, numbers, and hyphens', test: (s: string) => /^[a-z0-9\-]*$/.test(s) },
  { label: 'Use hyphens to separate words (e.g., ppf-wrapping)', test: (s: string) => !s.includes(' ') },
  { label: 'Start with a letter', test: (s: string) => /^[a-z]/.test(s) || s === '' },
  { label: 'Example: ppf-wrapping, car-washing, premium-service', test: (s: string) => /^[a-z0-9\-]*$/.test(s) },
];

function validateSlug(slug: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!slug) {
    return { valid: false, errors: ['Slug is required'] };
  }

  if (slug.length < 3) {
    errors.push('Slug must be at least 3 characters');
  }

  if (slug.length > 50) {
    errors.push('Slug must not exceed 50 characters');
  }

  if (/\s/.test(slug)) {
    errors.push('Slug cannot contain spaces (use hyphens instead)');
  }

  if (!/^[a-z]/.test(slug)) {
    errors.push('Slug must start with a lowercase letter');
  }

  if (!/^[a-z0-9\-]*$/.test(slug)) {
    errors.push('Slug can only contain lowercase letters, numbers, and hyphens');
  }

  if (/--/.test(slug)) {
    errors.push('Slug cannot contain consecutive hyphens');
  }

  return { valid: errors.length === 0, errors };
}

function normalizeSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-]/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function CategoryEditPage() {
  const params = useParams();
  const router = useRouter();
  const categoryId = params?.categoryId as string;
  const isNew = categoryId === 'new';
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  const [formData, setFormData] = useState<Omit<Category, 'id' | 'createdAt' | 'updatedAt'>>({
    name: '',
    slug: '',
    description: '',
  });
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [isGeneratingSlug, setIsGeneratingSlug] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slugError, setSlugError] = useState<string | null>(null);

  useEffect(() => {
    if (!isNew) {
      loadCategory();
    }
  }, [categoryId, isNew]);

  const loadCategory = async () => {
    try {
      setLoading(true);
      const docSnap = await getDoc(doc(db, 'products-categories', categoryId));
      if (docSnap.exists()) {
        const data = docSnap.data() as Category;
        setFormData({
          name: data.name,
          slug: data.slug,
          description: data.description || '',
        });
      } else {
        setError('Category not found');
      }
    } catch (err: any) {
      safeConsoleError('Error loading category:', err);
      setError('Failed to load category');
    } finally {
      setLoading(false);
    }
  };

  const handleSlugChange = (value: string) => {
    // Allow typing freely - don't normalize on every keystroke
    setFormData({ ...formData, slug: value });

    if (value) {
      const validation = validateSlug(value);
      setSlugError(validation.errors.length > 0 ? validation.errors[0] : null);
    } else {
      setSlugError(null);
    }
  };

  const handleSlugBlur = () => {
    // Normalize slug only when user leaves the field
    if (formData.slug) {
      const normalized = normalizeSlug(formData.slug);
      setFormData(prev => ({ ...prev, slug: normalized }));
      const validation = validateSlug(normalized);
      setSlugError(validation.errors.length > 0 ? validation.errors[0] : null);
    }
  };

  const handleNameChange = (name: string) => {
    setFormData({ ...formData, name });
    
    // Clear previous timer if exists
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    
    // Auto-generate slug from name if slug is empty (with 2 second debounce)
    if (!formData.slug && name) {
      setIsGeneratingSlug(true);
      debounceTimer.current = setTimeout(() => {
        const autoSlug = normalizeSlug(name);
        setFormData(prev => ({ ...prev, slug: autoSlug }));
        const validation = validateSlug(autoSlug);
        setSlugError(validation.errors.length > 0 ? validation.errors[0] : null);
        setIsGeneratingSlug(false);
      }, 2000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.slug) {
      setError('Please fill in all required fields');
      return;
    }

    // Validate slug
    const slugValidation = validateSlug(formData.slug);
    if (!slugValidation.valid) {
      setError(slugValidation.errors.join(', '));
      return;
    }

    setSaving(true);
    try {
      if (isNew) {
        await addCategory(formData);
      } else {
        await updateCategory(categoryId, formData);
      }
      router.push('/admin/products');
    } catch (err: any) {
      safeConsoleError('Error saving category:', err);
      setError('Failed to save category');
    } finally {
      setSaving(false);
    }
  };

  const slugValidation = validateSlug(formData.slug);
  const isSlugValid = slugValidation.valid && formData.slug.length > 0;

  if (loading) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <Card className="p-8 text-center">
          <div className="inline-block">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
          <p className="mt-4 text-gray-600">Loading category...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{isNew ? 'Create Category' : 'Edit Category'}</h1>
        <p className="text-gray-600 mt-1">Manage service category details</p>
      </div>

      {error && (
        <Card className="p-4 mb-6 bg-red-50 border-red-200">
          <p className="text-red-800">{error}</p>
        </Card>
      )}

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Category Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g., PPF Wrapping"
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <p className="text-xs text-gray-500 mt-1">Slug will auto-generate from category name</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Slug *
              {isGeneratingSlug && <Loader className="inline w-4 h-4 ml-2 text-blue-600 animate-spin" />}
              {isSlugValid && !isGeneratingSlug && <CheckCircle className="inline w-4 h-4 ml-2 text-green-600" />}
            </label>
            <div className="relative">
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                onBlur={handleSlugBlur}
                placeholder="e.g., ppf-wrapping"
                disabled={isGeneratingSlug}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                  isGeneratingSlug
                    ? 'blur-sm opacity-60 cursor-not-allowed border-gray-300'
                    : slugError
                      ? 'border-red-300 focus:ring-red-500'
                      : isSlugValid
                        ? 'border-green-300 focus:ring-green-500'
                        : 'focus:ring-blue-500'
                }`}
                required
              />
              {isGeneratingSlug && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <Loader className="w-4 h-4 text-blue-600 animate-spin" />
                  <span className="text-xs text-gray-500">Generating...</span>
                </div>
              )}
            </div>
            
            {/* Slug Rules Info */}
            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
              <p className="text-xs font-semibold text-gray-700 mb-2">Slug Rules:</p>
              <ul className="space-y-1">
                {SLUG_RULES.map((rule, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs text-gray-600">
                    <span className="mt-0.5">
                      {formData.slug && rule.test(formData.slug) ? (
                        <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full border border-gray-300" />
                      )}
                    </span>
                    <span>{rule.label}</span>
                  </li>
                ))}
                <li className="flex items-start gap-2 text-xs text-gray-600 mt-2 pt-2 border-t">
                  <span className="mt-0.5">
                    {formData.slug && formData.slug.length >= 3 ? (
                      <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                    ) : (
                      <div className="w-3.5 h-3.5 rounded-full border border-gray-300" />
                    )}
                  </span>
                  <span>3-50 characters long</span>
                </li>
              </ul>
            </div>

            {slugError && (
              <div className="mt-2 flex items-start gap-2 p-2 bg-red-50 rounded border border-red-200">
                <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-red-700">{slugError}</p>
              </div>
            )}

            {isSlugValid && (
              <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" /> Slug is valid!
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Description (Optional)</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of this service category"
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-vertical"
              rows={4}
            />
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <Button
              type="submit"
              disabled={saving || !isSlugValid}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : isNew ? 'Create Category' : 'Update Category'}
            </Button>
            <Button
              type="button"
              onClick={() => router.push('/admin/products')}
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

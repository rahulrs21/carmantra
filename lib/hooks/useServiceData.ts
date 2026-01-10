import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Product, Category } from '@/lib/firestore/products';
import { safeConsoleError } from '@/lib/safeConsole';

export interface ServiceData {
  category: Category | null;
  products: Product[];
  loading: boolean;
  error: string | null;
}

/**
 * Hook to fetch service category and products from Firestore
 * @param categorySlug - The slug of the category (e.g., 'ppf-wrapping', 'car-wash')
 */
export function useServiceData(categorySlug: string): ServiceData {
  const [category, setCategory] = useState<Category | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Query category by slug
        const categoriesRef = collection(db, 'products-categories');
        const q = query(categoriesRef, where('slug', '==', categorySlug));
        const categorySnap = await getDocs(q);

        if (categorySnap.empty) {
          setError(`Category not found: ${categorySlug}`);
          setLoading(false);
          return;
        }

        const categoryDoc = categorySnap.docs[0];
        const categoryData = { id: categoryDoc.id, ...categoryDoc.data() } as Category;
        setCategory(categoryData);

        // Fetch products for this category
        const productsRef = collection(db, 'products');
        const productsQuery = query(productsRef, where('categoryId', '==', categoryDoc.id));
        const productsSnap = await getDocs(productsQuery);

        const productsData = productsSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Product[];

        // Sort by order if available, otherwise by name
        productsData.sort((a, b) => {
          return a.name.localeCompare(b.name);
        });

        setProducts(productsData);
      } catch (err: any) {
        safeConsoleError('Error fetching service data:', err);
        setError(err.message || 'Failed to load service data');
      } finally {
        setLoading(false);
      }
    };

    if (categorySlug) {
      fetchData();
    }
  }, [categorySlug]);

  return { category, products, loading, error };
}

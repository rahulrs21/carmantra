import { db } from '@/lib/firebase';
import { collection, doc, setDoc, getDocs, query, where, deleteDoc, updateDoc, addDoc, Timestamp } from 'firebase/firestore';

export interface Product {
  id?: string;
  categoryId: string;
  name: string;
  description: string;
  price: string;
  warranty: string;
  duration: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface Category {
  id?: string;
  name: string;
  slug: string;
  description?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

// Categories Management
export async function addCategory(category: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>) {
  try {
    const docRef = await addDoc(collection(db, 'products-categories'), {
      ...category,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    return { id: docRef.id, ...category };
  } catch (error) {
    console.error('Error adding category:', error);
    throw error;
  }
}

export async function getCategories() {
  try {
    const snapshot = await getDocs(collection(db, 'products-categories'));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
  } catch (error) {
    console.error('Error fetching categories:', error);
    throw error;
  }
}

export async function updateCategory(categoryId: string, updates: Partial<Category>) {
  try {
    await updateDoc(doc(db, 'products-categories', categoryId), {
      ...updates,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error updating category:', error);
    throw error;
  }
}

export async function deleteCategory(categoryId: string) {
  try {
    await deleteDoc(doc(db, 'products-categories', categoryId));
  } catch (error) {
    console.error('Error deleting category:', error);
    throw error;
  }
}

// Products Management
export async function addProduct(product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) {
  try {
    const docRef = await addDoc(collection(db, 'products'), {
      ...product,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    return { id: docRef.id, ...product };
  } catch (error) {
    console.error('Error adding product:', error);
    throw error;
  }
}

export async function getProductsByCategory(categoryId: string) {
  try {
    const q = query(collection(db, 'products'), where('categoryId', '==', categoryId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)).sort((a, b) => {
      const aTime = a.createdAt?.toDate?.() || new Date(0);
      const bTime = b.createdAt?.toDate?.() || new Date(0);
      return bTime.getTime() - aTime.getTime();
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    throw error;
  }
}

export async function getAllProducts() {
  try {
    const snapshot = await getDocs(collection(db, 'products'));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
  } catch (error) {
    console.error('Error fetching all products:', error);
    throw error;
  }
}

export async function updateProduct(productId: string, updates: Partial<Product>) {
  try {
    await updateDoc(doc(db, 'products', productId), {
      ...updates,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error updating product:', error);
    throw error;
  }
}

export async function deleteProduct(productId: string) {
  try {
    await deleteDoc(doc(db, 'products', productId));
  } catch (error) {
    console.error('Error deleting product:', error);
    throw error;
  }
}

// Migration utility to populate existing service categories and products
// Run this once to populate the database with existing service data

import { addCategory, addProduct } from './products';

export const EXISTING_CATEGORIES_DATA = [
  {
    slug: 'ppf-wrapping',
    name: 'PPF Wrapping',
    description: 'Paint Protection Film & Wrapping Services - Advanced paint protection film and vinyl wrapping services to preserve your vehicle\'s finish and enhance its appearance with cutting-edge technology.',
    products: [
      {
        name: 'Elite Wrap – Matte',
        description: 'Complete paint protection film coverage for maximum protection',
        price: '7000',
        warranty: '10 Years Warranty',
        duration: '2-3 days'
      },
      {
        name: 'Elite Wrap – Glossy',
        description: 'Strategic protection for high-impact areas',
        price: '6000',
        warranty: '10 Years Warranty',
        duration: '2-3 days'
      },
      {
        name: 'Basic Wrap – Matte',
        description: 'Transform your vehicle\'s appearance with premium vinyl',
        price: '4000',
        warranty: '5 Years Warranty',
        duration: '2-3 days'
      },
      {
        name: 'Basic Wrap – Glossy',
        description: 'Professional branding and advertising solutions',
        price: '3000',
        warranty: '5 Years Warranty',
        duration: '2-3 days'
      },
      {
        name: 'Standard Color PPF – Matte',
        description: 'Transform your vehicle\'s appearance with premium vinyl',
        price: '7000',
        warranty: '5 Years Warranty',
        duration: '2-3 days'
      },
      {
        name: 'Standard Color PPF – Glossy',
        description: 'Professional branding and advertising solutions',
        price: '6000',
        warranty: '5 Years Warranty',
        duration: '2-3 days'
      }
    ]
  },
  {
    slug: 'ceramic-coating',
    name: 'Ceramic Coating',
    description: 'Premium ceramic coating services - Protect and enhance your vehicle\'s paint with advanced ceramic coating technology.',
    products: [
      {
        name: 'Professional Ceramic Coating',
        description: 'Complete ceramic coating application for ultimate paint protection',
        price: '2500',
        warranty: '3 Years Warranty',
        duration: '1-2 days'
      },
      {
        name: 'Premium Ceramic Coating',
        description: 'Enhanced ceramic coating with additional UV protection',
        price: '4000',
        warranty: '5 Years Warranty',
        duration: '2-3 days'
      },
      {
        name: 'Ceramic Coating Touch-up',
        description: 'Maintenance and touch-up service for existing ceramic coating',
        price: '500',
        warranty: '1 Year Warranty',
        duration: '2-3 hours'
      }
    ]
  },
  {
    slug: 'car-tinting',
    name: 'Car Tinting',
    description: 'Professional car window tinting - Reduce heat, improve privacy, and enhance your vehicle\'s appearance with expert tinting services.',
    products: [
      {
        name: 'Standard Window Tinting',
        description: 'Professional tinting for all windows with UV protection',
        price: '800',
        warranty: '2 Years Warranty',
        duration: '2-3 hours'
      },
      {
        name: 'Premium Ceramic Tinting',
        description: 'Advanced ceramic tint with superior heat rejection',
        price: '1500',
        warranty: '5 Years Warranty',
        duration: '3-4 hours'
      },
      {
        name: 'Full Vehicle Tinting Package',
        description: 'Complete tinting package including windshield and rear glass',
        price: '2500',
        warranty: '3 Years Warranty',
        duration: '4-5 hours'
      }
    ]
  },
  {
    slug: 'car-wash',
    name: 'Car Wash',
    description: 'Professional car washing services - Keep your vehicle looking pristine with our comprehensive washing and detailing solutions.',
    products: [
      {
        name: 'Basic Car Wash',
        description: 'Standard exterior wash with soap and water',
        price: '100',
        warranty: 'Same Day',
        duration: '30 minutes'
      },
      {
        name: 'Premium Wash & Wax',
        description: 'Complete wash with protective wax coating',
        price: '300',
        warranty: '1 Month',
        duration: '1 hour'
      },
      {
        name: 'Full Interior & Exterior Detailing',
        description: 'Complete detailing including interior cleaning and conditioning',
        price: '800',
        warranty: '1 Month',
        duration: '3-4 hours'
      },
      {
        name: 'Engine Bay Cleaning',
        description: 'Professional engine bay cleaning and degreasing',
        price: '400',
        warranty: 'Same Day',
        duration: '1-2 hours'
      }
    ]
  },
  {
    slug: 'car-polishing',
    name: 'Car Polishing',
    description: 'Expert car polishing services - Restore your vehicle\'s shine and remove imperfections with professional polishing techniques.',
    products: [
      {
        name: 'Single Stage Polish',
        description: 'Professional polishing to restore shine and remove light scratches',
        price: '600',
        warranty: '1 Month',
        duration: '2-3 hours'
      },
      {
        name: 'Multi-Stage Polish',
        description: 'Advanced polishing for deeper scratch removal and paint restoration',
        price: '1200',
        warranty: '2 Months',
        duration: '4-5 hours'
      },
      {
        name: 'Paint Correction',
        description: 'Complete paint correction with swirl mark removal',
        price: '2000',
        warranty: '6 Months',
        duration: '6-8 hours'
      },
      {
        name: 'Spot Polishing',
        description: 'Targeted polishing for specific areas',
        price: '300',
        warranty: 'Same Day',
        duration: '1-2 hours'
      }
    ]
  }
];

/**
 * Migrate existing service data to Firestore products database
 * Run this function once via a one-time script or admin action
 */
export async function migrateExistingProducts() {
  try {
    console.log('Starting migration of existing categories and products...');
    let totalAdded = 0;

    for (const categoryData of EXISTING_CATEGORIES_DATA) {
      // Add category
      const categoryResult = await addCategory({
        name: categoryData.name,
        slug: categoryData.slug,
        description: categoryData.description,
      });

      const categoryId = categoryResult.id;
      console.log(`✅ Created category: ${categoryData.name} (ID: ${categoryId})`);

      // Add products for this category
      for (const product of categoryData.products) {
        await addProduct({
          categoryId,
          name: product.name,
          description: product.description,
          price: product.price,
          warranty: product.warranty,
          duration: product.duration,
        });

        console.log(`  ✅ Added product: ${product.name}`);
        totalAdded++;
      }
    }

    console.log(`\n✅ Migration complete! Added ${totalAdded} products across ${EXISTING_CATEGORIES_DATA.length} categories`);
    return { success: true, categoriesAdded: EXISTING_CATEGORIES_DATA.length, productsAdded: totalAdded };
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

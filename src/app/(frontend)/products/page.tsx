/**
 * Products Catalog Page
 *
 * Two stacked sections:
 *   1. Big purchase cards for every active product (matches SHOP1.html preview).
 *   2. Small non-clickable grid of inactive/free products under "כל הקורסים"
 *      (heading is kept as-is per PM).
 *
 * @fileType page
 * @domain billing
 */

import { getDirection } from '@/i18n/config'
import { getSystemLocale } from '@/i18n/server-locale'
import { pageMetadata } from '@/infra/seo/pageMetadata'
import { queryActiveProducts, queryInactiveProducts } from '@/server/repos/queries/products'
import { ActiveProductsList } from './_components/ActiveProductsList'
import { EmptyProducts } from './_components/EmptyProducts'
import { InactiveProductsGrid } from './_components/InactiveProductsGrid'
import { ProductsHeader } from './_components/ProductsHeader'

export const revalidate = 60

export default async function ProductsPage() {
  const locale = await getSystemLocale()
  const [activeProducts, inactiveProducts] = await Promise.all([
    queryActiveProducts(),
    queryInactiveProducts(),
  ])

  return (
    <div className="min-h-screen text-card-foreground antialiased" dir={getDirection(locale)}>
      <ProductsHeader />

      <div className="max-w-7xl mx-auto px-6 py-20">
        {activeProducts.length === 0 ? (
          <EmptyProducts />
        ) : (
          <ActiveProductsList products={activeProducts} />
        )}

        <InactiveProductsGrid products={inactiveProducts} heading="כל הקורסים" />
      </div>
    </div>
  )
}

export async function generateMetadata() {
  const locale = await getSystemLocale()
  const isHebrew = locale === 'he'

  return pageMetadata({
    title: isHebrew ? 'חנות המוצרים' : 'Products',
    description: isHebrew ? 'עיין במוצרים הזמינים שלנו' : 'Browse our available products',
  })
}

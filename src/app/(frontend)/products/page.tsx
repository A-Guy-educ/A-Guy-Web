/**
 * Products Catalog Page
 *
 * Lists all products for the user's tenant (or global products if no tenant),
 * split into two sections:
 *   1. Active paid products → one big purchase card each (full-width, stacked)
 *   2. Inactive / free products → small "coming soon" grid (md:2, lg:3 cols)
 *
 * The Courses collection is intentionally NOT queried here — that catalog
 * lives at /courses. The bottom grid renders products only, per spec.
 *
 * @fileType page
 * @domain billing
 */

import { getDirection } from '@/i18n/config'
import { getSystemLocale } from '@/i18n/server-locale'
import { pageMetadata } from '@/infra/seo/pageMetadata'
import { queryActiveProducts, queryInactiveProducts } from '@/server/repos/queries/products'
import { ProductCardGrid } from './_components/ProductCardGrid'
import { ProductsHeader } from './_components/ProductsHeader'
import { EmptyProducts } from './_components/EmptyProducts'

export const revalidate = 60

export default async function ProductsPage() {
  const locale = await getSystemLocale()
  const [activeProducts, inactiveProducts] = await Promise.all([
    queryActiveProducts(),
    queryInactiveProducts(),
  ])

  const noActiveProducts = activeProducts.length === 0

  return (
    <div className="min-h-screen text-card-foreground antialiased" dir={getDirection(locale)}>
      <ProductsHeader />

      <div className="max-w-5xl mx-auto px-6 py-20">
        {noActiveProducts && inactiveProducts.length === 0 ? (
          <EmptyProducts />
        ) : noActiveProducts ? (
          // Hero still renders, but no big card to show — surface the
          // empty-state message instead of the grid, and let the inactive
          // grid render below the message via ProductCardGrid.
          <div className="flex flex-col gap-content-gap-xl">
            <EmptyProducts />
            {inactiveProducts.length > 0 ? (
              <InactiveOnlyGrid inactiveProducts={inactiveProducts} locale={locale} />
            ) : null}
          </div>
        ) : (
          <ProductCardGrid
            activeProducts={activeProducts}
            inactiveProducts={inactiveProducts}
            locale={locale}
          />
        )}
      </div>
    </div>
  )
}

/**
 * When the active list is empty but there ARE inactive products, we still
 * want to show the "all courses" grid below the empty-state message. This
 * renders just that section without duplicating logic from ProductCardGrid.
 */
function InactiveOnlyGrid({
  inactiveProducts,
  locale,
}: {
  inactiveProducts: Parameters<typeof ProductCardGrid>[0]['inactiveProducts']
  locale: string
}) {
  return <ProductCardGrid activeProducts={[]} inactiveProducts={inactiveProducts} locale={locale} />
}

export async function generateMetadata() {
  const locale = await getSystemLocale()
  const isHebrew = locale === 'he'

  return pageMetadata({
    title: isHebrew ? 'חנות המוצרים' : 'Products',
    description: isHebrew ? 'עיין במוצרים הזמינים שלנו' : 'Browse our available products',
  })
}

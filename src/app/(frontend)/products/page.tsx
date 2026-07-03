/**
 * Products Catalog Page
 *
 * Lists all products for the user's tenant (or global products if no tenant).
 * Partitions them into "active" (big featured card with the לרכישה button)
 * and "soon" (compact card with a greyed-out disabled בקרוב button), based on
 * the `isActive` field on each Product document.
 *
 * @fileType page
 * @domain billing
 */

import { getDirection } from '@/i18n/config'
import { getSystemLocale } from '@/i18n/server-locale'
import { pageMetadata } from '@/infra/seo/pageMetadata'
import { queryAllProductsSplit } from '@/server/repos/queries/products'
import { ProductCardGrid } from './_components/ProductCardGrid'
import { ProductSoonGrid } from './_components/ProductSoonGrid'
import { ProductsHeader } from './_components/ProductsHeader'
import { EmptyProducts } from './_components/EmptyProducts'
import { ComingSoonHeading } from './_components/ComingSoonHeading'

export const revalidate = 60

export default async function ProductsPage() {
  const locale = await getSystemLocale()
  const { active, soon } = await queryAllProductsSplit()

  if (active.length === 0 && soon.length === 0) {
    return (
      <div className="min-h-screen text-card-foreground antialiased" dir={getDirection(locale)}>
        <ProductsHeader />
        <div className="max-w-7xl mx-auto px-6 py-20">
          <EmptyProducts />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen text-card-foreground antialiased" dir={getDirection(locale)}>
      <ProductsHeader />

      <div className="max-w-7xl mx-auto px-6 py-20 space-y-section-md">
        {active.length > 0 && <ProductCardGrid products={active} />}
        {soon.length > 0 && (
          <section>
            <ComingSoonHeading />
            <ProductSoonGrid products={soon} />
          </section>
        )}
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

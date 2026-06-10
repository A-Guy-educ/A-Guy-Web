'use server'

export type ValidateCouponResult =
  | {
      success: true
      discountType: 'percentage' | 'fixed'
      discountValue: number
      discountedAmount: number
      originalAmount: number
    }
  | { success: false; error: string }

export async function validateCouponAction(
  _productId: string,
  _couponCode: string,
): Promise<ValidateCouponResult> {
  return { success: false, error: 'coupons_unavailable' }
}

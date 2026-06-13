/**
 * Grant product entitlements after successful payment.
 *
 * @ai-summary Stub — no-ops in all environments. This is the integration point
 * where payment confirmation should trigger access grants (e.g. unlocking a course
 * in Payload). Until this function is implemented, successful payments will NOT
 * grant product access to buyers.
 */
export async function grantProductEntitlements(
  _userId: string,
  _productId: string,
  _transactionId: string,
): Promise<void> {}

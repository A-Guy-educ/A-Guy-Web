/**
 * @fileType utility
 * @domain payment
 * @ai-summary Stub — entitlements are granted synchronously on `payment_status=paid` webhook events. This function does nothing; real grant logic lives in the webhook handler.
 */

export async function grantProductEntitlements(
  _userId: string,
  _productId: string,
  _transactionId: string,
): Promise<void> {}

'use server'

import { checkRateLimit } from './signup_rateLimit-action'
import { SignupSchema, type SignupResult } from '../signup_schemas'

export async function signupAction(formData: FormData): Promise<SignupResult> {
  const rawData = {
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
    website: formData.get('website'),
  }

  if (rawData.website && rawData.website.toString().trim() !== '') {
    return {
      success: false,
      message: 'Unable to create account. Please try again.',
    }
  }

  const parsed = SignupSchema.safeParse(rawData)

  if (!parsed.success) {
    const errors: Record<string, string> = {}
    parsed.error.issues.forEach((err) => {
      if (err.path[0]) {
        errors[err.path[0].toString()] = err.message
      }
    })
    return { success: false, message: 'Validation failed', errors }
  }

  const { email, password, confirmPassword } = parsed.data

  if (password !== confirmPassword) {
    return {
      success: false,
      errors: { confirmPassword: 'Passwords do not match' },
    }
  }

  const emailHash = Buffer.from(email).toString('base64')
  if (!checkRateLimit(emailHash)) {
    return {
      success: false,
      message: 'Too many signup attempts. Please try again later.',
    }
  }

  return {
    success: false,
    message: 'Account creation is not available without a backend.',
  }
}

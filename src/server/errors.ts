interface ErrorResult {
  success: false
  message: string
  errors?: Record<string, string>
}

export function handleValidationError(error: unknown, fallbackMessage: string): ErrorResult | null {
  if (!error || typeof error !== 'object' || !('data' in error)) {
    return null
  }

  const errorData = error.data as { errors?: Array<{ path?: string; message?: string }> }
  const errors: Record<string, string> = {}

  if (errorData.errors && Array.isArray(errorData.errors)) {
    errorData.errors.forEach((err) => {
      if (err.path && err.message) {
        errors[err.path] = err.message
      }
    })
  }

  if (Object.keys(errors).length === 0) {
    return null
  }

  return {
    success: false,
    message: fallbackMessage,
    errors,
  }
}

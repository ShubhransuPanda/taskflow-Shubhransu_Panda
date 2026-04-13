export function getApiErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (
      error as { response?: { data?: { error?: string; message?: string } } }
    ).response
    if (response?.data?.error) return response.data.error
    if (response?.data?.message) return response.data.message
  }
  return fallback
}

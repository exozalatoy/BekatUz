import { ApiError } from './api'

export type Translator = (key: string) => string

export function getErrorMessage(error: unknown, t: Translator): string {
  if (error instanceof ApiError) {
    if (error.status === 0) return t('errors.network')
    if (error.status === 401) return t('errors.invalidCredentials')
    if (error.detail) return error.detail
    return t('errors.unknown')
  }
  if (error instanceof Error && error.message) return error.message
  return t('errors.unknown')
}

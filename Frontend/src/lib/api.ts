const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();

export const apiBaseUrl = configuredApiBaseUrl && configuredApiBaseUrl.length > 0 ? configuredApiBaseUrl.replace(/\/$/, '') : 'http://localhost:3001';

export function buildApiUrl(path: string) {
  return `${apiBaseUrl}${path}`;
}

export async function readApiError(response: Response, fallbackMessage: string) {
  try {
    const body = (await response.json()) as { error?: { message?: string } };
    return body.error?.message ?? fallbackMessage;
  } catch {
    return fallbackMessage;
  }
}

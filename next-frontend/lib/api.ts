const configuredApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
const defaultApiBaseUrl = '/ppob-api';

export const apiBaseUrl = configuredApiBaseUrl && configuredApiBaseUrl.length > 0 ? configuredApiBaseUrl.replace(/\/$/, '') : defaultApiBaseUrl;

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

export function bearerHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
  };
}

export async function readJsonApi<T>(path: string, init?: RequestInit) {
  const response = await fetch(buildApiUrl(path), init);

  if (!response.ok) {
    throw new Error(await readApiError(response, 'Permintaan gagal diproses.'));
  }

  return (await response.json()) as T;
}

export type PerformanceCurve = {
  label: string;
  orderCount: number;
  grossSaleMinor: number;
  commissionMinor: number;
};

export type PerformanceCurvesResponse = {
  curves: PerformanceCurve[];
};

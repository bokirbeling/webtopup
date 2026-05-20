export function getAuthToken(): string | null {
  return localStorage.getItem('auth_token');
}

export function setAuthToken(token: string): void {
  localStorage.setItem('auth_token', token);
}

export function clearAuthToken(): void {
  localStorage.removeItem('auth_token');
}

export function isLoggedIn(): boolean {
  return getAuthToken() !== null;
}

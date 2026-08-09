const PREFIX = 'fiaba:';

export function read<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(`${PREFIX}${key}`);
    return value ? JSON.parse(value) as T : fallback;
  } catch {
    return fallback;
  }
}

export function write(key: string, value: unknown): void {
  localStorage.setItem(`${PREFIX}${key}`, JSON.stringify(value));
}

export function remove(key: string): void {
  localStorage.removeItem(`${PREFIX}${key}`);
}

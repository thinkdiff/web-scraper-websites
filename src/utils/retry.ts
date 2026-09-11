/**
 * Safe retry utility with exponential backoff and timeout
 */

export interface RetryOptions {
  retries?: number;
  minTimeoutMs?: number;
  maxTimeoutMs?: number;
  factor?: number;
  timeoutMs?: number;
}

export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, operationName = 'Operation'): Promise<T> {
  let timeoutId: NodeJS.Timeout | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${operationName} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
  operationName = 'Operation'
): Promise<T> {
  const retries = options.retries ?? 2;
  const minTimeoutMs = options.minTimeoutMs ?? 500;
  const maxTimeoutMs = options.maxTimeoutMs ?? 5000;
  const factor = options.factor ?? 2;
  const timeoutMs = options.timeoutMs ?? 15000;

  let attempt = 0;
  let delay = minTimeoutMs;

  while (true) {
    attempt++;
    try {
      return await withTimeout(fn(), timeoutMs, `${operationName} (attempt ${attempt})`);
    } catch (err) {
      if (attempt > retries) {
        throw err;
      }
      const jitter = Math.random() * 200;
      await sleep(Math.min(delay + jitter, maxTimeoutMs));
      delay *= factor;
    }
  }
}

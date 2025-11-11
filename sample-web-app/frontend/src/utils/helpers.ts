/**
 * Validate URL format
 * @param url string
 * @returns boolean true if valid, false otherwise
 */
export const validateUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Formats time in milliseconds to "MM:SS" format (no milliseconds).
 * @param timeMs - Time in milliseconds.
 * @returns Formatted time in "MM:SS" format.
 */
export const formatTime = (timeMs: number): string => {
  const minutes = Math.floor(timeMs / 60_000); // Calculate minutes
  const seconds = Math.floor((timeMs % 60_000) / 1000); // Calculate seconds
  // Ensure both minutes and seconds are always two digits
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

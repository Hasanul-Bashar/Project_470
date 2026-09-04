/**
 * Utility to format and resolve property image URLs correctly.
 * Handles relative paths (/uploads/...), base64 data URIs (data:image/...), and full HTTP/HTTPS URLs.
 */
export function getImageUrl(path) {
  if (!path) return '';

  // If already a Data URI or full HTTP/HTTPS URL, return as is
  if (
    path.startsWith('data:') ||
    path.startsWith('http://') ||
    path.startsWith('https://') ||
    path.startsWith('blob:')
  ) {
    return path;
  }

  // Handle relative upload paths (e.g. /uploads/property-xxx.jpg)
  const baseUrl = import.meta.env.VITE_API_URL || '';
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  return `${baseUrl}${cleanPath}`;
}

/**
 * Placeholder SVG data URL for broken or missing property images
 */
export const PLACEHOLDER_IMAGE =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect width="100%" height="100%" fill="%230f172a"/><text x="50%" y="50%" font-family="sans-serif" font-size="24" fill="%2364748b" dominant-baseline="middle" text-anchor="middle">🏠 RentEase Property Photo</text></svg>';

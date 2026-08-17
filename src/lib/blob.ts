export function blobProxy(url: string | null | undefined): string {
  if (!url) return "";
  if (!url.includes(".blob.vercel-storage.com")) return url;
  return `/api/blob?url=${encodeURIComponent(url)}`;
}

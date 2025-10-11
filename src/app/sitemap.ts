import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_BASE_URL || 'https://stocksense.app'
  return [
    { url: `${base}/`, priority: 1 },
    { url: `${base}/dashboard`, priority: 0.9 },
    { url: `${base}/portfolio`, priority: 0.8 },
    { url: `${base}/research`, priority: 0.6 },
  ]
}

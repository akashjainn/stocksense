import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const host = process.env.NEXT_PUBLIC_BASE_URL || 'https://stocksense.app'
  return {
    rules: [{ userAgent: '*', allow: '/' }],
    sitemap: `${host}/sitemap.xml`,
    host,
  }
}

import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    /**
     * Locked down deliberately.
     *
     * The previous config ended with `{ hostname: '**' }`, which matches every
     * host on the internet. That turns /_next/image into an open image proxy:
     * anyone can pass any URL and have this deployment fetch, transcode and
     * cache it on their behalf, billed to this account.
     *
     * Dish photographs are now self-hosted under /public/dishes and do not need
     * a remote pattern at all. The two entries below are the only genuine
     * remote sources: Google account avatars in the nav, and upload.wikimedia
     * for anyone previewing a Commons image before it has been downloaded.
     */
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'upload.wikimedia.org' },
    ],
    // AVIF first — roughly 20% smaller than WebP at matched quality. Next falls
    // back to WebP automatically for browsers that do not send the Accept header.
    formats: ['image/avif', 'image/webp'],
    // Matches the card grid breakpoints so the optimiser is not generating
    // widths nothing ever requests.
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },

  experimental: {
    // Tree-shakes the icon/util barrel imports so a page does not pull the
    // whole of fuse.js's module graph into the client bundle.
    optimizePackageImports: ['fuse.js'],
  },

  async headers() {
    return [
      {
        // Dish images are content-addressed by dish id and only change when the
        // fetch script is re-run, so they are safe to cache hard at the edge.
        source: '/dishes/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ]
  },
}

export default nextConfig

import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.ftcdn.net' },
      { protocol: 'https', hostname: '**.unsplash.com' },
      { protocol: 'https', hostname: '**.istockphoto.com' },
      { protocol: 'https', hostname: '**.staticflickr.com' },
      { protocol: 'https', hostname: '**.indianveggiedelight.com' },
      { protocol: 'https', hostname: '**.marionskitchen.com' },
      { protocol: 'https', hostname: '**.seriouseats.com' },
      { protocol: 'https', hostname: '**.indianhealthyrecipes.com' },
      { protocol: 'https', hostname: '**.awesomecuisine.com' },
      { protocol: 'https', hostname: '**.carameltintedlife.com' },
      { protocol: 'https', hostname: '**.kalimirchbysmita.com' },
      { protocol: 'https', hostname: '**.pariwaardelights.s3.us-east-1.amazonaws.com' },
      { protocol: 'https', hostname: 'beingwholesome.wordpress.com' },
      { protocol: 'http', hostname: '**' },
      { protocol: 'https', hostname: '**' },
    ],
  },
}

export default nextConfig

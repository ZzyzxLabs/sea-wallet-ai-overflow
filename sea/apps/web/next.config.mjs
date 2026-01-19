/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  transpilePackages: ["@workspace/ui"],
  async rewrites() {
    return [
      // Aggregator 重寫規則
      {
        source: '/aggregator1/v1/:path*',
        destination: 'https://aggregator.walrus-testnet.walrus.space/v1/:path*',
      },
      {
        source: '/aggregator2/v1/:path*',
        destination: 'https://wal-aggregator-testnet.staketab.org/v1/:path*',
      },
      {
        source: '/aggregator3/v1/:path*',
        destination: 'https://walrus-testnet-aggregator.redundex.com/v1/:path*',
      },
      {
        source: '/aggregator4/v1/:path*',
        destination: 'https://walrus-testnet-aggregator.nodes.guru/v1/:path*',
      },
      {
        source: '/aggregator5/v1/:path*',
        destination: 'https://aggregator.walrus.banansen.dev/v1/:path*',
      },
      {
        source: '/aggregator6/v1/:path*',
        destination: 'https://walrus-testnet-aggregator.everstake.one/v1/:path*',
      },
      // Publisher 重寫規則
      {
        source: '/publisher1/v1/:path*',
        destination: 'https://publisher.walrus-testnet.walrus.space/v1/:path*',
      },
      {
        source: '/publisher2/v1/:path*',
        destination: 'https://wal-publisher-testnet.staketab.org/v1/:path*',
      },
      {
        source: '/publisher3/v1/:path*',
        destination: 'https://walrus-testnet-publisher.redundex.com/v1/:path*',
      },
      {
        source: '/publisher4/v1/:path*',
        destination: 'https://walrus-testnet-publisher.nodes.guru/v1/:path*',
      },
      {
        source: '/publisher5/v1/:path*',
        destination: 'https://publisher.walrus.banansen.dev/v1/:path*',
      },
      {
        source: '/publisher6/v1/:path*',
        destination: 'https://walrus-testnet-publisher.everstake.one/v1/:path*',
      },
    ];
  }
}

export default nextConfig

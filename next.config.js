/** @type {import('next').NextConfig} */
module.exports = {
    reactStrictMode: true,
    experimental: {
        allowedDevOrigins: ['https://xsmb.win'],
    },
    env: {
        BACKEND_URL: process.env.BACKEND_URL,
    },
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'drive.google.com',
                port: '',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'i1-vnexpress.vnecdn.net',
                port: '',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'th.bing.com',
                port: '',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: '**',
                port: '',
                pathname: '/**',
            },
        ],
        domains: [],
    },
    async redirects() {
        return [
            {
                source: '/:path*',
                has: [{ type: 'host', value: 'www.xsmb.win' }],
                destination: 'https://xsmb.win/:path*',
                permanent: true,
            },
            { source: '/xsmb/', destination: '/ket-qua-xo-so-mien-bac', permanent: true },
            { source: '/xosomn/', destination: '/ket-qua-xo-so-mien-nam', permanent: true },
            { source: '/xosomt/', destination: '/ket-qua-xo-so-mien-trung', permanent: true },
            { source: '/soicauMB', destination: '/soicau/soi-cau-mien-bac', permanent: true },
            { source: '/soicauMT', destination: '/soicau/soi-cau-mien-trung', permanent: true },
            { source: '/TaoDan', destination: '/tao-dan-de-dac-biet', permanent: true },
            { source: '/TaoDanD/2D/', destination: '/taodande/dan-2d/tao-dan-de-2d', permanent: true },
            { source: '/TaoDanD/3D4D/', destination: '/taodande/dan-3d4d/tao-dan-de-3d4d', permanent: true },
            { source: '/thongke/giaidacbiettuan', destination: '/thongke/giai-dac-biet-tuan', permanent: true },
            { source: '/thongke/dauduoi', destination: '/thongke/dau-duoi', permanent: true },
        ];
    },
};
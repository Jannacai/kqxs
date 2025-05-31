/** @type {import('next').NextConfig} */
module.exports = {
    reactStrictMode: true,
    experimental: {
        allowedDevOrigins: ['https://xsmb.win'],
    },
    env: {
        BACKEND_URL: process.env.BACKEND_URL,
    },
    async rewrites() {
        return [
            { source: '/xsmb', destination: '/ket-qua-xo-so-mien-bac' },
            { source: '/xosomn', destination: '/ket-qua-xo-so-mien-nam' },
            { source: '/xosomt', destination: '/ket-qua-xo-so-mien-trung' },
            { source: '/soicauMB', destination: '/soicau/soi-cau-mien-bac' },
            { source: '/soicauMT', destination: '/soicau/soi-cau-mien-trung' },
            { source: '/TaoDan', destination: '/tao-dan-dac-biet' },
        ];
    },
};
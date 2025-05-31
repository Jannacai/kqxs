/** @type {import('next').NextConfig} */
module.exports = {
    reactStrictMode: true,
    experimental: {
        allowedDevOrigins: ['https://xsmb.win'],
    },
    env: {
        BACKEND_URL: process.env.BACKEND_URL,
    },
    async redirects() {
        return [
            { source: '/xsmb', destination: '/ket-qua-xo-so-mien-bac', permanent: true },
            { source: '/xosomn', destination: '/ket-qua-xo-so-mien-nam', permanent: true },
            { source: '/xosomt', destination: '/ket-qua-xo-so-mien-trung', permanent: true },
            { source: '/soicauMB', destination: '/soicau/soi-cau-mien-bac', permanent: true },
            { source: '/soicauMT', destination: '/soicau/soi-cau-mien-trung', permanent: true },
            { source: '/TaoDan', destination: '/tao-dan-dac-biet', permanent: true },
        ];
    },
};
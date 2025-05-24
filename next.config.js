/** @type {import('next').NextConfig} */
module.exports = {
    reactStrictMode: true,
    experimental: {
        allowedDevOrigins: ['https://xsmb.win/', '192.168.2.198'],
    },
    env: {
        BACKEND_URL: process.env.BACKEND_URL,
    },
    async rewrites() {
        return [
            { source: '/xsmb', destination: '/ket-qua-xo-so-mien-bac' },
            { source: '/xosomn', destination: '/ket-qua-xo-so-mien-nam' },
            { source: '/xosomt', destination: '/ket-qua-xo-so-mien-trung' },
            // Thêm các rewrite khác nếu cần
        ];
    },
};
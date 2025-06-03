module.exports = {
    siteUrl: 'https://xsmb.win',
    generateRobotsTxt: true,
    changefreq: 'daily',
    priority: 1.0,
    sitemapSize: 5000,
    excludeNamespaces: ['news', 'xhtml', 'mobile', 'image', 'video'],
    additionalPaths: async (config) => {
        const result = [
            {
                loc: '/ket-qua-xo-so-mien-bac',
                lastmod: new Date().toISOString().split('T')[0],
                changefreq: 'daily',
                priority: 0.9,
            },
            {
                loc: '/ket-qua-xo-so-mien-nam',
                lastmod: new Date().toISOString().split('T')[0],
                changefreq: 'daily',
                priority: 0.8,
            },
            {
                loc: '/ket-qua-xo-so-mien-trung',
                lastmod: new Date().toISOString().split('T')[0],
                changefreq: 'daily',
                priority: 0.8,
            },
            {
                loc: '/tao-dan-de-dac-biet',
                lastmod: new Date().toISOString().split('T')[0],
                changefreq: 'weekly',
                priority: 0.8,
            },
            {
                loc: '/taodande/dan-2d/tan-dan-de-2d',
                lastmod: new Date().toISOString().split('T')[0],
                changefreq: 'weekly',
                priority: 0.8,
            },
            {
                loc: '/taodande/dan-3d4d/tan-dan-de-3d4d',
                lastmod: new Date().toISOString().split('T')[0],
                changefreq: 'weekly',
                priority: 0.8,
            },
            {
                loc: '/taodande/tao-dan-ngau-nhien9x0x',
                lastmod: new Date().toISOString().split('T')[0],
                changefreq: 'weekly',
                priority: 0.8,
            },
            {
                loc: '/soicau/soi-cau-mien-bac',
                lastmod: new Date().toISOString().split('T')[0],
                changefreq: 'daily',
                priority: 0.8,
            },
            {
                loc: '/soicau/soi-cau-mien-trung',
                lastmod: new Date().toISOString().split('T')[0],
                changefreq: 'daily',
                priority: 0.8,
            },
            {
                loc: '/thongke/lo-gan',
                lastmod: new Date().toISOString().split('T')[0],
                changefreq: 'weekly',
                priority: 0.8,
            },
            {
                loc: '/thongke/giai-dac-biet',
                lastmod: new Date().toISOString().split('T')[0],
                changefreq: 'weekly',
                priority: 0.8,
            },
            {
                loc: '/thongke/dau-duoi',
                lastmod: new Date().toISOString().split('T')[0],
                changefreq: 'weekly',
                priority: 0.8,
            },
            {
                loc: '/thongke/giai-dac-biet-tuan',
                lastmod: new Date().toISOString().split('T')[0],
                changefreq: 'weekly',
                priority: 0.8,
            },
        ];
        const today = new Date();
        for (let i = 0; i < 30; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            const formattedDate = `${date.getDate().toString().padStart(2, '0')}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getFullYear()}`;
            result.push({
                loc: `/xsmb/${formattedDate}`,
                lastmod: date.toISOString().split('T')[0],
                changefreq: i === 0 ? 'daily' : 'never',
                priority: 0.7,
            });
        }
        return result;
    },
};
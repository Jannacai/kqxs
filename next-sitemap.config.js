module.exports = {
    siteUrl: 'https://xsmb.win',
    generateRobotsTxt: true,
    changefreq: 'daily',
    priority: 1.0,
    sitemapSize: 5000,
    additionalPaths: async (config) => {
        const result = [];
        const today = new Date();
        for (let i = 0; i < 30; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            const formattedDate = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
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
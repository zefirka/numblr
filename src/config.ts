const config = {
    port: process.env.PORT || 8081,
    saved: process.env.STATIC_DIR || 'static/saved',
    pageSize: process.env.PAGE_SIZE ? Number(process.env.PAGE_SIZE) : 20,
    useCache: process.env.USE_CACHE ? Boolean(process.env.USE_CACHE) : true,
    apiUrl: '',
};

config.apiUrl = `http://localhost${config.port === '80' ? '' : ':' + config.port}`;

export default config;

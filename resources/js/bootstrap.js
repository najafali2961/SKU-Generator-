import axios from 'axios';
window.axios = axios;

window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
window.axios.interceptors.request.use(async function (config) {
    config.headers.Authorization = `Bearer ${await shopify.idToken()}`;
    return config;
}, function (error) {
    return Promise.reject(error);
});

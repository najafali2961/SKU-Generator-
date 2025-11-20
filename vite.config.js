import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [
        laravel({
            input: 'resources/js/app.jsx',
            refresh: true,
        }),
        react(),
    ],
    server: {
        cors: {
            origin: 'https://bulkapp.omni-sync.com',
            methods: 'GET,POST,HEAD,PUT,PATCH,DELETE,OPTIONS',
            credentials: true,
        },
    },
});

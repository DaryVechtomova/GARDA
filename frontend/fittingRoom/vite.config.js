import { defineConfig } from 'vite';

export default defineConfig({
    server: {
        allowedHosts: [
            '.ngrok-free.app', // Дозволяє всі хости, що закінчуються на .ngrok-free.app
        ],
    },
});
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        VitePWA({
          registerType: 'autoUpdate',
          manifest: {
            name: 'تایپ صوتی هوشمند',
            short_name: 'تایپ هوشمند',
            description: 'تبدیل گفتار به متن با دقت بالا و دستیار هوش مصنوعی',
            theme_color: '#4f46e5',
            background_color: '#ffffff',
            display: 'standalone',
            lang: 'fa',
            dir: 'rtl',
            icons: [
              {
                src: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iIzRmNDZlNSI+PHBhdGggZD0iTTEyIDE0Yy0xLjY2IDAtLTMtMS4zNC0zLTNWNWMwLTEuNjYgMS4zNC0zIDMtM3MzIDEuMzQgMyAzdjZjMCAxLjY2LTEuMzQgMy0zIDN6Ii8+PHBhdGggZD0iTTE3IDExYzAgMi43Ni0yLjI0IDUtNSA1cy01LTIuMjQtNS01SDVjMCAzLjUzIDIuODEgNi40NSA2LjMyIDYuOTJWMjFoMS4zNnYtMy4wOGMzLjUxLS40NyA2LjMyLTMuMzkgNi4zMi02LjkySDE3eiIvPjwvc3ZnPg==',
                sizes: '192x192',
                type: 'image/svg+xml'
              },
              {
                src: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iIzRmNDZlNSI+PHBhdGggZD0iTTEyIDE0Yy0xLjY2IDAtLTMtMS4zNC0zLTNWNWMwLTEuNjYgMS4zNC0zIDMtM3MzIDEuMzQgMyAzdjZjMCAxLjY2LTEuMzQgMy0zIDN6Ii8+PHBhdGggZD0iTTE3IDExYzAgMi43Ni0yLjI0IDUtNSA1cy01LTIuMjQtNS01SDVjMCAzLjUzIDIuODEgNi40NSA2LjMyIDYuOTJWMjFoMS4zNnYtMy4wOGMzLjUxLS40NyA2LjMyLTMuMzkgNi4zMi02LjkySDE3eiIvPjwvc3ZnPg==',
                sizes: '512x512',
                type: 'image/svg+xml'
              }
            ]
          }
        })
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});

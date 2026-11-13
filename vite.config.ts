import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

function productImagesAliasPlugin() {
  return {
    name: 'product-images-alias',
    configureServer(server: any) {
      server.middlewares.use((req: any, _res: any, next: any) => {
        if (req.url) {
          if (req.url.startsWith('/products/veg/')) {
            req.url = req.url.replace('/products/veg/', '/images/products/vegetables/');
          } else if (req.url.startsWith('/products/vegetables/')) {
            req.url = req.url.replace('/products/vegetables/', '/images/products/vegetables/');
          } else if (req.url.startsWith('/products/fruit/')) {
            req.url = req.url.replace('/products/fruit/', '/images/products/fruits/');
          } else if (req.url.startsWith('/products/fruits/')) {
            req.url = req.url.replace('/products/fruits/', '/images/products/fruits/');
          } else if (req.url.startsWith('/products/')) {
            req.url = req.url.replace('/products/', '/images/products/');
          }
        }
        next();
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), productImagesAliasPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
      dedupe: ['react', 'react-dom'],
    },
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'motion/react',
        'leaflet',
        'canvas-confetti',
        'swiper',
        'swiper/react',
        'swiper/modules',
      ],
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
              return 'vendor-react';
            }
            if (id.includes('node_modules/leaflet')) {
              return 'leaflet';
            }
            if (id.includes('node_modules/canvas-confetti')) {
              return 'confetti';
            }
            if (id.includes('node_modules/swiper')) {
              return 'vendor-swiper';
            }
            if (id.includes('node_modules/motion')) {
              return 'vendor-motion';
            }
            if (id.includes('node_modules/@supabase')) {
              return 'vendor-supabase';
            }
            if (id.includes('node_modules/lucide-react')) {
              return 'vendor-lucide';
            }
            if (id.includes('node_modules/gsap')) {
              return 'vendor-gsap';
            }
          },
        },
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      allowedHosts: true as true,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify - file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

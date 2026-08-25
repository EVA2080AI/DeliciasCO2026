import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: null, // registro manual en src/pwa.ts (chequeo de actualización cada hora)
      includeAssets: ["favicon.ico", "favicon-32.png", "apple-touch-icon.png", "pwa-192.png", "pwa-512.png"],
      workbox: {
        // Solo el app shell se precachea. Las imágenes se cachean bajo demanda (runtimeCaching).
        globPatterns: ["**/*.{js,css,html,ico,svg,woff,woff2}"],
        maximumFileSizeToCacheInBytes: 2 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/~oauth/, /^\/admin\/reset-password/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: { cacheName: "google-fonts-cache", expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: { cacheName: "gstatic-fonts-cache", expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
          {
            // Imágenes del CMS (Supabase Storage). Solo <img> (destination === 'image'): los fetch()
            // programáticos del optimizador de medios no pasan por aquí. Las rutas son únicas por
            // subida, así que un CacheFirst largo nunca sirve una imagen reemplazada.
            urlPattern: ({ url, request }) =>
              request.destination === "image" &&
              url.hostname === "sqshrqbopwmxkfkvmmtd.supabase.co" &&
              url.pathname.startsWith("/storage/v1/object/public/"),
            handler: "CacheFirst",
            options: {
              cacheName: "supabase-images",
              expiration: { maxEntries: 150, maxAgeSeconds: 60 * 60 * 24 * 30, purgeOnQuotaError: true },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: ({ url, request }) => request.destination === "image" && url.pathname.startsWith("/assets/"),
            handler: "StaleWhileRevalidate",
            options: { cacheName: "static-images", expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 } },
          },
        ],
      },
      manifest: {
        name: "DC Delicias Colombianas",
        short_name: "Delicias",
        description: "Pastelería artesanal colombiana en Bogotá. Pasteles de pollo, empanadas, café premium y más.",
        theme_color: "#b5441c",
        background_color: "#faf8f5",
        display: "standalone",
        orientation: "portrait-primary",
        start_url: "/",
        scope: "/",
        icons: [
          { src: "/pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "/pwa-512.png", sizes: "512x512", type: "image/png" },
          { src: "/pwa-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
        categories: ["food", "lifestyle"],
        lang: "es",
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    target: "es2020",
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (/[\\/]node_modules[\\/](react|react-dom|scheduler|react-router|react-router-dom|@remix-run)[\\/]/.test(id)) return "react-vendor";
            if (id.includes("@supabase")) return "supabase";
            if (id.includes("@tanstack")) return "query";
            if (id.includes("browser-image-compression")) return "admin";
            if (/[\\/]node_modules[\\/](framer-motion|motion-dom|motion-utils)[\\/]/.test(id)) return "motion";
            return "vendor";
          }
          // Admin y sus librerías exclusivas: un solo chunk que el público nunca descarga.
          if (
            id.includes("/src/pages/admin/") ||
            id.includes("/src/components/admin/") ||
            id.includes("/src/lib/mediaOptimizer") ||
            id.includes("/src/lib/storage") ||
            id.includes("/src/lib/imageCompression")
          ) return "admin";
          // Código compartido (hooks, componentes, libs): chunk propio para que Rollup no lo
          // arrastre dentro de "admin" (haría que la portada descargue todo el panel).
          if (/[\\/]src[\\/](components|hooks|lib|integrations|store|data|assets)[\\/]/.test(id)) return "app";
          return undefined;
        },
      },
    },
  },
}));

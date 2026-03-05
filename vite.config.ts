import path from "path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  const isDev = mode === "development";

  return {
    base: "./",

    server: {
      port: 3000,
      host: "0.0.0.0",
    },

    plugins: [
      react(),
      VitePWA({
        registerType: "autoUpdate",
        injectRegister: false,
        includeAssets: ["favicon.ico", "apple-touch-icon.png"],
        manifest: {
          name: "HELM Legal Office",
          short_name: "HELM",
          description: "HELM Legal Office – إدارة الموكلين والقضايا والحسابات والتذكيرات",
          theme_color: env.VITE_THEME_COLOR || "#0f172a",
          background_color: "#ffffff",
          display: "standalone",
          scope: "./",
          start_url: "./",
          icons: [
            {
              src: "./icons/icon-192.png",
              sizes: "192x192",
              type: "image/png",
            },
            {
              src: "./icons/icon-512.png",
              sizes: "512x512",
              type: "image/png",
            },
            {
              src: "./icons/icon-512-maskable.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable",
            },
          ],
        },
        workbox: {
          navigateFallback: "./index.html",
          // In dev (`vite`), Vite doesn't emit bundled assets to disk, so Workbox glob
          // patterns won't match anything under `dev-dist`. Keep dev clean and rely on
          // runtimeCaching. In production build, precache the real output.
          globPatterns: isDev ? [] : ["**/*.{js,css,html,ico,png,svg,woff2}", "assets/**/*"],

          // ✅ استثناء الملف الكبير حتى لا يفشل build
          globIgnores: ["**/brand/crest.png"],

          runtimeCaching: [
            {
              // Avoid caching API calls (Supabase, etc.)
              urlPattern: ({ url }) => url.pathname.includes("/rest/v1/") || url.hostname.includes("supabase"),
              handler: "NetworkOnly",
            },
            {
              urlPattern: ({ request }) => request.destination === "image",
              handler: "CacheFirst",
              options: {
                cacheName: "images",
                expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
            {
              urlPattern: ({ request }) => request.destination === "font",
              handler: "CacheFirst",
              options: {
                cacheName: "fonts",
                expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              },
            },
          ],
        },
        devOptions: {
          enabled: true,
        },
      }),
    ],

    define: {},

    resolve: {
      alias: {
        "@": path.resolve(__dirname, "."),
      },
    },

    build: {
      // Faster initial load + smaller main bundle (especially inside Electron)
      chunkSizeWarningLimit: 900,
      rollupOptions: {
        output: {
          manualChunks: {
            react: ["react", "react-dom"],
            charts: ["recharts"],
          },
        },
      },
    },
  };
});

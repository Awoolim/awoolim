// electron.vite.config.ts
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { join } from "path";
var __electron_vite_injected_dirname = "F:\\free_coding\\solution_challenge\\awoolim";
var electron_vite_config_default = defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        external: [
          "electron",
          "electron-devtools-installer",
          "electron-store",
          "@tensorflow/tfjs-node"
        ]
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    plugins: [svelte()],
    build: {
      rollupOptions: {
        input: {
          main: join(__electron_vite_injected_dirname, "/src/renderer/main/index.html"),
          setup: join(__electron_vite_injected_dirname, "/src/renderer/setup/index.html")
        }
      }
    }
  }
});
export {
  electron_vite_config_default as default
};

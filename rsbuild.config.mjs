import { defineConfig } from "@rsbuild/core";
import { pluginReact } from "@rsbuild/plugin-react";

export default defineConfig({
  html: {
    title: "NCH | New Calcutta Handloom",
    favicon: "./public/favicon.svg",
  },
  plugins: [pluginReact()],
  server: {
    port: 4000, // change this to your desired port
  },
});

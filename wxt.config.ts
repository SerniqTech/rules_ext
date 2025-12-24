import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
    manifest:{
        permissions: ["scripting", "activeTab"],
        action: {
          default_title: "Grid Ruler",
        },
    }
});

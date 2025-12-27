import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
    manifest:{
        version:"1.0.0",
        name:"New Grid Ruler",
        description:"Overlay adjustable grid lines and measure accurate distances directly on live webpages—fast and distraction-free.",
        permissions: ["scripting", "activeTab"],
        action: {
          default_title: "Click here to active grid ruler",
        },
    }
});

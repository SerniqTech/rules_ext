export default defineBackground(() => {
  browser.action.onClicked.addListener(async (tab)=>{
    if(!tab.id) return;

    await browser.scripting.executeScript({
      target:{tabId:tab.id},
      files:['/content-scripts/content.js']
    })
  })
});

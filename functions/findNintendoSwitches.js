const dayjs = require("dayjs");

async function findNintendoSwitches() {
  console.log(`Starting at ${dayjs().toISOString()}`);
  const { browser, page } = await openBrowser();
  for (const product of products) {
    await notifyProductAvailability(product, page);
  }
  await browser.close();
  await updateProductList(products);
  console.log(`Finished at ${dayjs().toISOString()}`);
}

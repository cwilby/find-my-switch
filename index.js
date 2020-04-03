require("dotenv").config();
const puppeteer = require("puppeteer");
const fs = require("fs").promises;
const dayjs = require("dayjs");
const slack = require("slack-notify")(process.env.SLACK_WEBHOOK_URL);
const twilio = require("twilio")(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN,
  { lazyLoading: true }
);

const products = require("./products");

findNintendoSwitches();
setInterval(findNintendoSwitches, 15 * 60 * 1000);

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

async function openBrowser() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({ width: 1680, height: 1050 });
  return { browser, page };
}

async function notifyProductAvailability(product, page) {
  try {
    if (product.found && dayjs(product.found).isSame(dayjs())) {
      return;
    }

    const productIsAvailable = await checkProductAvailability(product, page);
    if (productIsAvailable) {
      console.log(`🚨 Available! - ${product.url}`);
      product.found = dayjs().toISOString();
      await notify(product);
    } else {
      console.log(`🌵 Sold out.. - ${product.name}`);
    }

    await new Promise(resolve => setTimeout(resolve, 4000));
  } catch (e) {
    console.log("🚨Error scanning product", e);
    return false;
  }
}

async function checkProductAvailability(product, page) {
  await page.goto(product.url);

  if (product.url.includes("amazon")) {
    return checkAmazonAvailability(page);
  }

  if (product.url.includes("gamestop")) {
    return checkGamestopAvailability(page);
  }
}

async function checkAmazonAvailability(page) {
  const canAddToCart = await page.$("#add-to-cart-button");
  const inStock = !(await page.content()).match(/in stock on/gi);
  return canAddToCart && inStock;
}

async function checkGamestopAvailability(page) {
  const readyToOrder = await checkDataAttribute(page, "data-ready-to-order");
  const available = await checkDataAttribute("data-available");
  const isPreorder = await checkDataAttribute("data-is-preorder");
  return readyToOrder && (available || isPreorder);
}

async function checkDataAttribute(page, attr) {
  return page.$eval(
    "div.availability.product-availability.global-availability",
    (el, attribute) => el.getAttribute(attribute) === true,
    attr
  );
}

async function notify(product) {
  const message = `🚨 ${product.name} now available!  ${product.url}`;

  if (process.env.SMS_TO_NUMBER) {
    process.env.SMS_TO_NUMBER.split(",").forEach(to => {
      console.log("Sending SMS", { to, message });
      twilio.messages.create({
        from: process.env.TWILIO_PHONE_NUMBER,
        to,
        body: message
      });
    });
  }

  if (process.env.SLACK_WEBHOOK_URL) {
    slack.send({
      text: message,
      channel: process.env.SLACK_CHANNEL || "#general"
    });
  }
}

function updateProductList(products) {
  return fs.writeFile("products.json", JSON.stringify(products, null, 4));
}

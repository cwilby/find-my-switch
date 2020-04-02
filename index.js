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

const scanIntervalInMinutes = Number(process.env.SCAN_INTERVAL || 15);

tick();
setInterval(tick, scanIntervalInMinutes * 60 * 1000);

//

async function tick() {
  console.log(`Starting at ${dayjs().toISOString()}`);
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({ width: 1680, height: 1050 });
  await scanProductsForAvailability(products, page);
  await fs.writeFile("products.json", JSON.stringify(products, null, 4));
  await browser.close();
  console.log(`Finished at ${dayjs().toISOString()}`);
  console.log(
    `Next scan at ${dayjs()
      .add(scanIntervalInMinutes, "minutes")
      .toISOString()}`
  );
  return;
}

async function scanProductsForAvailability(products, page) {
  for (const product of products) {
    await scanProductForAvailability(product, page);
  }
}

async function scanProductForAvailability(product, page) {
  try {
    const oneDayAgo = dayjs().subtract(1, "day");

    if (!product.found || dayjs(product.found).isBefore(oneDayAgo)) {
      console.log(`Checking ${product.name}`);

      await page.goto(product.url);

      const canAddToCart = await page.$("#add-to-cart-button");
      const inStock = !(await page.content()).match(/in stock on/gi);
      const available = canAddToCart && inStock;

      if (available) {
        product.found = dayjs().toISOString();
        console.log(`${product.name} is available.`);
      } else {
        console.log(`${product.url} is not available.`);
      }

      await notify({ product, available });

      await new Promise(resolve => setTimeout(() => resolve(), 4000));
    }
  } catch (e) {
    console.log("🚨Error scanning product", e);
    return false;
  }
}

async function notify({ product, available }) {
  const message = available
    ? `${product.name} now available! ${product.url}`
    : `${product.name} is not available.`;

  if (available && process.env.SMS_TO_NUMBER) {
    process.env.SMS_TO_NUMBER.split(",").forEach(to => {
      console.log("Sending SMS", { to, message });
      twilio.messages.create({
        from: process.env.TWILIO_PHONE_NUMBER,
        to,
        body: message
      });
    });
  }

  slack.send({
    text: message,
    channel: process.env.SLACK_CHANNEL || "#general"
  });
}

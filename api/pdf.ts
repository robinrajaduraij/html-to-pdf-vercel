import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

export default async function handler(req: any, res: any) {
  /* -------------------- CORS HEADERS -------------------- */
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Handle preflight request
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  /* -------------------- METHOD CHECK -------------------- */
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  const { html } = req.body;

  if (!html) {
    return res.status(400).send("Missing HTML");
  }

  /* -------------------- PDF GENERATION -------------------- */
  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless,
  });

  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle0" });

  const pdf = await page.pdf({
    format: "A4",
    printBackground: true,
    margin: {
      top: "18mm",
      bottom: "18mm",
      left: "18mm",
      right: "18mm",
    },
  });

  await browser.close();

  /* -------------------- RESPONSE -------------------- */
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    'attachment; filename="proposal.pdf"'
  );

  return res.status(200).send(pdf);
}

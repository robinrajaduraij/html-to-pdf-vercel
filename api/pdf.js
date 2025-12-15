import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

export default async function handler(req, res) {
  /* -------------------- CORS -------------------- */
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  /* -------------------- METHOD CHECK -------------------- */
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  const { html } = req.body || {};

  if (!html) {
    return res.status(400).send("Missing HTML");
  }

  let browser;

  try {
    /* -------------------- LAUNCH BROWSER -------------------- */
    browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();

    await page.setContent(html, {
      waitUntil: "networkidle0",
    });

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

    /* -------------------- RESPONSE -------------------- */
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="proposal.pdf"'
    );

    return res.status(200).send(pdf);
  } catch (err) {
    console.error("PDF generation failed:", err);
    return res.status(500).send("PDF generation failed");
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}


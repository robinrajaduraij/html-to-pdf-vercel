// import chromium from "@sparticuz/chromium";
// import puppeteer from "puppeteer-core";

// export default async function handler(req, res) {
//   /* -------------------- CORS -------------------- */
//   res.setHeader("Access-Control-Allow-Origin", "*");
//   res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
//   res.setHeader("Access-Control-Allow-Headers", "Content-Type");

//   if (req.method === "OPTIONS") {
//     return res.status(200).end();
//   }

//   /* -------------------- METHOD CHECK -------------------- */
//   if (req.method !== "POST") {
//     return res.status(405).send("Method Not Allowed");
//   }

//   const { html } = req.body || {};

//   if (!html) {
//     return res.status(400).send("Missing HTML");
//   }

//   let browser;

//   try {
//     /* -------------------- LAUNCH BROWSER -------------------- */
//     browser = await puppeteer.launch({
//       args: chromium.args,
//       executablePath: await chromium.executablePath(),
//       headless: chromium.headless,
//     });

//     const page = await browser.newPage();

//     await page.setContent(html, {
//       waitUntil: "networkidle0",
//     });

//     const pdf = await page.pdf({
//       format: "A4",
//       printBackground: true,
//       margin: {
//         top: "18mm",
//         bottom: "18mm",
//         left: "18mm",
//         right: "18mm",
//       },
//     });

//     /* -------------------- RESPONSE -------------------- */
//     res.setHeader("Content-Type", "application/pdf");
//     res.setHeader(
//       "Content-Disposition",
//       'attachment; filename="proposal.pdf"'
//     );

//     return res.status(200).send(pdf);
//   } catch (err) {
//     console.error("PDF generation failed:", err);
//     return res.status(500).send("PDF generation failed");
//   } finally {
//     if (browser) {
//       await browser.close();
//     }
//   }
// }



import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import { PDFDocument } from "pdf-lib";

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

  const { html, pdfAttachments = [] } = req.body || {};

  if (!html) {
    return res.status(400).send("Missing HTML");
  }

  let browser;

  try {
    /* -------------------- RENDER HTML → PDF -------------------- */
    browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();

    await page.setContent(html, {
      waitUntil: "networkidle0",
    });

    const htmlPdfBytes = await page.pdf({
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
    browser = null;

    /* -------------------- LOAD BASE PDF -------------------- */
    const finalPdf = await PDFDocument.load(htmlPdfBytes);

    /* -------------------- APPEND ATTACHED PDFs (VECTOR SAFE) -------------------- */
    for (const attachment of pdfAttachments) {
      try {
        const bytes = Buffer.from(attachment.data, "base64");
        const srcDoc = await PDFDocument.load(bytes);

        const pages = await finalPdf.copyPages(
          srcDoc,
          srcDoc.getPageIndices()
        );

        pages.forEach((p) => finalPdf.addPage(p));
      } catch (err) {
        console.warn(
          `Failed to append PDF attachment: ${attachment.name}`,
          err
        );
      }
    }

    /* -------------------- RETURN MERGED PDF -------------------- */
    const mergedPdfBytes = await finalPdf.save();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="proposal.pdf"'
    );

    return res.status(200).send(Buffer.from(mergedPdfBytes));
  } catch (err) {
    console.error("PDF generation failed:", err);
    return res.status(500).send("PDF generation failed");
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

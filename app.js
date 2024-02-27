const express = require("express");
const multer = require("multer");
const sharp = require("sharp");
const fs = require("fs");
const archiver = require("archiver");
const path = require("path");
const app = express();
const port = 3000;

// Configure multer for image uploads
const upload = multer({ dest: "uploads/" });

// Serve HTML form at root
app.get("/", (req, res) => {
  const indexPath = path.join(__dirname, "index.html"); // Adjust the path according to your file structure
  fs.readFile(indexPath, "utf8", (err, html) => {
    if (err) {
      res.status(500).send("Sorry, something went wrong");
      console.error(err);
      return;
    }
    res.send(html);
  });
});

app.post("/upload", upload.array("images"), async (req, res) => {
  // Extract color from form data, default to '#808080' if not provided
  const customColor = req.body.color || "#808080";

  const output = fs.createWriteStream("placeholders.zip");
  const archive = archiver("zip", { zlib: { level: 9 } });

  output.on("close", () => {
    res.download("placeholders.zip", "placeholders.zip", (err) => {
      if (err) {
        console.error("Error sending file", err);
      }
      fs.unlinkSync("placeholders.zip"); // Clean up zip file after sending
    });
  });

  archive.on("error", (err) => {
    throw err;
  });

  archive.pipe(output);

  for (const file of req.files) {
    const metadata = await sharp(file.path).metadata();
    const dimensionsText = `${metadata.width}p x ${metadata.height}p`;

    // Calculate font size as 30% of image width
    const fontSize = metadata.width * 0.1;
    const svg = `
      <svg width="${metadata.width}" height="${metadata.height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="${customColor}"/>
        <text x="50%" y="50%" alignment-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="${fontSize}px" fill="white">${dimensionsText}</text>
      </svg>
    `;

    try {
      const buffer = await sharp(Buffer.from(svg))
        .toFormat(metadata.format)
        .toBuffer();
      const sanitizedOriginalName = sanitizeFileName(
        path.basename(file.originalname),
      );
      archive.append(buffer, { name: `${sanitizedOriginalName}` });
    } catch (error) {
      console.error("Error processing image:", error);
      res.status(500).send("An error occurred while generating placeholders.");
      return;
    } finally {
      fs.unlinkSync(file.path); // Cleanup the uploaded file
    }
  }

  archive.finalize();
});

function sanitizeFileName(fileName) {
  // Replace spaces with underscores
  // let sanitized = fileName.replace(/\s+/g, "_");
  // it is not good to change space if there is because we will use it in our html template to replace all images
  // therefore same name needed. keeping above function for future option in the UI.

  // Remove or replace other non-standard or special characters
  // This regex removes anything that's not a letter, number, underscore, or dot.
  return fileName.replace(/[^a-zA-Z0-9._\s-]/g, "");
}

app.listen(port, () =>
  console.log(`Server running on http://localhost:${port}`),
);

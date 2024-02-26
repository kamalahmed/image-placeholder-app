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
  res.send(`
    <h2>Upload Images</h2>
    <form action="/upload" method="post" enctype="multipart/form-data">
      <div>
        <label>Select images to upload (PNG or JPEG):</label>
        <input type="file" name="images" multiple>
      </div>
      <div>
        <label>Background Color:</label>
        <input type="color" name="color" value="#808080">
      </div>
      <div>
        <label>Placeholder Text (optional):</label>
        <input type="text" name="placeholderText">
      </div>
      <button type="submit">Upload and Generate Placeholders</button>
    </form>
  `);
});

app.post("/upload", upload.array("images"), async (req, res) => {
  const color = req.body.color || "#808080"; // Default color if none provided
  const text = req.body.placeholderText || ""; // Default text if none provided
  const output = fs.createWriteStream("placeholders.zip");
  const archive = archiver("zip", {
    zlib: { level: 9 }, // Compression level
  });

  output.on("close", function () {
    console.log(archive.pointer() + " total bytes");
    console.log(
      "Archiver has been finalized and the output file descriptor has closed.",
    );
    res.download("placeholders.zip", "placeholders.zip", (err) => {
      if (err) {
        console.error("Error sending file", err);
      }
      try {
        fs.unlinkSync("placeholders.zip"); // Clean up zip file after sending
      } catch (err) {
        console.error("Error removing zip file", err);
      }
    });
  });

  archive.on("error", function (err) {
    throw err;
  });

  archive.pipe(output);

  try {
    for (const file of req.files) {
      const metadata = await sharp(file.path).metadata();
      const placeholder = await sharp({
        create: {
          width: metadata.width,
          height: metadata.height,
          channels: 4,
          background: color,
        },
      })
        .png()
        .toBuffer();

      // You can optionally add placeholder text here if required

      // Add the placeholder image to the archive
      archive.append(placeholder, {
        name: `${path.basename(file.originalname, path.extname(file.originalname))}.png`,
      });
    }

    // Finalize the archive (this will trigger the 'close' event on the output stream)
    archive.finalize();
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred while generating placeholders.");
  } finally {
    // Cleanup uploaded files
    req.files.forEach((file) => fs.unlinkSync(file.path));
  }
});

app.listen(port, () =>
  console.log(`Server running on http://localhost:${port}`),
);

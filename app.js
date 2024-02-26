const express = require("express");
const multer = require("multer");
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const app = express();
const upload = multer({ dest: "uploads/" });

app.post("/upload", upload.single("image"), async (req, res) => {
  try {
    const filePath = req.file.path;
    const placeholder = await createPlaceholder(filePath);

    res.type("png");
    placeholder.pipe(res);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

const createPlaceholder = async (filePath) => {
  const metadata = await sharp(filePath).metadata();
  return sharp({
    create: {
      width: metadata.width,
      height: metadata.height,
      channels: 3,
      background: { r: 150, g: 150, b: 150 },
    },
  }).png();
};

const port = 3000;
app.listen(port, () =>
  console.log(`Server running on port http://localhost:${port}`),
);

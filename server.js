const express = require("express");
const bodyParser = require("body-parser");
const multer = require("multer");
const upload = multer(); // Handles multipart/form-data

const app = express();
const port = 3000;

app.use(bodyParser.json()); // For parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded

app.post(
  "/upload",
  upload.fields([{ name: "image" }, { name: "massData" }]),
  (req, res) => {
    // Log the mass data received
    const massData = req.body.massData; // This is the JSON string
    console.log("Mass Data Received:", massData);

    // Check if mass data exists
    if (!massData) {
      return res.status(400).json({ error: "Mass data is required" });
    }

    // Log received image data (optional)
    const image = req.files.image[0]; // The image file
    console.log("Image size:", image.size); // Log the size of the uploaded image

    // Simulate processing and response
    const responseData = {
      status: "success",
      message: "Data received successfully",
      calories: 250, // Example value
      carbs: 30, // Example value
      protein: 20, // Example value
      fat: 10, // Example value
    };

    // Send a JSON response
    res.json(responseData);
  }
);

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});

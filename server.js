import { FoodDataAPI } from './FoodDataAPI.js';
import express from 'express';
import bodyParser from 'body-parser';
import multer from 'multer';

const upload = multer(); // Handles multipart/form-data

const app = express();
const port = 3000;

app.use(bodyParser.json()); // For parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded

app.post(
  '/upload',
  upload.fields([{ name: "image" }, { name: "massData" }]),
  async (req, res) => {
    
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

    /*
      Rekognition Function calling goes here
      Sample string return is 'chicken'
    */
   
    let rekognitionResponse = 'chicken';

    const fdc = new FoodDataAPI();
    const foodID = await fdc.getFoodID(rekognitionResponse);
    console.log(foodID);
    if (!foodID) {
      console.log('Food ID not found.');
        
    } else {
      const nutrientInfo = await fdc.getNutrientInfo(foodID);

      //TODO calculate meal nutritional content based on serving size. 
      //getNutrientInfo returns protien and kcals per 100g serving

      // Simulate processing and response
      const responseData = {
        status: "success",
        message: "Data received successfully",
        calories: nutrientInfo.calories,
        protein: nutrientInfo.protein
      };

      // Send a JSON response
      res.json(responseData);

    }


    
  }
);

app.get('/', (req, res) => {
  res.send('Welcome to the Food Data API!');
});

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});

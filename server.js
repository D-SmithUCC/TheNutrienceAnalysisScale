import { FoodDataAPI } from './FoodDataAPI.js';
import { processImage, rekognition } from './foodApp.js';
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
    try {
      // Handle massData if necessary
      // const massData = req.body.massData;

      // Use the uploaded image
      // const imageFile = req.files.image[0];
      // For this example, we're using a static image path
      const pathToImg = "./fried-egg-500x500.jpg";
      
      const params = await processImage(pathToImg);
      const rekognitionResponse = await rekognition(params);

      if (!rekognitionResponse) {
        return res.status(400).json({ error: 'No food items detected.' });
      }

      const fdc = new FoodDataAPI();
      const foodID = await fdc.getFoodID(rekognitionResponse);

      if (!foodID) {
        console.log('Food ID not found.');
        return res.status(400).json({ error: 'Food ID not found.' });
      } else {
        const nutrientInfo = await fdc.getNutrientInfo(foodID);

        // Simulate processing and response
        const responseData = {
          status: "success",
          message: "Data received successfully",
          food: rekognitionResponse,
          calories: nutrientInfo.calories,
          protein: nutrientInfo.protein
        };

        // Send a JSON response
        res.json(responseData);
      }
    } catch (error) {
      console.error('An error occurred:', error);
      res.status(500).json({ error: 'An internal server error occurred.' });
    }
  }
);

app.get('/', (req, res) => {
  res.send('Welcome to the Food Data API!');
});

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
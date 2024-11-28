import { FoodDataAPI } from './FoodDataAPI.js';
import { processImage, rekognition } from './foodApp.js';
import express from 'express';
import bodyParser from 'body-parser';
// Removed multer since we're handling JSON
// import multer from 'multer'; 

const app = express();
const port = 3000;

// Middleware to parse JSON and URL-encoded data
app.use(bodyParser.json()); // For parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded

// Route to handle POST /upload
app.post('/upload', async (req, res) => {
  try {
    console.log('POST /upload request received');

    // Extract massData from the request body
    const massDataRaw = req.body.massData;
    const massData = parseFloat(massDataRaw);

    // Validate massData
    if (isNaN(massData)) {
      console.error('Invalid or missing massData:', massDataRaw);
      return res.status(400).json({ error: 'Invalid or missing massData.' });
    }
    console.log(`Received massData: ${massData} grams`);

    // Use the static image path
    const pathToImg = "./fried-egg-500x500.jpg";
    console.log(`Processing image at path: ${pathToImg}`);

    // Process the image
    const params = await processImage(pathToImg);
    console.log('Image processed, params obtained:', params);

    // Perform rekognition
    const rekognitionResponse = await rekognition(params);
    console.log('Rekognition response received:', rekognitionResponse);

    if (!rekognitionResponse || rekognitionResponse.length === 0) {
      console.error('No food items detected.');
      return res.status(400).json({ error: 'No food items detected.' });
    }

    // Initialize FoodDataAPI
    const fdc = new FoodDataAPI();

    // Get Food ID
    const foodID = await fdc.getFoodID(rekognitionResponse);
    console.log(`Food ID obtained: ${foodID}`);

    if (!foodID) {
      console.error('Food ID not found.');
      return res.status(400).json({ error: 'Food ID not found.' });
    }

    // Get Nutrient Info
    const nutrientInfo = await fdc.getNutrientInfo(foodID);
    console.log(`Nutrient info obtained:`, nutrientInfo);

    // Validate nutrientInfo
    if (
      !nutrientInfo ||
      typeof nutrientInfo.calories !== 'number' ||
      typeof nutrientInfo.protein !== 'number'
    ) {
      console.error('Invalid nutrient information received:', nutrientInfo);
      return res.status(500).json({ error: 'Invalid nutrient information received.' });
    }

    // Calculate nutrients based on massData
    const calculatedCalories = (nutrientInfo.calories / 100) * massData;
    const calculatedProtein = (nutrientInfo.protein / 100) * massData;

    // Validate calculations
    if (isNaN(calculatedCalories) || isNaN(calculatedProtein)) {
      console.error('Calculation resulted in NaN:', {
        calculatedCalories,
        calculatedProtein
      });
      return res.status(500).json({ error: 'Error in nutrient calculations.' });
    }

    // Prepare response data
    const responseData = {
      food: rekognitionResponse,
      calories: calculatedCalories,
      protein: calculatedProtein
    };

    console.log('Sending response:', responseData);

    // Send a JSON response
    res.json(responseData);

  } catch (error) {
    console.error('An error occurred in /upload route:', error);
    res.status(500).json({ error: 'An internal server error occurred.' });
  }
});

// Root route for testing
app.get('/', (req, res) => {
  res.send('Welcome to the Food Data API!');
});

// Start the server
app.listen(port, '0.0.0.0', () => {
  console.log(`Server listening on http://localhost:${port}`);
});
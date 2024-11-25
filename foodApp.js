import fs from 'fs';
import path from 'path';
import mime from 'mime-types';
import { RekognitionClient, DetectLabelsCommand } from '@aws-sdk/client-rekognition';

async function processImage(passedImagePath) {
  try {
    // Resolve the absolute path
    const resolvedPath = path.resolve(passedImagePath);

    // Check if the file exists and is readable
    fs.accessSync(resolvedPath, fs.constants.F_OK | fs.constants.R_OK);

    // Check if it's a file (not a directory)
    const stats = fs.statSync(resolvedPath);
    if (!stats.isFile()) {
      throw new Error('The path does not point to a file.');
    }

    // Check if the file is an image
    const mimeType = mime.lookup(resolvedPath);
    if (!mimeType || !mimeType.startsWith('image/')) {
      throw new Error('The file is not an image.');
    }

    // Read image file
    const imageBytes = fs.readFileSync(resolvedPath);

    const params = {
      Image: {
        Bytes: imageBytes,
      },
      MaxLabels: 1,
      MinConfidence: 70,
    };

    return params;

  } catch (err) {
    throw err; // Let the caller handle the error
  }
}


// Function to detect labels
async function rekognition(params) {
  // Create a Rekognition client
  const client = new RekognitionClient({
    region: process.env.AWS_REGION,
  });

  // Create DetectLabelsCommand
  const command = new DetectLabelsCommand(params);

  try {
    const data = await client.send(command);
    console.log('Detected food items:');
    let detectedLabel = null;
    for (const label of data.Labels) {
      // Check if the label is related to food
      if (label.Parents.some((parent) => parent.Name.toLowerCase() === 'food')) {
        //console.log(`- ${label.Name} (${label.Confidence.toFixed(2)}% confidence)`);
        console.log(label);
        if (!label.Name.toLowerCase().includes('food')) {
          detectedLabel = label.Name.toLowerCase();
          break; // Exit loop when a label is found
        }
      }
    }
    if (!detectedLabel) {
      console.log('No specific food items detected.');
    }
    return detectedLabel;
  } catch (err) {
    console.error('Error detecting labels:', err);
    throw err; // Let the caller handle the error
  }
}

export { processImage, rekognition };
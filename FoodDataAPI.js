import 'node-fetch';

class FoodDataAPI {
    constructor() {
        this.APIKey = '9abVBer8hhAKbuNsoa9THuZ7XCiK5B64krQuRUU0';
    }

    async getNutrientInfo(foodID) {
        const url = `https://api.nal.usda.gov/fdc/v1/food/${foodID}?api_key=${this.APIKey}`;
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
        
            const protein = data.foodNutrients.find(nutrient => nutrient.nutrient.id === 1003).amount;

            //three different IDs for calories, 1008 is ideal but not always available
            //ex. searching for "chicken" does not return a nutrient with ID 1008, but includes 2047 and 2048
            //searching for "banana" includes ID 1008, but not 2047 nor 2048
            const kcals = data.foodNutrients.find(nutrient => nutrient.nutrient.id === 1008)?.amount || 
            data.foodNutrients.find(nutrient => nutrient.nutrient.id === 2047)?.amount ||
            data.foodNutrients.find(nutrient => nutrient.nutrient.id === 2048).amount;

            //Always returned per 100g serving
            return {
                protein: protein,
                calories: kcals,
            };
        } catch (error) {
            console.error('Error fetching nutrient info:', error);
            return null;
        }
    }

    async getFoodID(foodName) {
        //search for food and take first result
        const url = `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(foodName)}&dataType=Foundation&pageSize=1&pageNumber=1&api_key=${this.APIKey}`;
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            const topResult = data.foods[0];
            return topResult ? topResult.fdcId : null;
        } catch (error) {
            console.error('Error fetching food ID:', error);
            return null;
        }
    }
}

export { FoodDataAPI };

// Example usage
// (async () => {
//     const main = new Main();
//     const foodName = 'banana'; // Example food name
//     const foodID = await main.getFoodID(foodName);
//     if (foodID) {
//         const nutrientInfo = await main.getNutrientInfo(foodID);
//         console.log(`Nutrient Info for ${foodName}:`, nutrientInfo);
//     } else {
//         console.log('Food ID not found.');
//     }
// })();
#include <HX711.h>
#include <LiquidCrystal.h>
#include <WiFiNINA.h>
#include <ArduinoJson.h>

// HX711 circuit wiring
const int LOADCELL_DOUT_PIN = 2; // Data pin connected to D2
const int LOADCELL_SCK_PIN = 3;  // Clock pin connected to ICSP Pin 3
HX711 scale;

// LCD configuration
const int rs = 9, en = 10, d4 = 4, d5 = 5, d6 = 6, d7 = 7;
LiquidCrystal lcd(rs, en, d4, d5, d6, d7);

// FSR configuration
const int FSR_PIN = A0; // FSR connected to A0 (analog pin)
int fsrValue = 0;       // Variable to hold the FSR reading
int fsrThreshold = 300; // Threshold for the FSR to simulate a button press

// Double-click detection variables
unsigned long lastClickTime = 0;       // Time of the last click
unsigned long clickThreshold = 900;    // Time threshold to consider a double-click
bool fsrPressed = false;               // Tracks if FSR is currently pressed
bool singleClickPending = false;       // Tracks if a single click is pending

// Weight averaging variables
float weightSum = 0;
int weightCount = 0;
unsigned long weightStartTime = 0;
const unsigned long weightInterval = 1000; // 1-second average period
float lastKnownWeight = 0.0;                // Last stable weight for fallback

// WiFi and HTTP configuration
const char* WIFI_SSID = "Bens iPhone";        // Replace with your WiFi SSID
const char* WIFI_PASSWORD = "malvern122";     // Replace with your WiFi Password
const char* SERVER_IP = "172.20.10.13";       // Replace with your server's IP address
const int SERVER_PORT = 3000;                 // Replace with your server's port
const char* SERVER_ENDPOINT = "/upload";      // Replace with your server's endpoint
WiFiClient client;

void setup() {
  Serial.begin(57600);
  while (!Serial) {
    ; // Wait for Serial to initialize
  }
  Serial.println("Initializing HX711 and LCD...");

  // Initialize HX711
  scale.begin(LOADCELL_DOUT_PIN, LOADCELL_SCK_PIN);
  scale.set_scale(1073.f); // Adjust this value based on calibration
  scale.tare(); // Reset to 0

  // Initialize LCD
  lcd.begin(16, 2); 
  lcd.print("HX711 Ready");
  delay(2000);
  lcd.clear();

  // Connect to WiFi
  connectToWiFi();

  // Initialize timing for weight averaging
  weightStartTime = millis();
}

void loop() {
  // Handle FSR input for click detection
  fsrValue = analogRead(FSR_PIN);

  if (fsrValue > fsrThreshold) {
    if (!fsrPressed) { // First detection of press
      fsrPressed = true;
      unsigned long currentTime = millis();

      if (currentTime - lastClickTime < clickThreshold) {
        // Double-click detected
        doubleClickAction();
        singleClickPending = false; // Cancel pending single click
      } else {
        singleClickPending = true; // Single click might be pending
        lastClickTime = currentTime; // Save time for potential double click
      }
    }
  } else {
    fsrPressed = false; // Reset FSR state when released
  }

  // Check for pending single click (after clickThreshold has passed)
  if (singleClickPending && millis() - lastClickTime >= clickThreshold) {
    singleClickAction();
    singleClickPending = false;
  }

  // Handle 1-second averaging of the weight
  if (scale.is_ready()) {
    float currentWeight = scale.get_units();
    weightSum += currentWeight;
    weightCount++;

    // Check if the 1-second interval has passed
    if (millis() - weightStartTime >= weightInterval) {
      float averageWeight = weightSum / weightCount; // Compute average
      weightSum = 0; // Reset for next interval
      weightCount = 0;
      weightStartTime = millis(); // Reset timing

      // Display averaged weight on LCD
      lastKnownWeight = averageWeight; // Save for fallback
      lcd.setCursor(0, 1);
      lcd.print("Weight: ");
      lcd.print(averageWeight, 1); // Display with one decimal
      lcd.print(" g    "); // Ensure residual characters are cleared
    }
  } else {
    lcd.setCursor(0, 1);
    lcd.print("Scale Error!    "); // Clear residual characters
  }

  delay(100); // Delay for better readability
}

void singleClickAction() {
  lcd.setCursor(0, 1);
  lcd.print("Taring...       "); // Ensure any residual characters are cleared
  scale.tare(); // Tare the scale
  delay(2000);
  lcd.clear();
}

void doubleClickAction() {
  lcd.setCursor(0, 1);
  lcd.print("Sending Mass...");
  submitWeight(); // Post the weight
}

void submitWeight() {
  if (WiFi.status() != WL_CONNECTED) {
    lcd.setCursor(0, 1);
    lcd.print("WiFi Error      ");
    Serial.println("WiFi not connected.");
    return;
  }

  float weight = lastKnownWeight;

  Serial.print("Submitting weight: ");
  Serial.println(weight);

  if (client.connect(SERVER_IP, SERVER_PORT)) {
    Serial.println("Connected to server.");

    // Create JSON payload
    String jsonData = "{\"massData\":" + String(weight, 1) + "}"; // One decimal for float

    // Send HTTP headers
    client.println("POST " + String(SERVER_ENDPOINT) + " HTTP/1.1");
    client.println("Host: " + String(SERVER_IP) + ":" + String(SERVER_PORT)); // Include port
    client.println("User-Agent: ArduinoWiFi/1.1");
    client.println("Content-Type: application/json");
    client.print("Content-Length: ");
    client.println(jsonData.length());
    client.println("Connection: close"); // Ensure the server closes the connection
    client.println();

    // Send JSON payload without adding extra newline characters
    client.print(jsonData);
    Serial.println("Request sent:");
    Serial.println("POST " + String(SERVER_ENDPOINT) + " HTTP/1.1");
    Serial.println("Host: " + String(SERVER_IP) + ":" + String(SERVER_PORT));
    Serial.println("User-Agent: ArduinoWiFi/1.1");
    Serial.println("Content-Type: application/json");
    Serial.println("Content-Length: " + String(jsonData.length()));
    Serial.println("Connection: close");
    Serial.println();
    Serial.println(jsonData);

    // Await response
    String response = "";
    unsigned long timeout = millis();
    while (client.available() == 0) {
      if (millis() - timeout > 5000) { // 5-second timeout
        Serial.println("Server timeout");
        lcd.clear();
        lcd.setCursor(0, 1);
        lcd.print("Timeout!        ");
        client.stop();
        return;
      }
    }

    // Read the response
    while (client.available()) {
      String line = client.readStringUntil('\n');
      response += line + "\n"; // Accumulate the response line by line
    }
    Serial.println("Full Response:");
    Serial.println(response);

    // Extract JSON body from response
    int bodyStart = response.indexOf("\r\n\r\n");
    if (bodyStart != -1) {
      String body = response.substring(bodyStart + 4);
      Serial.println("JSON Body:");
      Serial.println(body);

      // Display result based on server response
      lcd.clear();
      lcd.setCursor(0, 1);
      if (body.indexOf("\"status\":\"success\"") != -1) {
        lcd.print("Submitted!      ");
        StaticJsonDocument<200> doc;
        DeserializationError error = deserializeJson(doc, body);
        if (error) {
          return;
        }
        int calories = (int) (doc["calories"].as<float>() + 0.5);
        int protein = (int) (doc["protein"].as<float>() + 0.5);

        lcd.clear();
        lcd.setCursor(0, 0);
        lcd.print("Calories: ");
        lcd.print(calories);
        lcd.setCursor(0, 1);
        lcd.print("Protein: ");
        lcd.print(protein);
        lcd.print(" g");
        delay(8000);
      } else {
        lcd.print("Post Failed     ");
      }
    } else {
      Serial.println("No JSON body found in response.");
      lcd.clear();
      lcd.setCursor(0, 1);
      lcd.print("Invalid Response!");
    }

    delay(2000);
    lcd.clear();
  } else {
    Serial.println("Connection failed");
    lcd.setCursor(0, 1);
    lcd.print("Post Failed     ");
    delay(2000);
    lcd.clear();
  }

  client.stop();
}

void connectToWiFi() {
  lcd.print("Connecting WiFi");
  Serial.println("Connecting to WiFi...");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.print(".");
    lcd.print(".");
  }

  lcd.clear();
  lcd.print("WiFi Connected");
  Serial.println("\nWiFi connected");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());
}

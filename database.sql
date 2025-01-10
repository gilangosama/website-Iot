CREATE DATABASE irigasidb;
USE irigasidb;

CREATE TABLE sensor_readings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    soil_moisture FLOAT,
    temperature FLOAT,
    humidity FLOAT,
    created_at DATETIME
);

CREATE TABLE weather_predictions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    prediction_today VARCHAR(255),
    prediction_tomorrow VARCHAR(255),
    created_at DATETIME
); 
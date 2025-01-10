<?php
require_once 'db_config.php';

header('Content-Type: application/json');

try {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if ($data['type'] === 'sensor_data') {
        $stmt = $pdo->prepare("INSERT INTO sensor_readings (soil_moisture, temperature, humidity, created_at) VALUES (?, ?, ?, NOW())");
        $stmt->execute([
            $data['soil_moisture'],
            $data['temperature'],
            $data['humidity']
        ]);
    } elseif ($data['type'] === 'weather_prediction') {
        $stmt = $pdo->prepare("INSERT INTO weather_predictions (prediction_today, prediction_tomorrow, created_at) VALUES (?, ?, NOW())");
        $stmt->execute([
            $data['prediction_today'],
            $data['prediction_tomorrow']
        ]);
    }
    
    echo json_encode(['status' => 'success']);
} catch(Exception $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
?> 
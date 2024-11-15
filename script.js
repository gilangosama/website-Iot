const mqttServer = 'wss://test.mosquitto.org:8081/mqtt';
const client = mqtt.connect(mqttServer);

client.on('connect', () => {
  console.log('Connected to MQTT broker');
  client.subscribe('irigasi/sensor_data', (err) => {
    if (!err) console.log('Subscribed to irigasi/sensor_data');
  });
  client.subscribe('irigasi/prediction', (err) => {
    if (!err) console.log('Subscribed to irigasi/prediction');
  });
});

client.on('message', (topic, message) => {
  const data = message.toString();
  if (topic === 'irigasi/sensor_data') {
    try {
      const sensorData = JSON.parse(data);
      document.getElementById('moistureLevel').innerHTML = `Kelembapan Tanah: <span>${sensorData.soil_moisture !== undefined ? sensorData.soil_moisture : 'Tidak Terdeteksi'}</span>`;
      document.getElementById('temperature').innerHTML = `Suhu: <span>${sensorData.temperature} °C</span>`;
      document.getElementById('humidity').innerHTML = `Kelembapan Udara: <span>${sensorData.humidity} %</span>`;
    } catch (error) {
      console.error('Error parsing sensor data JSON:', error);
    }
  } else if (topic === 'irigasi/prediction') {
    try {
      const weatherData = JSON.parse(data);
      document.getElementById('weatherPredictionToday').innerHTML = `Prediksi Cuaca Hari Ini: <span>${weatherData.prediction_today || 'Tidak ada prediksi'}</span>`;
      document.getElementById('weatherPredictionTomorrow').innerHTML = `Prediksi Cuaca Besok: <span>${weatherData.prediction_tomorrow || 'Tidak ada prediksi'}</span>`;
    } catch (error) {
      console.error('Error parsing weather data JSON:', error);
    }
  }
});

function togglePump() {
  client.publish('irigasi/relay', 'ON');
  setTimeout(() => {
    client.publish('irigasi/relay', 'OFF');
  }, 5000);
}

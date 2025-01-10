const mqttServer = 'wss://test.mosquitto.org:8081/mqtt';
const client = mqtt.connect(mqttServer);

let temperatureChart;
let humidityChart;
const maxDataPoints = 10;
const TEMPERATURE_STORAGE_KEY = 'temperature_data';
const HUMIDITY_STORAGE_KEY = 'humidity_data';
const SENSOR_VALUES_KEY = 'sensor_values';
const WEATHER_PREDICTION_KEY = 'weather_prediction';

const temperatureData = {
  labels: JSON.parse(localStorage.getItem(TEMPERATURE_STORAGE_KEY))?.labels || [],
  datasets: [
    {
      label: 'Suhu (°C)',
      data: JSON.parse(localStorage.getItem(TEMPERATURE_STORAGE_KEY))?.data || [],
      borderColor: '#e74c3c',
      tension: 0.4,
      fill: false,
    },
  ],
};

const humidityData = {
  labels: JSON.parse(localStorage.getItem(HUMIDITY_STORAGE_KEY))?.labels || [],
  datasets: [
    {
      label: 'Kelembapan (%)',
      data: JSON.parse(localStorage.getItem(HUMIDITY_STORAGE_KEY))?.data || [],
      borderColor: '#3498db',
      tension: 0.4,
      fill: false,
    },
  ],
};

function initializeCharts() {
  const commonOptions = {
    responsive: true,
    scales: {
      y: {
        beginAtZero: true,
      },
    },
    animation: {
      duration: 750,
    },
  };

  temperatureChart = new Chart(document.getElementById('temperatureChart'), {
    type: 'line',
    data: temperatureData,
    options: commonOptions,
  });

  humidityChart = new Chart(document.getElementById('humidityChart'), {
    type: 'line',
    data: humidityData,
    options: commonOptions,
  });

  loadSensorValues();
  loadWeatherPrediction();
}

function showNotification(message, type = 'error') {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.innerHTML = `
    <i class="fas fa-exclamation-circle"></i>
    <span>${message}</span>
    <button onclick="this.parentElement.remove()">×</button>
  `;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.classList.add('fade-out');
    notification.addEventListener('animationend', () => notification.remove());
  }, 5000);
}

client.on('connect', () => {
  console.log('Connected to MQTT broker');
  initializeCharts();
  client.subscribe('irigasi/sensor_data', (err) => {
    if (!err) console.log('Subscribed to irigasi/sensor_data');
  });
  client.subscribe('irigasi/prediction', (err) => {
    if (!err) console.log('Subscribed to irigasi/prediction');
  });
});

client.on('error', (error) => {
  console.error('MQTT connection error:', error);
  showNotification('Koneksi ke broker MQTT gagal.', 'error');
});

client.on('close', () => {
  console.warn('MQTT connection closed');
  showNotification('Koneksi ke broker MQTT terputus.', 'error');
});

let lastMessageTime = Date.now();
const checkInterval = 10000; // 10 detik

setInterval(() => {
  if (Date.now() - lastMessageTime > checkInterval) {
    showNotification('Tidak ada data yang diterima dari Wemos.', 'error');
  }
}, checkInterval);

client.on('message', (topic, message) => {
  lastMessageTime = Date.now(); // Update waktu terakhir pesan diterima
  const data = message.toString();
  if (topic === 'irigasi/sensor_data') {
    try {
      const sensorData = JSON.parse(data);

      document.getElementById('moistureLevel').innerHTML = `Kelembapan Tanah: <span>${sensorData.soil_moisture !== undefined ? sensorData.soil_moisture : 'Tidak Terdeteksi'}</span>`;
      document.getElementById('temperature').innerHTML = `Suhu: <span>${sensorData.temperature} °C</span>`;
      document.getElementById('humidity').innerHTML = `Kelembapan Udara: <span>${sensorData.humidity} %</span>`;

      localStorage.setItem(
        SENSOR_VALUES_KEY,
        JSON.stringify({
          soil_moisture: sensorData.soil_moisture,
          temperature: sensorData.temperature,
          humidity: sensorData.humidity,
        })
      );

      const timestamp = new Date().toLocaleTimeString();

      temperatureData.labels.push(timestamp);
      temperatureData.datasets[0].data.push(sensorData.temperature);
      if (temperatureData.labels.length > maxDataPoints) {
        temperatureData.labels.shift();
        temperatureData.datasets[0].data.shift();
      }
      temperatureChart.update();

      humidityData.labels.push(timestamp);
      humidityData.datasets[0].data.push(sensorData.humidity);
      if (humidityData.labels.length > maxDataPoints) {
        humidityData.labels.shift();
        humidityData.datasets[0].data.shift();
      }
      humidityChart.update();

      saveChartData();

      saveSensorData({
        type: 'sensor_data',
        ...sensorData,
      });
    } catch (error) {
      console.error('Error parsing sensor data JSON:', error);
    }
  } else if (topic === 'irigasi/prediction') {
    try {
      const weatherData = JSON.parse(data);

      document.getElementById('weatherPredictionToday').innerHTML = `Prediksi Cuaca Hari Ini: <span>${weatherData.prediction_today || 'Tidak ada prediksi'}</span>`;
      document.getElementById('weatherPredictionTomorrow').innerHTML = `Prediksi Cuaca Besok: <span>${weatherData.prediction_tomorrow || 'Tidak ada prediksi'}</span>`;

      updateIrrigationStatus(weatherData.prediction_today);

      localStorage.setItem(
        WEATHER_PREDICTION_KEY,
        JSON.stringify({
          today: weatherData.prediction_today,
          tomorrow: weatherData.prediction_tomorrow,
        })
      );

      saveSensorData({
        type: 'weather_prediction',
        ...weatherData,
      });
    } catch (error) {
      console.error('Error parsing weather data JSON:', error);
    }
  }
});

async function saveSensorData(data) {
  try {
    const response = await fetch('save_sensor_data.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();
    if (result.status !== 'success') {
      console.error('Error saving data:', result.message);
    }
  } catch (error) {
    console.error('Error saving data:', error);
  }
}

function togglePump() {
  client.publish('irigasi/relay', 'ON');
  setTimeout(() => {
    client.publish('irigasi/relay', 'OFF');
  }, 5000);
}

function saveChartData() {
  localStorage.setItem(
    TEMPERATURE_STORAGE_KEY,
    JSON.stringify({
      labels: temperatureData.labels,
      data: temperatureData.datasets[0].data,
    })
  );

  localStorage.setItem(
    HUMIDITY_STORAGE_KEY,
    JSON.stringify({
      labels: humidityData.labels,
      data: humidityData.datasets[0].data,
    })
  );
}

function clearChartData() {
  localStorage.removeItem(TEMPERATURE_STORAGE_KEY);
  localStorage.removeItem(HUMIDITY_STORAGE_KEY);

  temperatureData.labels = [];
  temperatureData.datasets[0].data = [];
  humidityData.labels = [];
  humidityData.datasets[0].data = [];

  temperatureChart.update();
  humidityChart.update();

  localStorage.removeItem(SENSOR_VALUES_KEY);
  document.getElementById('moistureLevel').innerHTML = 'Kelembapan Tanah: <span>Tidak Terdeteksi</span>';
  document.getElementById('temperature').innerHTML = 'Suhu: <span>-- °C</span>';
  document.getElementById('humidity').innerHTML = 'Kelembapan Udara: <span>-- %</span>';

  localStorage.removeItem(WEATHER_PREDICTION_KEY);
  document.getElementById('weatherPredictionToday').innerHTML = 'Prediksi Cuaca Hari Ini: <span>Tidak ada prediksi</span>';
  document.getElementById('weatherPredictionTomorrow').innerHTML = 'Prediksi Cuaca Besok: <span>Tidak ada prediksi</span>';
}

function loadSensorValues() {
  const savedValues = JSON.parse(localStorage.getItem(SENSOR_VALUES_KEY)) || {};

  document.getElementById('moistureLevel').innerHTML = `Kelembapan Tanah: <span>${savedValues.soil_moisture || 'Tidak Terdeteksi'}</span>`;
  document.getElementById('temperature').innerHTML = `Suhu: <span>${savedValues.temperature || '--'} °C</span>`;
  document.getElementById('humidity').innerHTML = `Kelembapan Udara: <span>${savedValues.humidity || '--'} %</span>`;
}

function loadWeatherPrediction() {
  const savedPrediction = JSON.parse(localStorage.getItem(WEATHER_PREDICTION_KEY)) || {};

  document.getElementById('weatherPredictionToday').innerHTML = `Prediksi Cuaca Hari Ini: <span>${savedPrediction.today || 'Tidak ada prediksi'}</span>`;
  document.getElementById('weatherPredictionTomorrow').innerHTML = `Prediksi Cuaca Besok: <span>${savedPrediction.tomorrow || 'Tidak ada prediksi'}</span>`;
}

function updateIrrigationStatus(weatherCondition) {
  const statusElement = document.getElementById('irrigationStatus');
  const durationElement = document.getElementById('irrigationDuration');
  let duration = 0;
  let status = '';

  switch (weatherCondition) {
    case 'Clear':
      duration = 6;
      status = 'Cerah';
      statusElement.style.color = '#e74c3c';
      break;
    case 'Partially cloudy':
      duration = 6;
      status = 'Berawan';
      statusElement.style.color = '#f39c12';
      break;
    case 'Rain, Partially cloudy':
      duration = 4;
      status = 'Hujan Ringan';
      statusElement.style.color = '#3498db';
      break;
    case 'Rain, Overcast':
      duration = 2;
      status = 'Hujan Sedang';
      statusElement.style.color = '#2ecc71';
      break;
    default:
      status = 'Tidak Diketahui atau Hujan Lebat';
      statusElement.style.color = '#95a5a6';
  }

  statusElement.textContent = status;
  durationElement.textContent = `Durasi: ${duration} detik`;
}

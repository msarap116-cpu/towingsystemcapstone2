//const API_BASE_URL = 'https://goodwrench-towing-rescue.onrender.com/api';
//export default API_BASE_URL;

// const API_BASE_URL = 'http://192.168.0.102:3000/api';
// export default API_BASE_URL;

// config.js
import { Platform } from 'react-native';

// Replace with YOUR computer's actual IP
const LAN_URL = 'http://192.168.0.103:3000/api'; // Your computer's IP

const PROD_URL = 'https://goodwrench-towing-rescue.onrender.com/api';

const USE_PROD = false; // Switch to false to test locally

const API_BASE_URL = USE_PROD ? PROD_URL : LAN_URL;

if (__DEV__) {
  console.log('🔧 Using API URL:', API_BASE_URL);
  console.log('📱 Platform:', Platform.OS);
}

export default API_BASE_URL;
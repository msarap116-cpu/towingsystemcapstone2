//const API_BASE_URL = 'https://goodwrench-towing-rescue.onrender.com/api';
//export default API_BASE_URL;

// const API_BASE_URL = 'http://192.168.0.102:3000/api';
// export default API_BASE_URL;

// // config.js
// import { Platform } from 'react-native';

// // Replace with YOUR computer's actual IP
// const LAN_URL = 'http://192.168.0.106:3000/api'; // Your computer's IP

// const PROD_URL = 'https://goodwrench-towing-rescue.onrender.com/api';

// const USE_PROD = false; // Switch to false to test locally

// const API_BASE_URL = USE_PROD ? PROD_URL : LAN_URL;

// if (__DEV__) {
//   console.log('🔧 Using API URL:', API_BASE_URL);
//   console.log('📱 Platform:', Platform.OS);
// }

// export default API_BASE_URL;


import { Platform } from 'react-native';

const LAN_URL = 'http://192.168.0.102:3000/api'; // local dev only
const PROD_URL = 'https://goodwrench-towing-rescue.onrender.com/api';

// Debug/Metro builds → LAN_URL automatically
// Release builds → PROD_URL automatically, no manual switch needed
const API_BASE_URL = __DEV__ ? LAN_URL : PROD_URL;

// const API_BASE_URL = PROD_URL;  // ← temporary override

if (__DEV__) {
  console.log('🔧 Using API URL:', API_BASE_URL);
  console.log('📱 Platform:', Platform.OS);
}

export default API_BASE_URL;
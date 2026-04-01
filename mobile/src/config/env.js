import { Platform } from 'react-native';
import brand from './brand.json';

function getDefaultApiBaseUrl() {
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:4000/api';
  }

  return 'http://localhost:4000/api';
}

export const envConfig = {
  appName: brand.appName,
  dataSource: process.env.EXPO_PUBLIC_DATA_SOURCE || 'api',
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || getDefaultApiBaseUrl(),
};

export function isApiMode() {
  return envConfig.dataSource === 'api';
}

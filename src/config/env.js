import brand from './brand.json';

export const envConfig = {
  appName: brand.appName,
  dataSource: 'mock',
  apiBaseUrl: 'https://api.example.com',
  supabase: {
    url: '',
    anonKey: '',
  },
};

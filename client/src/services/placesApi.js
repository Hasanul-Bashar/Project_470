import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

export const getNearbyPlaces = (lat, lng, radius = 2000) =>
  api.get('/places/nearby', { params: { lat, lng, radius } });

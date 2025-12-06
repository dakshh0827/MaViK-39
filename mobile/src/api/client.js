import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

// REPLACE WITH YOUR MACHINE'S LOCAL IP
const BASE_URL = "http://172.25.8.105:5000/api";

const client = axios.create({ baseURL: BASE_URL });

client.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("userToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default client;

import axios from "axios";
import { Platform } from "react-native";
import { auth } from "../config/firebase";

const ENV_BASE_URL =
  typeof process !== "undefined" &&
  process &&
  process.env &&
  process.env.EXPO_PUBLIC_API_BASE_URL
    ? process.env.EXPO_PUBLIC_API_BASE_URL
    : "";

const ENV_BASE_URL_WEB =
  typeof process !== "undefined" &&
  process &&
  process.env &&
  process.env.EXPO_PUBLIC_API_BASE_URL_WEB
    ? process.env.EXPO_PUBLIC_API_BASE_URL_WEB
    : "";

const BASE_URL =
  Platform.OS === "web"
    ? ENV_BASE_URL_WEB || "http://127.0.0.1:5000/api"
    : ENV_BASE_URL || "http://192.168.1.11:5000/api";

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 20000,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (!user) return config;
  try {
    const token = await user.getIdToken();
    if (!config.headers) config.headers = {};
    config.headers.Authorization = `Bearer ${token}`;
  } catch (_error) {
    // Keep request flow for non-protected endpoints.
  }
  return config;
});

export default apiClient;

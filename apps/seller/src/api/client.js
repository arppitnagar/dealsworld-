import axios from "axios";
import { auth } from "../config/firebase";

// Replace with your laptop's actual IP address (e.g., 192.168.1.5)
const BASE_URL = "http://192.168.1.8:5000/api";

const apiClient = axios.create({
  baseURL: BASE_URL,
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

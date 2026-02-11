import axios from "axios";

// Replace with your laptop's actual IP address (e.g., 192.168.1.5)
const BASE_URL = "http://192.168.1.8:5000/api";

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export default apiClient;

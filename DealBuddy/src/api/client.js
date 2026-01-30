import axios from "axios";

// Use your IP address so the physical device/emulator can reach the laptop
const BASE_URL = "http://192.168.1.7:5000/api";

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export default apiClient;

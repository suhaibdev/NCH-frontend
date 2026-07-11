// API Configuration - centralized for all frontend API calls
// This allows easy switching between development and production environments

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "https://nch-backend-1.onrender.com/api";

export default API_BASE_URL;
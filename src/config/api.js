// API Configuration - centralized for all frontend API calls
// This allows easy switching between development and production environments

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

if (!API_BASE_URL) {
  throw new Error(
    "VITE_API_BASE_URL is missing. Please configure environment variables."
  );
}

export default API_BASE_URL;
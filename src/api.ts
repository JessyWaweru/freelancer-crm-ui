import axios from "axios";

const api = axios.create({
    // axios.create() → Makes a reusable API object so you don’t have to type the base 
    // URL every time.
  baseURL: import.meta.env.VITE_API_BASE,
  
    // VITE_API_BASE → Environment variable set in .env file, pointing to the backend API.
    // This means calling:
    // api.get("/clients/")
    // will actually request:
    // http://127.0.0.1:8000/api/clients/
    withCredentials: true,  // 👈 Allows cookies to be sent with requests, useful for authentication.
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
// Interceptors → Functions that run before every request. Here it:
// Gets your saved JWT access token from localStorage.
// If it exists, adds it to the request’s headers

export default api;

// frontend/src/api/client.ts
import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:8000/api/v1",
  timeout: 10000,
});

// ✅ attach token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ✅ optional: auto-redirect on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      localStorage.removeItem("access_token");
      window.location.href = "/admin/login";
    }
    return Promise.reject(err);
  }
);

export default api;

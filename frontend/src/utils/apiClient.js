import axios from "axios";

export const api = axios.create({
  baseURL: "/api",
});

// Attach token from localStorage on every request so auth works even before
// AuthContext's useEffect runs (e.g. after full-page navigation or fast child mount).
api.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem("authToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (e) {}
  return config;
});

api.interceptors.response.use(
  (resp) => resp,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear any stored auth and redirect to login so user can re-authenticate.
      try {
        localStorage.removeItem("authToken");
        localStorage.removeItem("authUser");
      } catch (e) { }
      // If we're in a browser context, navigate to the login page.
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);


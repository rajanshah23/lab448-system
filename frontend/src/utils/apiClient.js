import axios from "axios";

export const api = axios.create({
  baseURL: "/api",
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


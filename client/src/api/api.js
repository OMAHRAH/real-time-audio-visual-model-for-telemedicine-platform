import axios from "axios";
import { API_BASE_URL } from "../config/runtime";

const API = axios.create({
  baseURL: API_BASE_URL,
});

// Attach token to every request
API.interceptors.request.use((req) => {
  const token = localStorage.getItem("token");

  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }

  return req;
});

export default API;

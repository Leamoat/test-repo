import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL;

export const api = axios.create({
  baseURL: `${BASE}/api`,
  timeout: 20000,
});

api.interceptors.request.use(async (cfg) => {
  const tok = await AsyncStorage.getItem("token");
  if (tok) cfg.headers.Authorization = `Bearer ${tok}`;
  return cfg;
});

export const setToken = async (t: string | null) => {
  if (t) await AsyncStorage.setItem("token", t);
  else await AsyncStorage.removeItem("token");
};

export const getToken = () => AsyncStorage.getItem("token");

export const formatErr = (e: any): string => {
  const d = e?.response?.data?.detail;
  if (!d) return e?.message || "Network error";
  if (typeof d === "string") return d;
  if (Array.isArray(d)) return d.map((x: any) => x?.msg || JSON.stringify(x)).join(", ");
  return String(d);
};

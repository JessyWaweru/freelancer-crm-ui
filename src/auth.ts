// Frontend auth helpers for the Django SimpleJWT backend.
import api from "./api";

export async function login(username: string, password: string) {
  const { data } = await api.post("/auth/token/", { username, password });
  localStorage.setItem("access", data.access);
  localStorage.setItem("refresh", data.refresh);
  localStorage.setItem("username", username);
}

export function logout() {
  localStorage.removeItem("access");
  localStorage.removeItem("refresh");
  localStorage.removeItem("username");
}

export function isAuthed() {
  return !!localStorage.getItem("access");
}

export function currentUsername() {
  return localStorage.getItem("username") ?? "";
}

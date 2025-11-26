//this is your frontend authentication helper that works with the Django JWT backend 
// you set up earlier.
import api from "./api";

export async function login(username: string, password: string) {
  const { data } = await api.post("/auth/token/", { username, password });
  localStorage.setItem("access", data.access);
  localStorage.setItem("refresh", data.refresh);
}
//Purpose → Log the user in and store JWT tokens for later API calls.
// api.post("/auth/token/", …) → Sends username & password to Django’s JWT endpoint
//  (TokenObtainPairView).
// Store tokens → Saves both tokens in localStorage so they persist even if the page is
//  reloaded.
export function logout() {
  localStorage.removeItem("access");
  localStorage.removeItem("refresh");
}

export function isAuthed() {
  return !!localStorage.getItem("access");
}
// Returns true if an access token exists, false if not.
// This is a quick way to decide if the user is logged in
// (e.g., for route guards in React).

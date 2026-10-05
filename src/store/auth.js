import { writable } from "svelte/store";

// Read from env, fallback to localhost
export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
export const user = writable(null);
export const authReady = writable(false);

export async function fetchMe() {
  try {
    const res = await fetch(`${API_URL}/api/auth/me`, {
      credentials: "include",
    });
    const data = await res.json();
    user.set(data.user);
  } catch (err) {
    console.error("fetchMe error:", err);
    user.set(null);
  } finally {
    authReady.set(true);
  }
}

export async function signup(username, password) {
  const res = await fetch(`${API_URL}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Signup failed");
  }
  user.set(data.user);
  return data.user;
}

export async function login(username, password) {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Login failed");
  }
  user.set(data.user);
  return data.user;
}

export async function logout() {
  await fetch(`${API_URL}/api/auth/logout`, {
    method: "POST",
    credentials: "include",
  });
  user.set(null);
}

export async function updateProfile(patch) {
  const res = await fetch(`${API_URL}/api/users/me`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(patch),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Update failed");
  }
  user.set(data.user);
  return data.user;
}

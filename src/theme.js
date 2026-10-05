import { writable } from "svelte/store";

// Read from localStorage or default to "light"
const stored = typeof localStorage !== "undefined"
    ? localStorage.getItem("chat_theme")
    : "light";

export const theme = writable(stored || "light");

// Apply theme to <html> whenever it changes
theme.subscribe((value) => {
    if (typeof document !== "undefined") {
        document.documentElement.setAttribute("data-theme", value);
        localStorage.setItem("chat_theme", value);
    }
});

export function toggleTheme() {
    theme.update((t) => (t === "light" ? "dark" : "light"));
}

// src/stores/auth.js
import { ref, computed } from "vue";

const isLoggedIn = ref(localStorage.getItem("isLoggedIn") === "true");
const user = ref(localStorage.getItem("user") || "");

function setLoggedIn(username) {
    localStorage.setItem("isLoggedIn", "true");
    localStorage.setItem("user", username);
    isLoggedIn.value = true;
    user.value = username;
}

async function logoutAndClear() {
    try {
        localStorage.clear();
        sessionStorage.clear();

        if ("caches" in window) {
            const keys = await caches.keys();
            await Promise.all(keys.map((k) => caches.delete(k)));
        }

        if ("serviceWorker" in navigator) {
            const regs = await navigator.serviceWorker.getRegistrations();
            await Promise.all(regs.map((r) => r.unregister()));
        }
    } catch (e) {
        console.warn("Logout cleanup failed:", e);
    } finally {
        isLoggedIn.value = false;
        user.value = "";
    }
}

function syncFromStorage() {
    isLoggedIn.value = localStorage.getItem("isLoggedIn") === "true";
    user.value = localStorage.getItem("user") || "";
}

export function useAuth() {
    return {
        isLoggedIn: computed(() => isLoggedIn.value),
        user: computed(() => user.value),
        setLoggedIn,
        logoutAndClear,
        syncFromStorage,
    };
}

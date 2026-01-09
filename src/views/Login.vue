<template>
    <div class="login-page">
        <div class="login-card">
            <h1 class="title">Login</h1>
            <p class="subtitle">Water Meter Dashboard</p>

            <form @submit.prevent="handleLogin">
                <div class="field">
                    <label>Username</label>
                    <input v-model="username" type="text" placeholder="admin" required />
                </div>

                <div class="field">
                    <label>Password</label>
                    <input v-model="password" type="password" placeholder="admin" required />
                </div>

                <div v-if="error" class="error">{{ error }}</div>

                <button type="submit" class="login-btn">Login</button>
            </form>
        </div>
    </div>
</template>

<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useAuth } from "../stores/auth";

const router = useRouter();
const { setLoggedIn } = useAuth();

const username = ref("");
const password = ref("");
const error = ref("");

function handleLogin() {
    if (username.value === "admin" && password.value === "admin") {
        setLoggedIn("admin");
        router.replace("/");
    } else {
        error.value = "Invalid username or password";
    }
}
</script>

<style scoped>
/* Page background */
.login-page {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f5f7fb;
    /* light grey background */
}

/* Card */
.login-card {
    width: 360px;
    padding: 32px;
    border-radius: 14px;
    background: #ffffff;
    /* white card */
    border: 1px solid #e5e7eb;
    box-shadow: 0 12px 28px rgba(0, 0, 0, 0.08);
}

/* Text */
.title {
    margin: 0;
    text-align: center;
    font-size: 24px;
    color: #111827;
}

.subtitle {
    margin: 6px 0 22px;
    text-align: center;
    font-size: 13px;
    color: #6b7280;
}

/* Fields */
.field {
    margin-bottom: 16px;
}

label {
    font-size: 13px;
    color: #374151;
}

input {
    width: 100%;
    margin-top: 6px;
    padding: 10px 12px;
    border-radius: 10px;
    border: 1px solid #d1d5db;
    background: #ffffff;
    color: #111827;
    outline: none;
}

input:focus {
    border-color: #4f8cff;
    box-shadow: 0 0 0 1px #4f8cff;
}

/* Button */
.login-btn {
    width: 100%;
    margin-top: 12px;
    padding: 12px;
    border-radius: 12px;
    border: none;
    background: #4f8cff;
    color: white;
    font-weight: 700;
    cursor: pointer;
}

.login-btn:hover {
    opacity: 0.9;
}

/* Error */
.error {
    margin-top: 8px;
    color: #dc2626;
    font-size: 13px;
    text-align: center;
}
</style>

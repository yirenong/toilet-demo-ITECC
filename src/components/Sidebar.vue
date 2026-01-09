<template>
    <aside :class="['app-sidebar', { collapsed }]">
        <div class="logo-section">
            <img src="../assets/cavill_logo2.png" alt="Logo" class="logo" />
        </div>

        <!-- Close button on mobile only -->
        <button class="close-btn" @click="$emit('toggle-sidebar')">&times;</button>

        <nav class="nav-content">
            <div class="menu-section">
                <span class="menu-title">MENU</span>
                <ul class="menu">
                    <li>
                        <router-link to="/" class="menu-link" @click="onLinkClick">
                            <i class="fas fa-home"></i>
                            <span class="link-text">Homepage</span>
                        </router-link>
                    </li>
                </ul>
            </div>
        </nav>

        <!-- 🔴 Logout section at bottom -->
        <div class="logout-section">
            <button class="menu-link logout-btn" @click="logout">
                <i class="fas fa-sign-out-alt"></i>
                <span class="link-text">Logout</span>
            </button>
        </div>
    </aside>
</template>

<script setup>
defineProps({ collapsed: Boolean })
const emit = defineEmits(['toggle-sidebar'])

const isMobile = () => window.matchMedia('(max-width: 768px)').matches
function onLinkClick() {
    if (isMobile()) emit('toggle-sidebar')
}

async function logout() {
    try {
        // 1) Clear storage
        localStorage.clear();
        sessionStorage.clear();

        // 2) Clear Cache Storage (PWA / SW caches)
        if ("caches" in window) {
            const keys = await caches.keys();
            await Promise.all(keys.map((k) => caches.delete(k)));
        }

        // 3) OPTIONAL: Unregister service workers (if you use one)
        if ("serviceWorker" in navigator) {
            const regs = await navigator.serviceWorker.getRegistrations();
            await Promise.all(regs.map((r) => r.unregister()));
        }
    } catch (e) {
        console.warn("Logout cleanup failed:", e);
    } finally {
        // 4) Redirect to login
        window.location.href = "/login";
    }
}

</script>

<style scoped>
.app-sidebar {
    position: fixed;
    top: 0;
    left: 0;
    height: 100vh;
    width: 15%;
    background: var(--sidebar-bg-color);
    color: var(--sidebar-text-color);
    padding-top: 24px;
    box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
    transition: width 0.3s, transform 0.3s;
    overflow: hidden;
    z-index: 2000;

    display: flex;
    flex-direction: column;
}

.app-sidebar.collapsed {
    width: 5%;
}

.nav-content {
    flex: 1;
}

.menu-section {
    margin-bottom: 32px;
}

.menu li {
    margin: 8px 0;
}

.menu-link {
    display: flex;
    align-items: center;
    padding: 12px 20px;
    color: inherit;
    text-decoration: none;
    border-radius: 4px;
    transition: background 0.2s;
    background: none;
    border: none;
    width: 100%;
    cursor: pointer;
}

.menu-link i {
    margin-right: 12px;
    font-size: 16px;
}

.menu-link:hover {
    background: var(--sidebar-hover-color);
}

.router-link-active {
    background: var(--sidebar-hover-color);
    border-left: 4px solid var(--header-icon-hover-color);
    padding-left: 12px;
}

.logo-section {
    text-align: center;
    margin-bottom: 32px;
}

.logo {
    height: 78px;
}

.menu-title {
    margin-left: 16px;
    margin-bottom: 8px;
    font-size: 11px;
    letter-spacing: 1px;
    text-transform: uppercase;
}

.link-text {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

/* 🔴 Logout styling */
.logout-section {
    padding: 16px;
    border-top: 1px solid var(--sidebar-hover-color);
}

.logout-btn {
    color: #ff6b6b;
}

.logout-btn:hover {
    background: rgba(255, 107, 107, 0.15);
}

/* ---- Desktop collapsed rail ---- */
@media (min-width: 769px) {

    .app-sidebar.collapsed .menu-title,
    .app-sidebar.collapsed .link-text {
        display: none;
    }

    .app-sidebar.collapsed .menu-link {
        justify-content: center;
        padding: 12px 0;
    }

    .app-sidebar.collapsed .menu-link i {
        margin-right: 0;
    }

    .app-sidebar.collapsed .router-link-active {
        border-left: 0;
        padding-left: 0;
    }

    .app-sidebar.collapsed .logo {
        height: 40px;
    }
}

/* ---- Mobile drawer ---- */
.close-btn {
    display: none;
}

@media (max-width: 768px) {
    .app-sidebar {
        transform: translateX(-100%);
        width: 0;
    }

    .app-sidebar.collapsed {
        transform: translateX(0);
        width: 100%;
    }

    .close-btn {
        display: block;
        position: absolute;
        top: 12px;
        right: 12px;
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
    }

    .link-text,
    .menu-title {
        display: block !important;
    }
}
</style>

<!-- WaterMeterDashboard.vue
  Water Meter Dashboard (ZetaTest01)
  - Uses CSS variables that react to body.dark-mode (matches your header toggleTheme)
  - Shows Alarm TYPE + Description (mapped from your event code table)
  - Daily / Weekly / Monthly toggles
  - Timestamps converted to local date/time

  Deps:
    npm i axios echarts
-->

<template>
    <div class="page">
        <header class="topbar">
            <div>
                <h1 class="title">Water Meter Dashboard</h1>
                <p class="subtitle">Consumption, interval flow, and alarm status (clean view)</p>
            </div>

            <div class="controls">
                <label class="control">
                    <span>Meter ID</span>
                    <select v-model="selectedDeviceId" class="select" :disabled="loading.devices">
                        <option v-for="d in deviceIds" :key="d" :value="d">{{ d }}</option>
                    </select>
                </label>

                <label class="control">
                    <span>Range</span>
                    <div class="segmented">
                        <button v-for="opt in rangeOptions" :key="opt" class="seg-btn"
                            :class="{ active: range === opt }" @click="range = opt" type="button">
                            {{ opt }}
                        </button>
                    </div>
                </label>

                <label class="control">
                    <span>Anchor date</span>
                    <input class="input" type="date" v-model="anchorDateStr" />
                </label>

                <button class="btn" type="button" @click="refreshAll" :disabled="loading.any">
                    {{ loading.any ? "Loading..." : "Refresh" }}
                </button>
            </div>
        </header>

        <section class="grid">
            <!-- Summary -->
            <div class="card">
                <h2 class="card-title">Summary</h2>

                <div class="kpis">
                    <div class="kpi">
                        <div class="kpi-label">Latest daily reading</div>
                        <div class="kpi-value">{{ formatNumber(summary.latestDailyValue) }}</div>
                        <div class="kpi-sub">{{ summary.latestDailyTime ? formatDateTime(summary.latestDailyTime) : "—"
                            }}</div>
                    </div>

                    <div class="kpi">
                        <div class="kpi-label">Range total (daily)</div>
                        <div class="kpi-value">{{ formatNumber(summary.rangeTotal) }}</div>
                        <div class="kpi-sub">{{ rangeLabel }}</div>
                    </div>

                    <div class="kpi">
                        <div class="kpi-label">Active alarms</div>
                        <div class="kpi-value"
                            :class="{ ok: summary.activeAlarmCount === 0, bad: summary.activeAlarmCount > 0 }">
                            {{ summary.activeAlarmCount }}
                        </div>
                        <div class="kpi-sub">
                            Last check: {{ summary.latestAlarmCheck ? formatDateTime(summary.latestAlarmCheck) : "—" }}
                        </div>
                    </div>
                </div>

                <div v-if="error" class="error">
                    {{ error }}
                </div>
            </div>

            <!-- Daily trend -->
            <div class="card">
                <div class="card-head">
                    <h2 class="card-title">Daily Consumption</h2>
                    <div class="muted">Port 1 • aggregated by day (based on selected range)</div>
                </div>

                <div ref="dailyChartEl" class="chart"></div>

                <div class="table-wrap">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th class="right">Consumption</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="r in dailyRangeRows" :key="r.dayKey">
                                <td>{{ formatDate(r.dayDate) }}</td>
                                <td class="right">{{ formatNumber(r.port1) }}</td>
                            </tr>
                            <tr v-if="dailyRangeRows.length === 0">
                                <td colspan="2" class="muted">No daily data found for this range.</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Interval chart -->
            <div class="card">
                <div class="card-head">
                    <h2 class="card-title">Interval Flow (Intraday)</h2>
                    <div class="muted">30-min bins • selected anchor date</div>
                </div>

                <div ref="intervalChartEl" class="chart"></div>

                <div class="table-wrap">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Time</th>
                                <th class="right">Consumption</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="row in intervalRowsForAnchor" :key="row.key">
                                <td>{{ formatDate(row.dt) }}</td>
                                <td>{{ formatTime(row.dt) }}</td>
                                <td class="right">{{ formatNumber(row.value) }}</td>
                            </tr>
                            <tr v-if="intervalRowsForAnchor.length === 0">
                                <td colspan="3" class="muted">No interval data found for this date.</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Alarms -->
            <div class="card">
                <div class="card-head">
                    <h2 class="card-title">Alarms</h2>
                    <div class="muted">Latest snapshot (per alarm type)</div>
                </div>

                <div class="alarm-grid">
                    <div v-for="a in latestAlarmSnapshot" :key="a.code" class="alarm-pill"
                        :class="{ ok: !a.active, bad: a.active }">
                        <div class="alarm-code">{{ a.alarmType }}</div>
                        <div class="alarm-desc">{{ a.alarmDesc }}</div>
                        <div class="alarm-small">Code: {{ a.code }}</div>
                        <div class="alarm-state">{{ a.active ? "TRIGGERED" : "Normal" }}</div>
                        <div class="alarm-time">{{ a.time ? formatDateTime(a.time) : "—" }}</div>
                        <div v-if="a.value !== undefined" class="alarm-extra">Value: {{ a.value }}</div>
                    </div>

                    <div v-if="latestAlarmSnapshot.length === 0" class="muted">No alarm data found.</div>
                </div>

                <div class="divider"></div>

                <div class="card-head">
                    <h3 class="card-title small">Alarm History</h3>
                    <div class="muted">Most recent events first</div>
                </div>

                <div class="table-wrap">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Time</th>
                                <th>Alarm Type</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="e in alarmEvents.slice(0, 25)" :key="e.key">
                                <td>{{ formatDateTime(e.time) }}</td>
                                <td>
                                    <div class="alarm-type">{{ e.alarmType }}</div>
                                    <div class="alarm-desc">{{ e.alarmDesc }}</div>
                                    <div class="alarm-small">Code: {{ e.code }}</div>
                                </td>
                                <td>
                                    <span :class="e.active ? 'badge bad' : 'badge ok'">
                                        {{ e.active ? "TRIGGERED" : "Normal" }}
                                    </span>
                                </td>
                            </tr>

                            <tr v-if="alarmEvents.length === 0">
                                <td colspan="4" class="muted">No alarm history found.</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </section>
    </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import axios from "axios";
import * as echarts from "echarts";

const API_BASE = "https://zetatest01-devices.rshare.io";
const rangeOptions = ["Daily", "Weekly", "Monthly"];

/** Alarm code → Alarm Type + Description (from your table) */
const ALARM_META = {
    "100": { type: "Overflow Alarm", desc: "Flow greater than 1.5 times of Q3 value" },
    "101": { type: "Reverse Flow Alarm", desc: "Reverse flow occurred" },
    "104": { type: "Anti-tampering Alarm", desc: "The tamper switch changes from being pressed to released open." },
    "109": { type: "Low Battery Alarm", desc: "Battery percentage drops below 20%" },
    "112": { type: "Abnormal Pulse Alarm", desc: "Abnormal pulse count" },
    "114": { type: "Time Sync Alarm", desc: "The device undergoes time synchronization." },
};

function getAlarmMeta(code) {
    return ALARM_META[String(code)] || { type: `Unknown Alarm (${code})`, desc: "No description available." };
}

const deviceIds = ref([]);
const selectedDeviceId = ref("");

const range = ref("Daily");
const anchorDateStr = ref(toDateInputValue(new Date()));

const loading = reactive({
    devices: false,
    daily: false,
    interval: false,
    alarm: false,
    get any() {
        return this.devices || this.daily || this.interval || this.alarm;
    },
});

const error = ref("");

const dailyReadings = ref([]); // { dayDate, dayKey, port1 }
const intervalSeriesByDayKey = ref(new Map()); // dayKey -> { dtList, values, intervalSec }
const alarmEvents = ref([]); // { key, time, code, alarmType, alarmDesc, active, value? }

const dailyChartEl = ref(null);
const intervalChartEl = ref(null);
let dailyChart = null;
let intervalChart = null;

/** -------- Time helpers -------- */
function epochSecondsToDate(sec) {
    return new Date(sec * 1000);
}
function startOfDay(d) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
}
function addDays(d, n) {
    const x = new Date(d);
    x.setDate(x.getDate() + n);
    return x;
}
function toDateInputValue(d) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}
function parseAnchorDate() {
    const [y, m, d] = anchorDateStr.value.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setHours(0, 0, 0, 0);
    return dt;
}
function dayKeyFromDate(d) {
    return toDateInputValue(d);
}

/** -------- Formatting -------- */
function formatNumber(v) {
    if (v === null || v === undefined || Number.isNaN(Number(v))) return "—";
    return Number(v).toLocaleString(undefined, { maximumFractionDigits: 3 });
}
function formatDateTime(d) {
    if (!d) return "—";
    return new Intl.DateTimeFormat(undefined, {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    }).format(d);
}
function formatDate(d) {
    if (!d) return "—";
    return new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "2-digit" }).format(d);
}
function formatTime(d) {
    if (!d) return "—";
    return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(d);
}

/** -------- Range window -------- */
const rangeWindow = computed(() => {
    const anchor = parseAnchorDate();
    if (range.value === "Daily") {
        const from = startOfDay(anchor);
        const to = addDays(from, 1);
        return { from, to };
    }
    if (range.value === "Weekly") {
        const to = addDays(startOfDay(anchor), 1);
        const from = addDays(to, -7);
        return { from, to };
    }
    const to = addDays(startOfDay(anchor), 1);
    const from = addDays(to, -30);
    return { from, to };
});

const rangeLabel = computed(() => {
    const { from, to } = rangeWindow.value;
    const endInclusive = addDays(to, -1);
    return `${formatDate(from)} → ${formatDate(endInclusive)}`;
});

const dailyRangeRows = computed(() => {
    const { from, to } = rangeWindow.value;
    return dailyReadings.value
        .filter((r) => r.dayDate >= from && r.dayDate < to)
        .sort((a, b) => a.dayDate - b.dayDate);
});

const intervalRowsForAnchor = computed(() => {
    const anchorKey = dayKeyFromDate(parseAnchorDate());
    const series = intervalSeriesByDayKey.value.get(anchorKey);
    if (!series) return [];
    return series.dtList.map((dt, idx) => ({
        key: `${anchorKey}_${idx}`,
        dt,
        value: series.values[idx],
    }));
});

const latestAlarmSnapshot = computed(() => {
    const latestByCode = new Map();
    for (const e of alarmEvents.value) {
        const prev = latestByCode.get(e.code);
        if (!prev || e.time > prev.time) latestByCode.set(e.code, e);
    }

    return Array.from(latestByCode.values())
        .sort((a, b) => Number(a.code) - Number(b.code))
        .map((e) => ({
            code: e.code,
            alarmType: e.alarmType,
            alarmDesc: e.alarmDesc,
            active: e.active,
            time: e.time,
            value: e.value,
        }));
});

const summary = computed(() => {
    const latestDaily = [...dailyReadings.value].sort((a, b) => b.dayDate - a.dayDate)[0];
    const rangeTotal = dailyRangeRows.value.reduce((sum, r) => sum + (Number(r.port1) || 0), 0);

    const snap = latestAlarmSnapshot.value;
    const activeAlarmCount = snap.filter((s) => s.active).length;

    const latestAlarmCheck = alarmEvents.value.length
        ? alarmEvents.value.reduce((max, e) => (e.time > max ? e.time : max), alarmEvents.value[0].time)
        : null;

    return {
        latestDailyValue: latestDaily?.port1 ?? null,
        latestDailyTime: latestDaily?.dayDate ?? null,
        rangeTotal,
        activeAlarmCount,
        latestAlarmCheck,
    };
});

/** -------- Fetchers -------- */
async function fetchDevices() {
    loading.devices = true;
    error.value = "";
    try {
        const res = await axios.get(`${API_BASE}/devices`);
        const ids = Array.isArray(res.data) ? res.data : [];
        deviceIds.value = ids;
        if (!selectedDeviceId.value && ids.length) selectedDeviceId.value = ids[0];
    } catch (e) {
        error.value = `Failed to load meters: ${safeErr(e)}`;
    } finally {
        loading.devices = false;
    }
}

async function fetchDaily(deviceId) {
    loading.daily = true;
    error.value = "";
    try {
        const res = await axios.get(`${API_BASE}/device/${encodeURIComponent(deviceId)}/raw/daily`);
        const items = Array.isArray(res.data) ? res.data : [];
        const byDayKey = new Map();

        for (const rec of items) {
            const data0 = rec?.data?.[0];
            if (!data0 || typeof data0.timeStamp !== "number") continue;

            const dt = epochSecondsToDate(data0.timeStamp);
            const day = startOfDay(dt);
            const key = dayKeyFromDate(day);

            const port1 = data0.port1 ?? null;

            // last write wins (dedupe)
            byDayKey.set(key, { dayDate: day, dayKey: key, port1 });
        }

        dailyReadings.value = Array.from(byDayKey.values()).sort((a, b) => a.dayDate - b.dayDate);
    } catch (e) {
        error.value = `Failed to load daily readings: ${safeErr(e)}`;
        dailyReadings.value = [];
    } finally {
        loading.daily = false;
    }
}

async function fetchInterval(deviceId) {
    loading.interval = true;
    error.value = "";
    try {
        const res = await axios.get(`${API_BASE}/device/${encodeURIComponent(deviceId)}/raw/interval`);
        const items = Array.isArray(res.data) ? res.data : [];
        const map = new Map();

        for (const rec of items) {
            const data0 = rec?.data?.[0];
            if (!data0 || typeof data0.startTimeStamp !== "number") continue;

            const startDt = epochSecondsToDate(data0.startTimeStamp);
            const day = startOfDay(startDt);
            const key = dayKeyFromDate(day);

            const intervalSec = Number(data0.interval) || 1800;
            const arr = Array.isArray(data0.intervalConsumption) ? data0.intervalConsumption : [];

            const dtList = [];
            const values = [];
            for (let i = 0; i < arr.length; i++) {
                dtList.push(new Date(startDt.getTime() + i * intervalSec * 1000));
                values.push(Number(arr[i]) || 0);
            }

            // last write wins (dedupe)
            map.set(key, { dtList, values, intervalSec });
        }

        intervalSeriesByDayKey.value = map;
    } catch (e) {
        error.value = `Failed to load interval readings: ${safeErr(e)}`;
        intervalSeriesByDayKey.value = new Map();
    } finally {
        loading.interval = false;
    }
}

async function fetchAlarms(deviceId) {
    loading.alarm = true;
    error.value = "";
    try {
        const res = await axios.get(`${API_BASE}/device/${encodeURIComponent(deviceId)}/raw/alarm`);
        const items = Array.isArray(res.data) ? res.data : [];
        const events = [];

        for (const rec of items) {
            const dataArr = Array.isArray(rec?.data) ? rec.data : [];
            for (const entry of dataArr) {
                if (!entry || typeof entry.timeStamp !== "number") continue;

                const time = epochSecondsToDate(entry.timeStamp);

                // Extract all alarm codes in this entry (everything except timeStamp/value)
                for (const [k, v] of Object.entries(entry)) {
                    if (k === "timeStamp" || k === "value") continue;

                    const meta = getAlarmMeta(k);

                    events.push({
                        key: `${entry.timeStamp}_${k}_${Math.random().toString(16).slice(2)}`,
                        time,
                        code: k,
                        alarmType: meta.type,
                        alarmDesc: meta.desc,
                        active: Boolean(v),
                        value: entry.value,
                    });
                }
            }
        }

        events.sort((a, b) => b.time - a.time);
        alarmEvents.value = events;
    } catch (e) {
        error.value = `Failed to load alarms: ${safeErr(e)}`;
        alarmEvents.value = [];
    } finally {
        loading.alarm = false;
    }
}

/** -------- Charts -------- */
function buildDailyChart() {
    if (!dailyChartEl.value) return;
    if (!dailyChart) dailyChart = echarts.init(dailyChartEl.value);

    const rows = dailyRangeRows.value;
    const x = rows.map((r) => r.dayKey);
    const y = rows.map((r) => (r.port1 ?? null));

    dailyChart.setOption({
        tooltip: { trigger: "axis" },
        grid: { left: 45, right: 20, top: 20, bottom: 40 },
        xAxis: { type: "category", data: x, axisLabel: { rotate: x.length > 10 ? 45 : 0 } },
        yAxis: { type: "value" },
        series: [{ name: "Consumption", type: "line", data: y, smooth: true, showSymbol: x.length <= 30 }],
    });
}

function buildIntervalChart() {
    if (!intervalChartEl.value) return;
    if (!intervalChart) intervalChart = echarts.init(intervalChartEl.value);

    const anchorKey = dayKeyFromDate(parseAnchorDate());
    const series = intervalSeriesByDayKey.value.get(anchorKey);

    const x = [];
    const y = [];
    if (series) {
        for (let i = 0; i < series.dtList.length; i++) {
            x.push(formatTime(series.dtList[i]));
            y.push(series.values[i]);
        }
    }

    intervalChart.setOption({
        tooltip: { trigger: "axis" },
        grid: { left: 45, right: 20, top: 20, bottom: 40 },
        xAxis: { type: "category", data: x, axisLabel: { rotate: x.length > 18 ? 45 : 0 } },
        yAxis: { type: "value" },
        series: [{ name: "Interval", type: "bar", data: y }],
    });
}

function resizeCharts() {
    dailyChart?.resize();
    intervalChart?.resize();
}

/** -------- Orchestration -------- */
async function refreshAll() {
    if (!selectedDeviceId.value) return;
    await Promise.all([fetchDaily(selectedDeviceId.value), fetchInterval(selectedDeviceId.value), fetchAlarms(selectedDeviceId.value)]);
    await nextTick();
    buildDailyChart();
    buildIntervalChart();
}

function safeErr(e) {
    return e?.response?.data?.message || e?.message || String(e);
}

/** -------- Lifecycle -------- */
onMounted(async () => {
    await fetchDevices();
    if (selectedDeviceId.value) await refreshAll();
    window.addEventListener("resize", resizeCharts);
});

onBeforeUnmount(() => {
    window.removeEventListener("resize", resizeCharts);
    dailyChart?.dispose();
    intervalChart?.dispose();
    dailyChart = null;
    intervalChart = null;
});

/** -------- Watchers -------- */
watch(selectedDeviceId, async (newId, oldId) => {
    if (!newId || newId === oldId) return;
    await refreshAll();
});

watch([range, anchorDateStr], async () => {
    await nextTick();
    buildDailyChart();
    buildIntervalChart();
});
</script>

<style scoped>
/* Light mode defaults */
:global(body) {
    --wm-bg: #f6f8ff;
    --wm-text: #0b1220;
    --wm-muted: rgba(11, 18, 32, 0.65);
    --wm-card-bg: rgba(255, 255, 255, 0.85);
    --wm-card-border: rgba(11, 18, 32, 0.10);
    --wm-shadow: 0 10px 25px rgba(0, 0, 0, 0.10);

    --wm-input-bg: rgba(255, 255, 255, 0.9);
    --wm-input-border: rgba(11, 18, 32, 0.18);

    --wm-accent-bg: rgba(79, 140, 255, 0.16);
    --wm-accent-border: rgba(79, 140, 255, 0.25);

    --wm-ok: #0b7a3b;
    --wm-bad: #b3261e;
}

/* Dark mode overrides (matches your header toggleTheme) */
:global(body.dark-mode) {
    --wm-bg: #0b1220;
    --wm-text: #e8eefc;
    --wm-muted: rgba(232, 238, 252, 0.65);
    --wm-card-bg: rgba(255, 255, 255, 0.04);
    --wm-card-border: rgba(232, 238, 252, 0.12);
    --wm-shadow: 0 10px 25px rgba(0, 0, 0, 0.25);

    --wm-input-bg: rgba(255, 255, 255, 0.06);
    --wm-input-border: rgba(232, 238, 252, 0.18);

    --wm-accent-bg: rgba(79, 140, 255, 0.18);
    --wm-accent-border: rgba(232, 238, 252, 0.18);

    --wm-ok: #b7ffd0;
    --wm-bad: #ffb7b7;
}

.page {
    padding: 16px;
    background: var(--wm-bg);
    color: var(--wm-text);
    min-height: 100vh;
    font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial;
}

.topbar {
    display: flex;
    gap: 16px;
    align-items: flex-end;
    justify-content: space-between;
    flex-wrap: wrap;
    margin-bottom: 14px;
}

.title {
    margin: 0;
    font-size: 22px;
    letter-spacing: 0.2px;
}

.subtitle {
    margin: 4px 0 0;
    color: var(--wm-muted);
    font-size: 13px;
}

.controls {
    display: flex;
    gap: 10px;
    align-items: flex-end;
    flex-wrap: wrap;
}

.control span {
    display: block;
    font-size: 12px;
    margin-bottom: 6px;
    color: var(--wm-muted);
}

.select,
.input {
    height: 34px;
    padding: 0 10px;
    border-radius: 10px;
    border: 1px solid var(--wm-input-border);
    background: var(--wm-input-bg);
    color: var(--wm-text);
    outline: none;
}

.segmented {
    display: flex;
    gap: 6px;
    padding: 4px;
    border-radius: 12px;
    border: 1px solid var(--wm-input-border);
    background: var(--wm-input-bg);
}

.seg-btn {
    height: 28px;
    padding: 0 10px;
    border-radius: 10px;
    border: 0;
    cursor: pointer;
    color: var(--wm-muted);
    background: transparent;
}

.seg-btn.active {
    background: var(--wm-accent-bg);
    color: var(--wm-text);
    border: 1px solid var(--wm-accent-border);
}

.btn {
    height: 34px;
    padding: 0 12px;
    border-radius: 10px;
    border: 1px solid var(--wm-accent-border);
    background: var(--wm-accent-bg);
    color: var(--wm-text);
    cursor: pointer;
}

.btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
}

@media (max-width: 980px) {
    .grid {
        grid-template-columns: 1fr;
    }
}

.card {
    background: var(--wm-card-bg);
    border: 1px solid var(--wm-card-border);
    border-radius: 16px;
    padding: 14px;
    box-shadow: var(--wm-shadow);
}

.card-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 10px;
    flex-wrap: wrap;
}

.card-title {
    margin: 0 0 10px;
    font-size: 16px;
}

.card-title.small {
    font-size: 14px;
    margin-top: 0;
}

.muted {
    color: var(--wm-muted);
    font-size: 12px;
}

.chart {
    width: 100%;
    height: 260px;
    margin-top: 6px;
}

.kpis {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
}

@media (max-width: 980px) {
    .kpis {
        grid-template-columns: 1fr;
    }
}

.kpi {
    padding: 12px;
    border-radius: 14px;
    border: 1px solid var(--wm-card-border);
    background: var(--wm-card-bg);
}

.kpi-label {
    color: var(--wm-muted);
    font-size: 12px;
}

.kpi-value {
    font-size: 22px;
    margin-top: 6px;
    font-weight: 700;
}

.kpi-value.ok {
    color: var(--wm-ok);
}

.kpi-value.bad {
    color: var(--wm-bad);
}

.kpi-sub {
    margin-top: 4px;
    font-size: 12px;
    color: var(--wm-muted);
}

.table-wrap {
    margin-top: 10px;
    overflow: auto;
    border-radius: 12px;
    border: 1px solid var(--wm-card-border);
}

.table {
    width: 100%;
    border-collapse: collapse;
    min-width: 380px;
}

.table th,
.table td {
    padding: 10px 10px;
    border-bottom: 1px solid var(--wm-card-border);
    font-size: 13px;
}

.table th {
    text-align: left;
    color: var(--wm-muted);
    background: var(--wm-card-bg);
}

.right {
    text-align: right;
}

.alarm-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
}

@media (max-width: 980px) {
    .alarm-grid {
        grid-template-columns: 1fr;
    }
}

.alarm-pill {
    padding: 12px;
    border-radius: 14px;
    border: 1px solid var(--wm-card-border);
    background: var(--wm-card-bg);
}

.alarm-pill.ok {
    border-color: color-mix(in srgb, var(--wm-ok) 35%, transparent);
}

.alarm-pill.bad {
    border-color: color-mix(in srgb, var(--wm-bad) 35%, transparent);
}

.alarm-code {
    font-weight: 700;
    font-size: 14px;
}

.alarm-type {
    font-weight: 600;
}

.alarm-desc {
    margin-top: 6px;
    font-size: 12px;
    color: var(--wm-muted);
    line-height: 1.3;
}

.alarm-small {
    margin-top: 3px;
    font-size: 11px;
    color: var(--wm-muted);
}

.alarm-state,
.alarm-time,
.alarm-extra {
    margin-top: 4px;
    font-size: 12px;
    color: var(--wm-muted);
}

.badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 12px;
    border: 1px solid var(--wm-card-border);
}

.badge.ok {
    background: color-mix(in srgb, var(--wm-ok) 12%, transparent);
}

.badge.bad {
    background: color-mix(in srgb, var(--wm-bad) 12%, transparent);
}

.divider {
    height: 1px;
    background: var(--wm-card-border);
    margin: 14px 0;
}

.error {
    margin-top: 10px;
    padding: 10px;
    border-radius: 12px;
    border: 1px solid color-mix(in srgb, var(--wm-bad) 35%, transparent);
    background: color-mix(in srgb, var(--wm-bad) 10%, transparent);
    color: var(--wm-text);
    font-size: 13px;
}
</style>

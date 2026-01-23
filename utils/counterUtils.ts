import { CounterSource } from "../types";

const LOCAL_STORAGE_KEY = 'wall-go-local-matches';

// Target API
const TARGET_API_URL = 'https://api.counterapi.dev/v1/wall-go-v1/matches';
const TARGET_API_UP_URL = 'https://api.counterapi.dev/v1/wall-go-v1/matches/up';

interface CountResult {
    count: number;
    source: CounterSource;
}

/**
 * Strategy 1: Direct Fetch
 * Works if the user has no ad-blocker/strict DNS.
 */
const fetchDirect = async (url: string) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 3000); // 3s timeout
    try {
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(id);
        if (!res.ok) throw new Error(`Direct status: ${res.status}`);
        return await res.json();
    } catch (e) {
        clearTimeout(id);
        throw e;
    }
};

/**
 * Strategy 2: High Performance Proxy (corsproxy.io)
 * Usually bypasses standard tracker blockers.
 */
const fetchCorsProxy = async (url: string) => {
    // Add random param to prevent caching
    const target = `${url}?t=${Date.now()}`; 
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(target)}`;
    
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 4000); 
    try {
        const res = await fetch(proxyUrl, { signal: controller.signal });
        clearTimeout(id);
        if (!res.ok) throw new Error(`CorsProxy status: ${res.status}`);
        return await res.json();
    } catch (e) {
        clearTimeout(id);
        throw e;
    }
};

/**
 * Strategy 3: Backup Proxy (allorigins.win)
 * Slower, but reliable fallback.
 */
const fetchAllOrigins = async (url: string) => {
    const target = `${url}?t=${Date.now()}`;
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(target)}`;
    
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 5000);
    try {
        const res = await fetch(proxyUrl, { signal: controller.signal });
        clearTimeout(id);
        if (!res.ok) throw new Error(`AllOrigins status: ${res.status}`);
        return await res.json();
    } catch (e) {
        clearTimeout(id);
        throw e;
    }
};

/**
 * The "Waterfall" Fetcher
 * Tries strategies in order. Returns first success.
 */
const fetchWaterfall = async (targetUrl: string): Promise<number> => {
    // 1. Try Direct
    try {
        console.log("[Counter] Strategy 1: Direct");
        const data = await fetchDirect(targetUrl);
        if (typeof data.count === 'number') return data.count;
    } catch (e) {
        console.warn("[Counter] Direct failed, switching to Proxy Alpha...");
    }

    // 2. Try CorsProxy
    try {
        console.log("[Counter] Strategy 2: CorsProxy");
        const data = await fetchCorsProxy(targetUrl);
        if (typeof data.count === 'number') return data.count;
    } catch (e) {
        console.warn("[Counter] Proxy Alpha failed, switching to Proxy Beta...");
    }

    // 3. Try AllOrigins
    try {
        console.log("[Counter] Strategy 3: AllOrigins");
        const data = await fetchAllOrigins(targetUrl);
        if (typeof data.count === 'number') return data.count;
    } catch (e) {
        console.error("[Counter] All strategies failed.");
    }

    throw new Error("All fetch strategies failed");
};

/**
 * Gets the current match count.
 */
export const getMatchCount = async (): Promise<CountResult> => {
    try {
        const count = await fetchWaterfall(TARGET_API_URL);
        return { count, source: 'GLOBAL' };
    } catch (error) {
        console.warn("[Counter] Final fallback to local storage.", error);
    }

    // Fallback to Local Storage
    const local = localStorage.getItem(LOCAL_STORAGE_KEY);
    const localCount = local ? parseInt(local, 10) : 0;
    if (!local) localStorage.setItem(LOCAL_STORAGE_KEY, '0');

    return { count: localCount, source: 'LOCAL' };
};

/**
 * Increments the match count.
 */
export const incrementMatchCount = async (): Promise<number | null> => {
    // 1. Always update Local immediate
    const local = localStorage.getItem(LOCAL_STORAGE_KEY);
    const newVal = (local ? parseInt(local, 10) : 0) + 1;
    localStorage.setItem(LOCAL_STORAGE_KEY, newVal.toString());

    // 2. Try to update Global via Waterfall
    try {
        const count = await fetchWaterfall(TARGET_API_UP_URL);
        return count;
    } catch (e) {
        console.warn("[Counter] Global Increment failed completely.");
    }
    return null;
};
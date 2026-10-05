<script>
    import { theme, toggleTheme } from "../theme.js";

    let {
        connected = false,
        onlineCount = 0,
        roomName = "Chat Room",
        isPrivate = false,
    } = $props();
</script>

<div class="chat-header">
    <div class="header-left">
        <span class="logo">{isPrivate ? "🔒" : "💬"}</span>
        <div class="room-info">
            <h4>{roomName}</h4>
            {#if isPrivate}
                <span class="privacy-tag">members only</span>
            {/if}
        </div>
    </div>

    <div class="header-right">
        <div class="status">
            <span class="status-dot" class:offline={!connected}>
                {#if connected}<span class="pulse-ring"></span>{/if}
            </span>
            <span class="online-text">
                {connected ? `${onlineCount} online` : "Offline"}
            </span>
        </div>

        <button class="theme-toggle" onclick={toggleTheme} title="Toggle theme">
            {#if $theme === "light"}🌙{:else}☀️{/if}
        </button>
    </div>
</div>

<style>
    .chat-header {
        padding: 14px 20px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: linear-gradient(
            135deg,
            rgba(102, 126, 234, 0.85) 0%,
            rgba(118, 75, 162, 0.85) 100%
        );
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border-bottom: 1px solid var(--glass-border);
        color: white;
    }
    .header-left { display: flex; align-items: center; gap: 10px; }
    .logo { font-size: 1.3rem; }
    .room-info { display: flex; flex-direction: column; gap: 1px; }
    .chat-header h4 {
        margin: 0; font-size: 1.05rem; font-weight: 700;
        letter-spacing: -0.3px;
    }
    .privacy-tag {
        font-size: 0.65rem;
        opacity: 0.85;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        background: rgba(255, 255, 255, 0.2);
        padding: 1px 6px;
        border-radius: 4px;
        display: inline-block;
        width: fit-content;
    }
    .header-right { display: flex; align-items: center; gap: 14px; }
    .status { display: flex; align-items: center; gap: 8px; font-size: 0.8rem; }
    .status-dot {
        position: relative;
        width: 10px; height: 10px;
        background: #4ade80;
        border-radius: 50%;
        box-shadow: 0 0 10px #4ade80;
    }
    .status-dot.offline { background: #ef4444; box-shadow: 0 0 10px #ef4444; }
    .pulse-ring {
        position: absolute; inset: 0;
        border-radius: 50%; background: #4ade80;
        animation: pulseRing 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }
    @keyframes pulseRing {
        0% { transform: scale(1); opacity: 0.7; }
        80%, 100% { transform: scale(2.2); opacity: 0; }
    }
    .theme-toggle {
        background: rgba(255, 255, 255, 0.15);
        border: 1px solid rgba(255, 255, 255, 0.25);
        color: white;
        width: 34px; height: 34px;
        border-radius: 50%;
        font-size: 1rem;
        cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        transition: background 0.2s, transform 0.15s;
    }
    .theme-toggle:hover {
        background: rgba(255, 255, 255, 0.3);
        transform: rotate(20deg);
    }
</style>
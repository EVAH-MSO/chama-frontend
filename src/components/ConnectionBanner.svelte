<script>
    let { connected } = $props();

    let visible = $state(false);
    let wasConnected = $state(true);
    let timeout;

    // Show banner when connection state changes
    $effect(() => {
        const current = connected;
        if (current !== wasConnected) {
            visible = true;
            wasConnected = current;
            clearTimeout(timeout);
            timeout = setTimeout(() => (visible = false), 3000);
        }
    });
</script>

{#if visible}
    <div class="banner" class:error={!connected}>
        {#if connected}
            <span>✅ Reconnected</span>
        {:else}
            <span>⚠️ Connection lost — trying to reconnect...</span>
        {/if}
    </div>
{/if}

<style>
    .banner {
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        padding: 12px 24px;
        border-radius: 12px;
        font-size: 0.9rem;
        font-weight: 600;
        color: white;
        background: rgba(16, 185, 129, 0.95);
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        z-index: 1000;
        animation: slideDown 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        backdrop-filter: blur(10px);
    }

    .banner.error {
        background: rgba(239, 68, 68, 0.95);
    }

    @keyframes slideDown {
        from {
            opacity: 0;
            transform: translate(-50%, -20px);
        }
        to {
            opacity: 1;
            transform: translate(-50%, 0);
        }
    }
</style>
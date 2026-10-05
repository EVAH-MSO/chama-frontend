<script>
    let { visible = false, unread = 0, onclick } = $props();
</script>

{#if visible}
    <button class="scroll-btn" {onclick} aria-label="Scroll to bottom">
        {#if unread > 0}
            <span class="badge">{unread > 99 ? "99+" : unread}</span>
        {/if}
        <span class="arrow">↓</span>
    </button>
{/if}

<style>
    .scroll-btn {
        position: absolute;
        bottom: 100px;
        right: 24px;
        width: 44px;
        height: 44px;
        border-radius: 50%;
        border: none;
        background: linear-gradient(135deg, var(--accent), var(--accent-2));
        color: white;
        font-size: 1.2rem;
        cursor: pointer;
        box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10;
        animation: popIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        transition: transform 0.15s;
    }

    .scroll-btn:hover {
        transform: translateY(-2px) scale(1.05);
    }

    @keyframes popIn {
        from {
            opacity: 0;
            transform: scale(0.6);
        }
        to {
            opacity: 1;
            transform: scale(1);
        }
    }

    .badge {
        position: absolute;
        top: -6px;
        right: -6px;
        background: var(--error);
        color: white;
        font-size: 0.7rem;
        font-weight: 700;
        min-width: 20px;
        height: 20px;
        padding: 0 6px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid var(--surface);
        animation: pulse 2s infinite;
    }

    @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.15); }
    }

    .arrow {
        font-weight: 700;
    }
</style>
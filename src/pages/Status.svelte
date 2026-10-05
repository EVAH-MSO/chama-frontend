<script>
    import { onMount } from "svelte";
    import { API_URL, user } from "../store/auth.js";

    let feed = $state([]);
    let myStatuses = $state([]);
    let loading = $state(true);
    let composing = $state(false);

    let statusText = $state("");
    let statusColor = $state("#667eea");
    let statusFile = $state(null);
    let previewUrl = $state(null);
    let posting = $state(false);
    let showEmojiPicker = $state(false);

    let viewing = $state(null);
    let currentIndex = $state(0);
    let viewProgress = $state(0);

    const COLORS = [
        "#667eea", "#f59e0b", "#10b981", "#ef4444",
        "#8b5cf6", "#ec4899", "#14b8a6", "#f97316",
        "#0ea5e9", "#1e293b",
    ];

    const EMOJIS = [
        "😀","😂","😍","🥰","😎","🤔","😅","😭","😴","🤯",
        "👍","👎","🙏","👏","🙌","💪","❤️","🔥","✨","🎉",
        "💯","🚀","🌟","☀️","🌈","⚡","🎵","🎨","🍕","☕",
    ];

    let progressTimer;
    let autoTimer;

    onMount(() => {
        loadFeed();
        const interval = setInterval(loadFeed, 60000);
        const handler = () => loadFeed();
        window.addEventListener("status-updated", handler);
        return () => {
            clearInterval(interval);
            window.removeEventListener("status-updated", handler);
            clearInterval(progressTimer);
            clearTimeout(autoTimer);
        };
    });

    async function loadFeed() {
        loading = true;
        try {
            const [feedRes, mineRes] = await Promise.all([
                fetch(`${API_URL}/api/status/feed`, { credentials: "include" }),
                fetch(`${API_URL}/api/status/mine`, { credentials: "include" }),
            ]);
            if (feedRes.ok) feed = await feedRes.json();
            if (mineRes.ok) myStatuses = await mineRes.json();
        } catch (err) {
            console.error("Load failed:", err);
        } finally {
            loading = false;
        }
    }

    async function postStatus() {
        if (!statusText.trim() && !statusFile) return;
        posting = true;

        try {
            const fd = new FormData();
            if (statusText.trim()) fd.append("text", statusText.trim());
            fd.append("bg_color", statusColor);
            if (statusFile) fd.append("file", statusFile);

            const res = await fetch(`${API_URL}/api/status`, {
                method: "POST",
                credentials: "include",
                body: fd,
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                alert(err.error || `Failed (${res.status})`);
                return;
            }

            statusText = "";
            statusFile = null;
            if (previewUrl) URL.revokeObjectURL(previewUrl);
            previewUrl = null;
            composing = false;
            showEmojiPicker = false;
            await loadFeed();
        } catch (err) {
            alert("Failed: " + err.message);
        } finally {
            posting = false;
        }
    }

    function pickFile(e) {
        const file = e.target.files?.[0];
        if (!file) return;
        const isVideo = file.type.startsWith("video/");
        const limit = isVideo ? 25 * 1024 * 1024 : 5 * 1024 * 1024;
        const label = isVideo ? "25 MB" : "5 MB";

        if (file.size > limit) {
            alert(`Max ${label} for ${isVideo ? "videos" : "images"}`);
            return;
        }
        statusFile = file;
        previewUrl = URL.createObjectURL(file);
    }

    function clearFile() {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        statusFile = null;
        previewUrl = null;
    }

    function openStatus(userObj, index = 0) {
        viewing = userObj;
        currentIndex = index;
        startAutoAdvance();
    }

    function closeViewer() {
        clearInterval(progressTimer);
        clearTimeout(autoTimer);
        viewing = null;
        viewProgress = 0;
    }

    function startAutoAdvance() {
        clearInterval(progressTimer);
        clearTimeout(autoTimer);

        const status = viewing?.statuses[currentIndex];
        if (!status) return;

        if (!status.viewed && !viewing.is_me) {
            fetch(`${API_URL}/api/status/${status.id}/view`, {
                method: "POST",
                credentials: "include",
            }).catch(() => {});
        }

        const DURATION = 5000;
        const STEPS = 50;
        viewProgress = 0;
        progressTimer = setInterval(() => {
            viewProgress += 100 / STEPS;
            if (viewProgress >= 100) clearInterval(progressTimer);
        }, DURATION / STEPS);

        autoTimer = setTimeout(nextStatus, DURATION);
    }

    function nextStatus() {
        if (!viewing) return;
        if (currentIndex < viewing.statuses.length - 1) {
            currentIndex += 1;
            startAutoAdvance();
        } else {
            closeViewer();
        }
    }

    function prevStatus() {
        if (currentIndex > 0) {
            currentIndex -= 1;
            startAutoAdvance();
        }
    }

    async function deleteMyStatus(id) {
        if (!confirm("Delete this status?")) return;
        await fetch(`${API_URL}/api/status/${id}`, {
            method: "DELETE",
            credentials: "include",
        });
        await loadFeed();
        closeViewer();
    }

    let currentStatus = $derived(
        viewing && viewing.statuses[currentIndex] ? viewing.statuses[currentIndex] : null
    );

    function timeAgo(iso) {
        const diff = (Date.now() - new Date(iso).getTime()) / 1000;
        if (diff < 60) return "now";
        if (diff < 3600) return `${Math.floor(diff / 60)}m`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
        return `${Math.floor(diff / 86400)}d`;
    }
</script>

<div class="status-page">
    <h2>📸 Status</h2>

    <div class="my-status-row">
        <div class="my-status-card" class:has-status={myStatuses.length > 0}>
            <div class="my-status-avatar" style="background: {$user?.avatar_color || '#667eea'}">
                {($user?.display_name || $user?.username || "?")[0].toUpperCase()}
            </div>
            <div class="my-status-info">
                <strong>My Status</strong>
                <small>
                    {#if myStatuses.length > 0}
                        {myStatuses.length} active · tap to view
                    {:else}
                        Tap to add status update
                    {/if}
                </small>
            </div>
            <div class="my-status-actions">
                {#if myStatuses.length > 0}
                    <button
                        class="mini-btn"
                        onclick={() => {
                            openStatus({
                                user_id: $user.id,
                                display_name: $user.display_name || $user.username,
                                avatar_color: $user.avatar_color || "#667eea",
                                is_me: true,
                                statuses: myStatuses.map((s) => ({ ...s, viewed: true })),
                            });
                        }}
                    >
                        ▶️ View
                    </button>
                {/if}
                <button class="mini-btn primary" onclick={() => (composing = !composing)}>
                    {composing ? "✕" : "＋ Post"}
                </button>
            </div>
        </div>
    </div>

    {#if composing}
        <div class="composer">
            <div class="composer-preview" style="background: {statusColor}">
                {#if previewUrl}
                    {#if statusFile?.type?.startsWith("video/")}
                        <video src={previewUrl} controls muted></video>
                    {:else}
                        <img src={previewUrl} alt="preview" />
                    {/if}
                {:else}
                    <textarea
                        bind:value={statusText}
                        placeholder="Type your status..."
                        maxlength="200"
                    ></textarea>
                {/if}
            </div>

            {#if previewUrl}
                <div class="preview-caption">
                    <input
                        type="text"
                        bind:value={statusText}
                        placeholder="Add a caption (optional)"
                        maxlength="200"
                    />
                </div>
            {/if}

            <div class="color-row">
                {#each COLORS as c}
                    <button
                        class="color-dot"
                        class:active={statusColor === c}
                        style="background: {c}"
                        onclick={() => (statusColor = c)}
                    ></button>
                {/each}
            </div>

            {#if showEmojiPicker}
                <div class="emoji-row">
                    {#each EMOJIS as e}
                        <button
                            type="button"
                            class="emoji-pick"
                            onclick={() => (statusText += e)}
                        >{e}</button>
                    {/each}
                </div>
            {/if}

            <div class="composer-actions">
                <label class="file-pick">
                    📷 Photo / 🎥 Video
                    <input
                        type="file"
                        accept="image/*,video/*"
                        onchange={pickFile}
                        hidden
                    />
                </label>
                <button
                    class="file-pick"
                    onclick={() => (showEmojiPicker = !showEmojiPicker)}
                    type="button"
                >
                    😊 Emoji
                </button>
                {#if previewUrl}
                    <button class="mini-btn" onclick={clearFile}>Remove</button>
                {/if}
                <button
                    class="post-btn"
                    onclick={postStatus}
                    disabled={posting || (!statusText.trim() && !statusFile)}
                >
                    {posting ? "Posting..." : "Post Status"}
                </button>
            </div>
        </div>
    {/if}

    <h3 class="section-title">Recent Updates</h3>

    {#if loading}
        <div class="empty-row">Loading statuses...</div>
    {:else if feed.filter((e) => !e.is_me).length === 0}
        <div class="empty-row">No status updates yet. Be the first!</div>
    {:else}
        <div class="feed">
            {#each feed as entry}
                {#if !entry.is_me}
                    <button
                        class="feed-item"
                        class:unviewed={!entry.all_viewed}
                        onclick={() => openStatus(entry)}
                    >
                        <div class="ring" class:active={!entry.all_viewed}>
                            <div class="avatar-small" style="background: {entry.avatar_color}">
                                {(entry.display_name || "?")[0].toUpperCase()}
                            </div>
                        </div>
                        <div class="feed-info">
                            <strong>{entry.display_name}</strong>
                            <small>
                                {entry.statuses.length} update{entry.statuses.length !== 1 ? "s" : ""}
                            </small>
                        </div>
                    </button>
                {/if}
            {/each}
        </div>
    {/if}
</div>

{#if viewing && currentStatus}
    <div class="viewer-overlay">
        <div class="progress-bar-row">
            {#each viewing.statuses as s, i}
                <div class="progress-track">
                    <div
                        class="progress-fill"
                        style="width: {i < currentIndex
                            ? '100%'
                            : i === currentIndex
                              ? viewProgress + '%'
                              : '0%'}"
                    ></div>
                </div>
            {/each}
        </div>

        <div class="viewer-header">
            <div class="avatar-small" style="background: {viewing.avatar_color}">
                {(viewing.display_name || "?")[0].toUpperCase()}
            </div>
            <div class="viewer-info">
                <strong>{viewing.display_name}</strong>
                <small>{timeAgo(currentStatus.created_at)}</small>
            </div>
            {#if viewing.is_me}
                <button
                    class="icon-btn"
                    onclick={() => deleteMyStatus(currentStatus.id)}
                    title="Delete"
                >🗑️</button>
            {/if}
            <button class="icon-btn" onclick={closeViewer} title="Close">✕</button>
        </div>

        <div
            class="viewer-content"
            style="background: {currentStatus.image_url ? '#000' : currentStatus.bg_color}"
        >
            {#if currentStatus.image_url}
                {#if currentStatus.media_type === "video"}
                    <video
                        src={`${API_URL}${currentStatus.image_url}`}
                        autoplay
                        controls
                        playsinline
                    ></video>
                {:else}
                    <img src={`${API_URL}${currentStatus.image_url}`} alt="status" />
                {/if}
            {/if}
            {#if currentStatus.text}
                <div class="viewer-text">{currentStatus.text}</div>
            {/if}
            {#if viewing.is_me}
                <div class="viewer-views">
                    👁️ {currentStatus.views_count} view{currentStatus.views_count !== 1 ? "s" : ""}
                </div>
            {/if}
        </div>

        <button class="nav-btn prev" onclick={prevStatus} aria-label="Previous"></button>
        <button class="nav-btn next" onclick={nextStatus} aria-label="Next"></button>
    </div>
{/if}

<style>
    .status-page {
        background: var(--surface);
        border-radius: 18px;
        padding: 20px;
        box-shadow: var(--shadow-lg);
        max-height: 75vh;
        overflow-y: auto;
        transition: background 0.3s ease;
    }
    .status-page h2 { margin: 0 0 16px; color: var(--text); font-size: 1.3rem; }
    .section-title {
        color: var(--text-muted);
        font-size: 0.85rem;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin: 20px 0 10px;
    }
    .my-status-card {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        background: var(--surface-2);
        border-radius: 12px;
        border: 1px solid var(--border);
    }
    .my-status-avatar {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        color: white;
        font-size: 1.3rem;
        font-weight: 700;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    .my-status-card.has-status .my-status-avatar {
        box-shadow: 0 0 0 3px var(--accent), 0 0 0 6px rgba(102, 126, 234, 0.3);
    }
    .my-status-info { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .my-status-info strong { color: var(--text); }
    .my-status-info small { color: var(--text-muted); font-size: 0.8rem; }
    .my-status-actions { display: flex; gap: 6px; }
    .mini-btn {
        padding: 6px 12px;
        background: var(--surface-3);
        color: var(--text);
        border: none;
        border-radius: 8px;
        font-size: 0.8rem;
        font-weight: 600;
        cursor: pointer;
    }
    .mini-btn.primary {
        background: linear-gradient(135deg, var(--accent), var(--accent-2));
        color: white;
    }
    .composer {
        margin-top: 14px;
        padding: 14px;
        background: var(--surface-2);
        border-radius: 12px;
        border: 1px solid var(--border);
        animation: slideDown 0.25s ease;
    }
    @keyframes slideDown {
        from { opacity: 0; transform: translateY(-8px); }
        to { opacity: 1; transform: translateY(0); }
    }
    .composer-preview {
        width: 100%;
        height: 220px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        overflow: hidden;
    }
    .composer-preview textarea {
        width: 100%;
        height: 100%;
        background: transparent;
        border: none;
        color: white;
        font-size: 1.2rem;
        font-weight: 600;
        text-align: center;
        resize: none;
        outline: none;
        font-family: inherit;
    }
    .composer-preview textarea::placeholder { color: rgba(255,255,255,0.7); }
    .composer-preview img {
        width: 100%;
        height: 100%;
        object-fit: contain;
    }
    .composer-preview video {
        width: 100%;
        height: 100%;
        object-fit: contain;
        border-radius: 8px;
    }
    .preview-caption { margin-top: 10px; }
    .preview-caption input {
        width: 100%;
        padding: 10px 14px;
        border: 1.5px solid var(--border);
        border-radius: 8px;
        font-size: 0.9rem;
        background: var(--surface);
        color: var(--text);
        outline: none;
    }
    .preview-caption input:focus { border-color: var(--accent); }
    .color-row {
        display: flex;
        gap: 8px;
        margin-top: 12px;
        flex-wrap: wrap;
    }
    .color-dot {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        border: 2px solid transparent;
        cursor: pointer;
    }
    .color-dot.active { border-color: var(--text); transform: scale(1.15); }
    .emoji-row {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        padding: 8px;
        margin-top: 8px;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 10px;
        max-height: 100px;
        overflow-y: auto;
    }
    .emoji-pick {
        background: transparent;
        border: none;
        font-size: 1.3rem;
        cursor: pointer;
        padding: 4px 6px;
        border-radius: 6px;
    }
    .emoji-pick:hover { background: var(--surface-3); transform: scale(1.2); }
    .composer-actions {
        display: flex;
        gap: 8px;
        margin-top: 14px;
        align-items: center;
        flex-wrap: wrap;
    }
    .file-pick {
        padding: 8px 14px;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 8px;
        font-size: 0.85rem;
        cursor: pointer;
        font-weight: 600;
        color: var(--text);
    }
    .file-pick:hover { background: var(--surface-3); }
    .post-btn {
        margin-left: auto;
        padding: 8px 20px;
        background: linear-gradient(135deg, var(--accent), var(--accent-2));
        color: white;
        border: none;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
    }
    .post-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .feed { display: flex; flex-direction: column; gap: 4px; }
    .feed-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px;
        background: transparent;
        border: none;
        border-radius: 12px;
        cursor: pointer;
        text-align: left;
        width: 100%;
    }
    .feed-item:hover { background: var(--surface-2); }
    .ring {
        padding: 2px;
        border-radius: 50%;
        background: var(--border);
    }
    .ring.active {
        background: linear-gradient(135deg, var(--accent), var(--accent-2));
        padding: 3px;
    }
    .avatar-small {
        width: 44px;
        height: 44px;
        border-radius: 50%;
        color: white;
        font-weight: 700;
        font-size: 1.1rem;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid var(--surface);
    }
    .feed-info { flex: 1; display: flex; flex-direction: column; gap: 2px; }
    .feed-info strong { color: var(--text); font-size: 0.95rem; }
    .feed-info small { color: var(--text-muted); font-size: 0.78rem; }
    .empty-row {
        padding: 30px;
        text-align: center;
        color: var(--text-muted);
        font-size: 0.9rem;
    }
    .viewer-overlay {
        position: fixed;
        inset: 0;
        background: #000;
        z-index: 2000;
        display: flex;
        flex-direction: column;
        animation: fadeIn 0.2s ease;
    }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    .progress-bar-row { display: flex; gap: 4px; padding: 8px 10px; }
    .progress-track {
        flex: 1;
        height: 3px;
        background: rgba(255, 255, 255, 0.3);
        border-radius: 2px;
        overflow: hidden;
    }
    .progress-fill { height: 100%; background: white; }
    .viewer-header {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 14px;
        color: white;
    }
    .viewer-info { flex: 1; display: flex; flex-direction: column; gap: 1px; }
    .viewer-info strong { font-size: 0.95rem; }
    .viewer-info small { color: rgba(255, 255, 255, 0.7); font-size: 0.75rem; }
    .icon-btn {
        background: rgba(255, 255, 255, 0.15);
        border: none;
        color: white;
        width: 34px;
        height: 34px;
        border-radius: 50%;
        cursor: pointer;
        font-size: 1rem;
    }
    .viewer-content {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        overflow: hidden;
    }
    .viewer-content img { max-width: 100%; max-height: 100%; object-fit: contain; }
    .viewer-content video {
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
    }
    .viewer-text {
        position: absolute;
        color: white;
        font-size: 1.8rem;
        font-weight: 700;
        text-align: center;
        padding: 30px;
        text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
        max-width: 90%;
    }
    .viewer-views {
        position: absolute;
        bottom: 20px;
        left: 20px;
        background: rgba(0, 0, 0, 0.6);
        color: white;
        padding: 6px 12px;
        border-radius: 20px;
        font-size: 0.85rem;
    }
    .nav-btn {
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        width: 60px;
        height: 100px;
        background: transparent;
        border: none;
        cursor: pointer;
    }
    .nav-btn.prev { left: 0; }
    .nav-btn.next { right: 0; }
</style>
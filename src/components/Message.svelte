<script>
    import { user as currentUser, API_URL } from "../store/auth.js";
    import { renderMarkdown, attachCopyButtons } from "../utils/markdown.js";
    import { API_URL } from "../store/auth.js";

    let {
        id,
        user_id,
        user = "Unknown",
        text = "",
        time = "",
        image_url = null,
        reply_to = null,
        reply_preview = null,
        reactions = {},
        onDelete,
        onEdit,
        onReply,
        onReact,
    } = $props();

    const QUICK_REACTIONS = ["❤️", "👍", "😂", "😮", "😢", "🔥"];

    function colorFor(name) {
        if (!name) name = "?";
        const colors = [
            "#667eea", "#f59e0b", "#10b981", "#ef4444",
            "#8b5cf6", "#ec4899", "#14b8a6", "#f97316",
        ];
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    }

    let initial = $derived((user || "?")[0].toUpperCase());
    let avatarColor = $derived(colorFor(user));

    let fullImageUrl = $derived(image_url ? `${API_URL}${image_url}` : null);

    let isMine = $derived($currentUser && user_id === $currentUser.id);
    let showActions = $state(false);
    let showReactionPicker = $state(false);
    let editing = $state(false);
    let editText = $state(text || "");
    let bodyEl = $state(null);

    let renderedHtml = $derived(renderMarkdown(text || ""));

    $effect(() => {
        if (bodyEl && renderedHtml) {
            bodyEl.innerHTML = renderedHtml;
            attachCopyButtons(bodyEl);
        }
    });

    async function handleDelete() {
        if (!confirm("Delete this message?")) return;
        try {
            const res = await fetch(`${API_URL}/api/messages/${id}`, {
                method: "DELETE",
                credentials: "include",
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                alert(err.error || "Delete failed");
                return;
            }
            onDelete?.(id);
        } catch (err) {
            alert("Delete failed: " + err.message);
        }
    }

    async function saveEdit() {
        if (!editText.trim()) return;
        try {
            const res = await fetch(`${API_URL}/api/messages/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ text: editText.trim() }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                alert(err.error || "Edit failed");
                return;
            }
            onEdit?.(id, editText.trim());
            editing = false;
        } catch (err) {
            alert("Edit failed: " + err.message);
        }
    }

    function cancelEdit() {
        editText = text || "";
        editing = false;
    }

    async function react(emoji) {
        showReactionPicker = false;
        try {
            await fetch(`${API_URL}/api/messages/${id}/react`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ emoji }),
            });
            onReact?.(id, emoji);
        } catch (err) {
            console.error("React failed:", err);
        }
    }

    function handleReply() {
        onReply?.({ id, user, text });
    }

    let reactionKeys = $derived(Object.keys(reactions || {}));

    function didIReact(emoji) {
        const list = reactions?.[emoji] || [];
        return list.some((r) => r.user_id === $currentUser?.id);
    }
</script>

<div
    class="message"
    class:mine={isMine}
    onmouseenter={() => (showActions = true)}
    onmouseleave={() => {
        showActions = false;
        showReactionPicker = false;
    }}
    role="article"
>
    <div class="avatar" style="background: {avatarColor}">
        {initial}
    </div>

    <div class="bubble-wrapper">
        {#if reply_preview}
            <div class="reply-quote">
                <div class="reply-bar"></div>
                <div class="reply-content">
                    <div class="reply-user">{reply_preview.user}</div>
                    <div class="reply-text">{reply_preview.text}</div>
                </div>
            </div>
        {/if}

        <div class="bubble">
            <div class="message-header">
                <strong style="color: {avatarColor}">{user}</strong>
                <div class="header-right">
                    {#if showActions && !editing}
                        <button class="action-btn" title="Reply" onclick={handleReply} aria-label="Reply">↩️</button>
                        <button
                            class="action-btn"
                            title="React"
                            onclick={() => (showReactionPicker = !showReactionPicker)}
                            aria-label="React"
                        >😊</button>
                        {#if isMine}
                            <button class="action-btn" title="Edit" onclick={() => (editing = true)} aria-label="Edit">✏️</button>
                            <button class="action-btn" title="Delete" onclick={handleDelete} aria-label="Delete">🗑️</button>
                        {/if}
                    {/if}
                    <span class="time">{time}</span>
                </div>
            </div>

            {#if fullImageUrl}
                <a href={fullImageUrl} target="_blank" rel="noopener">
                    <img src={fullImageUrl} alt="shared" class="message-image" />
                </a>
            {/if}

            {#if editing}
                <div class="edit-area">
                    <textarea bind:value={editText} rows="3"></textarea>
                    <div class="edit-actions">
                        <button class="save-btn" onclick={saveEdit}>Save</button>
                        <button class="cancel-btn" onclick={cancelEdit}>Cancel</button>
                    </div>
                </div>
            {:else if text}
                <div class="message-text markdown-body" bind:this={bodyEl}></div>
            {/if}

            {#if reactionKeys.length > 0}
                <div class="reactions">
                    {#each reactionKeys as emoji}
                        <button
                            class="reaction-chip"
                            class:mine={didIReact(emoji)}
                            onclick={() => react(emoji)}
                            title={reactions[emoji].map((r) => r.user).join(", ")}
                        >
                            <span class="emoji">{emoji}</span>
                            <span class="count">{reactions[emoji].length}</span>
                        </button>
                    {/each}
                </div>
            {/if}
        </div>

        {#if showReactionPicker}
            <div class="reaction-picker">
                {#each QUICK_REACTIONS as emoji}
                    <button class="picker-emoji" onclick={() => react(emoji)}>{emoji}</button>
                {/each}
            </div>
        {/if}
    </div>
</div>

<style>
    .message {
        display: flex;
        gap: 10px;
        margin-bottom: 15px;
        animation: bubblePop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    @keyframes bubblePop {
        0% { opacity: 0; transform: scale(0.7) translateY(15px); }
        60% { opacity: 1; transform: scale(1.04) translateY(-2px); }
        100% { opacity: 1; transform: scale(1) translateY(0); }
    }
    .avatar {
        width: 36px; height: 36px; border-radius: 50%;
        color: white; font-weight: 700; font-size: 1rem;
        display: flex; align-items: center; justify-content: center;
        flex-shrink: 0; box-shadow: var(--shadow-sm);
    }
    .bubble-wrapper { flex: 1; position: relative; min-width: 0; }
    .reply-quote {
        display: flex; gap: 8px;
        padding: 6px 10px; margin-bottom: -4px;
        background: var(--surface-3);
        border-radius: 10px 10px 0 0;
        opacity: 0.85; font-size: 0.78rem;
    }
    .reply-bar { width: 3px; background: var(--accent); border-radius: 2px; }
    .reply-content { flex: 1; min-width: 0; }
    .reply-user { font-weight: 700; color: var(--accent); font-size: 0.75rem; }
    .reply-text {
        color: var(--text-muted);
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .bubble {
        padding: 10px 14px;
        background: var(--surface); color: var(--text);
        border-radius: 14px 14px 14px 4px;
        box-shadow: var(--shadow-sm);
        min-width: 0;
    }
    .message.mine .bubble { border-left: 3px solid var(--accent); }
    .message-header {
        display: flex; justify-content: space-between; align-items: center;
        margin-bottom: 4px; font-size: 0.85rem; gap: 6px;
    }
    .message-header strong { font-weight: 700; }
    .header-right { display: flex; align-items: center; gap: 3px; }
    .action-btn {
        background: transparent; border: none; cursor: pointer;
        font-size: 0.78rem; padding: 2px 4px; border-radius: 4px;
        opacity: 0.6;
        transition: opacity 0.15s, background 0.15s;
    }
    .action-btn:hover { opacity: 1; background: var(--surface-3); }
    .message-header .time { color: var(--text-muted); font-size: 0.72rem; }
    .message-text {
        color: var(--text);
        word-wrap: break-word; line-height: 1.5; overflow-wrap: break-word;
    }
    .message-image {
        max-width: 100%; max-height: 300px;
        border-radius: 10px; margin: 6px 0;
        cursor: pointer; display: block;
    }

    .reactions { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; }
    .reaction-chip {
        display: flex; align-items: center; gap: 4px;
        padding: 2px 8px; background: var(--surface-3);
        border: 1px solid transparent; border-radius: 12px;
        cursor: pointer; font-size: 0.85rem;
        transition: transform 0.1s, background 0.15s, border-color 0.15s;
    }
    .reaction-chip:hover { transform: scale(1.08); }
    .reaction-chip.mine {
        background: rgba(102, 126, 234, 0.18);
        border-color: var(--accent);
    }
    .reaction-chip .count {
        font-size: 0.75rem; color: var(--text-muted); font-weight: 600;
    }
    .reaction-chip.mine .count { color: var(--accent); }

    .reaction-picker {
        position: absolute; top: -6px; right: 0;
        display: flex; gap: 2px; padding: 4px 6px;
        background: var(--surface); border: 1px solid var(--border);
        border-radius: 20px; box-shadow: var(--shadow-md); z-index: 20;
        animation: pickerPop 0.18s ease-out;
    }
    @keyframes pickerPop {
        from { opacity: 0; transform: scale(0.85) translateY(4px); }
        to { opacity: 1; transform: scale(1) translateY(0); }
    }
    .picker-emoji {
        background: transparent; border: none;
        font-size: 1.15rem; cursor: pointer;
        padding: 3px 5px; border-radius: 50%;
        transition: transform 0.12s, background 0.12s;
    }
    .picker-emoji:hover { transform: scale(1.35); background: var(--surface-3); }

    .edit-area textarea {
        width: 100%; padding: 8px 10px;
        border: 1.5px solid var(--border); border-radius: 8px;
        font-family: inherit; font-size: 0.95rem;
        background: var(--surface-2); color: var(--text);
        resize: vertical; min-height: 60px;
    }
    .edit-area textarea:focus { outline: none; border-color: var(--accent); }
    .edit-actions { display: flex; gap: 6px; margin-top: 8px; justify-content: flex-end; }
    .edit-actions button {
        padding: 6px 14px; border-radius: 6px;
        font-size: 0.85rem; font-weight: 600; cursor: pointer; border: none;
    }
    .save-btn { background: var(--accent); color: white; }
    .cancel-btn { background: var(--surface-3); color: var(--text); }

    :global(.markdown-body p) { margin: 0 0 8px; }
    :global(.markdown-body p:last-child) { margin-bottom: 0; }
    :global(.markdown-body a) { color: var(--accent); text-decoration: underline; }
    :global(.markdown-body code) {
        background: var(--surface-3); padding: 2px 6px; border-radius: 4px;
        font-family: 'Consolas', 'Monaco', monospace; font-size: 0.85em;
    }
    :global(.markdown-body pre) {
        background: #1e1e2e; color: #e5e5e5;
        padding: 12px 14px; border-radius: 8px;
        overflow-x: auto; margin: 8px 0; font-size: 0.85rem;
        position: relative;
    }
    :global(.markdown-body pre code) { background: transparent; padding: 0; color: inherit; }
    :global(.markdown-body blockquote) {
        border-left: 3px solid var(--accent);
        padding-left: 10px; color: var(--text-muted); margin: 6px 0;
    }
    :global(.markdown-body ul),
    :global(.markdown-body ol) { margin: 6px 0; padding-left: 22px; }
    :global(.markdown-body li) { margin: 2px 0; }
    :global(.markdown-body h1),
    :global(.markdown-body h2),
    :global(.markdown-body h3) { margin: 8px 0 4px; font-size: 1.05em; }
    :global(.markdown-body table) { border-collapse: collapse; margin: 6px 0; }
    :global(.markdown-body th),
    :global(.markdown-body td) { border: 1px solid var(--border); padding: 4px 8px; }
    :global(.markdown-body .copy-btn) {
        position: absolute; top: 6px; right: 6px;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: #e5e5e5; padding: 3px 8px;
        border-radius: 4px; font-size: 0.7rem; cursor: pointer;
        opacity: 0.7;
    }
    :global(.markdown-body .copy-btn:hover) { opacity: 1; background: rgba(255,255,255,0.2); }
    :global(.markdown-body .copy-btn.copied) {
        background: rgba(74, 222, 128, 0.3);
        border-color: rgba(74, 222, 128, 0.5); opacity: 1;
    }
</style>

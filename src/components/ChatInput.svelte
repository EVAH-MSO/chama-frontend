<script>
    import { API_URL } from "../store/auth.js";

    let { onSend, onTyping, replyTo = $bindable(null) } = $props();
    let text = $state("");
    let showEmojis = $state(false);
    let typingTimer;
    let selectedFile = $state(null);
    let previewUrl = $state(null);
    let uploading = $state(false);
    let textareaEl = $state(null);
    let focused = $state(false);

    const emojis = [
        "😀","😂","😍","🥰","😎","🤔","😅","😭","😴","🤯",
        "👍","👎","🙏","👏","🙌","💪","❤️","🔥","✨","🎉",
        "💯","🚀","🌟","☀️","🌈","⚡","🎵","🎨","🍕","☕",
    ];

    $effect(() => {
        text;
        if (textareaEl) {
            textareaEl.style.height = "auto";
            const newHeight = Math.min(textareaEl.scrollHeight, 140);
            textareaEl.style.height = newHeight + "px";
        }
    });

    function handleSubmit(e) {
        if (e) e.preventDefault();
        console.log("ChatInput submit — text:", text);

        if (selectedFile) {
            uploadFile();
            return;
        }
        if (!text.trim()) return;

        onSend(text.trim(), replyTo?.id);
        text = "";
        replyTo = null;
        showEmojis = false;
        onTyping?.(false);
        if (textareaEl) textareaEl.style.height = "auto";
    }

    function handleKeyDown(e) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    }

    async function uploadFile() {
        uploading = true;
        const formData = new FormData();
        formData.append("file", selectedFile);
        if (text.trim()) formData.append("text", text.trim());
        if (replyTo?.id) formData.append("reply_to", replyTo.id);

        try {
            const res = await fetch(`${API_URL}/api/upload`, {
                method: "POST",
                credentials: "include",
                body: formData,
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                alert(err.error || `Upload failed (${res.status})`);
                return;
            }
            clearFile();
            text = "";
            replyTo = null;
            if (textareaEl) textareaEl.style.height = "auto";
        } catch (err) {
            alert("Upload failed: " + err.message);
        } finally {
            uploading = false;
        }
    }

    function handleFileChange(e) {
        const file = e.target.files?.[0];
        if (!file) return;
        const isVideo = file.type.startsWith("video/");
        const limit = isVideo ? 25 * 1024 * 1024 : 5 * 1024 * 1024;
        if (file.size > limit) {
            alert(`Max ${isVideo ? "25" : "5"} MB`);
            return;
        }
        selectedFile = file;
        previewUrl = URL.createObjectURL(file);
    }

    function clearFile() {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        selectedFile = null;
        previewUrl = null;
    }

    function handleInput(e) {
        text = e.target.value;
        onTyping?.(true);
        clearTimeout(typingTimer);
        typingTimer = setTimeout(() => onTyping?.(false), 1500);
    }

    function insertEmoji(emoji) {
        text += emoji;
        textareaEl?.focus();
    }
</script>

<div class="input-wrapper">
    {#if replyTo}
        <div class="reply-preview">
            <div class="reply-bar"></div>
            <div class="reply-content">
                <div class="reply-label">
                    Replying to <strong>{replyTo.user}</strong>
                </div>
                <div class="reply-text">
                    {replyTo.text?.slice(0, 80) || "📷 Media"}
                </div>
            </div>
            <button class="reply-close" onclick={() => (replyTo = null)} aria-label="Cancel reply">✕</button>
        </div>
    {/if}

    {#if previewUrl}
        <div class="preview-bar">
            {#if selectedFile?.type?.startsWith("video/")}
                <video src={previewUrl} class="preview-thumb" muted></video>
            {:else}
                <img src={previewUrl} alt="preview" class="preview-thumb" />
            {/if}
            <span class="preview-label">Ready to send</span>
            <button type="button" class="preview-remove" onclick={clearFile} aria-label="Remove file">✕</button>
        </div>
    {/if}

    {#if showEmojis}
        <div class="emoji-picker">
            {#each emojis as emoji}
                <button type="button" class="emoji-btn" onclick={() => insertEmoji(emoji)}>
                    {emoji}
                </button>
            {/each}
        </div>
    {/if}

    <form class="chat-input" onsubmit={handleSubmit}>
        <label class="file-btn" title="Send image or video">
            📎
            <input
                type="file"
                accept="image/*,video/*"
                onchange={handleFileChange}
                hidden
            />
        </label>

        <div class="textarea-wrap" class:focused>
            <textarea
                bind:this={textareaEl}
                class="message-input"
                placeholder={selectedFile ? "Add a caption..." : "Type a message..."}
                value={text}
                oninput={handleInput}
                onkeydown={handleKeyDown}
                onfocus={() => (focused = true)}
                onblur={() => (focused = false)}
                rows="1"
            ></textarea>
        </div>

        <button
            type="button"
            class="emoji-toggle"
            onclick={() => (showEmojis = !showEmojis)}
            aria-label="Toggle emoji picker"
        >
            😊
        </button>

        <button
            type="submit"
            class="send-btn"
            disabled={uploading || (!text.trim() && !selectedFile)}
        >
            {uploading ? "..." : "Send"}
        </button>
    </form>

    <div class="hint">
        <kbd>Enter</kbd> to send · <kbd>Shift</kbd>+<kbd>Enter</kbd> new line
    </div>
</div>

<style>
    .input-wrapper {
        background: var(--surface);
        border-top: 1px solid var(--border);
    }
    .reply-preview {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 14px;
        background: var(--surface-3);
        border-bottom: 1px solid var(--border);
    }
    .reply-bar {
        width: 3px;
        height: 36px;
        background: var(--accent);
        border-radius: 2px;
        flex-shrink: 0;
    }
    .reply-content { flex: 1; min-width: 0; }
    .reply-label { font-size: 0.75rem; color: var(--text-muted); margin-bottom: 2px; }
    .reply-label strong { color: var(--accent); }
    .reply-text {
        font-size: 0.85rem;
        color: var(--text);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .reply-close {
        background: transparent;
        border: none;
        color: var(--text-muted);
        cursor: pointer;
        font-size: 1rem;
        padding: 4px 8px;
        border-radius: 6px;
    }
    .reply-close:hover { background: var(--border); }
    .preview-bar {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 14px;
        background: var(--surface-3);
        border-bottom: 1px solid var(--border);
    }
    .preview-thumb {
        width: 50px;
        height: 50px;
        object-fit: cover;
        border-radius: 8px;
    }
    .preview-label {
        flex: 1;
        font-size: 0.9rem;
        color: var(--accent);
        font-weight: 600;
    }
    .preview-remove {
        background: var(--error);
        color: white;
        border: none;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        cursor: pointer;
        font-weight: 700;
    }
    .emoji-picker {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        padding: 10px;
        background: var(--surface-3);
        border-bottom: 1px solid var(--border);
        max-height: 150px;
        overflow-y: auto;
    }
    .emoji-btn {
        font-size: 1.4rem;
        background: transparent;
        border: none;
        cursor: pointer;
        padding: 4px 6px;
        border-radius: 8px;
    }
    .emoji-btn:hover { background: var(--border); transform: scale(1.2); }
    .chat-input {
        display: flex;
        padding: 12px;
        gap: 8px;
        align-items: flex-end;
    }
    .file-btn {
        background: transparent;
        border: 1px solid var(--border);
        border-radius: 50%;
        width: 44px;
        height: 44px;
        font-size: 1.3rem;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        color: var(--text);
    }
    .file-btn:hover { background: var(--surface-3); }
    .textarea-wrap {
        flex: 1;
        border: 1.5px solid var(--border);
        border-radius: 20px;
        background: var(--surface);
        display: flex;
        align-items: center;
    }
    .textarea-wrap.focused {
        border-color: var(--accent);
        box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.15);
    }
    .message-input {
        flex: 1;
        padding: 12px 18px;
        border: none;
        outline: none;
        font-size: 1rem;
        font-family: inherit;
        background: transparent;
        color: var(--text);
        resize: none;
        min-height: 44px;
        max-height: 140px;
        line-height: 1.4;
        overflow-y: auto;
    }
    .message-input::placeholder { color: var(--text-muted); }
    .emoji-toggle {
        background: transparent;
        border: 1px solid var(--border);
        border-radius: 50%;
        width: 44px;
        height: 44px;
        font-size: 1.3rem;
        cursor: pointer;
        flex-shrink: 0;
    }
    .emoji-toggle:hover { background: var(--surface-3); }
    .send-btn {
        padding: 12px 22px;
        background: linear-gradient(135deg, var(--accent), var(--accent-2));
        color: white;
        border: none;
        border-radius: 22px;
        font-weight: 600;
        cursor: pointer;
        flex-shrink: 0;
        min-height: 44px;
    }
    .send-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .hint {
        font-size: 0.7rem;
        color: var(--text-muted);
        text-align: center;
        padding: 0 12px 10px;
        opacity: 0.7;
    }
    .hint kbd {
        background: var(--surface-3);
        border: 1px solid var(--border);
        border-radius: 4px;
        padding: 1px 5px;
        font-family: monospace;
        font-size: 0.7rem;
    }
</style>
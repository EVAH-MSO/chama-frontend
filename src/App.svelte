<script>
    import { onMount, tick } from "svelte";
    import { io } from "socket.io-client";
    import { user, authReady, fetchMe, API_URL } from "./store/auth.js";
    import "./theme.js";
    import Login from "./pages/Login.svelte";
    import Profile from "./pages/Profile.svelte";
    import Status from "./pages/Status.svelte";
    import Chama from "./pages/Chama.svelte";
    import ChatHeader from "./components/ChatHeader.svelte";
    import Message from "./components/Message.svelte";
    import ChatInput from "./components/ChatInput.svelte";
    import ConnectionBanner from "./components/ConnectionBanner.svelte";
    import ScrollToBottom from "./components/ScrollToBottom.svelte";

    let socket;
    let messages = $state([]);
    let currentPage = $state("chat");
    let messagesEnd = $state(null);
    let chatMessagesEl = $state(null);
    let connected = $state(false);
    let onlineCount = $state(0);
    let typingUsers = $state([]);
    let replyTo = $state(null);

    let isNearBottom = $state(true);
    let unreadCount = $state(0);

    // Room state
    let currentRoom = $state(null);   // null = global, number = chama_id
    let userChamas = $state([]);

    onMount(() => {
        fetchMe();
    });

    $effect(() => {
        if ($user) {
            connectSocket();
            loadUserChamas();
        } else {
            if (socket) {
                socket.disconnect();
                socket = null;
            }
            userChamas = [];
            currentRoom = null;
        }
    });

    async function loadUserChamas() {
        try {
            const res = await fetch(`${API_URL}/api/chamas/mine`, {
                credentials: "include",
            });
            if (res.ok) userChamas = await res.json();
        } catch (err) {
            console.error("Load chamas failed:", err);
        }
    }

    async function loadMessages() {
        try {
            const url = currentRoom
                ? `${API_URL}/api/messages?chama_id=${currentRoom}`
                : `${API_URL}/api/messages`;
            const res = await fetch(url, { credentials: "include" });
            if (res.ok) {
                messages = await res.json();
            } else if (res.status === 403) {
                console.warn("Not allowed in this room");
                messages = [];
            }
        } catch (err) {
            console.error("Load messages failed:", err);
        }
    }

    async function switchRoom(chamaId) {
        currentRoom = chamaId;
        messages = [];
        unreadCount = 0;
        await loadMessages();
    }

    async function connectSocket() {
        await loadMessages();

        socket = io(API_URL, {
            transports: ["polling"],
            withCredentials: true,
        });

        socket.on("connect", () => {
            console.log("✅ Socket connected");
            connected = true;
            socket.emit("register", {
                username: $user.display_name || $user.username,
            });
        });

        socket.on("connect_error", () => (connected = false));
        socket.on("disconnect", () => (connected = false));

        socket.on("new_message", (msg) => {
            // Only display if message belongs to current room
            const msgRoom = msg.chama_id ?? null;
            if (msgRoom !== currentRoom) return;

            messages = [...messages, msg];
            playSound();
            typingUsers = typingUsers.filter((u) => u !== msg.user);
            if (!isNearBottom) unreadCount += 1;
        });

        socket.on("user_count", ({ count }) => (onlineCount = count));

        socket.on("user_typing", ({ user: u, is_typing, chama_id }) => {
            if ((chama_id ?? null) !== currentRoom) return;
            if (is_typing) {
                if (!typingUsers.includes(u)) typingUsers = [...typingUsers, u];
            } else {
                typingUsers = typingUsers.filter((x) => x !== u);
            }
        });

        socket.on("message_deleted", ({ id }) => {
            messages = messages.filter((m) => m.id !== id);
        });

        socket.on("message_edited", ({ id, text }) => {
            messages = messages.map((m) => (m.id === id ? { ...m, text } : m));
        });

        socket.on("chat_cleared", ({ chama_id }) => {
            if ((chama_id ?? null) === currentRoom) messages = [];
        });

        socket.on("reactions_updated", ({ message_id, reactions }) => {
            messages = messages.map((m) =>
                m.id === message_id ? { ...m, reactions } : m
            );
        });

        socket.on("status_created", () => {
            window.dispatchEvent(new CustomEvent("status-updated"));
        });
        socket.on("status_deleted", () => {
            window.dispatchEvent(new CustomEvent("status-updated"));
        });

        socket.on("chama_updated", ({ chama_id }) => {
            window.dispatchEvent(new CustomEvent("chama-updated", { detail: { chama_id } }));
            // Refresh chama list (in case we got added/removed)
            loadUserChamas();
        });
    }

    $effect(() => {
        messages.length;
        if (messagesEnd && isNearBottom) {
            tick().then(() =>
                messagesEnd.scrollIntoView({ behavior: "smooth" })
            );
        }
    });

    function handleScroll() {
        if (!chatMessagesEl) return;
        const { scrollTop, scrollHeight, clientHeight } = chatMessagesEl;
        const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
        isNearBottom = distanceFromBottom < 100;
        if (isNearBottom) unreadCount = 0;
    }

    function scrollToBottom() {
        messagesEnd?.scrollIntoView({ behavior: "smooth" });
        unreadCount = 0;
    }

    function sendMessage(text, replyToId = null) {
        if (!socket || !socket.connected) {
            alert("Not connected. Please wait.");
            return;
        }
        socket.emit("send_message", {
            text,
            reply_to: replyToId,
            chama_id: currentRoom,
        });
    }

    function handleTyping(isTyping) {
        socket?.emit("typing", {
            user: $user?.display_name || $user?.username,
            is_typing: isTyping,
            chama_id: currentRoom,
        });
    }

    function handleDeleteMessage() {}
    function handleEditMessage() {}
    function handleReact() {}

    async function clearChat() {
        const label = currentRoom
            ? `chama "${userChamas.find((c) => c.id === currentRoom)?.name}"`
            : "GLOBAL chat";
        if (!confirm(`⚠️ Delete ALL messages in ${label} for everyone?`)) return;

        const url = currentRoom
            ? `${API_URL}/api/messages/clear?chama_id=${currentRoom}`
            : `${API_URL}/api/messages/clear`;
        try {
            const res = await fetch(url, {
                method: "POST",
                credentials: "include",
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                alert(err.error || "Clear failed");
            }
        } catch (err) {
            alert("Clear failed: " + err.message);
        }
    }

    function playSound() {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = 800;
            gain.gain.value = 0.05;
            osc.start();
            osc.stop(ctx.currentTime + 0.1);
        } catch {}
    }

    let currentChamaName = $derived(
        currentRoom
            ? userChamas.find((c) => c.id === currentRoom)?.name || "Chama"
            : "Global Chat"
    );
</script>

<ConnectionBanner {connected} />

{#if !$authReady}
    <div class="loading"><div class="spinner"></div></div>
{:else if !$user}
    <Login />
{:else}
    <div class="app-shell">
        <nav class="top-nav">
            <button class="nav-btn" class:active={currentPage === "chat"} onclick={() => (currentPage = "chat")}>
                💬 Chat
            </button>
            <button class="nav-btn" class:active={currentPage === "status"} onclick={() => (currentPage = "status")}>
                📸 Status
            </button>
            <button class="nav-btn" class:active={currentPage === "chama"} onclick={() => (currentPage = "chama")}>
                🏦 Chama
            </button>
            <button class="nav-btn" class:active={currentPage === "profile"} onclick={() => (currentPage = "profile")}>
                👤 Profile
            </button>
            {#if currentPage === "chat"}
                <button class="nav-btn danger" onclick={clearChat} title="Delete all messages">🗑️</button>
            {/if}
        </nav>

        {#if currentPage === "chat"}
            <div class="chat-container">
                <!-- Room switcher -->
                <div class="room-switcher">
                    <button
                        class="room-btn"
                        class:active={currentRoom === null}
                        onclick={() => switchRoom(null)}
                    >
                        🌍 Global
                    </button>
                    {#each userChamas as c}
                        <button
                            class="room-btn"
                            class:active={currentRoom === c.id}
                            onclick={() => switchRoom(c.id)}
                        >
                            🏦 {c.name}
                        </button>
                    {/each}
                </div>

                <ChatHeader
                    connected={connected}
                    onlineCount={onlineCount}
                    roomName={currentChamaName}
                    isPrivate={currentRoom !== null}
                />

                <div class="chat-messages" bind:this={chatMessagesEl} onscroll={handleScroll}>
                    {#if messages.length === 0}
                        <div class="empty-chat">
                            {#if currentRoom}
                                🔒 Private room — only members of <strong>{currentChamaName}</strong> can see this.
                            {:else}
                                🌍 Global chat — anyone with an account can see this.
                            {/if}
                        </div>
                    {/if}

                    {#each messages as msg, i (msg.id ?? i)}
                        <Message
                            id={msg.id}
                            user_id={msg.user_id}
                            user={msg.user}
                            text={msg.text}
                            time={msg.time}
                            image_url={msg.image_url}
                            reply_to={msg.reply_to}
                            reply_preview={msg.reply_preview}
                            reactions={msg.reactions || {}}
                            onDelete={handleDeleteMessage}
                            onEdit={handleEditMessage}
                            onReply={(payload) => (replyTo = payload)}
                            onReact={handleReact}
                        />
                    {/each}

                    {#if typingUsers.length > 0}
                        <div class="typing-indicator">
                            <span class="dots"><span></span><span></span><span></span></span>
                            {typingUsers.join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing...
                        </div>
                    {/if}

                    <div bind:this={messagesEnd}></div>
                </div>

                <ScrollToBottom visible={!isNearBottom} unread={unreadCount} onclick={scrollToBottom} />
                <ChatInput onSend={sendMessage} onTyping={handleTyping} bind:replyTo />
            </div>
        {:else if currentPage === "status"}
            <Status />
        {:else if currentPage === "chama"}
            <Chama />
        {:else}
            <Profile />
        {/if}
    </div>
{/if}

<style>
    .loading { display: flex; justify-content: center; align-items: center; padding: 60px; }
    .spinner {
        width: 40px; height: 40px;
        border: 4px solid rgba(255, 255, 255, 0.2);
        border-top-color: white;
        border-radius: 50%;
        animation: spin 0.9s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .app-shell {
        width: 100%; max-width: 600px;
        display: flex; flex-direction: column; gap: 12px;
    }
    .top-nav {
        display: flex; gap: 4px;
        background: var(--glass);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border: 1px solid var(--glass-border);
        padding: 6px; border-radius: 14px;
    }
    .nav-btn {
        flex: 1; padding: 10px 6px;
        border: none; border-radius: 10px;
        background: transparent; color: white;
        font-weight: 600; cursor: pointer;
        white-space: nowrap; font-size: 0.85rem;
        transition: background 0.2s;
    }
    .nav-btn:hover:not(.active) { background: rgba(255, 255, 255, 0.15); }
    .nav-btn.active { background: var(--surface); color: var(--accent); box-shadow: var(--shadow-md); }
    .nav-btn.danger { flex: 0 0 auto; padding: 10px 12px; color: #fca5a5; }
    .nav-btn.danger:hover { background: rgba(239, 68, 68, 0.35); color: white; }

    .chat-container {
        width: 100%; height: 75vh;
        background: var(--surface);
        border-radius: 18px;
        box-shadow: var(--shadow-lg);
        display: flex; flex-direction: column;
        overflow: hidden; position: relative;
    }

    .room-switcher {
        display: flex;
        gap: 4px;
        padding: 8px 10px 4px;
        background: var(--surface-2);
        overflow-x: auto;
        flex-shrink: 0;
        border-bottom: 1px solid var(--border);
    }
    .room-switcher::-webkit-scrollbar { height: 4px; }
    .room-btn {
        padding: 6px 12px;
        border-radius: 20px;
        border: 1px solid var(--border);
        background: var(--surface);
        color: var(--text);
        cursor: pointer;
        font-weight: 600;
        font-size: 0.8rem;
        white-space: nowrap;
        transition: background 0.15s, color 0.15s;
    }
    .room-btn.active {
        background: var(--accent);
        color: white;
        border-color: var(--accent);
    }
    .room-btn:hover:not(.active) { background: var(--surface-3); }

    .chat-messages {
        flex: 1; overflow-y: auto;
        padding: 20px;
        background: var(--surface-2);
        scroll-behavior: smooth;
    }
    .empty-chat {
        text-align: center; color: var(--text-muted);
        padding: 40px 20px; font-style: italic;
        font-size: 0.9rem; line-height: 1.6;
    }
    .empty-chat strong { color: var(--accent); }

    .typing-indicator {
        display: flex; align-items: center; gap: 8px;
        font-size: 0.85rem; color: var(--text-muted);
        font-style: italic; padding: 8px 12px;
    }
    .dots { display: inline-flex; gap: 3px; }
    .dots span {
        width: 6px; height: 6px;
        background: var(--text-muted);
        border-radius: 50%;
        animation: bounce 1.2s infinite;
    }
    .dots span:nth-child(2) { animation-delay: 0.15s; }
    .dots span:nth-child(3) { animation-delay: 0.3s; }
    @keyframes bounce {
        0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
        30% { transform: translateY(-5px); opacity: 1; }
    }
</style>
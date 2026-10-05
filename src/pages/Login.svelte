<script>
    import { signup, login } from "../store/auth.js";

    let mode = $state("login");
    let username = $state("");
    let password = $state("");
    let error = $state("");
    let loading = $state(false);

    async function submit(e) {
        e.preventDefault();
        error = "";
        loading = true;
        try {
            if (mode === "signup") {
                await signup(username, password);
            } else {
                await login(username, password);
            }
        } catch (err) {
            const msg = err.message || "";
            if (msg.includes("Invalid username")) {
                error = "❌ Wrong username or password. Check and try again.";
            } else if (msg.includes("already taken")) {
                error = "❌ That username is taken. Pick another or log in.";
            } else if (msg.includes("at least 6")) {
                error = "❌ Password must be at least 6 characters.";
            } else if (msg.includes("Username must be")) {
                error = "❌ Username: 3–20 lowercase letters, numbers, underscore.";
            } else {
                error = msg;
            }
        } finally {
            loading = false;
        }
    }

    function toggleMode() {
        mode = mode === "login" ? "signup" : "login";
        error = "";
    }
</script>

<div class="auth-container">
    <div class="auth-card">
        <div class="auth-header">
            <div class="logo">💬</div>
            <h1>MiniChat</h1>
            <p class="subtitle">
                {mode === "login" ? "Welcome back" : "Create your account"}
            </p>
        </div>

        <form onsubmit={submit}>
            <div class="field">
                <label>Username</label>
                <input
                    type="text"
                    bind:value={username}
                    placeholder="e.g. evah"
                    autocomplete="username"
                    required
                />
                {#if mode === "signup"}
                    <small>3–20 chars · lowercase letters, numbers, underscore</small>
                {/if}
            </div>

            <div class="field">
                <label>Password</label>
                <input
                    type="password"
                    bind:value={password}
                    placeholder="At least 6 characters"
                    autocomplete={mode === "login" ? "current-password" : "new-password"}
                    required
                />
            </div>

            {#if error}
                <div class="error">{error}</div>
            {/if}

            <button type="submit" class="primary-btn" disabled={loading}>
                {loading ? "Please wait..." : (mode === "login" ? "Log In" : "Create Account")}
            </button>
        </form>

        <div class="switch">
            {mode === "login" ? "New here?" : "Already have an account?"}
            <button type="button" class="link" onclick={toggleMode}>
                {mode === "login" ? "Sign up" : "Log in"}
            </button>
        </div>
    </div>
</div>

<style>
    .auth-container {
        width: 100%;
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 80vh;
    }
    .auth-card {
        background: var(--surface);
        padding: 40px;
        border-radius: 20px;
        box-shadow: var(--shadow-lg);
        width: 100%;
        max-width: 400px;
        transition: background 0.3s ease;
    }
    .auth-header { text-align: center; margin-bottom: 30px; }
    .logo { font-size: 3rem; margin-bottom: 10px; }
    h1 { font-size: 1.8rem; color: var(--text); margin: 0 0 6px; }
    .subtitle { color: var(--text-muted); font-size: 0.95rem; }
    .field { margin-bottom: 18px; }
    label {
        display: block;
        font-size: 0.9rem;
        font-weight: 600;
        color: var(--text);
        margin-bottom: 6px;
    }
    input {
        width: 100%;
        padding: 12px 14px;
        border: 2px solid var(--border);
        border-radius: 10px;
        font-size: 1rem;
        background: var(--surface);
        color: var(--text);
    }
    input:focus { outline: none; border-color: var(--accent); }
    small { color: var(--text-muted); font-size: 0.8rem; }
    .primary-btn {
        width: 100%;
        padding: 14px;
        background: linear-gradient(135deg, var(--accent), var(--accent-2));
        color: white;
        border: none;
        border-radius: 10px;
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        margin-top: 8px;
    }
    .primary-btn:disabled { opacity: 0.6; cursor: not-allowed; }
    .error {
        background: #fee2e2;
        color: #b91c1c;
        padding: 10px 14px;
        border-radius: 8px;
        font-size: 0.9rem;
        margin-bottom: 12px;
    }
    .switch {
        text-align: center;
        margin-top: 20px;
        color: var(--text-muted);
        font-size: 0.9rem;
    }
    .link {
        background: none;
        border: none;
        color: var(--accent);
        font-weight: 600;
        cursor: pointer;
        text-decoration: underline;
        padding: 0 4px;
        font-size: 0.9rem;
    }
</style>
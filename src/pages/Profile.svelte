<script>
    import { user, updateProfile, logout } from "../store/auth.js";

    let editing = $state(false);
    let display_name = $state("");
    let bio = $state("");
    let avatar_color = $state("#667eea");
    let saving = $state(false);

    const colors = [
        "#667eea", "#f59e0b", "#10b981", "#ef4444",
        "#8b5cf6", "#ec4899", "#14b8a6", "#f97316",
    ];

    $effect(() => {
        if ($user && !editing) {
            display_name = $user.display_name || $user.username;
            bio = $user.bio || "";
            avatar_color = $user.avatar_color || "#667eea";
        }
    });

    async function save() {
        saving = true;
        try {
            await updateProfile({ display_name, bio, avatar_color });
            editing = false;
        } catch (err) {
            alert(err.message);
        } finally {
            saving = false;
        }
    }

    let initial = $derived(
        (($user?.display_name || $user?.username || "?")[0] || "?").toUpperCase()
    );
</script>

<div class="profile-container">
    <div class="profile-card">
        <div class="avatar-large" style="background: {avatar_color}">
            {initial}
        </div>

        {#if !editing}
            <h2>{$user.display_name || $user.username}</h2>
            <p class="username">@{$user.username}</p>
            {#if $user.bio}
                <p class="bio">{$user.bio}</p>
            {/if}
            <button class="secondary-btn" onclick={() => (editing = true)}>
                ✏️ Edit Profile
            </button>
        {:else}
            <div class="edit-form">
                <label>Display Name</label>
                <input type="text" bind:value={display_name} maxlength="40" />

                <label>Bio</label>
                <textarea bind:value={bio} maxlength="200" rows="3"></textarea>

                <label>Avatar Color</label>
                <div class="color-grid">
                    {#each colors as c}
                        <button
                            type="button"
                            class="color-swatch"
                            class:selected={avatar_color === c}
                            style="background: {c}"
                            onclick={() => (avatar_color = c)}
                        ></button>
                    {/each}
                </div>

                <div class="form-actions">
                    <button class="primary-btn" onclick={save} disabled={saving}>
                        {saving ? "Saving..." : "Save"}
                    </button>
                    <button class="secondary-btn" onclick={() => (editing = false)}>
                        Cancel
                    </button>
                </div>
            </div>
        {/if}

        <hr />

        <button class="logout-btn" onclick={logout}>🚪 Log Out</button>
    </div>
</div>

<style>
    .profile-container { width: 100%; display: flex; justify-content: center; }
    .profile-card {
        background: white;
        padding: 40px;
        border-radius: 20px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        width: 100%;
        max-width: 450px;
        text-align: center;
    }
    .avatar-large {
        width: 100px; height: 100px;
        border-radius: 50%;
        color: white;
        font-size: 2.5rem;
        font-weight: 700;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 16px;
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
    }
    h2 { margin: 0; color: #222; }
    .username { color: #888; margin-top: 4px; font-size: 0.9rem; }
    .bio { color: #555; margin-top: 12px; font-style: italic; }
    hr { border: none; border-top: 1px solid #e5e7eb; margin: 24px 0; }
    .primary-btn, .secondary-btn, .logout-btn {
        padding: 10px 20px;
        border-radius: 10px;
        font-weight: 600;
        cursor: pointer;
        border: none;
        font-size: 0.95rem;
    }
    .primary-btn {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
    }
    .secondary-btn { background: #f3f4f6; color: #444; }
    .logout-btn {
        background: #fee2e2;
        color: #b91c1c;
        width: 100%;
        margin-top: 8px;
    }
    .edit-form { text-align: left; }
    .edit-form label {
        display: block;
        font-size: 0.85rem;
        font-weight: 600;
        color: #444;
        margin-top: 14px;
        margin-bottom: 6px;
    }
    .edit-form input, .edit-form textarea {
        width: 100%;
        padding: 10px 12px;
        border: 2px solid #e5e7eb;
        border-radius: 10px;
        font-size: 0.95rem;
        font-family: inherit;
    }
    .edit-form input:focus, .edit-form textarea:focus {
        outline: none;
        border-color: #667eea;
    }
    .color-grid { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 6px; }
    .color-swatch {
        width: 32px; height: 32px;
        border-radius: 50%;
        border: 3px solid transparent;
        cursor: pointer;
    }
    .color-swatch.selected { border-color: #222; transform: scale(1.15); }
    .form-actions { display: flex; gap: 8px; margin-top: 20px; }
    .form-actions button { flex: 1; }
</style>

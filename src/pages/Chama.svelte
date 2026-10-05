<script>
    import { onMount } from "svelte";
    import { API_URL, user as currentUser } from "../store/auth.js";

    let myChamas = $state([]);
    let activeChamaId = $state(null);
    let detail = $state(null);
    let pending = $state([]);
    let loading = $state(true);
    let activeTab = $state("overview");

    // Modals
    let showCreate = $state(false);
    let showJoin = $state(false);
    let showContribute = $state(false);
    let showPending = $state(false);
    let showAnnouncement = $state(false);
    let showLoanRequest = $state(false);
    let showFineCreate = $state(false);
    let showMinuteCreate = $state(false);

    // Create form
    let newName = $state("");
    let newDesc = $state("");
    let newTarget = $state(1000);
    let newLateFine = $state(0);
    let creating = $state(false);

    // Join form
    let joinCode = $state("");
    let joining = $state(false);

    // Contribute form
    let contribAmount = $state(0);
    let contribNotes = $state("");
    let contributing = $state(false);

    // Announcement
    let annText = $state("");
    let annPinned = $state(true);

    // Loan request
    let loanAmount = $state(0);
    let loanPurpose = $state("");
    let loanInterest = $state(0);
    let loanDueDate = $state("");

    // Fine create
    let fineUser = $state("");
    let fineAmount = $state(0);
    let fineReason = $state("");

    // Minute create
    let minuteTitle = $state("");
    let minuteContent = $state("");
    let minuteDate = $state("");

    // Tab data
    let history = $state([]);
    let loans = $state([]);
    let fines = $state([]);
    let minutes = $state([]);

    let errorMsg = $state("");
    let successMsg = $state("");

    onMount(() => {
        loadChamas();
        const handler = () => {
            loadDetail(activeChamaId);
            loadPending(activeChamaId);
            if (activeTab === "history") loadHistory(activeChamaId);
            if (activeTab === "loans") loadLoans(activeChamaId);
            if (activeTab === "fines") loadFines(activeChamaId);
            if (activeTab === "minutes") loadMinutes(activeChamaId);
        };
        window.addEventListener("chama-updated", handler);
        return () => window.removeEventListener("chama-updated", handler);
    });

    async function loadChamas() {
        loading = true;
        try {
            const res = await fetch(`${API_URL}/api/chamas/mine`, {
                credentials: "include",
            });
            myChamas = await res.json();
            if (myChamas.length > 0) {
                activeChamaId = myChamas[0].id;
                await loadDetail(activeChamaId);
            }
        } catch (err) {
            console.error(err);
        } finally {
            loading = false;
        }
    }

    async function loadDetail(id) {
        if (!id) return;
        try {
            const res = await fetch(`${API_URL}/api/chamas/${id}`, {
                credentials: "include",
            });
            if (res.ok) {
                detail = await res.json();
                if (detail.chama.monthly_target) {
                    contribAmount = detail.chama.monthly_target;
                }
                const me = detail.members.find((m) => m.id === $currentUser?.id);
                if (me?.contribution) {
                    contribNotes = me.contribution.notes || "";
                }
                if (iAmTreasurer()) {
                    await loadPending(id);
                } else {
                    pending = [];
                }
            }
        } catch (err) {
            console.error(err);
        }
    }

    async function loadPending(id) {
        if (!id) return;
        try {
            const res = await fetch(`${API_URL}/api/chamas/${id}/pending`, {
                credentials: "include",
            });
            if (res.ok) pending = await res.json();
            else pending = [];
        } catch (err) {
            pending = [];
        }
    }

    async function loadHistory(id) {
        if (!id) return;
        try {
            const res = await fetch(`${API_URL}/api/chamas/${id}/history`, {
                credentials: "include",
            });
            if (res.ok) history = await res.json();
        } catch (err) {
            console.error(err);
        }
    }

    async function loadLoans(id) {
        if (!id) return;
        try {
            const res = await fetch(`${API_URL}/api/chamas/${id}/loans`, {
                credentials: "include",
            });
            if (res.ok) loans = await res.json();
        } catch (err) {
            console.error(err);
        }
    }

    async function loadFines(id) {
        if (!id) return;
        try {
            const res = await fetch(`${API_URL}/api/chamas/${id}/fines`, {
                credentials: "include",
            });
            if (res.ok) fines = await res.json();
        } catch (err) {
            console.error(err);
        }
    }

    async function loadMinutes(id) {
        if (!id) return;
        try {
            const res = await fetch(`${API_URL}/api/chamas/${id}/minutes`, {
                credentials: "include",
            });
            if (res.ok) minutes = await res.json();
        } catch (err) {
            console.error(err);
        }
    }

    async function switchTab(tab) {
        activeTab = tab;
        errorMsg = "";
        successMsg = "";
        if (tab === "history") await loadHistory(activeChamaId);
        else if (tab === "loans") await loadLoans(activeChamaId);
        else if (tab === "fines") await loadFines(activeChamaId);
        else if (tab === "minutes") await loadMinutes(activeChamaId);
    }

    async function createChama() {
        if (!newName.trim()) {
            errorMsg = "Name required";
            return;
        }
        creating = true;
        errorMsg = "";
        try {
            const res = await fetch(`${API_URL}/api/chamas`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    name: newName,
                    description: newDesc,
                    monthly_target: newTarget,
                    late_fine: newLateFine,
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                errorMsg = data.error || "Failed";
                return;
            }
            showCreate = false;
            newName = "";
            newDesc = "";
            newTarget = 1000;
            newLateFine = 0;
            await loadChamas();
        } catch (err) {
            errorMsg = err.message;
        } finally {
            creating = false;
        }
    }

    async function joinChama() {
        if (!joinCode.trim()) return;
        joining = true;
        errorMsg = "";
        try {
            const res = await fetch(`${API_URL}/api/chamas/join`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ invite_code: joinCode }),
            });
            const data = await res.json();
            if (!res.ok) {
                errorMsg = data.error || "Failed";
                return;
            }
            showJoin = false;
            joinCode = "";
            await loadChamas();
        } catch (err) {
            errorMsg = err.message;
        } finally {
            joining = false;
        }
    }

    async function logContribution() {
        if (!activeChamaId) return;
        contributing = true;
        errorMsg = "";
        try {
            const res = await fetch(
                `${API_URL}/api/chamas/${activeChamaId}/contribute`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({
                        amount: contribAmount,
                        notes: contribNotes,
                    }),
                }
            );
            const data = await res.json();
            if (!res.ok) {
                errorMsg = data.error || "Failed";
                return;
            }
            showContribute = false;
            await loadDetail(activeChamaId);
        } catch (err) {
            errorMsg = err.message;
        } finally {
            contributing = false;
        }
    }

    // ===== TREASURER CONFIRMATIONS =====
    async function confirmContribution(id) {
        try {
            const res = await fetch(
                `${API_URL}/api/contributions/${id}/confirm`,
                { method: "POST", credentials: "include" }
            );
            if (res.ok) await loadDetail(activeChamaId);
            else {
                const err = await res.json().catch(() => ({}));
                alert(err.error || "Failed to confirm");
            }
        } catch (err) {
            alert("Error: " + err.message);
        }
    }

    async function unconfirmContribution(id) {
        if (!confirm("Un-confirm this contribution?")) return;
        try {
            const res = await fetch(
                `${API_URL}/api/contributions/${id}/unconfirm`,
                { method: "POST", credentials: "include" }
            );
            if (res.ok) await loadDetail(activeChamaId);
            else {
                const err = await res.json().catch(() => ({}));
                alert(err.error || "Failed to un-confirm");
            }
        } catch (err) {
            alert("Error: " + err.message);
        }
    }

    async function approveMembership(membershipId) {
        try {
            const res = await fetch(
                `${API_URL}/api/chamas/${activeChamaId}/members/${membershipId}/approve`,
                { method: "POST", credentials: "include" }
            );
            if (res.ok) {
                await loadPending(activeChamaId);
                await loadDetail(activeChamaId);
            } else {
                const err = await res.json().catch(() => ({}));
                alert(err.error || "Failed to approve");
            }
        } catch (err) {
            alert("Error: " + err.message);
        }
    }

    async function rejectMembership(membershipId) {
        if (!confirm("Reject this join request?")) return;
        try {
            await fetch(
                `${API_URL}/api/chamas/${activeChamaId}/members/${membershipId}`,
                { method: "DELETE", credentials: "include" }
            );
            await loadPending(activeChamaId);
        } catch (err) {
            console.error(err);
        }
    }

    // ===== Announcements =====
    async function postAnnouncement() {
        if (!annText.trim()) return;
        try {
            const res = await fetch(
                `${API_URL}/api/chamas/${activeChamaId}/announcements`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({ text: annText, pinned: annPinned }),
                }
            );
            if (res.ok) {
                showAnnouncement = false;
                annText = "";
                await loadDetail(activeChamaId);
            } else {
                const err = await res.json().catch(() => ({}));
                alert(err.error || "Failed to post");
            }
        } catch (err) {
            alert(err.message);
        }
    }

    async function deleteAnnouncement(id) {
        if (!confirm("Delete this announcement?")) return;
        await fetch(`${API_URL}/api/announcements/${id}`, {
            method: "DELETE",
            credentials: "include",
        });
        await loadDetail(activeChamaId);
    }

    // ===== Loans =====
    async function requestLoan() {
        if (loanAmount <= 0) return;
        try {
            const res = await fetch(
                `${API_URL}/api/chamas/${activeChamaId}/loans`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({
                        amount: loanAmount,
                        interest_rate: loanInterest,
                        purpose: loanPurpose,
                        due_date: loanDueDate,
                    }),
                }
            );
            if (res.ok) {
                showLoanRequest = false;
                loanAmount = 0;
                loanPurpose = "";
                loanInterest = 0;
                loanDueDate = "";
                await loadLoans(activeChamaId);
            } else {
                const err = await res.json().catch(() => ({}));
                alert(err.error || "Failed");
            }
        } catch (err) {
            alert(err.message);
        }
    }

    async function approveLoan(id) {
        const res = await fetch(`${API_URL}/api/loans/${id}/approve`, {
            method: "POST",
            credentials: "include",
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            alert(err.error || "Only the treasurer can approve loans");
        }
        await loadLoans(activeChamaId);
    }

    async function rejectLoan(id) {
        if (!confirm("Reject this loan?")) return;
        const res = await fetch(`${API_URL}/api/loans/${id}/reject`, {
            method: "POST",
            credentials: "include",
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            alert(err.error || "Only the treasurer can reject loans");
        }
        await loadLoans(activeChamaId);
    }

    async function repayLoan(id) {
        if (!confirm("Mark this loan as fully repaid?")) return;
        await fetch(`${API_URL}/api/loans/${id}/repay`, {
            method: "POST",
            credentials: "include",
        });
        await loadLoans(activeChamaId);
    }

    // ===== Fines =====
    async function createFine() {
        if (!fineUser || fineAmount <= 0) return;
        try {
            const res = await fetch(
                `${API_URL}/api/chamas/${activeChamaId}/fines`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({
                        user_id: parseInt(fineUser),
                        amount: fineAmount,
                        reason: fineReason,
                    }),
                }
            );
            if (res.ok) {
                showFineCreate = false;
                fineUser = "";
                fineAmount = 0;
                fineReason = "";
                await loadFines(activeChamaId);
            } else {
                const err = await res.json().catch(() => ({}));
                alert(err.error || "Failed");
            }
        } catch (err) {
            alert(err.message);
        }
    }

    async function markFinePaid(id) {
        const res = await fetch(`${API_URL}/api/fines/${id}/mark-paid`, {
            method: "POST",
            credentials: "include",
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            alert(err.error || "Only the treasurer can mark fines paid");
        }
        await loadFines(activeChamaId);
    }

    async function autoFine() {
        if (!confirm("Auto-create fines for all unpaid members this month?")) return;
        try {
            const res = await fetch(
                `${API_URL}/api/chamas/${activeChamaId}/auto-fine`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({}),
                }
            );
            const data = await res.json();
            if (!res.ok) {
                alert(data.error || "Failed");
                return;
            }
            alert(`Created ${data.fines_created} new fine(s)`);
            await loadFines(activeChamaId);
        } catch (err) {
            alert(err.message);
        }
    }

    // ===== Minutes =====
    async function createMinute() {
        if (!minuteTitle.trim() || !minuteContent.trim()) return;
        try {
            const res = await fetch(
                `${API_URL}/api/chamas/${activeChamaId}/minutes`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({
                        title: minuteTitle,
                        content: minuteContent,
                        meeting_date: minuteDate || undefined,
                    }),
                }
            );
            if (res.ok) {
                showMinuteCreate = false;
                minuteTitle = "";
                minuteContent = "";
                minuteDate = "";
                await loadMinutes(activeChamaId);
            } else {
                const err = await res.json().catch(() => ({}));
                alert(err.error || "Failed");
            }
        } catch (err) {
            alert(err.message);
        }
    }

    async function deleteMinute(id) {
        if (!confirm("Delete this minute?")) return;
        await fetch(`${API_URL}/api/minutes/${id}`, {
            method: "DELETE",
            credentials: "include",
        });
        await loadMinutes(activeChamaId);
    }

    // ===== Role management (treasurer only) =====
    async function updateRole(userId, newRole) {
        try {
            const res = await fetch(
                `${API_URL}/api/chamas/${activeChamaId}/members/${userId}/role`,
                {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({ role: newRole }),
                }
            );
            const data = await res.json();
            if (!res.ok) {
                alert(data.error || "Failed");
                return;
            }
            await loadDetail(activeChamaId);
        } catch (err) {
            alert(err.message);
        }
    }

    // ===== CSV Export =====
    function exportCSV() {
        if (!activeChamaId) return;
        const month = detail?.month || new Date().toISOString().slice(0, 7);
        window.open(
            `${API_URL}/api/chamas/${activeChamaId}/export.csv?month=${month}`,
            "_blank"
        );
    }

    function copyInvite() {
        if (!detail?.chama?.invite_code) return;
        navigator.clipboard.writeText(detail.chama.invite_code);
        alert(`Invite code copied: ${detail.chama.invite_code}`);
    }

    // ===== Derived state =====
    let progressPercent = $derived.by(() => {
        if (!detail?.stats) return 0;
        if (detail.stats.target_total === 0) return 0;
        return Math.min(
            100,
            (detail.stats.total_paid / detail.stats.target_total) * 100
        );
    });

    let me = $derived(detail?.members?.find((m) => m.id === $currentUser?.id));
    let myRole = $derived(me?.role || "member");
    // ✅ Only treasurer is a manager
    let isManager = $derived(myRole === "treasurer");
    let canPostContent = $derived(myRole === "treasurer");

    function iAmTreasurer() {
        return myRole === "treasurer";
    }

    function fmtDate(iso) {
        if (!iso) return "—";
        try {
            return new Date(iso).toLocaleDateString("en-KE", {
                year: "numeric",
                month: "short",
                day: "numeric",
            });
        } catch {
            return iso;
        }
    }

    function loanStatusClass(status) {
        return status === "active"
            ? "status-active"
            : status === "repaid"
              ? "status-repaid"
              : status === "rejected"
                ? "status-rejected"
                : "status-pending";
    }
</script>

<div class="chama-page">
    {#if loading}
        <div class="empty-row">Loading...</div>
    {:else if myChamas.length === 0}
        <div class="welcome">
            <div class="welcome-icon">🏦</div>
            <h2>Your Chama, Digitized</h2>
            <p>Track contributions, loans, fines & minutes — all in one place.</p>

            {#if errorMsg}
                <div class="error">{errorMsg}</div>
            {/if}

            <div class="welcome-buttons">
                <button class="big-btn primary" onclick={() => (showCreate = true)}>
                    ➕ Create a Chama
                </button>
                <button class="big-btn secondary" onclick={() => (showJoin = true)}>
                    🔑 Join with Code
                </button>
            </div>
        </div>
    {:else}
        {#if myChamas.length > 1}
            <div class="chama-switcher">
                {#each myChamas as c}
                    <button
                        class="switch-btn"
                        class:active={c.id === activeChamaId}
                        onclick={() => {
                            activeChamaId = c.id;
                            loadDetail(c.id);
                            activeTab = "overview";
                        }}
                    >
                        {c.name}
                    </button>
                {/each}
            </div>
        {/if}

        {#if detail}
            <div class="chama-header">
                <div>
                    <h2>🏦 {detail.chama.name}</h2>
                    {#if detail.chama.description}
                        <p class="desc">{detail.chama.description}</p>
                    {/if}
                </div>
                <div class="header-actions">
                    <button class="icon-btn" onclick={copyInvite} title="Copy invite code">
                        🔑 {detail.chama.invite_code}
                    </button>
                    <button class="icon-btn" onclick={exportCSV} title="Download CSV">
                        📥
                    </button>
                </div>
            </div>

            <!-- Pinned announcements -->
            {#if detail.announcements && detail.announcements.length > 0}
                <div class="announcements">
                    {#each detail.announcements.filter(a => a.pinned).slice(0, 2) as a}
                        <div class="announcement">
                            <span class="ann-pin">📢</span>
                            <div class="ann-text">{a.text}</div>
                            {#if isManager}
                                <button
                                    class="ann-close"
                                    onclick={() => deleteAnnouncement(a.id)}
                                    title="Delete"
                                >✕</button>
                            {/if}
                        </div>
                    {/each}
                </div>
            {/if}

            <!-- Pending approvals (treasurer only) -->
            {#if isManager && pending.length > 0}
                <div class="pending-banner">
                    <span>
                        ⏳ <strong>{pending.length}</strong>
                        pending request{pending.length > 1 ? "s" : ""}
                    </span>
                    <button
                        class="view-pending-btn"
                        onclick={() => (showPending = !showPending)}
                    >
                        {showPending ? "Hide" : "Review"}
                    </button>
                </div>

                {#if showPending}
                    <div class="pending-list">
                        {#each pending as p}
                            <div class="member-row pending-row">
                                <div
                                    class="member-avatar"
                                    style="background: {p.avatar_color || '#667eea'}"
                                >
                                    {(p.display_name || p.username || "?")[0].toUpperCase()}
                                </div>
                                <div class="member-info">
                                    <div class="member-name">{p.display_name || p.username}</div>
                                    <div class="member-status pending">Requested to join</div>
                                </div>
                                <button
                                    class="approve-btn"
                                    onclick={() => approveMembership(p.membership_id)}
                                >✓ Approve</button>
                                <button
                                    class="reject-btn"
                                    onclick={() => rejectMembership(p.membership_id)}
                                >✕</button>
                            </div>
                        {/each}
                    </div>
                {/if}
            {/if}

            <!-- TAB NAV -->
            <div class="tab-nav">
                <button class="tab-btn" class:active={activeTab === "overview"} onclick={() => switchTab("overview")}>📊 Overview</button>
                <button class="tab-btn" class:active={activeTab === "history"} onclick={() => switchTab("history")}>📅 History</button>
                <button class="tab-btn" class:active={activeTab === "loans"} onclick={() => switchTab("loans")}>💰 Loans</button>
                <button class="tab-btn" class:active={activeTab === "fines"} onclick={() => switchTab("fines")}>🏷️ Fines</button>
                <button class="tab-btn" class:active={activeTab === "minutes"} onclick={() => switchTab("minutes")}>📝 Minutes</button>
                <button class="tab-btn" class:active={activeTab === "members"} onclick={() => switchTab("members")}>👥 Members</button>
            </div>

            <!-- ============ OVERVIEW TAB ============ -->
            {#if activeTab === "overview"}
                <div class="month-picker">
                    <span class="month-label">{detail.month}</span>
                    <span class="target-label">
                        Target: KES {detail.chama.monthly_target.toLocaleString()} / member
                    </span>
                </div>

                <div class="progress-card">
                    <div class="progress-top">
                        <span class="big-number">
                            {detail.stats.paid_count} / {detail.stats.total_members}
                        </span>
                        <span class="progress-text">members paid</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: {progressPercent}%"></div>
                    </div>
                    <div class="progress-amounts">
                        <strong>KES {detail.stats.total_paid.toLocaleString()}</strong>
                        <span>/ KES {detail.stats.target_total.toLocaleString()}</span>
                    </div>
                </div>

                {#if !me?.contribution}
                    <button class="big-btn primary full" onclick={() => (showContribute = true)}>
                        💰 Log My Contribution for {detail.month}
                    </button>
                {:else}
                    <div class="paid-banner" class:pending={!me.contribution.confirmed}>
                        {#if me.contribution.confirmed}
                            ✅ You paid KES {me.contribution.amount.toLocaleString()} · Confirmed
                        {:else}
                            ⏳ You logged KES {me.contribution.amount.toLocaleString()} · Awaiting treasurer confirmation
                        {/if}
                        <button class="edit-link" onclick={() => (showContribute = true)}>Edit</button>
                    </div>
                {/if}

                {#if canPostContent}
                    <button class="big-btn secondary full" onclick={() => (showAnnouncement = true)}>
                        📢 Post Announcement
                    </button>
                {/if}
            {/if}

            <!-- ============ HISTORY TAB ============ -->
            {#if activeTab === "history"}
                <h3 class="section-title">Contribution History</h3>
                {#if history.length === 0}
                    <div class="empty-row">No history yet</div>
                {:else}
                    {#each history as h}
                        <div class="history-row">
                            <div class="history-month">{h.month}</div>
                            <div class="history-bar">
                                <div class="history-fill" style="width: {h.completion_pct}%"></div>
                            </div>
                            <div class="history-info">
                                <strong>KES {h.total.toLocaleString()}</strong>
                                <small>{h.contributors}/{h.total_members} paid</small>
                            </div>
                        </div>
                    {/each}
                {/if}
            {/if}

            <!-- ============ LOANS TAB ============ -->
            {#if activeTab === "loans"}
                <div class="tab-actions">
                    <h3 class="section-title">Loans</h3>
                    <button class="mini-btn primary" onclick={() => (showLoanRequest = true)}>
                        ➕ Request Loan
                    </button>
                </div>

                {#if loans.length === 0}
                    <div class="empty-row">No loans yet</div>
                {:else}
                    {#each loans as l}
                        <div class="loan-card">
                            <div class="loan-top">
                                <div class="loan-user">
                                    <div class="member-avatar small" style="background: {l.avatar_color || '#667eea'}">
                                        {(l.display_name || l.username || "?")[0].toUpperCase()}
                                    </div>
                                    <div>
                                        <strong>{l.display_name || l.username}</strong>
                                        <small class={loanStatusClass(l.status)}>{l.status}</small>
                                    </div>
                                </div>
                                <div class="loan-amount">
                                    KES {l.amount.toLocaleString()}
                                    {#if l.interest_rate > 0}
                                        <small>+{l.interest_rate}%</small>
                                    {/if}
                                </div>
                            </div>
                            {#if l.purpose}<p class="loan-purpose">{l.purpose}</p>{/if}
                            {#if l.due_date}<small class="loan-due">Due: {l.due_date}</small>{/if}
                            <div class="loan-actions">
                                {#if isManager && l.status === "pending"}
                                    <button class="approve-btn" onclick={() => approveLoan(l.id)}>✓ Approve</button>
                                    <button class="reject-btn" onclick={() => rejectLoan(l.id)}>✕ Reject</button>
                                {/if}
                                {#if l.status === "active" && (l.user_id === $currentUser?.id || isManager)}
                                    <button class="mini-btn primary" onclick={() => repayLoan(l.id)}>✓ Mark Repaid</button>
                                {/if}
                            </div>
                        </div>
                    {/each}
                {/if}
            {/if}

            <!-- ============ FINES TAB ============ -->
            {#if activeTab === "fines"}
                <div class="tab-actions">
                    <h3 class="section-title">Fines</h3>
                    {#if isManager}
                        <button class="mini-btn" onclick={autoFine}>⚡ Auto-fine unpaid</button>
                        <button class="mini-btn primary" onclick={() => (showFineCreate = true)}>
                            ➕ Create Fine
                        </button>
                    {/if}
                </div>

                {#if fines.length === 0}
                    <div class="empty-row">No fines</div>
                {:else}
                    {#each fines as f}
                        <div class="fine-row">
                            <div class="member-avatar small" style="background: {f.avatar_color || '#667eea'}">
                                {(f.display_name || f.username || "?")[0].toUpperCase()}
                            </div>
                            <div class="fine-info">
                                <strong>{f.display_name || f.username}</strong>
                                <small>{f.reason} · {f.month}</small>
                            </div>
                            <div class="fine-amount">
                                KES {f.amount.toLocaleString()}
                                {#if f.paid}
                                    <span class="paid-tag">✅ Paid</span>
                                {:else if isManager}
                                    <button class="mini-btn primary" onclick={() => markFinePaid(f.id)}>
                                        Mark Paid
                                    </button>
                                {/if}
                            </div>
                        </div>
                    {/each}
                {/if}
            {/if}

            <!-- ============ MINUTES TAB ============ -->
            {#if activeTab === "minutes"}
                <div class="tab-actions">
                    <h3 class="section-title">Meeting Minutes</h3>
                    {#if canPostContent}
                        <button class="mini-btn primary" onclick={() => (showMinuteCreate = true)}>
                            ➕ Add Minutes
                        </button>
                    {/if}
                </div>

                {#if minutes.length === 0}
                    <div class="empty-row">No minutes yet</div>
                {:else}
                    {#each minutes as m}
                        <div class="minute-card">
                            <div class="minute-header">
                                <strong>{m.title}</strong>
                                <small>{fmtDate(m.meeting_date)}</small>
                            </div>
                            <p class="minute-content">{m.content}</p>
                            <div class="minute-footer">
                                <small>By {m.display_name || m.username || "?"}</small>
                                {#if isManager}
                                    <button class="mini-btn danger" onclick={() => deleteMinute(m.id)}>
                                        🗑️ Delete
                                    </button>
                                {/if}
                            </div>
                        </div>
                    {/each}
                {/if}
            {/if}

            <!-- ============ MEMBERS TAB ============ -->
            {#if activeTab === "members"}
                <h3 class="section-title">Members ({detail.members.length})</h3>
                <div class="member-list">
                    {#each detail.members as m}
                        <div class="member-row">
                            <div class="member-avatar" style="background: {m.avatar_color || '#667eea'}">
                                {(m.display_name || m.username || "?")[0].toUpperCase()}
                            </div>
                            <div class="member-info">
                                <div class="member-name">
                                    {m.display_name || m.username}
                                </div>
                                {#if m.contribution}
                                    <div class="member-status paid">
                                        KES {m.contribution.amount.toLocaleString()}
                                        {#if m.contribution.confirmed}
                                            · ✅ Confirmed
                                        {:else}
                                            · ⏳ Pending
                                        {/if}
                                    </div>
                                {:else}
                                    <div class="member-status pending">Not paid yet</div>
                                {/if}
                            </div>

                            <!-- Confirm/Unconfirm buttons (treasurer only) -->
                            {#if isManager && m.contribution}
                                {#if !m.contribution.confirmed}
                                    <button
                                        class="confirm-btn"
                                        onclick={() => confirmContribution(m.contribution.id)}
                                        title="Confirm this payment"
                                    >
                                        ✓ Confirm
                                    </button>
                                {:else}
                                    <button
                                        class="mini-btn danger"
                                        onclick={() => unconfirmContribution(m.contribution.id)}
                                        title="Undo confirmation"
                                    >
                                        ✕ Undo
                                    </button>
                                {/if}
                            {/if}

                            <!-- Role selector (treasurer only, 2 roles) -->
                            {#if isManager}
                                <select
                                    class="role-select"
                                    value={m.role}
                                    onchange={(e) => updateRole(m.id, e.target.value)}
                                >
                                    <option value="member">👤 Member</option>
                                    <option value="treasurer">💰 Treasurer</option>
                                </select>
                            {:else}
                                <span class="role-badge">{m.role}</span>
                            {/if}
                        </div>
                    {/each}
                </div>
            {/if}

            {#if errorMsg}
                <div class="error">{errorMsg}</div>
            {/if}
        {/if}
    {/if}
</div>

<!-- ============ MODALS ============ -->

{#if showCreate}
    <div class="modal-backdrop" onclick={() => (showCreate = false)}>
        <div class="modal" onclick={(e) => e.stopPropagation()}>
            <h3>Create a Chama</h3>
            <label>Name</label>
            <input type="text" bind:value={newName} placeholder="e.g. Umoja Chama" maxlength="60" />
            <label>Description (optional)</label>
            <input type="text" bind:value={newDesc} placeholder="e.g. Monthly savings group" maxlength="200" />
            <label>Monthly target per member (KES)</label>
            <input type="number" bind:value={newTarget} min="10" />
            <label>Late fine (KES, optional)</label>
            <input type="number" bind:value={newLateFine} min="0" placeholder="0 = no automatic fines" />
            <div class="modal-actions">
                <button class="secondary" onclick={() => (showCreate = false)}>Cancel</button>
                <button class="primary" onclick={createChama} disabled={creating}>
                    {creating ? "Creating..." : "Create"}
                </button>
            </div>
        </div>
    </div>
{/if}

{#if showJoin}
    <div class="modal-backdrop" onclick={() => (showJoin = false)}>
        <div class="modal" onclick={(e) => e.stopPropagation()}>
            <h3>Join a Chama</h3>
            <label>Invite code</label>
            <input
                type="text"
                bind:value={joinCode}
                placeholder="e.g. A3F7B2"
                maxlength="6"
                style="text-transform: uppercase; letter-spacing: 3px; text-align: center; font-size: 1.4rem;"
            />
            <div class="modal-actions">
                <button class="secondary" onclick={() => (showJoin = false)}>Cancel</button>
                <button class="primary" onclick={joinChama} disabled={joining}>
                    {joining ? "Joining..." : "Join"}
                </button>
            </div>
        </div>
    </div>
{/if}

{#if showContribute}
    <div class="modal-backdrop" onclick={() => (showContribute = false)}>
        <div class="modal" onclick={(e) => e.stopPropagation()}>
            <h3>Log Contribution</h3>
            <p class="muted">For month: {detail?.month}</p>
            <label>Amount (KES)</label>
            <input type="number" bind:value={contribAmount} min="1" />
            <label>Notes (optional)</label>
            <input type="text" bind:value={contribNotes} placeholder="e.g. M-Pesa REF ABC123" maxlength="200" />
            <div class="modal-actions">
                <button class="secondary" onclick={() => (showContribute = false)}>Cancel</button>
                <button class="primary" onclick={logContribution} disabled={contributing}>
                    {contributing ? "Saving..." : "Save"}
                </button>
            </div>
        </div>
    </div>
{/if}

{#if showAnnouncement}
    <div class="modal-backdrop" onclick={() => (showAnnouncement = false)}>
        <div class="modal" onclick={(e) => e.stopPropagation()}>
            <h3>Post Announcement</h3>
            <label>Message</label>
            <textarea bind:value={annText} maxlength="500" rows="4"></textarea>
            <label class="checkbox-row">
                <input type="checkbox" bind:checked={annPinned} />
                Pin to top
            </label>
            <div class="modal-actions">
                <button class="secondary" onclick={() => (showAnnouncement = false)}>Cancel</button>
                <button class="primary" onclick={postAnnouncement}>Post</button>
            </div>
        </div>
    </div>
{/if}

{#if showLoanRequest}
    <div class="modal-backdrop" onclick={() => (showLoanRequest = false)}>
        <div class="modal" onclick={(e) => e.stopPropagation()}>
            <h3>Request Loan</h3>
            <label>Amount (KES)</label>
            <input type="number" bind:value={loanAmount} min="1" />
            <label>Interest rate (%, optional)</label>
            <input type="number" bind:value={loanInterest} min="0" step="0.5" />
            <label>Purpose</label>
            <input type="text" bind:value={loanPurpose} placeholder="e.g. School fees" maxlength="200" />
            <label>Due date (optional)</label>
            <input type="date" bind:value={loanDueDate} />
            <div class="modal-actions">
                <button class="secondary" onclick={() => (showLoanRequest = false)}>Cancel</button>
                <button class="primary" onclick={requestLoan}>Request</button>
            </div>
        </div>
    </div>
{/if}

{#if showFineCreate}
    <div class="modal-backdrop" onclick={() => (showFineCreate = false)}>
        <div class="modal" onclick={(e) => e.stopPropagation()}>
            <h3>Create Fine</h3>
            <label>Member</label>
            <select bind:value={fineUser}>
                <option value="">-- select --</option>
                {#each detail?.members || [] as m}
                    <option value={m.id}>{m.display_name || m.username}</option>
                {/each}
            </select>
            <label>Amount (KES)</label>
            <input type="number" bind:value={fineAmount} min="1" />
            <label>Reason</label>
            <input type="text" bind:value={fineReason} placeholder="e.g. Late to meeting" maxlength="200" />
            <div class="modal-actions">
                <button class="secondary" onclick={() => (showFineCreate = false)}>Cancel</button>
                <button class="primary" onclick={createFine}>Create</button>
            </div>
        </div>
    </div>
{/if}

{#if showMinuteCreate}
    <div class="modal-backdrop" onclick={() => (showMinuteCreate = false)}>
        <div class="modal" onclick={(e) => e.stopPropagation()}>
            <h3>Add Minutes</h3>
            <label>Title</label>
            <input type="text" bind:value={minuteTitle} placeholder="e.g. November Meeting" maxlength="200" />
            <label>Meeting date</label>
            <input type="date" bind:value={minuteDate} />
            <label>Content</label>
            <textarea bind:value={minuteContent} rows="6" maxlength="5000"></textarea>
            <div class="modal-actions">
                <button class="secondary" onclick={() => (showMinuteCreate = false)}>Cancel</button>
                <button class="primary" onclick={createMinute}>Save</button>
            </div>
        </div>
    </div>
{/if}

<style>
    .chama-page {
        background: var(--surface);
        border-radius: 18px;
        padding: 20px;
        box-shadow: var(--shadow-lg);
        max-height: 78vh;
        overflow-y: auto;
    }

    .empty-row {
        padding: 30px;
        text-align: center;
        color: var(--text-muted);
        font-style: italic;
    }

    .welcome { text-align: center; padding: 30px 10px; }
    .welcome-icon { font-size: 4rem; margin-bottom: 10px; }
    .welcome h2 { color: var(--text); margin: 10px 0; }
    .welcome p { color: var(--text-muted); margin-bottom: 20px; }
    .welcome-buttons { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }

    .big-btn {
        padding: 14px 24px; border: none; border-radius: 12px;
        font-weight: 700; font-size: 1rem; cursor: pointer;
        transition: transform 0.15s;
    }
    .big-btn.primary { background: linear-gradient(135deg, var(--accent), var(--accent-2)); color: white; }
    .big-btn.secondary { background: var(--surface-3); color: var(--text); }
    .big-btn.full { width: 100%; margin: 8px 0; }
    .big-btn:hover { transform: translateY(-2px); }

    .mini-btn {
        padding: 6px 12px;
        background: var(--surface-3);
        color: var(--text);
        border: 1px solid var(--border);
        border-radius: 8px;
        cursor: pointer;
        font-size: 0.8rem;
        font-weight: 600;
    }
    .mini-btn.primary {
        background: linear-gradient(135deg, var(--accent), var(--accent-2));
        color: white;
        border-color: transparent;
    }
    .mini-btn.danger { background: #fee2e2; color: #b91c1c; border-color: #fecaca; }

    .chama-switcher {
        display: flex; gap: 6px; margin-bottom: 12px;
        overflow-x: auto; padding-bottom: 4px;
    }
    .switch-btn {
        padding: 8px 14px; border-radius: 20px;
        border: 1px solid var(--border); background: var(--surface-2);
        color: var(--text); cursor: pointer; font-weight: 600;
        white-space: nowrap;
    }
    .switch-btn.active { background: var(--accent); color: white; border-color: var(--accent); }

    .chama-header {
        display: flex; justify-content: space-between;
        align-items: flex-start; gap: 10px; margin-bottom: 12px;
    }
    .chama-header h2 { margin: 0 0 4px; color: var(--text); font-size: 1.3rem; }
    .desc { color: var(--text-muted); font-size: 0.85rem; margin: 0; }
    .header-actions { display: flex; gap: 4px; flex-shrink: 0; }
    .icon-btn {
        background: var(--surface-3); border: 1px solid var(--border);
        padding: 8px 10px; border-radius: 10px; cursor: pointer;
        font-family: monospace; font-weight: 700; color: var(--accent);
        font-size: 0.85rem;
    }

    .announcements { margin-bottom: 12px; }
    .announcement {
        display: flex; align-items: flex-start; gap: 8px;
        padding: 10px 12px;
        background: rgba(102, 126, 234, 0.12);
        border: 1px solid rgba(102, 126, 234, 0.3);
        border-radius: 10px;
        margin-bottom: 6px;
    }
    .ann-pin { font-size: 1.1rem; flex-shrink: 0; }
    .ann-text { flex: 1; color: var(--text); font-size: 0.9rem; }
    .ann-close {
        background: transparent; border: none; cursor: pointer;
        color: var(--text-muted); font-size: 0.9rem;
    }

    .pending-banner {
        display: flex; align-items: center; justify-content: space-between;
        padding: 10px 14px;
        background: rgba(245, 158, 11, 0.15);
        border: 1px solid rgba(245, 158, 11, 0.4);
        border-radius: 10px;
        color: #92400e;
        margin-bottom: 12px;
        font-weight: 600;
        font-size: 0.9rem;
    }
    .view-pending-btn {
        background: var(--accent); color: white; border: none;
        padding: 5px 12px; border-radius: 8px; cursor: pointer;
        font-weight: 600; font-size: 0.8rem;
    }
    .pending-list {
        background: var(--surface-2); border-radius: 10px;
        padding: 8px; margin-bottom: 12px;
    }
    .pending-row { background: var(--surface); }
    .approve-btn {
        padding: 5px 10px; background: #059669; color: white;
        border: none; border-radius: 6px; cursor: pointer;
        font-weight: 600; font-size: 0.75rem;
    }
    .reject-btn {
        padding: 5px 8px; background: #ef4444; color: white;
        border: none; border-radius: 6px; cursor: pointer;
        font-weight: 700; font-size: 0.75rem;
    }

    .tab-nav {
        display: flex; gap: 4px;
        padding: 6px;
        background: var(--surface-2);
        border-radius: 12px;
        margin-bottom: 16px;
        overflow-x: auto;
    }
    .tab-btn {
        padding: 8px 12px;
        border: none;
        border-radius: 8px;
        background: transparent;
        color: var(--text);
        cursor: pointer;
        font-weight: 600;
        font-size: 0.8rem;
        white-space: nowrap;
        transition: background 0.15s;
    }
    .tab-btn:hover { background: var(--surface-3); }
    .tab-btn.active { background: var(--accent); color: white; }

    .tab-actions {
        display: flex; align-items: center; gap: 6px;
        margin-bottom: 12px; flex-wrap: wrap;
    }
    .tab-actions .section-title { flex: 1; margin: 0; }

    .month-picker {
        display: flex; justify-content: space-between;
        align-items: center; margin-bottom: 8px;
    }
    .month-label { font-weight: 700; color: var(--text); font-size: 1.05rem; }
    .target-label { font-size: 0.75rem; color: var(--text-muted); }

    .progress-card {
        background: var(--surface-2); border-radius: 14px;
        padding: 14px; margin-bottom: 14px;
    }
    .progress-top {
        display: flex; align-items: baseline; gap: 8px; margin-bottom: 8px;
    }
    .big-number { font-size: 1.6rem; font-weight: 800; color: var(--accent); }
    .progress-text { color: var(--text-muted); font-size: 0.9rem; }
    .progress-bar {
        height: 10px; background: var(--border);
        border-radius: 6px; overflow: hidden; margin-bottom: 8px;
    }
    .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, var(--accent), var(--accent-2));
        transition: width 0.4s ease;
    }
    .progress-amounts { display: flex; gap: 6px; align-items: baseline; }
    .progress-amounts strong { color: var(--text); font-size: 1rem; }
    .progress-amounts span { color: var(--text-muted); font-size: 0.85rem; }

    .paid-banner {
        display: flex; align-items: center; justify-content: space-between;
        padding: 10px 14px;
        background: rgba(74, 222, 128, 0.15);
        border: 1px solid rgba(74, 222, 128, 0.4);
        border-radius: 10px;
        color: #166534;
        font-weight: 600;
        margin-bottom: 8px;
        font-size: 0.9rem;
    }
    .paid-banner.pending {
        background: rgba(245, 158, 11, 0.15);
        border-color: rgba(245, 158, 11, 0.4);
        color: #92400e;
    }
    .edit-link {
        background: transparent; border: none;
        text-decoration: underline; color: inherit;
        cursor: pointer; font-size: 0.8rem;
    }

    .history-row {
        display: flex; align-items: center; gap: 10px;
        padding: 10px;
        background: var(--surface-2);
        border-radius: 10px;
        margin-bottom: 6px;
    }
    .history-month { font-weight: 700; color: var(--text); min-width: 70px; font-size: 0.9rem; }
    .history-bar {
        flex: 1; height: 8px; background: var(--border);
        border-radius: 4px; overflow: hidden;
    }
    .history-fill {
        height: 100%;
        background: linear-gradient(90deg, var(--accent), var(--accent-2));
    }
    .history-info { text-align: right; min-width: 90px; }
    .history-info strong { display: block; color: var(--text); font-size: 0.9rem; }
    .history-info small { color: var(--text-muted); font-size: 0.72rem; }

    .loan-card {
        background: var(--surface-2); border-radius: 12px;
        padding: 12px; margin-bottom: 8px;
    }
    .loan-top { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-bottom: 6px; }
    .loan-user { display: flex; align-items: center; gap: 10px; }
    .loan-user strong { display: block; color: var(--text); font-size: 0.9rem; }
    .loan-user small { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700; }
    .loan-amount { text-align: right; font-weight: 700; color: var(--text); font-size: 0.95rem; }
    .loan-amount small { display: block; color: var(--text-muted); font-size: 0.7rem; font-weight: 500; }
    .loan-purpose { color: var(--text-muted); font-size: 0.8rem; margin: 4px 0; }
    .loan-due { color: var(--text-muted); font-size: 0.75rem; }
    .loan-actions { display: flex; gap: 6px; margin-top: 8px; justify-content: flex-end; }

    .status-active { color: #2563eb; }
    .status-repaid { color: #059669; }
    .status-rejected { color: #dc2626; }
    .status-pending { color: #d97706; }

    .fine-row {
        display: flex; align-items: center; gap: 10px;
        padding: 10px;
        background: var(--surface-2);
        border-radius: 10px;
        margin-bottom: 6px;
    }
    .fine-info { flex: 1; min-width: 0; }
    .fine-info strong { display: block; color: var(--text); font-size: 0.9rem; }
    .fine-info small { color: var(--text-muted); font-size: 0.75rem; }
    .fine-amount {
        display: flex; flex-direction: column; align-items: flex-end;
        font-weight: 700; color: var(--text); font-size: 0.9rem;
        gap: 4px;
    }
    .paid-tag { font-size: 0.7rem; color: #059669; }

    .minute-card {
        background: var(--surface-2); border-radius: 12px;
        padding: 12px; margin-bottom: 8px;
    }
    .minute-header {
        display: flex; justify-content: space-between;
        align-items: baseline; gap: 8px; margin-bottom: 6px;
    }
    .minute-header strong { color: var(--text); font-size: 0.95rem; }
    .minute-header small { color: var(--text-muted); font-size: 0.75rem; }
    .minute-content {
        color: var(--text); font-size: 0.85rem;
        line-height: 1.5; white-space: pre-wrap;
        margin: 6px 0;
    }
    .minute-footer {
        display: flex; justify-content: space-between; align-items: center;
        margin-top: 8px;
    }
    .minute-footer small { color: var(--text-muted); font-size: 0.72rem; }

    .section-title {
        font-size: 0.85rem; text-transform: uppercase;
        letter-spacing: 0.5px; color: var(--text-muted);
        margin: 16px 0 10px;
    }
    .member-list { display: flex; flex-direction: column; gap: 6px; }
    .member-row {
        display: flex; align-items: center; gap: 10px;
        padding: 10px; border-radius: 10px;
        background: var(--surface-2);
    }
    .member-avatar {
        width: 40px; height: 40px; border-radius: 50%;
        color: white; font-weight: 700;
        display: flex; align-items: center; justify-content: center;
        flex-shrink: 0;
    }
    .member-avatar.small { width: 34px; height: 34px; font-size: 0.85rem; }
    .member-info { flex: 1; min-width: 0; }
    .member-name { font-weight: 600; color: var(--text); }
    .role-badge {
        font-size: 0.65rem; background: var(--accent); color: white;
        padding: 2px 6px; border-radius: 4px;
        text-transform: uppercase; letter-spacing: 0.5px;
    }
    .role-select {
        padding: 4px 8px;
        border: 1px solid var(--border);
        border-radius: 6px;
        background: var(--surface);
        color: var(--text);
        font-size: 0.75rem;
        font-weight: 600;
        cursor: pointer;
    }
    .member-status { font-size: 0.78rem; margin-top: 2px; }
    .member-status.paid { color: #059669; }
    .member-status.pending { color: #d97706; }

    .confirm-btn {
        padding: 5px 10px;
        background: #059669; color: white; border: none;
        border-radius: 6px; cursor: pointer;
        font-weight: 600; font-size: 0.75rem;
    }

    .error {
        background: #fee2e2; color: #b91c1c;
        padding: 10px 14px; border-radius: 8px;
        margin: 10px 0; font-size: 0.85rem;
    }

    .modal-backdrop {
        position: fixed; inset: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex; align-items: center; justify-content: center;
        z-index: 3000; padding: 20px;
    }
    .modal {
        background: var(--surface); border-radius: 16px;
        padding: 22px; width: 100%; max-width: 400px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        max-height: 90vh; overflow-y: auto;
    }
    .modal h3 { margin: 0 0 14px; color: var(--text); }
    .modal label {
        display: block;
        font-size: 0.82rem; font-weight: 600;
        color: var(--text); margin: 10px 0 5px;
    }
    .modal input, .modal select, .modal textarea {
        width: 100%; padding: 10px 12px;
        border: 1.5px solid var(--border); border-radius: 8px;
        font-size: 0.95rem;
        background: var(--surface); color: var(--text);
        font-family: inherit;
        box-sizing: border-box;
    }
    .modal textarea { resize: vertical; min-height: 80px; }
    .modal input:focus, .modal select:focus, .modal textarea:focus {
        outline: none; border-color: var(--accent);
    }
    .checkbox-row {
        display: flex; align-items: center; gap: 6px;
        margin-top: 8px;
    }
    .checkbox-row input { width: auto; }
    .modal .muted {
        color: var(--text-muted); font-size: 0.82rem; margin: 0;
    }
    .modal-actions {
        display: flex; gap: 8px;
        margin-top: 18px; justify-content: flex-end;
    }
    .modal-actions button {
        padding: 10px 18px; border-radius: 8px;
        font-weight: 600; cursor: pointer; border: none;
        font-size: 0.9rem;
    }
    .modal-actions .primary {
        background: linear-gradient(135deg, var(--accent), var(--accent-2));
        color: white;
    }
    .modal-actions .secondary {
        background: var(--surface-3); color: var(--text);
    }
    .modal-actions button:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
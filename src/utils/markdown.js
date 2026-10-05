import { marked } from "marked";
import DOMPurify from "dompurify";

// Configure marked
marked.setOptions({
    breaks: true,       // convert \n to <br>
    gfm: true,          // GitHub-flavored markdown
});

/**
 * Convert markdown text to safe HTML.
 */
export function renderMarkdown(text) {
    if (!text) return "";
    const raw = marked.parse(text);
    // Allow class attr on code blocks for language
    return DOMPurify.sanitize(raw, {
        ADD_ATTR: ["target"],
        ADD_TAGS: ["iframe"],   // optional
    });
}

/**
 * Add copy buttons to code blocks inside an element.
 */
export function attachCopyButtons(container) {
    if (!container) return;
    const blocks = container.querySelectorAll("pre > code");
    blocks.forEach((codeEl) => {
        const pre = codeEl.parentElement;
        if (pre.querySelector(".copy-btn")) return;

        const btn = document.createElement("button");
        btn.className = "copy-btn";
        btn.textContent = "Copy";
        btn.onclick = async () => {
            try {
                await navigator.clipboard.writeText(codeEl.textContent);
                btn.textContent = "✓ Copied!";
                btn.classList.add("copied");
                setTimeout(() => {
                    btn.textContent = "Copy";
                    btn.classList.remove("copied");
                }, 1500);
            } catch {
                btn.textContent = "Failed";
            }
        };
        pre.style.position = "relative";
        pre.appendChild(btn);
    });
}

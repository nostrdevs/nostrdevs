import { SimplePool } from "https://esm.sh/nostr-tools@2/pool";
import { decode, npubEncode } from "https://esm.sh/nostr-tools@2/nip19";

const NPUB =
    "npub10a9ljwf4cn367ytwc8zx8q5h3zqe0u0pgurvhcja82lh7n3s5ecqa5hkwx";
const RELAYS = [
    "wss://relay.damus.io",
    "wss://nos.lol",
    "wss://relay.nostr.band",
    "wss://relay.primal.net",
];
const PAGE_SIZE = 20;

let pool;
let pubkey;
let allEvents = [];
let displayedCount = 0;
let profileCache = new Map();

const loadingEl = document.getElementById("feed-loading");
const errorEl = document.getElementById("feed-error");
const notesEl = document.getElementById("feed-notes");
const actionsEl = document.getElementById("feed-actions");
const loadMoreBtn = document.getElementById("load-more-btn");
const retryBtn = document.getElementById("retry-btn");

function showLoading() {
    loadingEl.classList.remove("hidden");
    errorEl.classList.add("hidden");
    notesEl.innerHTML = "";
    actionsEl.classList.add("hidden");
}

function showError() {
    loadingEl.classList.add("hidden");
    errorEl.classList.remove("hidden");
    actionsEl.classList.add("hidden");
}

function showNotes() {
    loadingEl.classList.add("hidden");
    errorEl.classList.add("hidden");
}

function relativeTime(timestamp) {
    const now = Math.floor(Date.now() / 1000);
    const diff = now - timestamp;

    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;

    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
    });
}

function parseContent(content) {
    let parsed = content
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    // Convert URLs to links
    parsed = parsed.replace(
        /(https?:\/\/[^\s<]+)/g,
        '<a href="$1" target="_blank" rel="noopener">$1</a>'
    );

    // Handle nostr: mentions (npub, note, nevent)
    parsed = parsed.replace(
        /nostr:(npub1[a-z0-9]+|note1[a-z0-9]+|nevent1[a-z0-9]+)/g,
        (match, id) => {
            const short = id.slice(0, 12) + "..." + id.slice(-4);
            return `<a href="${match}" class="nostr-mention">${short}</a>`;
        }
    );

    // Convert newlines to breaks
    parsed = parsed.replace(/\n/g, "<br>");

    return parsed;
}

function extractImages(content) {
    const imageRegex = /(https?:\/\/[^\s<]+\.(?:jpg|jpeg|png|gif|webp)(?:\?[^\s<]*)?)/gi;
    return content.match(imageRegex) || [];
}

function getProfile(pubkey) {
    return profileCache.get(pubkey) || {
        name: null,
        displayName: null,
        picture: null,
        npub: npubEncode(pubkey),
    };
}

function getDisplayName(profile) {
    return profile.displayName || profile.name || profile.npub.slice(0, 12) + "...";
}

function renderNote(event, isRepost = false, repostAuthorPubkey = null) {
    const note = document.createElement("div");
    note.className = `Feed-note${isRepost ? " Feed-note--repost" : ""}`;

    const authorPubkey = event.pubkey;
    const profile = getProfile(authorPubkey);
    const images = extractImages(event.content);
    const contentWithoutImageUrls = event.content.replace(
        /(https?:\/\/[^\s<]+\.(?:jpg|jpeg|png|gif|webp)(?:\?[^\s<]*)?)/gi,
        ""
    );

    let html = "";

    // Repost label with reposter info
    if (isRepost && repostAuthorPubkey) {
        const reposterProfile = getProfile(repostAuthorPubkey);
        html += `<div class="Feed-note-repost-label">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M4.5 3.88l4.432 4.14-1.364 1.46L5.5 7.55V16c0 1.1.896 2 2 2H13v2H7.5c-2.209 0-4-1.79-4-4V7.55L1.432 9.48.068 8.02 4.5 3.88zM16.5 6H11V4h5.5c2.209 0 4 1.79 4 4v8.45l2.068-1.93 1.364 1.46-4.432 4.14-4.432-4.14 1.364-1.46 2.068 1.93V8c0-1.1-.896-2-2-2z"/>
            </svg>
            ${getDisplayName(reposterProfile)} reposted
        </div>`;
    }

    // Author header
    const profileLink = `nostr:${profile.npub}`;
    const avatarHtml = profile.picture
        ? `<img src="${profile.picture}" alt="" class="Feed-note-avatar">`
        : `<div class="Feed-note-avatar Feed-note-avatar--placeholder">${getDisplayName(profile).charAt(0).toUpperCase()}</div>`;

    html += `
        <div class="Feed-note-header">
            <a href="${profileLink}" class="Feed-note-author">
                ${avatarHtml}
                <div class="Feed-note-author-info">
                    <span class="Feed-note-author-name">${getDisplayName(profile)}</span>
                    <span class="Feed-note-author-handle">@${profile.name || profile.npub.slice(5, 13)}...</span>
                </div>
            </a>
            <span class="Feed-note-time">${relativeTime(event.created_at)}</span>
        </div>
    `;

    html += `<div class="Feed-note-content">${parseContent(contentWithoutImageUrls.trim())}</div>`;

    if (images.length > 0) {
        html += `<div class="Feed-note-images">`;
        for (const img of images) {
            html += `<a href="${img}" target="_blank" rel="noopener"><img src="${img}" alt="" class="Feed-note-image" loading="lazy"></a>`;
        }
        html += `</div>`;
    }

    note.innerHTML = html;
    return note;
}

async function fetchRepostedEvent(event, pool) {
    // Kind 6 reposts can have the original event in content (JSON)
    // or reference it via 'e' tag
    if (event.content) {
        try {
            const original = JSON.parse(event.content);
            if (original.content && original.created_at && original.pubkey) {
                return original;
            }
        } catch {
            // Content is not JSON, try fetching via tag
        }
    }

    // Find the 'e' tag referencing the original event
    const eTag = event.tags.find((t) => t[0] === "e");
    if (!eTag) return null;

    const eventId = eTag[1];
    const relayHint = eTag[2];

    const relaysToQuery = relayHint ? [relayHint, ...RELAYS] : RELAYS;

    try {
        const original = await pool.get(relaysToQuery, {
            ids: [eventId],
        });
        return original;
    } catch {
        return null;
    }
}

async function fetchProfiles(pubkeys) {
    if (pubkeys.length === 0) return;

    try {
        const profiles = await pool.querySync(RELAYS, {
            authors: pubkeys,
            kinds: [0],
        });

        for (const event of profiles) {
            try {
                const metadata = JSON.parse(event.content);
                profileCache.set(event.pubkey, {
                    name: metadata.name,
                    displayName: metadata.display_name || metadata.displayName,
                    picture: metadata.picture,
                    npub: npubEncode(event.pubkey),
                });
            } catch {
                // Invalid metadata JSON
            }
        }
    } catch (err) {
        console.error("Failed to fetch profiles:", err);
    }
}

async function loadNotes() {
    showLoading();

    try {
        const decoded = decode(NPUB);
        pubkey = decoded.data;
    } catch (err) {
        console.error("Failed to decode npub:", err);
        showError();
        return;
    }

    pool = new SimplePool();

    try {
        // Fetch kind 1 (text notes) and kind 6 (reposts)
        const events = await pool.querySync(RELAYS, {
            authors: [pubkey],
            kinds: [1, 6],
            limit: 100,
        });

        // Process reposts to get original content
        const processedEvents = [];
        const pubkeysToFetch = new Set([pubkey]);

        for (const event of events) {
            if (event.kind === 6) {
                const original = await fetchRepostedEvent(event, pool);
                if (original) {
                    pubkeysToFetch.add(original.pubkey);
                    processedEvents.push({
                        ...event,
                        originalEvent: original,
                        isRepost: true,
                    });
                }
            } else {
                processedEvents.push({
                    ...event,
                    isRepost: false,
                });
            }
        }

        // Fetch all author profiles
        await fetchProfiles([...pubkeysToFetch]);

        // Sort by created_at descending
        processedEvents.sort((a, b) => b.created_at - a.created_at);

        allEvents = processedEvents;
        displayedCount = 0;

        showNotes();
        displayMoreNotes();
    } catch (err) {
        console.error("Failed to fetch notes:", err);
        showError();
    }
}

function displayMoreNotes() {
    const nextBatch = allEvents.slice(displayedCount, displayedCount + PAGE_SIZE);

    for (const event of nextBatch) {
        if (event.isRepost && event.originalEvent) {
            const noteEl = renderNote(event.originalEvent, true, event.pubkey);
            notesEl.appendChild(noteEl);
        } else {
            const noteEl = renderNote(event);
            notesEl.appendChild(noteEl);
        }
    }

    displayedCount += nextBatch.length;

    if (displayedCount < allEvents.length) {
        actionsEl.classList.remove("hidden");
    } else {
        actionsEl.classList.add("hidden");
    }
}

loadMoreBtn.addEventListener("click", displayMoreNotes);
retryBtn.addEventListener("click", loadNotes);

// Start loading
loadNotes();

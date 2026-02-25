const REPO = "aljazceru/awesome-nostr";
const API_BASE = "https://api.github.com";

let events = [];

async function init() {
  try {
    const res = await fetch("events.json");
    events = await res.json();
  } catch {
    events = [];
  }

  // Sort events by date ascending
  events.sort((a, b) => new Date(a.date) - new Date(b.date));

  populateDateSelectors();

  document.getElementById("load-diff").addEventListener("click", loadDiff);

  // Auto-load if we have at least two events
  if (events.length >= 2) {
    loadDiff();
  }
}

function populateDateSelectors() {
  const fromSelect = document.getElementById("from-date");
  const toSelect = document.getElementById("to-date");

  for (const event of events) {
    const fromOpt = document.createElement("option");
    fromOpt.value = event.date;
    fromOpt.textContent = `${event.date} — ${event.title}`;
    fromSelect.appendChild(fromOpt);

    const toOpt = document.createElement("option");
    toOpt.value = event.date;
    toOpt.textContent = `${event.date} — ${event.title}`;
    toSelect.appendChild(toOpt);
  }

  // Default: second-to-last event as "from", last event as "to"
  if (events.length >= 2) {
    fromSelect.value = events[events.length - 2].date;
    toSelect.value = events[events.length - 1].date;
  }
}

function showStatus(msg, isError) {
  const el = document.getElementById("diff-status");
  el.textContent = msg;
  el.className = isError
    ? "Diff-status Diff-status--error"
    : "Diff-status Diff-status--loading";
}

function hideStatus() {
  const el = document.getElementById("diff-status");
  el.className = "Diff-status hidden";
}

async function findCommitAtDate(date) {
  // Find the most recent commit on or before the given date
  const until = new Date(date + "T23:59:59Z").toISOString();
  const url = `${API_BASE}/repos/${REPO}/commits?until=${until}&per_page=1`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
  }

  const commits = await res.json();
  if (commits.length === 0) {
    throw new Error(`No commits found before ${date}`);
  }

  return commits[0].sha;
}

function parseReadmeDiff(files) {
  // Find README.md in the changed files
  const readme = files.find(
    (f) => f.filename === "README.md" || f.filename.toLowerCase() === "readme.md",
  );

  if (!readme || !readme.patch) {
    return null;
  }

  return parsePatch(readme.patch);
}

function parsePatch(patch) {
  const lines = patch.split("\n");
  let currentSection = "Uncategorized";
  const sections = {};

  for (const line of lines) {
    // Track section headers from context lines or changed lines
    // awesome-nostr uses ## headers for sections
    const headerMatch = line.match(/^[\s+-]*##\s+(.+)/);
    if (headerMatch) {
      currentSection = headerMatch[1].replace(/\s*$/, "");
    }

    if (!line.startsWith("+") && !line.startsWith("-")) continue;
    if (line.startsWith("+++") || line.startsWith("---")) continue;

    // Only include meaningful lines (skip empty additions/removals)
    const content = line.slice(1).trim();
    if (!content) continue;

    // Skip section headers themselves from the items list
    if (content.match(/^#+\s/)) continue;

    if (!sections[currentSection]) {
      sections[currentSection] = { added: [], removed: [] };
    }

    if (line.startsWith("+")) {
      sections[currentSection].added.push(content);
    } else {
      sections[currentSection].removed.push(content);
    }
  }

  return sections;
}

async function loadDiff() {
  const fromDate = document.getElementById("from-date").value;
  const toDate = document.getElementById("to-date").value;

  if (!fromDate || !toDate) {
    showStatus("Select both dates.", true);
    return;
  }

  if (fromDate >= toDate) {
    showStatus("'From' date must be before 'To' date.", true);
    return;
  }

  showStatus("Finding commits...", false);
  const resultsEl = document.getElementById("diff-results");
  resultsEl.innerHTML = "";

  try {
    // Find commits closest to each date
    const [fromSha, toSha] = await Promise.all([
      findCommitAtDate(fromDate),
      findCommitAtDate(toDate),
    ]);

    if (fromSha === toSha) {
      showStatus("No changes — same commit at both dates.", true);
      return;
    }

    showStatus("Fetching diff...", false);

    // Compare the two commits
    const compareUrl = `${API_BASE}/repos/${REPO}/compare/${fromSha}...${toSha}`;
    const compareRes = await fetch(compareUrl);

    if (!compareRes.ok) {
      throw new Error(
        `Compare failed: ${compareRes.status} ${compareRes.statusText}`,
      );
    }

    const compareData = await compareRes.json();
    const sections = parseReadmeDiff(compareData.files || []);

    if (!sections) {
      hideStatus();
      resultsEl.innerHTML =
        '<p class="Diff-empty">No changes to README.md in this range.</p>';
      return;
    }

    // Check if there are any actual changes
    const totalAdded = Object.values(sections).reduce(
      (sum, s) => sum + s.added.length,
      0,
    );
    const totalRemoved = Object.values(sections).reduce(
      (sum, s) => sum + s.removed.length,
      0,
    );

    if (totalAdded === 0 && totalRemoved === 0) {
      hideStatus();
      resultsEl.innerHTML =
        '<p class="Diff-empty">No meaningful changes to README.md in this range.</p>';
      return;
    }

    hideStatus();
    renderDiff(sections, compareData, fromDate, toDate);
  } catch (err) {
    showStatus(`Error: ${err.message}`, true);
    console.error(err);
  }
}

function renderDiff(sections, compareData, fromDate, toDate) {
  const resultsEl = document.getElementById("diff-results");

  // Summary bar
  const totalAdded = Object.values(sections).reduce(
    (sum, s) => sum + s.added.length,
    0,
  );
  const totalRemoved = Object.values(sections).reduce(
    (sum, s) => sum + s.removed.length,
    0,
  );

  let html = `
    <div class="Diff-summary">
      <span class="Diff-summary-range">${fromDate} → ${toDate}</span>
      <span class="Diff-summary-stats">
        <span class="Diff-stat-added">+${totalAdded} added</span>
        <span class="Diff-stat-removed">-${totalRemoved} removed</span>
        <span class="Diff-stat-commits">${compareData.total_commits} commits</span>
      </span>
      <a href="${compareData.html_url}" target="_blank" rel="noopener" class="Diff-github-link">View on GitHub</a>
    </div>
  `;

  // Render each section
  const sectionNames = Object.keys(sections);
  for (const name of sectionNames) {
    const section = sections[name];
    if (section.added.length === 0 && section.removed.length === 0) continue;

    html += `<div class="Diff-section">`;
    html += `<h3 class="Diff-section-title">${escapeHtml(name)}</h3>`;

    for (const line of section.added) {
      html += `<div class="Diff-line Diff-line--added"><span class="Diff-line-marker">+</span> ${linkify(escapeHtml(line))}</div>`;
    }

    for (const line of section.removed) {
      html += `<div class="Diff-line Diff-line--removed"><span class="Diff-line-marker">-</span> ${linkify(escapeHtml(line))}</div>`;
    }

    html += `</div>`;
  }

  resultsEl.innerHTML = html;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function linkify(html) {
  // Turn markdown links [text](url) into clickable links
  return html.replace(
    /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener">$1</a>',
  );
}

init();

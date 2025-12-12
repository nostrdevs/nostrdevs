let allItems = [];
let activeTag = null;

const LOCAL_STORAGE_KEY = "nostrdevs-since-date";

async function init() {
  // Load items
  const res = await fetch("items.json");
  allItems = await res.json();

  // Build tag list
  buildTagButtons();

  // Restore saved date
  const savedDate = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (savedDate) {
    document.getElementById("since-date").value = savedDate;
  }

  // Set up event listeners
  document.getElementById("since-date").addEventListener("change", (e) => {
    localStorage.setItem(LOCAL_STORAGE_KEY, e.target.value);
    render();
  });

  document.getElementById("clear-date").addEventListener("click", () => {
    document.getElementById("since-date").value = "";
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    render();
  });

  // Submit form functionality
  setupSubmitForm();

  render();
}

function buildTagButtons() {
  // Collect all unique tags
  const tags = new Set();
  for (const item of allItems) {
    for (const tag of item.tags || []) {
      tags.add(tag);
    }
  }

  const container = document.getElementById("tag-buttons");

  // Add "All" button
  const allBtn = document.createElement("button");
  allBtn.className = "tag-btn active";
  allBtn.textContent = "All";
  allBtn.addEventListener("click", () => {
    activeTag = null;
    updateTagButtons();
    render();
  });
  container.appendChild(allBtn);

  // Add button for each tag
  const sortedTags = Array.from(tags).sort();
  for (const tag of sortedTags) {
    const btn = document.createElement("button");
    btn.className = "tag-btn";
    btn.textContent = tag;
    btn.dataset.tag = tag;
    btn.addEventListener("click", () => {
      activeTag = tag;
      updateTagButtons();
      render();
    });
    container.appendChild(btn);
  }
}

function updateTagButtons() {
  const buttons = document.querySelectorAll(".tag-btn");
  for (const btn of buttons) {
    if (activeTag === null && !btn.dataset.tag) {
      btn.classList.add("active");
    } else if (btn.dataset.tag === activeTag) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  }
}

function render() {
  const sinceDate = document.getElementById("since-date").value;

  let filtered = allItems;

  // Filter by date
  if (sinceDate) {
    filtered = filtered.filter((item) => item.date >= sinceDate);
  }

  // Filter by tag
  if (activeTag) {
    filtered = filtered.filter(
      (item) => item.tags && item.tags.includes(activeTag),
    );
  }

  // Update count
  document.getElementById("count").textContent = filtered.length;

  // Render list
  const list = document.getElementById("item-list");
  list.innerHTML = "";

  for (const item of filtered) {
    const div = document.createElement("div");
    div.className = "Home-posts-post";

    const tagsHtml =
      (item.tags || []).length > 0
        ? ' <span class="item-tags">[' +
          (item.tags || []).join(", ") +
          "]</span>"
        : "";

    div.innerHTML = `
      <span class="Home-posts-post-date">${item.date}</span>
      <span class="Home-posts-post-arrow">&raquo;</span>
      <a class="Home-posts-post-title" href="${item.url}" target="_blank" rel="noopener">${item.title}</a>${tagsHtml}
    `;

    list.appendChild(div);
  }
}

function setupSubmitForm() {
  const toggleBtn = document.getElementById("toggle-submit");
  const submitForm = document.getElementById("submit-form");
  const cancelBtn = document.getElementById("cancel-submit");
  const dateInput = document.getElementById("submit-date");

  // Set default date to today
  const today = new Date().toISOString().split("T")[0];
  dateInput.value = today;

  // Toggle form visibility
  toggleBtn.addEventListener("click", () => {
    submitForm.classList.toggle("hidden");
    if (!submitForm.classList.contains("hidden")) {
      toggleBtn.textContent = "− Hide Form";
    } else {
      toggleBtn.textContent = "+ Submit Item";
    }
  });

  cancelBtn.addEventListener("click", () => {
    submitForm.classList.add("hidden");
    toggleBtn.textContent = "+ Submit Item";
    submitForm.reset();
    dateInput.value = today;
  });

  // Handle form submission
  submitForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const title = document.getElementById("submit-title").value.trim();
    const url = document.getElementById("submit-url").value.trim();
    const date = document.getElementById("submit-date").value;
    const tagsInput = document.getElementById("submit-tags").value.trim();

    // Parse tags
    const tags = tagsInput
      ? tagsInput
          .split(",")
          .map((t) => t.trim())
          .filter((t) => t.length > 0)
      : [];

    // Create slug for filename
    const slug = createSlug(title);
    const filename = `${date}-${slug}.json`;

    // Build JSON object
    const itemData = {
      title,
      url,
      date,
    };

    if (tags.length > 0) {
      itemData.tags = tags;
    }

    // Pretty-print JSON
    const jsonContent = JSON.stringify(itemData, null, 2);

    // URL encode the content
    const encodedContent = encodeURIComponent(jsonContent);

    // Build GitHub URL
    const githubUrl = `https://github.com/dtdannen/nostrdevs/new/main/items?filename=${filename}&value=${encodedContent}`;

    // Open in new tab
    window.open(githubUrl, "_blank", "noopener,noreferrer");

    // Reset form
    submitForm.reset();
    dateInput.value = today;
    submitForm.classList.add("hidden");
    toggleBtn.textContent = "+ Submit Item";
  });
}

function createSlug(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
}

init();

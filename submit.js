// Set default date to today
const dateInput = document.getElementById("submit-date");
const today = new Date().toISOString().split("T")[0];
dateInput.value = today;

// AI Form Fill functionality
const aiFillBtn = document.getElementById("ai-fill-btn");
const aiFillText = aiFillBtn.querySelector(".ai-fill-text");
const aiFillLoading = aiFillBtn.querySelector(".ai-fill-loading");

aiFillBtn.addEventListener("click", async () => {
  const url = document.getElementById("submit-url").value.trim();
  const context = document.getElementById("submit-context").value.trim();

  if (!url) {
    alert("Please enter a URL first");
    return;
  }

  // Show loading state
  aiFillBtn.disabled = true;
  aiFillText.classList.add("hidden");
  aiFillLoading.classList.remove("hidden");

  try {
    const response = await fetch("/api/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, context }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to extract details");
    }

    const data = await response.json();

    // Populate form fields
    if (data.title) {
      document.getElementById("submit-title").value = data.title;
    }
    if (data.tags && data.tags.length > 0) {
      document.getElementById("submit-tags").value = data.tags.join(", ");
    }
  } catch (err) {
    alert("Error: " + err.message);
  } finally {
    // Reset button state
    aiFillBtn.disabled = false;
    aiFillText.classList.remove("hidden");
    aiFillLoading.classList.add("hidden");
  }
});

// Handle form submission
document.getElementById("submit-form").addEventListener("submit", (e) => {
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
  document.getElementById("submit-form").reset();
  dateInput.value = today;
});

function createSlug(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
}

// Set default date to today
const dateInput = document.getElementById('submit-date');
const today = new Date().toISOString().split('T')[0];
dateInput.value = today;

// Handle form submission
document.getElementById('submit-form').addEventListener('submit', (e) => {
  e.preventDefault();

  const title = document.getElementById('submit-title').value.trim();
  const url = document.getElementById('submit-url').value.trim();
  const date = document.getElementById('submit-date').value;
  const tagsInput = document.getElementById('submit-tags').value.trim();

  // Parse tags
  const tags = tagsInput
    ? tagsInput.split(',').map(t => t.trim()).filter(t => t.length > 0)
    : [];

  // Create slug for filename
  const slug = createSlug(title);
  const filename = `${date}-${slug}.json`;

  // Build JSON object
  const itemData = {
    title,
    url,
    date
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
  window.open(githubUrl, '_blank', 'noopener,noreferrer');

  // Reset form
  document.getElementById('submit-form').reset();
  dateInput.value = today;
});

function createSlug(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-')      // Replace spaces with hyphens
    .replace(/-+/g, '-')       // Replace multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, '');  // Remove leading/trailing hyphens
}

let allEvents = [];

function formatDate(dateStr) {
    const date = new Date(dateStr + 'T00:00:00');
    const day = String(date.getDate()).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
}

function renderEvents() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcoming = allEvents.filter(e => new Date(e.date + 'T00:00:00') >= today);
    const past = allEvents.filter(e => new Date(e.date + 'T00:00:00') < today);

    // Sort upcoming by date ascending (soonest first)
    upcoming.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Sort past by date descending (most recent first)
    past.sort((a, b) => new Date(b.date) - new Date(a.date));

    const upcomingEl = document.getElementById('upcoming-events');
    const pastEl = document.getElementById('past-events');

    if (upcoming.length === 0) {
        upcomingEl.innerHTML = '<p class="Events-empty">No upcoming events scheduled.</p>';
    } else {
        upcomingEl.innerHTML = upcoming.map(event => {
            const linkStart = event.url ? `<a href="${event.url}" target="_blank" rel="noopener" class="Events-event-title">` : '<span class="Events-event-title">';
            const linkEnd = event.url ? '</a>' : '</span>';
            return `
                <div class="Events-event">
                    <span class="Events-event-date">${formatDate(event.date)}</span>
                    <span class="Events-event-arrow">»</span>
                    ${linkStart}${event.title}${linkEnd}
                </div>
            `;
        }).join('');
    }

    if (past.length === 0) {
        pastEl.innerHTML = '<p class="Events-empty">No past events.</p>';
    } else {
        pastEl.innerHTML = past.map(event => {
            const linkStart = event.url ? `<a href="${event.url}" target="_blank" rel="noopener" class="Events-event-title">` : '<span class="Events-event-title">';
            const linkEnd = event.url ? '</a>' : '</span>';
            return `
                <div class="Events-event">
                    <span class="Events-event-date">${formatDate(event.date)}</span>
                    <span class="Events-event-arrow">»</span>
                    ${linkStart}${event.title}${linkEnd}
                </div>
            `;
        }).join('');
    }
}

async function init() {
    try {
        const res = await fetch('events.json');
        allEvents = await res.json();
        renderEvents();
    } catch (err) {
        console.error('Failed to load events:', err);
    }
}

init();


/*
  Name: Ziyad Abdelhamid
  Date: 10.16.2026
  CSC 372

  Assignment 4: TVmaze Show Gallery.
  Searches for TV shows using Fetch API, retrieves
  cast members, and displays results as cards.
*/

let searchForm = document.querySelector("#search-form");
let searchInput = document.querySelector("#show-search");
let showGallery = document.querySelector("#show-gallery");
let statusMessage = document.querySelector("#status-message");

let currentSearch = 0;
let castCache = new Map();

/**
 * Handles form submission.
 * @param {Event} event - The form submit event.
 */
function handleSearch(event) {
    event.preventDefault();
    searchShows(searchInput.value.trim());
}

/**
 * Searches TVmaze and displays up to 10 shows.
 * @param {string} query - The TV show search text.
 * @returns {Promise<void>} Resolves when search processing finishes.
 */
async function searchShows(query) {
    let searchId = ++currentSearch;

    showGallery.replaceChildren();

    if (query === "") {
        statusMessage.textContent = "Please enter a show name.";
        return;
    }

    statusMessage.textContent = "Loading shows...";

    try {
        let url = "https://api.tvmaze.com/search/shows?q="
            + encodeURIComponent(query);

        let response = await fetch(url);

        if (!response.ok) {
            if (response.status === 429) {
                throw new Error(
                    "Rate limit reached. Please try again shortly."
                );
            }

            throw new Error("Search failed. HTTP " + response.status);
        }

        let results = await response.json();

        if (searchId !== currentSearch) {
            return;
        }

        if (results.length === 0) {
            statusMessage.textContent = "No matching shows found.";
            return;
        }

        let topResults = results.slice(0, 10);

        let cards = await Promise.all(
            topResults.map(result => createShowCard(result.show))
        );

        if (searchId !== currentSearch) {
            return;
        }

        for (let card of cards) {
            showGallery.appendChild(card);
        }

        statusMessage.textContent =
            "Showing " + cards.length + " results for " + query + ".";

    } catch (error) {
        if (searchId !== currentSearch) {
            return;
        }

        showGallery.replaceChildren();
        statusMessage.textContent =
            "Unable to load shows: " + error.message;
    }
}

/**
 * Gets main cast members for a show.
 * @param {number} showId - The TVmaze show ID.
 * @returns {Promise<Array>} The show's cast information.
 */
async function getCast(showId) {
    if (castCache.has(showId)) {
        return castCache.get(showId);
    }

    let url = "https://api.tvmaze.com/shows/" + showId + "/cast";
    let response = await fetch(url);

    if (!response.ok) {
        if (response.status === 429) {
            throw new Error("Rate limit reached.");
        }

        throw new Error("Cast request failed.");
    }

    let cast = await response.json();
    castCache.set(showId, cast);

    return cast;
}

/**
 * Removes HTML tags and shortens a summary.
 * @param {string|null} html - The original show summary.
 * @returns {string} A readable plain-text summary.
 */
function cleanSummary(html) {
    if (!html) {
        return "Not available";
    }

    let parser = new DOMParser();
    let documentData = parser.parseFromString(html, "text/html");
    let summary = documentData.body.textContent.trim();

    if (summary.length > 200) {
        return summary.slice(0, 200) + "...";
    }

    return summary || "Not available";
}

/**
 * Adds a labeled information paragraph to a card.
 * @param {HTMLElement} card - The TV show card.
 * @param {string} label - The information label.
 * @param {string|number} value - The information value.
 */
function addShowInfo(card, label, value) {
    let paragraph = document.createElement("p");
    paragraph.className = "show-info";
    paragraph.textContent = label + ": " + value;
    card.appendChild(paragraph);
}

/**
 * Creates a TV show card with details and cast.
 * @param {Object} show - The TVmaze show object.
 * @returns {Promise<HTMLElement>} The completed show card.
 */
async function createShowCard(show) {
    let card = document.createElement("article");
    card.className = "show-card";

    // Show name
    let title = document.createElement("h2");
    title.textContent = show.name || "Unknown show";
    card.appendChild(title);

    // Show poster
    if (show.image && show.image.medium) {
        let poster = document.createElement("img");
        poster.className = "show-poster";
        poster.src = show.image.medium;
        poster.alt = "Poster for " + title.textContent;
        poster.loading = "lazy";

        poster.addEventListener("error", () => {
            let fallback = document.createElement("p");
            fallback.textContent = "Poster: Not available";
            poster.replaceWith(fallback);
        });

        card.appendChild(poster);
    } else {
        addShowInfo(card, "Poster", "Not available");
    }

    // Summary
    let summary = document.createElement("p");
    summary.className = "show-summary";
    summary.textContent = cleanSummary(show.summary);
    card.appendChild(summary);

    // Premiere date
    addShowInfo(
        card,
        "Premiered",
        show.premiered || "Not available"
    );

    // Last updated date and time
    let updated = "Not available";

    if (typeof show.updated === "number") {
        updated = new Date(show.updated * 1000).toLocaleString();
    }

    addShowInfo(card, "Last updated", updated);

    // Genres
    let genres = "Not available";

    if (show.genres && show.genres.length > 0) {
        genres = show.genres.join(", ");
    }

    addShowInfo(card, "Genres", genres);

    // Average rating
    let rating = show.rating?.average ?? "Not available";
    addShowInfo(card, "Average rating", rating);

    // Main cast
    let castHeading = document.createElement("h3");
    castHeading.textContent = "Main Cast";
    card.appendChild(castHeading);

    try {
        let cast = await getCast(show.id);

        if (cast.length === 0) {
            addShowInfo(card, "Cast", "Not available");
        } else {
            let castList = document.createElement("ul");
            castList.className = "cast-list";

            for (let member of cast.slice(0, 5)) {
                if (!member.person || !member.person.name) {
                    continue;
                }

                let item = document.createElement("li");
                item.textContent = member.person.name;

                if (member.character?.name) {
                    item.textContent += " as " + member.character.name;
                }

                castList.appendChild(item);
            }

            if (castList.children.length > 0) {
                card.appendChild(castList);
            } else {
                addShowInfo(card, "Cast", "Not available");
            }
        }
    } catch (error) {
        addShowInfo(card, "Cast", error.message);
    }

    // TVmaze show link
    if (show.url) {
        let link = document.createElement("a");
        link.className = "show-link";
        link.href = show.url;
        link.textContent = "View on TVmaze";
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        card.appendChild(link);
    } else {
        addShowInfo(card, "TVmaze link", "Not available");
    }

    return card;
}

// Register search event and load default results.
searchForm.addEventListener("submit", handleSearch);
searchShows(searchInput.value.trim());

// Configuration
const OPEN_LIBRARY_API = "https://openlibrary.org";
const COVERS_API = "https://covers.openlibrary.org/b";

// Global Variables
let allBooks = [];
let currentPage = 1;
let loadedBookIDs = new Set();
const booksPerPage = 100; // 
let currentSubject = 'fiction';

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    setupEventListeners();
    populateFilters();
    restoreDarkModePref();
    showLoading(false); // Don't load books on initial page load
    addDynamicStyles(); // Add dynamic CSS styles
});

// Fetch books from Open Library API
async function fetchBooksFromAPI(subject = "fiction", isLoadMore = false) {
    try {
        if (!isLoadMore) {
            currentPage = 1;
            allBooks = [];
            loadedBookIDs.clear();
        }
        
        currentSubject = subject;

        const response = await fetch(
            `${OPEN_LIBRARY_API}/subjects/${subject}.json?limit=${booksPerPage}&page=${currentPage}`
        );
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();

        if (!data.works || data.works.length === 0) {
            console.log("No more books available");
            return;
        }

        const newBooks = data.works
            .filter(work => work.title && !loadedBookIDs.has(work.key))
            .map(work => {
                loadedBookIDs.add(work.key);
                return {
                    title: work.title,
                    author: work.authors?.[0]?.name || "Unknown Author",
                    genre: subject,
                    era: (work.first_publish_year && work.first_publish_year > 1980) ? "modern" : "classic",
                    length: getRandomLength(),
                    age: getAgeGroup(work, subject),
                    description: work.description?.value || work.description || "No description available",
                    rating: (Math.random() * 2 + 3).toFixed(1),
                    cover: work.cover_id ? `${COVERS_API}/id/${work.cover_id}-M.jpg` : null,
                    olid: work.cover_edition_key || work.key.replace("/works/", ""),
                    subjects: work.subject || []
                };
            });

        allBooks = [...allBooks, ...newBooks];
        updateAuthorDropdown();
        
        console.log(`Loaded ${newBooks.length} new books. Total: ${allBooks.length}`);

    } catch (error) {
        console.error("API Error:", error);
        // Show user-friendly error message
        const resultsDiv = document.getElementById('recommendationResults');
        resultsDiv.innerHTML = '<div class="error-message">Unable to load books. Please try again later.</div>';
    }
}

function getRandomLength() {
    const lengths = ["short", "medium", "long"];
    return lengths[Math.floor(Math.random() * lengths.length)];
}

function getAgeGroup(work, subject) {
    const title = work.title?.toLowerCase() || '';
    const subjects = work.subject || [];

    const teenKeywords = ['teen', 'young adult', 'ya', 'teenager', 'high school', 'adolescent'];
    const kidsKeywords = ['children', 'juvenile', 'kids', 'picture book', 'elementary'];
    
    if (teenKeywords.some(keyword => title.includes(keyword))) {
        return "teens";
    }
    
    if (kidsKeywords.some(keyword => title.includes(keyword))) {
        return "kids";
    }
    
    const subjectString = subjects.join(' ').toLowerCase();
    if (subjectString.includes('juvenile') || subjectString.includes('children')) {
        return "kids";
    }
    
    if (subjectString.includes('young adult') || subjectString.includes('teen')) {
        return "teens";
    }
    
    if (['romance', 'fantasy', 'mystery'].includes(subject)) {
        return Math.random() > 0.7 ? "teens" : "adults";
    }
    
    return "adults";
}

// event listeners
function setupEventListeners() {
    // Dark mode toggle
    document.getElementById('darkModeToggle').addEventListener('click', toggleDarkMode);
    // Homepage options
    document.getElementById('exploreBooks').addEventListener('click', showExploreSection);
    document.getElementById('wordOfTheDay').addEventListener('click', showWordSection);
    // Explore section
    document.getElementById('findBooks').addEventListener('click', findBooks);
    document.getElementById('resetFilters').addEventListener('click', resetFilters);
    document.getElementById('surpriseMe').addEventListener('click', surpriseMe);
    document.getElementById('backFromExplore').addEventListener('click', showHome);
    // Word section
    document.getElementById('newWord').addEventListener('click', fetchWordOfTheDay);
    document.getElementById('backFromWord').addEventListener('click', showHome);
}
// Dark mode toggle with local storage
function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
    updateDarkModeButton();
}

function restoreDarkModePref() {
    const darkMode = localStorage.getItem('darkMode') === 'true';
    document.body.classList.toggle('dark-mode', darkMode);
    updateDarkModeButton();
}

function updateDarkModeButton() {
    const toggleBtn = document.getElementById('darkModeToggle');
    toggleBtn.textContent = document.body.classList.contains('dark-mode') 
        ? '☀️ Light Mode' 
        : '🌙 Dark Mode';
}

function showHome() {
    document.querySelector('.home-container').style.display = 'block';
    document.querySelector('.explore-section').style.display = 'none';
    document.querySelector('.word-section').style.display = 'none';
}

function showExploreSection() {
    document.querySelector('.home-container').style.display = 'none';
    document.querySelector('.explore-section').style.display = 'block';
    document.querySelector('.word-section').style.display = 'none';
}

function showWordSection() {
    document.querySelector('.home-container').style.display = 'none';
    document.querySelector('.explore-section').style.display = 'none';
    document.querySelector('.word-section').style.display = 'block';
    
    if (document.getElementById('wordDisplay').textContent === '✨') {
        fetchWordOfTheDay();
    }
}

function showLoading(show) {
    document.getElementById('loading').style.display = show ? 'flex' : 'none';
}

function populateFilters() {
    const genreSelect = document.getElementById("genreFilter");
    const popularGenres = [
        "fiction", "fantasy", "romance", "mystery", 
        "science_fiction", "biography", "history", "horror",
        "young_adult", "children" 
    ];
    
    genreSelect.innerHTML = '';
    popularGenres.forEach(genre => {
        const option = document.createElement("option");
        option.value = genre;
        option.textContent = genre.split('_').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
        genreSelect.appendChild(option);
    });
    
    const authorSelect = document.getElementById("authorFilter");
    authorSelect.innerHTML = '<option value="">All Authors</option>';
}

function updateAuthorDropdown() {
    const authorSelect = document.getElementById("authorFilter");
    
    // while (authorSelect.options.length > 1) {
    //     authorSelect.remove(1);
    // }
    
    const uniqueAuthors = [...new Set(allBooks.map(book => book.author).filter(author => author && author !== "Unknown Author"))];
    
    // Sort alphabetically and add to dropdown
    uniqueAuthors.sort().forEach(author => {
        const option = document.createElement("option");
        option.value = author;
        option.textContent = author;
        authorSelect.appendChild(option);
    });
}

async function findBooks() {
    showLoading(true);
    
    try {
        const selectedGenres = getSelectedValues('genreFilter');
        if (selectedGenres.length > 0) {
            await fetchBooksFromAPI(selectedGenres[0], false);
        } else {
            // If no genre selected, fetch default fiction
            await fetchBooksFromAPI('fiction', false);
        }
        
        const selectedAuthors = getSelectedValues('authorFilter');
        const selectedEras = getSelectedValues('eraFilter');
        const selectedLengths = getSelectedValues('lengthFilter');
        const selectedAges = getSelectedValues('ageFilter');

        let results = allBooks.filter(book => {
            const authorMatch = selectedAuthors.length === 0 || 
                               selectedAuthors.some(author => book.author.toLowerCase().includes(author.toLowerCase()));
            // Era filter
            const eraMatch = selectedEras.length === 0 || selectedEras.includes(book.era);
            
            // Length filter
            const lengthMatch = selectedLengths.length === 0 || selectedLengths.includes(book.length);
            
            // Age filter
            const ageMatch = selectedAges.length === 0 || selectedAges.includes(book.age);
            
            return authorMatch && eraMatch && lengthMatch && ageMatch;
        });

        updateSearchSummary(results.length, selectedGenres, selectedAuthors, selectedEras, selectedLengths, selectedAges);
        
        displayRecommendations(results);
        
    } catch (error) {
        console.error("Error finding books:", error);
        document.getElementById('recommendationResults').innerHTML = 
            '<div class="error-message">Error loading books. Please try again.</div>';
    } finally {
        showLoading(false);
    }
}

function updateSearchSummary(count, genres, authors, eras, lengths, ages) {
    const summaryDiv = document.getElementById('searchSummary');
    const filters = [];
    
    if (genres.length > 0) filters.push(`Genre: ${genres.join(', ')}`);
    if (authors.length > 0) filters.push(`Author: ${authors.join(', ')}`);
    if (eras.length > 0) filters.push(`Era: ${eras.join(', ')}`);
    if (lengths.length > 0) filters.push(`Length: ${lengths.join(', ')}`);
    if (ages.length > 0) filters.push(`Age: ${ages.join(', ')}`);
    
    const filterText = filters.length > 0 ? ` with filters: ${filters.join(', ')}` : '';
    summaryDiv.innerHTML = `Found ${count} books${filterText}`;
}

function getSelectedValues(selectId) {
    const select = document.getElementById(selectId);
    return Array.from(select.selectedOptions).map(option => option.value);
}

function resetFilters() {
    document.querySelectorAll('select').forEach(select => {
        select.selectedIndex = -1;
    });
    document.getElementById('recommendationResults').innerHTML = '';
    document.getElementById('searchSummary').innerHTML = '';
    
    // Remove any existing load more button
    const loadMoreBtn = document.getElementById('loadMore');
    if (loadMoreBtn) {
        loadMoreBtn.remove();
    }
}

async function surpriseMe() {
    showLoading(true);
    
    try {
        const randomGenres = ["fiction", "fantasy", "mystery", "romance", "young_adult"];
        const randomGenre = randomGenres[Math.floor(Math.random() * randomGenres.length)];
        
        await fetchBooksFromAPI(randomGenre, false);
        
        // Get random books from the loaded collection
        const shuffled = [...allBooks].sort(() => 0.5 - Math.random());
        const randomBooks = shuffled.slice(0, 6);
        
        document.getElementById('searchSummary').innerHTML = `Surprise selection of ${randomBooks.length} books from ${randomGenre}`;
        displayRecommendations(randomBooks);
        
    } catch (error) {
        console.error("Error in surprise me:", error);
        document.getElementById('recommendationResults').innerHTML = 
            '<div class="error-message">Unable to surprise you right now. Please try again!</div>';
    } finally {
        showLoading(false);
    }
}

function displayRecommendations(books, isLoadMore = false) {
    const resultsDiv = document.getElementById('recommendationResults');
    
    // Only clear if this is a new search (not load more)
    if (!isLoadMore) {
        resultsDiv.innerHTML = '';
    }
    
    const existingLoadMore = document.getElementById('loadMore');
    if (existingLoadMore) {
        existingLoadMore.remove();
    }

    if (books.length === 0) {
        resultsDiv.innerHTML = '<div class="no-results">No books found matching your criteria. Try different filters!</div>';
        return;
    }
    let booksToShow = books;
    if (isLoadMore) {
        const currentBookCount = resultsDiv.querySelectorAll('.book-card').length;
        booksToShow = books.slice(currentBookCount);
    }

    booksToShow.forEach(book => {
        const bookCard = document.createElement('div');
        bookCard.className = 'book-card animate__animated animate__fadeIn';
        
        const truncatedTitle = book.title.length > 50 ? book.title.substring(0, 50) + '...' : book.title;
        const truncatedDesc = book.description.length > 100 ? book.description.substring(0, 100) + '...' : book.description;
        
        bookCard.innerHTML = `
            <div class="book-cover" style="background-image: url('${book.cover || ''}')">
                ${!book.cover ? '<div class="no-cover">No Cover Available</div>' : ''}
            </div>
            <h3>${truncatedTitle}</h3>
            <p class="book-author">by ${book.author}</p>
            <div class="book-meta">
                <span class="rating">★ ${book.rating}</span>
                <span class="genre">${book.genre.replace('_', ' ')}</span>
                <span class="age-group">${book.age}</span>
            </div>
            <p class="book-desc">${truncatedDesc}</p>
            <a href="https://openlibrary.org/works/${book.olid}" target="_blank" class="view-book">
                View on Open Library
            </a>
        `;
        resultsDiv.appendChild(bookCard);
    });

    if (books.length > 0 && allBooks.length >= booksPerPage) {
        const loadMoreBtn = document.createElement('button');
        loadMoreBtn.id = 'loadMore';
        loadMoreBtn.textContent = '📚 Load More Books';
        loadMoreBtn.addEventListener('click', async () => {
            showLoading(true);
            currentPage++;
            await fetchBooksFromAPI(currentSubject, true);
            
            // Re-apply current filters
            const selectedAuthors = getSelectedValues('authorFilter');
            const selectedEras = getSelectedValues('eraFilter');
            const selectedLengths = getSelectedValues('lengthFilter');
            const selectedAges = getSelectedValues('ageFilter');
            
            let filteredBooks = allBooks;
            if (selectedAuthors.length > 0 || selectedEras.length > 0 || selectedLengths.length > 0 || selectedAges.length > 0) {
                filteredBooks = allBooks.filter(book => {
                    const authorMatch = selectedAuthors.length === 0 || 
                                       selectedAuthors.some(author => book.author.toLowerCase().includes(author.toLowerCase()));
                    const eraMatch = selectedEras.length === 0 || selectedEras.includes(book.era);
                    const lengthMatch = selectedLengths.length === 0 || selectedLengths.includes(book.length);
                    const ageMatch = selectedAges.length === 0 || selectedAges.includes(book.age);
                    
                    return authorMatch && eraMatch && lengthMatch && ageMatch;
                });
            }
            
            displayRecommendations(filteredBooks, true); // Pass true for isLoadMore
            showLoading(false);
            
            // Scroll to the newly loaded content
            const newCards = resultsDiv.querySelectorAll('.book-card');
            if (newCards.length > 0) {
                newCards[newCards.length - booksToShow.length].scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'start' 
                });
            }
        });
        resultsDiv.parentNode.appendChild(loadMoreBtn);
    }
}

// Word of the day functions
async function fetchWordOfTheDay() {
    const fallbackWords = [
        { word: "Serendipity", meaning: "Finding something good without looking for it" },
        { word: "Ephemeral", meaning: "Lasting for a very short time" },
        { word: "Ubiquitous", meaning: "Present everywhere" },
        { word: "Petrichor", meaning: "The pleasant smell of earth after rain" },
        { word: "Wanderlust", meaning: "A strong desire to travel and explore" },
        { word: "Mellifluous", meaning: "Sweet or musical; pleasant to hear" }
    ];

    try {
        document.getElementById('wordDisplay').textContent = "✨";
        document.getElementById('wordMeaning').textContent = "Consulting the lexicon...";
        const useFallback = Math.random() > 0.5;
        
        if (useFallback) {
            const fallback = fallbackWords[Math.floor(Math.random() * fallbackWords.length)];
            document.getElementById('wordDisplay').textContent = fallback.word;
            document.getElementById('wordMeaning').textContent = fallback.meaning;
            return;
        }
        const randomWordResponse = await fetch("https://random-word-api.herokuapp.com/word?number=1");
        const [randomWord] = await randomWordResponse.json();
        
        if (randomWord) {
            try {
                const definitionResponse = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${randomWord}`);
                const definitionData = await definitionResponse.json();
                
                if (definitionData && definitionData[0] && definitionData[0].meanings) {
                    document.getElementById('wordDisplay').textContent = randomWord;
                    document.getElementById('wordMeaning').textContent = 
                        definitionData[0].meanings[0].definitions[0].definition;
                    return;
                }
            } catch (defError) {
                console.log("Definition fetch failed, using fallback");
            }
        }
    
        const fallback = fallbackWords[Math.floor(Math.random() * fallbackWords.length)];
        document.getElementById('wordDisplay').textContent = fallback.word;
        document.getElementById('wordMeaning').textContent = fallback.meaning;
        
    } catch (error) {
        console.error("Error fetching word:", error);
        const fallback = fallbackWords[Math.floor(Math.random() * fallbackWords.length)];
        document.getElementById('wordDisplay').textContent = fallback.word;
        document.getElementById('wordMeaning').textContent = fallback.meaning;
    }
}

// dynamic CSS styles for error messages and better book display
function addDynamicStyles() {
    const additionalStyles = `
        .error-message {
            grid-column: 1 / -1;
            text-align: center;
            padding: 2rem;
            background-color: #ffebee;
            border: 1px solid #f44336;
            border-radius: 8px;
            color: #c62828;
            font-size: 1.1rem;
        }
        
        .no-results {
            grid-column: 1 / -1;
            text-align: center;
            padding: 2rem;
            background-color: #e3f2fd;
            border: 1px solid #2196f3;
            border-radius: 8px;
            color: #1565c0;
            font-size: 1.1rem;
        }
        
        .book-desc {
            font-size: 0.9rem;
            line-height: 1.4;
            color: #666;
            margin: 0.5rem 0;
        }
        
        .genre {
            background-color: #e8f5e8;
            color: #2e7d32;
        }
        
        .age-group {
            background-color: #fff3e0;
            color: #f57c00;
        }
        
        body.dark-mode .error-message {
            background-color: #3a1f1f;
            border-color: #f44336;
            color: #ff8a80;
        }
        
        body.dark-mode .no-results {
            background-color: #1a237e;
            border-color: #2196f3;
            color: #90caf9;
        }
        
        body.dark-mode .book-desc {
            color: #bbb;
        }
    `;

    const styleSheet = document.createElement('style');
    styleSheet.textContent = additionalStyles;
    document.head.appendChild(styleSheet);
}

// Utility function
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

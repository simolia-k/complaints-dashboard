
let allData = []; // Variable to store the raw data
let categoryChartInstance = null; // Variable to hold the Chart.js instance

// Function to fetch and parse the CSV data
async function loadData() {
    try {
        const response = await fetch('/content/민원_preprocessed.csv');
        const csvText = await response.text();

        // Simple manual CSV parsing (assuming no complex characters or delimiters)
        const lines = csvText.split('\n');
        const headers = lines[0].split(',');
        const data = [];

        for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim() === '') continue; // Skip empty lines
            const values = lines[i].split(',');
            const item = {};
            for (let j = 0; j < headers.length; j++) {
                item[headers[j].trim()] = values[j].trim();
            }
            data.push(item);
        }

        allData = data;
        console.log("Data loaded successfully:", allData.length, "rows");

        // Initial display of data with default filters
        displayData();

    } catch (error) {
        console.error("Error loading data:", error);
    }
}

// Function to filter data based on selected criteria
function filterData(data, age, gender) {
    return data.filter(item => {
        const ageValue = item['연령'] ? item['연령'].trim() : ''; // Handle potential undefined/null
        const genderValue = item['성별'] ? item['성별'].trim() : ''; // Handle potential undefined/null

        const ageMatch = (age === '전체' || ageValue === age);
        const genderMatch = (gender === '전체' || genderValue === gender);

        return ageMatch && genderMatch;
    });
}


// Function to get selected filter values and trigger display
function displayData() {
    const ageFilter = document.getElementById('age-filter').value;
    const genderFilter = document.getElementById('gender-filter').value;

    const filtered = filterData(allData, ageFilter, genderFilter);
    console.log("Filtered data:", filtered.length, "rows");

    renderDashboard(filtered);
}

// Function for rendering the dashboard (cards and chart)
function renderDashboard(data) {
    renderCards(data);
    renderChart(data);
}

// Function to render the category cards
function renderCards(data) {
    const cardContainer = document.getElementById('card-container');
    cardContainer.innerHTML = ''; // Clear previous cards

    // Aggregate data by category
    const categoryCounts = {};
    let maxCount = 0;
    data.forEach(item => {
        const category = item['분야'];
        const count = parseInt(item['건수'], 10) || 0;
        categoryCounts[category] = (categoryCounts[category] || 0) + count;
        if (categoryCounts[category] > maxCount) {
            maxCount = categoryCounts[category];
        }
    });

    // Sort categories by count descending
    const sortedCategories = Object.entries(categoryCounts).sort(([, a], [, b]) => b - a);

    sortedCategories.forEach(([category, count]) => {
        const card = document.createElement('div');
        card.classList.add('card');

        // Add visual emphasis based on count size
        if (maxCount > 0) {
            const percentage = (count / maxCount) * 100;
            if (percentage > 80) {
                card.style.backgroundColor = '#ffcccc'; // Reddish for high counts
            } else if (percentage > 50) {
                 card.style.backgroundColor = '#ffffcc'; // Yellowish for medium counts
            } else {
                 card.style.backgroundColor = '#ccffcc'; // Greenish for lower counts
            }
        }


        card.innerHTML = `<h3>${category}</h3><p>${count.toLocaleString()} 건</p>`;
        cardContainer.appendChild(card);
    });
}

// Function for rendering the chart
function renderChart(data) {
     // Aggregate data by category for chart display
     const categoryCounts = {};
     data.forEach(item => {
         const category = item['분야'];
         const count = parseInt(item['건수'], 10) || 0;
         categoryCounts[category] = (categoryCounts[category] || 0) + count;
     });

     const categories = Object.keys(categoryCounts);
     const counts = Object.values(categoryCounts);

     const ctx = document.getElementById('categoryChart').getContext('2d');

     // Destroy existing chart if it exists
     if (window.categoryChartInstance) {
         window.categoryChartInstance.destroy();
     }

     window.categoryChartInstance = new Chart(ctx, {
         type: 'bar', // Or 'pie', 'doughnut', etc.
         data: {
             labels: categories,
             datasets: [{
                 label: '민원 건수',
                 data: counts,
                 backgroundColor: 'rgba(75, 192, 192, 0.6)',
                 borderColor: 'rgba(75, 192, 192, 1)',
                 borderWidth: 1
             }]
         },
         options: {
             responsive: true,
             scales: {
                 y: {
                     beginAtZero: true
                 }
             },
             plugins: {
                 title: {
                     display: true,
                     text: '분야별 민원 건수'
                 },
                  legend: {
                    display: false // Hide legend for single dataset
                 }
             }
         }
     });
}


// Add event listeners to filters
document.getElementById('age-filter').addEventListener('change', displayData);
document.getElementById('gender-filter').addEventListener('change', displayData);

// Load data when the page loads
loadData();

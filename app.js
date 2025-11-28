// Configuration
const CONFIG = {
    API_BASE: 'https://cliq.zoho.com/api/v2',
    CLIENT_ID: '1000.2AXRFCVRFH5FZJRI6KAKZJDXQBPYHF',  // Replace with your Client ID
    CLIENT_SECRET: '82bed1e7a089468a700513b367d51e304479b0c595',  // Replace with your Client Secret
    REDIRECT_URI: 'https://rudradev-sys.github.io/team-expenditure-dashboard/callback.html',
    CARDS_DB: 'cardsdb',
    TRANSACTIONS_DB: 'transactionsdb'
};

// Get tokens from localStorage (set by callback.html)
function getAccessToken() {
    return localStorage.getItem('zoho_access_token');
}

function getRefreshToken() {s
    return localStorage.getItem('zoho_refresh_token');
}

function isTokenExpired() {
    const expiry = localStorage.getItem('zoho_token_expiry');
    return !expiry || Date.now() >= parseInt(expiry);
}

// Refresh access token when expired
async function refreshAccessToken() {
    const refreshToken = getRefreshToken();
    
    if (!refreshToken) {
        redirectToAuth();
        return null;
    }

    try {
        const response = await fetch('https://accounts.zoho.com/oauth/v2/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                grant_type: 'refresh_token',
                client_id: CONFIG.CLIENT_ID,
                client_secret: CONFIG.CLIENT_SECRET,
                refresh_token: refreshToken
            })
        });
        
        const data = await response.json();
        
        if (data.access_token) {
            localStorage.setItem('zoho_access_token', data.access_token);
            localStorage.setItem('zoho_token_expiry', Date.now() + (data.expires_in * 1000));
            return data.access_token;
        } else {
            console.error('Token refresh failed:', data);
            redirectToAuth();
            return null;
        }
    } catch (error) {
        console.error('Error refreshing token:', error);
        redirectToAuth();
        return null;
    }
}

// Redirect to authorization page
function redirectToAuth() {
    const authUrl = `https://accounts.zoho.com/oauth/v2/auth?scope=ZohoCliq.Databases.READ,ZohoCliq.Databases.CREATE,ZohoCliq.Databases.UPDATE,ZohoCliq.Databases.DELETE&client_id=${CONFIG.CLIENT_ID}&response_type=code&access_type=offline&redirect_uri=${encodeURIComponent(CONFIG.REDIRECT_URI)}`;
    window.location.href = authUrl;
}

// Check if user is authenticated
function checkAuth() {
    const token = getAccessToken();
    if (!token) {
        // Show authorization button
        showAuthPrompt();
        return false;
    }
    return true;
}

// Show authorization prompt
function showAuthPrompt() {
    document.body.innerHTML = `
        <div style="
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        ">
            <div style="
                background: white;
                padding: 40px;
                border-radius: 15px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                text-align: center;
                max-width: 500px;
            ">
                <h1 style="color: #667eea; margin-bottom: 20px;">💳 FinSync Dashboard</h1>
                <p style="color: #666; margin-bottom: 30px;">
                    You need to authorize this application to access your Zoho Cliq data.
                </p>
                <button onclick="redirectToAuth()" style="
                    background: #667eea;
                    color: white;
                    border: none;
                    padding: 15px 40px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 16px;
                    font-weight: 600;
                ">
                    🔐 Authorize Access
                </button>
            </div>
        </div>
    `;
}

// API Helper Functions with automatic token refresh
async function apiRequest(endpoint) {
    // Check if token is expired
    if (isTokenExpired()) {
        const newToken = await refreshAccessToken();
        if (!newToken) return null;
    }

    const token = getAccessToken();
    
    try {
        let response = await fetch(`${CONFIG.API_BASE}${endpoint}`, {
            headers: {
                'Authorization': `Zoho-oauthtoken ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        // If unauthorized, try refreshing token once
        if (response.status === 401) {
            const newToken = await refreshAccessToken();
            if (!newToken) return null;
            
            response = await fetch(`${CONFIG.API_BASE}${endpoint}`, {
                headers: {
                    'Authorization': `Zoho-oauthtoken ${newToken}`,
                    'Content-Type': 'application/json'
                }
            });
        }
        
        return await response.json();
    } catch (error) {
        console.error('API request failed:', error);
        return null;
    }
}

async function getCards() {
    return await apiRequest(`/databases/${CONFIG.CARDS_DB}/records`);
}

async function getTransactions() {
    return await apiRequest(`/databases/${CONFIG.TRANSACTIONS_DB}/records`);
}

// Data Processing Functions
function processData(cards, transactions) {
    const stats = {
        totalCards: cards.length,
        activeCards: cards.filter(c => c.status === 'true').length,
        totalTransactions: transactions.length,
        totalSpent: 0,
        merchantSpending: {},
        bankDistribution: {},
        userSpending: {},
        dailySpending: {},
        recentTransactions: []
    };

    // Build card lookup map
    const cardMap = {};
    cards.forEach(card => {
        cardMap[card.cardnum] = card;
        
        // Bank distribution
        const bank = card.bank || 'Unknown';
        stats.bankDistribution[bank] = (stats.bankDistribution[bank] || 0) + 1;
    });

    // Process transactions
    transactions.forEach(txn => {
        if (txn.status === 'true') {
            const amount = parseFloat(txn.amount) || 0;
            stats.totalSpent += amount;

            // Merchant spending
            const merchant = txn.merchant || 'Unknown';
            stats.merchantSpending[merchant] = (stats.merchantSpending[merchant] || 0) + amount;

            // Daily spending (last 7 days)
            const date = txn.datetime ? txn.datetime.split(' ')[0] : 'Unknown';
            stats.dailySpending[date] = (stats.dailySpending[date] || 0) + amount;

            // User spending
            const card = cardMap[txn.cardnum];
            if (card) {
                const userName = card.name || 'Unknown';
                if (!stats.userSpending[userName]) {
                    stats.userSpending[userName] = {
                        cards: new Set(),
                        transactions: 0,
                        totalSpent: 0
                    };
                }
                stats.userSpending[userName].cards.add(txn.cardnum);
                stats.userSpending[userName].transactions++;
                stats.userSpending[userName].totalSpent += amount;
            }
        }

        // Recent transactions (all, including pending)
        stats.recentTransactions.push({
            ...txn,
            card: cardMap[txn.cardnum]
        });
    });

    // Sort recent transactions by date
    stats.recentTransactions.sort((a, b) => 
        new Date(b.datetime) - new Date(a.datetime)
    ).slice(0, 10);

    stats.avgTransaction = stats.totalTransactions > 0 
        ? stats.totalSpent / stats.totalTransactions 
        : 0;

    return stats;
}

// UI Update Functions
function updateStats(stats) {
    document.getElementById('totalCards').textContent = stats.totalCards;
    document.getElementById('activeCards').textContent = `${stats.activeCards} Active`;
    document.getElementById('totalTransactions').textContent = stats.totalTransactions;
    document.getElementById('totalSpent').textContent = `₹${stats.totalSpent.toLocaleString('en-IN')}`;
    document.getElementById('avgTransaction').textContent = `₹${Math.round(stats.avgTransaction).toLocaleString('en-IN')}`;
    document.getElementById('lastUpdated').textContent = `Updated: ${new Date().toLocaleTimeString()}`;
}

function createMerchantChart(merchantSpending) {
    const ctx = document.getElementById('merchantChart').getContext('2d');
    const sortedMerchants = Object.entries(merchantSpending)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: sortedMerchants.map(m => m[0]),
            datasets: [{
                data: sortedMerchants.map(m => m[1]),
                backgroundColor: [
                    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'
                ]
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

function createTrendChart(dailySpending) {
    const ctx = document.getElementById('trendChart').getContext('2d');
    const sortedDates = Object.entries(dailySpending)
        .sort((a, b) => new Date(a[0]) - new Date(b[0]))
        .slice(-7);

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: sortedDates.map(d => d[0]),
            datasets: [{
                label: 'Daily Spending',
                data: sortedDates.map(d => d[1]),
                borderColor: '#36A2EB',
                backgroundColor: 'rgba(54, 162, 235, 0.2)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: value => `₹${value}`
                    }
                }
            }
        }
    });
}

function createBankChart(bankDistribution) {
    const ctx = document.getElementById('bankChart').getContext('2d');
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(bankDistribution),
            datasets: [{
                label: 'Number of Cards',
                data: Object.values(bankDistribution),
                backgroundColor: '#667eea'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

function updateUserSpendingTable(userSpending) {
    const tbody = document.querySelector('#userSpendingTable tbody');
    tbody.innerHTML = '';

    Object.entries(userSpending)
        .sort((a, b) => b[1].totalSpent - a[1].totalSpent)
        .slice(0, 5)
        .forEach(([user, data]) => {
            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${user}</td>
                <td>${data.cards.size}</td>
                <td>${data.transactions}</td>
                <td>₹${data.totalSpent.toLocaleString('en-IN')}</td>
            `;
        });
}

function updateTransactionsTable(transactions) {
    const tbody = document.querySelector('#transactionsTable tbody');
    tbody.innerHTML = '';

    transactions.forEach(txn => {
        const row = tbody.insertRow();
        const statusBadge = txn.status === 'true' 
            ? '<span class="badge bg-success">Paid</span>' 
            : '<span class="badge bg-warning">Pending</span>';
        
        const cardLast4 = txn.cardnum ? `****${txn.cardnum.slice(-4)}` : 'N/A';
        
        row.innerHTML = `
            <td>${txn.datetime || 'N/A'}</td>
            <td>${txn.card?.name || 'Unknown'}</td>
            <td>${txn.merchant || 'N/A'}</td>
            <td>${cardLast4}</td>
            <td>₹${parseFloat(txn.amount || 0).toLocaleString('en-IN')}</td>
            <td>${statusBadge}</td>
        `;
    });
}

// Main Function
async function initDashboard() {
    // Check authentication first
    if (!checkAuth()) {
        return;
    }

    try {
        // Fetch data
        const [cardsResponse, transactionsResponse] = await Promise.all([
            getCards(),
            getTransactions()
        ]);

        if (!cardsResponse || !transactionsResponse) {
            throw new Error('Failed to fetch data');
        }

        const cards = cardsResponse.data || [];
        const transactions = transactionsResponse.data || [];

        // Process data
        const stats = processData(cards, transactions);

        // Update UI
        updateStats(stats);
        createMerchantChart(stats.merchantSpending);
        createTrendChart(stats.dailySpending);
        createBankChart(stats.bankDistribution);
        updateUserSpendingTable(stats.userSpending);
        updateTransactionsTable(stats.recentTransactions);

    } catch (error) {
        console.error('Error loading dashboard:', error);
        alert('Failed to load dashboard data. Please check your configuration and try again.');
    }
}

// Initialize dashboard on page load
window.addEventListener('load', initDashboard);

// Refresh every 30 seconds
setInterval(initDashboard, 30000);

// Expose redirectToAuth to global scope for auth prompt button
window.redirectToAuth = redirectToAuth;

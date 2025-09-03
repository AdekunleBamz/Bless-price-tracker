// Global variables
let cryptoData = [];
let alerts = JSON.parse(localStorage.getItem('priceAlerts')) || [];
let portfolio = JSON.parse(localStorage.getItem('portfolio')) || [];
let filteredData = [];

// CoinGecko API endpoints
const COINGECKO_API = 'https://api.coingecko.com/api/v3';

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

async function initializeApp() {
    showLoading(true);
    
    try {
        // Load initial data
        await loadCryptoData();
        populateCoinSelects();
        renderPriceGrid();
        renderAlerts();
        renderPortfolio();
        
        // Set up event listeners
        setupEventListeners();
        
        // Start auto-refresh
        setInterval(refreshPrices, 30000); // Refresh every 30 seconds
        
        // Check alerts periodically
        setInterval(checkAlerts, 10000); // Check every 10 seconds
        
    } catch (error) {
        console.error('Error initializing app:', error);
        showNotification('Error loading data. Please try again.', 'error');
    } finally {
        showLoading(false);
    }
}

async function loadCryptoData() {
    try {
        const response = await fetch(`${COINGECKO_API}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=false&price_change_percentage=24h`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch crypto data');
        }
        
        cryptoData = await response.json();
        filteredData = [...cryptoData];
        
    } catch (error) {
        console.error('Error loading crypto data:', error);
        throw error;
    }
}

function populateCoinSelects() {
    const alertCoinSelect = document.getElementById('alertCoin');
    const portfolioCoinSelect = document.getElementById('portfolioCoin');
    
    // Clear existing options
    alertCoinSelect.innerHTML = '<option value="">Select a coin...</option>';
    portfolioCoinSelect.innerHTML = '<option value="">Select a coin...</option>';
    
    // Add coin options
    cryptoData.forEach(coin => {
        const option = document.createElement('option');
        option.value = coin.id;
        option.textContent = `${coin.name} (${coin.symbol.toUpperCase()})`;
        
        alertCoinSelect.appendChild(option.cloneNode(true));
        portfolioCoinSelect.appendChild(option);
    });
}

function renderPriceGrid() {
    const priceGrid = document.getElementById('priceGrid');
    
    if (filteredData.length === 0) {
        priceGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search"></i>
                <h3>No cryptocurrencies found</h3>
                <p>Try adjusting your search criteria</p>
            </div>
        `;
        return;
    }
    
    priceGrid.innerHTML = filteredData.map(coin => `
        <div class="price-card">
            <div class="price-card-header">
                <div class="coin-info">
                    <div class="coin-icon">
                        <img src="${coin.image}" alt="${coin.name}" width="40" height="40" style="border-radius: 50%;">
                    </div>
                    <div class="coin-details">
                        <h3>${coin.name}</h3>
                        <p>${coin.symbol.toUpperCase()}</p>
                    </div>
                </div>
                <div class="price-info">
                    <div class="current-price">$${formatPrice(coin.current_price)}</div>
                    <div class="price-change ${coin.price_change_percentage_24h >= 0 ? 'positive' : 'negative'}">
                        ${coin.price_change_percentage_24h >= 0 ? '+' : ''}${coin.price_change_percentage_24h.toFixed(2)}%
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

function renderAlerts() {
    const alertsList = document.getElementById('alertsList');
    
    if (alerts.length === 0) {
        alertsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-bell"></i>
                <h3>No price alerts set</h3>
                <p>Add your first price alert to get notified</p>
            </div>
        `;
        return;
    }
    
    alertsList.innerHTML = alerts.map((alert, index) => {
        const coin = cryptoData.find(c => c.id === alert.coinId);
        const currentPrice = coin ? coin.current_price : 0;
        const isTriggered = (alert.type === 'above' && currentPrice >= alert.price) ||
                          (alert.type === 'below' && currentPrice <= alert.price);
        
        return `
            <div class="alert-item ${isTriggered ? 'triggered' : ''}">
                <div class="alert-info">
                    <div class="alert-coin">${coin ? coin.name : alert.coinId}</div>
                    <div class="alert-details">
                        Alert when price ${alert.type} $${formatPrice(alert.price)}
                        ${isTriggered ? ' - TRIGGERED!' : ''}
                    </div>
                </div>
                <div class="alert-actions">
                    <button class="delete-btn" onclick="deleteAlert(${index})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function renderPortfolio() {
    const portfolioList = document.getElementById('portfolioList');
    updatePortfolioSummary();
    
    if (portfolio.length === 0) {
        portfolioList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-wallet"></i>
                <h3>No portfolio assets</h3>
                <p>Add your first asset to start tracking</p>
            </div>
        `;
        return;
    }
    
    portfolioList.innerHTML = portfolio.map((asset, index) => {
        const coin = cryptoData.find(c => c.id === asset.coinId);
        if (!coin) return '';
        
        const currentValue = asset.amount * coin.current_price;
        const purchaseValue = asset.amount * asset.purchasePrice;
        const profit = currentValue - purchaseValue;
        const profitPercentage = ((currentValue / purchaseValue - 1) * 100);
        
        return `
            <div class="portfolio-item">
                <div class="portfolio-info">
                    <div class="portfolio-coin">${coin.name} (${coin.symbol.toUpperCase()})</div>
                    <div class="portfolio-details">
                        ${asset.amount} ${coin.symbol.toUpperCase()} • Bought at $${formatPrice(asset.purchasePrice)}
                    </div>
                </div>
                <div class="portfolio-value">
                    <div class="portfolio-total">$${formatPrice(currentValue)}</div>
                    <div class="portfolio-profit ${profit >= 0 ? 'positive' : 'negative'}">
                        ${profit >= 0 ? '+' : ''}$${formatPrice(profit)} (${profitPercentage >= 0 ? '+' : ''}${profitPercentage.toFixed(2)}%)
                    </div>
                </div>
                <div class="alert-actions">
                    <button class="delete-btn" onclick="deletePortfolioAsset(${index})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function updatePortfolioSummary() {
    const totalValueElement = document.getElementById('totalValue');
    const totalChangeElement = document.getElementById('totalChange');
    
    let totalValue = 0;
    let totalPurchaseValue = 0;
    
    portfolio.forEach(asset => {
        const coin = cryptoData.find(c => c.id === asset.coinId);
        if (coin) {
            totalValue += asset.amount * coin.current_price;
            totalPurchaseValue += asset.amount * asset.purchasePrice;
        }
    });
    
    const totalProfit = totalValue - totalPurchaseValue;
    const totalProfitPercentage = totalPurchaseValue > 0 ? ((totalValue / totalPurchaseValue - 1) * 100) : 0;
    
    totalValueElement.textContent = `$${formatPrice(totalValue)}`;
    totalChangeElement.textContent = `${totalProfit >= 0 ? '+' : ''}${totalProfitPercentage.toFixed(2)}%`;
    totalChangeElement.className = `total-change ${totalProfit >= 0 ? 'positive' : 'negative'}`;
}

// Modal functions
function showAddAlertModal() {
    document.getElementById('addAlertModal').style.display = 'block';
}

function showAddPortfolioModal() {
    document.getElementById('addPortfolioModal').style.display = 'block';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function addAlert() {
    const coinId = document.getElementById('alertCoin').value;
    const price = parseFloat(document.getElementById('alertPrice').value);
    const type = document.getElementById('alertType').value;
    
    if (!coinId || !price || price <= 0) {
        showNotification('Please fill in all fields with valid values.', 'error');
        return;
    }
    
    const newAlert = {
        coinId,
        price,
        type,
        createdAt: new Date().toISOString()
    };
    
    alerts.push(newAlert);
    localStorage.setItem('priceAlerts', JSON.stringify(alerts));
    
    renderAlerts();
    closeModal('addAlertModal');
    
    // Clear form
    document.getElementById('alertCoin').value = '';
    document.getElementById('alertPrice').value = '';
    document.getElementById('alertType').value = 'above';
    
    showNotification('Price alert added successfully!', 'success');
}

function addPortfolioAsset() {
    const coinId = document.getElementById('portfolioCoin').value;
    const amount = parseFloat(document.getElementById('portfolioAmount').value);
    const purchasePrice = parseFloat(document.getElementById('portfolioPrice').value);
    
    if (!coinId || !amount || !purchasePrice || amount <= 0 || purchasePrice <= 0) {
        showNotification('Please fill in all fields with valid values.', 'error');
        return;
    }
    
    const newAsset = {
        coinId,
        amount,
        purchasePrice,
        addedAt: new Date().toISOString()
    };
    
    portfolio.push(newAsset);
    localStorage.setItem('portfolio', JSON.stringify(portfolio));
    
    renderPortfolio();
    closeModal('addPortfolioModal');
    
    // Clear form
    document.getElementById('portfolioCoin').value = '';
    document.getElementById('portfolioAmount').value = '';
    document.getElementById('portfolioPrice').value = '';
    
    showNotification('Portfolio asset added successfully!', 'success');
}

function deleteAlert(index) {
    if (confirm('Are you sure you want to delete this alert?')) {
        alerts.splice(index, 1);
        localStorage.setItem('priceAlerts', JSON.stringify(alerts));
        renderAlerts();
        showNotification('Alert deleted successfully!', 'success');
    }
}

function deletePortfolioAsset(index) {
    if (confirm('Are you sure you want to delete this portfolio asset?')) {
        portfolio.splice(index, 1);
        localStorage.setItem('portfolio', JSON.stringify(portfolio));
        renderPortfolio();
        showNotification('Portfolio asset deleted successfully!', 'success');
    }
}

// Utility functions
function formatPrice(price) {
    if (price >= 1) {
        return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } else {
        return price.toFixed(6);
    }
}

function showLoading(show) {
    const spinner = document.getElementById('loadingSpinner');
    spinner.style.display = show ? 'flex' : 'none';
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 10px;
        color: white;
        font-weight: 600;
        z-index: 3000;
        animation: slideIn 0.3s ease;
        max-width: 300px;
    `;
    
    // Set background color based on type
    const colors = {
        success: 'linear-gradient(135deg, #4CAF50, #45a049)',
        error: 'linear-gradient(135deg, #f44336, #d32f2f)',
        info: 'linear-gradient(135deg, #2196F3, #1976D2)',
        warning: 'linear-gradient(135deg, #FF9800, #F57C00)'
    };
    
    notification.style.background = colors[type] || colors.info;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Remove notification after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Add CSS animations for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .alert-item.triggered {
        background: linear-gradient(135deg, #ff6b6b, #ee5a52) !important;
        color: white;
    }
    
    .alert-item.triggered .alert-coin,
    .alert-item.triggered .alert-details {
        color: white;
    }
`;
document.head.appendChild(style);

// Event listeners
function setupEventListeners() {
    // Search functionality
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        filteredData = cryptoData.filter(coin => 
            coin.name.toLowerCase().includes(searchTerm) ||
            coin.symbol.toLowerCase().includes(searchTerm)
        );
        renderPriceGrid();
    });
    
    // Close modals when clicking outside
    window.addEventListener('click', function(event) {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
    });
    
    // Close modals with Escape key
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            const modals = document.querySelectorAll('.modal');
            modals.forEach(modal => {
                if (modal.style.display === 'block') {
                    modal.style.display = 'none';
                }
            });
        }
    });
}

// Refresh prices
async function refreshPrices() {
    try {
        await loadCryptoData();
        renderPriceGrid();
        renderAlerts();
        renderPortfolio();
        showNotification('Prices updated successfully!', 'success');
    } catch (error) {
        console.error('Error refreshing prices:', error);
        showNotification('Error updating prices. Please try again.', 'error');
    }
}

// Check alerts
function checkAlerts() {
    alerts.forEach((alert, index) => {
        const coin = cryptoData.find(c => c.id === alert.coinId);
        if (!coin) return;
        
        const currentPrice = coin.current_price;
        const isTriggered = (alert.type === 'above' && currentPrice >= alert.price) ||
                          (alert.type === 'below' && currentPrice <= alert.price);
        
        if (isTriggered) {
            // Show notification for triggered alert
            const coinName = coin.name;
            const message = `${coinName} is now ${alert.type} $${formatPrice(alert.price)}! Current price: $${formatPrice(currentPrice)}`;
            showNotification(message, 'warning');
            
            // Remove triggered alert
            alerts.splice(index, 1);
            localStorage.setItem('priceAlerts', JSON.stringify(alerts));
            renderAlerts();
        }
    });
}

// Smooth scroll to section
function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.scrollIntoView({ 
            behavior: 'smooth',
            block: 'start'
        });
        
        // Add a subtle highlight effect
        section.style.transition = 'all 0.3s ease';
        section.style.transform = 'scale(1.02)';
        section.style.boxShadow = '0 12px 40px rgba(102, 126, 234, 0.2)';
        
        setTimeout(() => {
            section.style.transform = 'scale(1)';
            section.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.1)';
        }, 300);
    }
}

// Elemen DOM
const amountInput = document.getElementById('amount');
const fromSelect = document.getElementById('from');
const toSelect = document.getElementById('to');
const swapBtn = document.getElementById('swap');
const convertBtn = document.getElementById('convert');
const resultDiv = document.getElementById('result');
const conversionRate = document.getElementById('conversion-rate');
const conversionAmount = document.getElementById('conversion-amount');
const lastUpdated = document.getElementById('last-updated');
const historyList = document.getElementById('history-list');
const clearHistoryBtn = document.getElementById('clear-history');
const apiStatus = document.getElementById('api-status');

// Variabel global
let exchangeRates = {};
let baseCurrency = 'USD';
let lastUpdateTime = null;

// Inisialisasi aplikasi
document.addEventListener('DOMContentLoaded', () => {
    loadExchangeRates();
    loadHistory();
    
    // Event listeners
    convertBtn.addEventListener('click', convertCurrency);
    swapBtn.addEventListener('click', swapCurrencies);
    clearHistoryBtn.addEventListener('click', clearHistory);
    
    // Konversi otomatis saat input berubah
    amountInput.addEventListener('input', convertCurrency);
    fromSelect.addEventListener('change', convertCurrency);
    toSelect.addEventListener('change', convertCurrency);
});

// Memuat data kurs dari API
async function loadExchangeRates() {
    try {
        // Menggunakan ExchangeRate-API (gratis)
        const response = await fetch(`https://api.exchangerate-api.com/v4/latest/${baseCurrency}`);
        
        if (!response.ok) {
            throw new Error('Gagal mengambil data kurs');
        }
        
        const data = await response.json();
        exchangeRates = data.rates;
        lastUpdateTime = new Date(data.time_last_updated * 1000);
        
        // Update status API
        apiStatus.innerHTML = '<i class="fas fa-circle" style="color: #2ecc71;"></i> API Online';
        
        // Tampilkan waktu pembaruan terakhir
        lastUpdated.textContent = `Terakhir diperbarui: ${formatDate(lastUpdateTime)}`;
        
        // Lakukan konversi pertama kali
        convertCurrency();
        
    } catch (error) {
        console.error('Error:', error);
        apiStatus.innerHTML = '<i class="fas fa-circle" style="color: #e74c3c;"></i> API Offline';
        resultDiv.innerHTML = `<div class="error">
            <i class="fas fa-exclamation-triangle"></i> 
            Gagal mengambil data kurs terkini. Silakan coba lagi nanti.
        </div>`;
        
        // Gunakan kurs fallback jika API gagal
        setFallbackRates();
    }
}

// Kurs fallback jika API tidak tersedia
function setFallbackRates() {
    exchangeRates = {
        USD: 1,
        IDR: 14500,
        EUR: 0.85,
        GBP: 0.73,
        JPY: 110,
        SGD: 1.35
    };
    lastUpdateTime = new Date();
    lastUpdated.textContent = `Terakhir diperbarui: ${formatDate(lastUpdateTime)} (Data offline)`;
    convertCurrency();
}

// Fungsi konversi mata uang
function convertCurrency() {
    const amount = parseFloat(amountInput.value);
    const fromCurrency = fromSelect.value;
    const toCurrency = toSelect.value;
    
    if (isNaN(amount) || amount <= 0) {
        resultDiv.innerHTML = `<div class="error">
            <i class="fas fa-exclamation-circle"></i> 
            Masukkan jumlah uang yang valid.
        </div>`;
        return;
    }
    
    // Jika mata uang asal sama dengan mata uang tujuan
    if (fromCurrency === toCurrency) {
        conversionRate.textContent = `1 ${fromCurrency} = 1 ${toCurrency}`;
        conversionAmount.textContent = `${formatCurrency(amount, toCurrency)}`;
        return;
    }
    
    // Konversi melalui USD sebagai mata uang dasar
    let convertedAmount;
    
    if (fromCurrency === baseCurrency) {
        // Konversi langsung dari mata uang dasar
        convertedAmount = amount * exchangeRates[toCurrency];
    } else if (toCurrency === baseCurrency) {
        // Konversi ke mata uang dasar
        convertedAmount = amount / exchangeRates[fromCurrency];
    } else {
        // Konversi melalui mata uang dasar
        const amountInBase = amount / exchangeRates[fromCurrency];
        convertedAmount = amountInBase * exchangeRates[toCurrency];
    }
    
    // Tampilkan hasil
    const rate = exchangeRates[toCurrency] / exchangeRates[fromCurrency];
    conversionRate.textContent = `1 ${fromCurrency} = ${formatCurrency(rate, toCurrency, 6)}`;
    conversionAmount.textContent = `${formatCurrency(convertedAmount, toCurrency)}`;
    
    // Simpan ke riwayat
    saveToHistory(amount, fromCurrency, toCurrency, convertedAmount, rate);
}

// Menukar mata uang
function swapCurrencies() {
    const fromValue = fromSelect.value;
    const toValue = toSelect.value;
    
    fromSelect.value = toValue;
    toSelect.value = fromValue;
    
    convertCurrency();
}

// Format mata uang
function formatCurrency(amount, currency, decimals = 2) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    }).format(amount);
}

// Format tanggal
function formatDate(date) {
    return new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
}

// Simpan ke riwayat
function saveToHistory(amount, from, to, converted, rate) {
    const history = getHistory();
    const conversion = {
        id: Date.now(),
        amount,
        from,
        to,
        converted,
        rate,
        date: new Date()
    };
    
    history.unshift(conversion);
    
    // Simpan maksimal 50 riwayat
    if (history.length > 50) {
        history.pop();
    }
    
    localStorage.setItem('currencyConversionHistory', JSON.stringify(history));
    loadHistory();
}

// Muat riwayat dari localStorage
function loadHistory() {
    const history = getHistory();
    historyList.innerHTML = '';
    
    if (history.length === 0) {
        historyList.innerHTML = '<div class="loading">Belum ada riwayat konversi</div>';
        return;
    }
    
    history.forEach(item => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        historyItem.innerHTML = `
            <div class="history-details">
                <div class="history-amount">${formatCurrency(item.converted, item.to)}</div>
                <div class="history-currencies">${formatCurrency(item.amount, item.from)} → ${item.to}</div>
                <div class="history-date">${formatDate(new Date(item.date))}</div>
            </div>
            <button class="delete-btn" data-id="${item.id}">
                <i class="fas fa-times"></i>
            </button>
        `;
        historyList.appendChild(historyItem);
    });
    
    // Tambahkan event listener untuk tombol hapus
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = parseInt(this.getAttribute('data-id'));
            deleteHistoryItem(id);
        });
    });
}

// Dapatkan riwayat dari localStorage
function getHistory() {
    const history = localStorage.getItem('currencyConversionHistory');
    return history ? JSON.parse(history) : [];
}

// Hapus item riwayat
function deleteHistoryItem(id) {
    const history = getHistory();
    const filteredHistory = history.filter(item => item.id !== id);
    localStorage.setItem('currencyConversionHistory', JSON.stringify(filteredHistory));
    loadHistory();
}

// Hapus semua riwayat
function clearHistory() {
    if (confirm('Apakah Anda yakin ingin menghapus semua riwayat konversi?')) {
        localStorage.removeItem('currencyConversionHistory');
        loadHistory();
    }
}
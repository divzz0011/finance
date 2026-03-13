let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
let savingGoals = JSON.parse(localStorage.getItem('savingGoals')) || [];
let currentFilter = 'all';
let trendChart;

const cats = {
    income: ['Gaji', 'Bonus', 'Investasi', 'Lainnya'],
    expense: ['Makanan', 'Transportasi', 'Belanja', 'Tagihan', 'Hiburan']
};

function init() {
    initSecurity();
    updateCategoryOptions();
    document.getElementById('current-date').innerText = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    if(localStorage.getItem('darkMode') === 'true') toggleDarkMode();
    updateUI();
}

// SECURITY
function initSecurity() {
    const modal = document.getElementById('pin-modal');
    if (!localStorage.getItem('app_pin')) document.getElementById('pin-title').innerText = "Atur PIN Baru";
    modal.classList.remove('hidden');
}

function checkPIN() {
    const input = document.getElementById('pin-input').value;
    const saved = localStorage.getItem('app_pin');
    if (!saved) {
        if(input.length === 4) { localStorage.setItem('app_pin', input); document.getElementById('pin-modal').classList.add('hidden'); }
    } else if (input === saved) {
        document.getElementById('pin-modal').classList.add('hidden');
    } else { alert("PIN Salah!"); document.getElementById('pin-input').value = ''; }
}

// TARGET LOGIC
function toggleTargetSelection() {
    const type = document.getElementById('type').value;
    const container = document.getElementById('target-selection-container');
    const select = document.getElementById('target-allocation');
    updateCategoryOptions();
    
    if (type === 'income') {
        container.classList.remove('hidden');
        select.innerHTML = '<option value="none">Hanya Saldo Umum</option>';
        savingGoals.forEach((g, i) => select.innerHTML += `<option value="${i}">${g.name}</option>`);
    } else {
        container.classList.add('hidden');
    }
}

function addNewGoal() {
    const name = prompt("Nama Target (contoh: Liburan):");
    const amount = parseInt(prompt("Nominal Target:"));
    if (name && amount) {
        savingGoals.push({ name, target: amount, current: 0 });
        saveGoals();
        updateUI();
    }
}

function deleteGoal(i) {
    if (confirm("Hapus target? Saldo akan tetap di saldo utama.")) {
        savingGoals.splice(i, 1);
        saveGoals();
        updateUI();
    }
}

function saveGoals() { localStorage.setItem('savingGoals', JSON.stringify(savingGoals)); }

// FORM SUBMIT
document.getElementById('finance-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const amount = parseInt(document.getElementById('amount').value);
    const type = document.getElementById('type').value;
    const targetIdx = document.getElementById('target-allocation').value;

    if (type === 'income' && targetIdx !== 'none') {
        savingGoals[targetIdx].current += amount;
        saveGoals();
    }

    transactions.push({
        desc: document.getElementById('desc').value,
        amount: amount,
        type: type,
        category: document.getElementById('category').value,
        date: new Date().toLocaleDateString('id-ID', {day:'2-digit', month:'short'}),
        allocatedTo: (type === 'income' && targetIdx !== 'none') ? savingGoals[targetIdx].name : null
    });

    localStorage.setItem('transactions', JSON.stringify(transactions));
    updateUI();
    e.target.reset();
    document.getElementById('target-selection-container').classList.add('hidden');
});

// UI RENDERING
function updateUI() {
    const list = document.getElementById('transaction-list');
    const search = document.getElementById('search-input').value.toLowerCase();
    const goalsList = document.getElementById('goals-container');
    list.innerHTML = '';
    goalsList.innerHTML = '';
    
    let inc = 0, exp = 0;

    // Render Goals
    savingGoals.forEach((g, i) => {
        const p = Math.min((g.current/g.target)*100, 100).toFixed(1);
        goalsList.innerHTML += `
            <div class="border-b pb-2">
                <div class="flex justify-between text-xs mb-1 font-bold"><span>${g.name}</span><button onclick="deleteGoal(${i})" class="text-red-400">✕</button></div>
                <div class="w-full bg-slate-100 h-1.5 rounded-full"><div class="bg-indigo-500 h-1.5 rounded-full" style="width: ${p}%"></div></div>
                <div class="flex justify-between text-[9px] text-slate-400 mt-1"><span>${p}%</span><span>${g.current.toLocaleString()} / ${g.target.toLocaleString()}</span></div>
            </div>`;
    });

    // Render Transactions
    transactions.forEach(t => { if(t.type === 'income') inc += t.amount; else exp += t.amount; });

    const filtered = transactions.filter(t => {
        const mF = currentFilter === 'all' || t.type === currentFilter;
        const mS = t.desc.toLowerCase().includes(search) || t.category.toLowerCase().includes(search);
        return mF && mS;
    });

    filtered.slice().reverse().forEach((t, i) => {
        const li = document.createElement('li');
        li.className = "p-4 flex justify-between items-center";
        li.innerHTML = `
            <div>
                <p class="font-bold text-sm text-slate-700">${t.desc} ${t.allocatedTo ? `<span class="text-indigo-500 text-[10px]">[🎯 ${t.allocatedTo}]</span>` : ''}</p>
                <p class="text-[10px] text-slate-400">${t.category} • ${t.date}</p>
            </div>
            <div class="flex items-center gap-4">
                <span class="font-bold text-sm ${t.type === 'income' ? 'text-green-500' : 'text-red-500'}">${t.type === 'income' ? '+' : '-'}${t.amount.toLocaleString()}</span>
                <button onclick="deleteTx(${transactions.indexOf(t)})" class="text-slate-300 hover:text-red-500">✕</button>
            </div>`;
        list.appendChild(li);
    });

    document.getElementById('total-balance').innerText = "Rp " + (inc-exp).toLocaleString();
    document.getElementById('total-income').innerText = "Rp " + inc.toLocaleString();
    document.getElementById('total-expense').innerText = "Rp " + exp.toLocaleString();
    updateTrendChart();
}

// OTHERS
function updateCategoryOptions() {
    const type = document.getElementById('type').value;
    document.getElementById('category').innerHTML = cats[type].map(c => `<option value="${c}">${c}</option>`).join('');
}

function updateTrendChart() {
    const ctx = document.getElementById('trendChart').getContext('2d');
    const labels = [...Array(7)].map((_,i) => {
        const d = new Date(); d.setDate(d.getDate()-i); 
        return d.toLocaleDateString('id-ID', {day:'2-digit', month:'short'});
    }).reverse();
    const data = labels.map(l => transactions.filter(t => t.date.includes(l) && t.type === 'expense').reduce((s,t) => s+t.amount, 0));
    if(trendChart) trendChart.destroy();
    trendChart = new Chart(ctx, {
        type: 'line',
        data: { labels, datasets: [{ data, borderColor: '#4f46e5', tension: 0.4, fill: true, backgroundColor: 'rgba(79, 70, 229, 0.05)' }]},
        options: { plugins: { legend: { display: false }}, scales: { y: { display: false }, x: { grid: { display: false }}}}
    });
}

function deleteTx(i) {
    if(confirm("Hapus transaksi?")) {
        const t = transactions[i];
        if (t.allocatedTo) {
            const gIdx = savingGoals.findIndex(g => g.name === t.allocatedTo);
            if (gIdx !== -1) savingGoals[gIdx].current -= t.amount;
        }
        transactions.splice(i, 1);
        localStorage.setItem('transactions', JSON.stringify(transactions));
        saveGoals();
        updateUI();
    }
}

function setFilter(f) {
    currentFilter = f;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.toggle('active', b.innerText.toLowerCase().includes(f === 'all' ? 'semua' : f === 'income' ? 'masuk' : 'keluar')));
    updateUI();
}

function toggleDarkMode() {
    const isDark = document.body.classList.toggle('dark');
    localStorage.setItem('darkMode', isDark);
}

function toggleDevModal() { document.getElementById('dev-modal').classList.toggle('hidden'); }

function exportToCSV() {
    let csv = "Tanggal,Keterangan,Kategori,Tipe,Nominal\n" + transactions.map(t => `${t.date},${t.desc},${t.category},${t.type},${t.amount}`).join("\n");
    const a = document.createElement('a'); a.href = 'data:text/csv;charset=utf-8,' + encodeURI(csv); a.download = 'finance_report.csv'; a.click();
}

function backupData() {
    const a = document.createElement('a'); a.href = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(transactions)); a.download = 'backup.json'; a.click();
}

function clearAll() { if(confirm("Hapus semua data permanen?")) { localStorage.clear(); location.reload(); } }

// Prevent dots and commas in amount
document.getElementById('amount').addEventListener('keydown', (e) => { if(e.key === '.' || e.key === ',') e.preventDefault(); });

init();
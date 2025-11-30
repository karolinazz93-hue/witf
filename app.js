// Import Firebase
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getDatabase, ref, set, onValue, remove, push } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

// Your Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCQz3cfhvrj1k6u-jWX8pvLBlBh-PvfUgo",
    authDomain: "witf-app.firebaseapp.com",
    databaseURL: "https://witf-app-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "witf-app",
    storageBucket: "witf-app.firebasestorage.app",
    messagingSenderId: "576239871878",
    appId: "1:576239871878:web:9f60b6ed0b7f511f0b6e07",
    measurementId: "G-SJTWDGYTSL"
};

// Initialize Firebase
let app, database, itemsRef;
try {
    app = initializeApp(firebaseConfig);
    database = getDatabase(app);
    itemsRef = ref(database, 'items');
    console.log('Firebase initialized successfully');
} catch (error) {
    console.error('Firebase initialization error:', error);
    alert('Firebase connection failed. Check console for details.');
}

// State
let items = [];
let editingItemId = null;
let selectedLocation = 'Fridge';

// DOM Elements
const modal = document.getElementById('modal');
const addBtn = document.getElementById('add-btn');
const cancelBtn = document.getElementById('cancel-btn');
const saveBtn = document.getElementById('save-btn');
const itemNameInput = document.getElementById('item-name');
const itemDateInput = document.getElementById('item-date');
const modalTitle = document.getElementById('modal-title');
const locationBtns = document.querySelectorAll('.location-btn');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded');
    console.log('Add button:', addBtn);
    setupRealtimeListener();
    setTodayDate();
    
    addBtn.addEventListener('click', () => openModal());
    cancelBtn.addEventListener('click', closeModal);
    saveBtn.addEventListener('click', saveItem);
    
    locationBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            locationBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedLocation = btn.dataset.location;
        });
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
});

// Setup realtime listener
function setupRealtimeListener() {
    onValue(itemsRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            items = Object.keys(data).map(key => ({
                id: key,
                ...data[key]
            }));
        } else {
            items = [];
        }
        renderItems();
    });
}

// Calculate days until expiry
function getDaysUntilExpiry(dateStr) {
    const expiry = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    expiry.setHours(0, 0, 0, 0);
    return Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
}

// Get color class based on days
function getColorClass(dateStr) {
    const days = getDaysUntilExpiry(dateStr);
    if (days < 0) return 'gray';
    if (days <= 2) return 'red';
    if (days <= 6) return 'yellow';
    return 'green';
}

// Get status text
function getStatusText(dateStr) {
    const days = getDaysUntilExpiry(dateStr);
    if (days < 0) return `Expired ${Math.abs(days)}d ago`;
    if (days === 0) return 'Expires today!';
    if (days === 1) return 'Expires tomorrow!';
    return `${days}d left`;
}

// Render all items
function renderItems() {
    const locations = ['Fridge', 'Freezer', 'Pantry'];
    
    locations.forEach(location => {
        const container = document.getElementById(`${location.toLowerCase()}-items`);
        const locationItems = items
            .filter(item => item.location === location)
            .sort((a, b) => getDaysUntilExpiry(a.date) - getDaysUntilExpiry(b.date));
        
        if (locationItems.length === 0) {
            container.innerHTML = '<div class="empty-text">No items</div>';
        } else {
            container.innerHTML = locationItems.map(item => `
                <div class="item-card ${getColorClass(item.date)}" onclick="openModal('${item.id}')">
                    <div class="item-content">
                        <div class="item-name">${escapeHtml(item.name)}</div>
                        <div class="item-status">${getStatusText(item.date)}</div>
                    </div>
                    <div class="item-date">${item.date}</div>
                    <button class="delete-btn" onclick="event.stopPropagation(); deleteItem('${item.id}')">Delete</button>
                </div>
            `).join('');
        }
    });
}

// Open modal (make it global for onclick)
window.openModal = function(itemId = null) {
    if (itemId) {
        const item = items.find(i => i.id === itemId);
        if (item) {
            editingItemId = itemId;
            itemNameInput.value = item.name;
            itemDateInput.value = item.date;
            selectedLocation = item.location;
            modalTitle.textContent = 'Edit Item';
            
            locationBtns.forEach(btn => {
                btn.classList.toggle('active', btn.dataset.location === item.location);
            });
        }
    } else {
        editingItemId = null;
        itemNameInput.value = '';
        setTodayDate();
        selectedLocation = 'Fridge';
        modalTitle.textContent = 'Add Item';
        
        locationBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.location === 'Fridge');
        });
    }
    
    modal.classList.add('active');
    setTimeout(() => itemNameInput.focus(), 100);
}

// Close modal
function closeModal() {
    modal.classList.remove('active');
    editingItemId = null;
}

// Save item
function saveItem() {
    const name = itemNameInput.value.trim();
    const date = itemDateInput.value;
    
    if (!name) {
        alert('Please enter an item name');
        return;
    }
    
    if (!date) {
        alert('Please select a date');
        return;
    }
    
    if (editingItemId) {
        // Update existing item
        const itemRef = ref(database, `items/${editingItemId}`);
        set(itemRef, {
            name,
            location: selectedLocation,
            date
        });
    } else {
        // Add new item
        const newItemRef = push(itemsRef);
        set(newItemRef, {
            name,
            location: selectedLocation,
            date
        });
    }
    
    closeModal();
}

// Delete item (make it global for onclick)
window.deleteItem = function(itemId) {
    if (confirm('Delete this item?')) {
        const itemRef = ref(database, `items/${itemId}`);
        remove(itemRef);
    }
}

// Set today's date as default
function setTodayDate() {
    const today = new Date().toISOString().split('T')[0];
    itemDateInput.value = today;
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

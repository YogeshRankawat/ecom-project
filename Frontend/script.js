document.addEventListener('DOMContentLoaded', () => {
    // --- STATE MANAGEMENT ---
    const state = {
        apiBaseUrl: 'http://localhost:4000/api',
        token: localStorage.getItem('token') || null,
        currentView: 'shop', // 'shop' or 'cart'
    };

    const emailPattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;

    // --- DOM ELEMENTS ---
    const DOMElements = {
        productList: document.getElementById('product-list'),
        shopView: document.getElementById('shop-view'),
        cartView: document.getElementById('cart-view'),
        cartItemsContainer: document.getElementById('cart-items'),
        cartCount: document.getElementById('cart-count'),
        authButtons: document.getElementById('auth-buttons'),
        userInfo: document.getElementById('user-info'),
        // Modals
        loginModal: new bootstrap.Modal(document.getElementById('loginModal')),
        signupModal: new bootstrap.Modal(document.getElementById('signupModal')),
    };

    // --- API HELPER ---
    async function apiCall(endpoint, method = 'GET', body = null) {
        const headers = { 'Content-Type': 'application/json' };
        if (state.token) {
            headers['Authorization'] = `Bearer ${state.token}`;
        }

        const config = {
            method,
            headers,
            body: body ? JSON.stringify(body) : null
        };

        try {
            const response = await fetch(`${state.apiBaseUrl}${endpoint}`, config);
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'An error occurred');
            }
            return data;
        } catch (error) {
            console.error('API Error:', error);
            showError(error.message);
            throw error;
        }
    }

    // --- RENDER FUNCTIONS ---
    function renderProducts(products) {
        DOMElements.productList.innerHTML = products.map(product => `
            <div class="col-md-4 col-lg-3 mb-4">
                <div class="card product-card h-100">
                    <img src="${product.image}" class="card-img-top" alt="${product.title}">
                    <div class="card-body d-flex flex-column">
                        <h5 class="card-title">${product.title}</h5>
                        <p class="card-text text-muted">${product.desc}</p>
                        <h6 class="mt-auto">Price: ₹${product.price}</h6>
                        <button class="btn btn-primary mt-2" onclick="app.addToCart(${product.id})">Add to Cart</button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    function renderCart(cartItems) {
        if (cartItems.length === 0) {
            DOMElements.cartItemsContainer.innerHTML = '<p>Your cart is empty.</p>';
        } else {
            DOMElements.cartItemsContainer.innerHTML = cartItems.map(item => `
                <div class="cart-item-row">
                    <span>${item.title} (₹${item.price})</span>
                    <div>
                        Quantity: ${item.qty}
                        <button class="btn btn-danger btn-sm ms-3" onclick="app.removeFromCart(${item.itemId})">Remove</button>
                    </div>
                </div>
            `).join('');
        }
        DOMElements.cartCount.textContent = cartItems.reduce((sum, item) => sum + item.qty, 0);
    }

    function updateUIForAuthState() {
        if (state.token) {
            DOMElements.authButtons.classList.add('d-none');
            DOMElements.userInfo.classList.remove('d-none');
            fetchCart();
        } else {
            DOMElements.authButtons.classList.remove('d-none');
            DOMElements.userInfo.classList.add('d-none');
            renderCart([]);
        }
    }

    function switchView(view) {
        state.currentView = view;
        if (view === 'shop') {
            DOMElements.shopView.classList.remove('d-none');
            DOMElements.cartView.classList.add('d-none');
        } else {
            DOMElements.shopView.classList.add('d-none');
            DOMElements.cartView.classList.remove('d-none');
        }
    }

    // --- DATA FETCHING & ACTIONS ---
    async function fetchProducts() {
        try {
            const q = document.getElementById('search-input').value;
            const category = document.getElementById('category-select').value;
            let url = '/items?';
            if (q) url += `q=${q}&`;
            if (category) url += `category=${category}&`;

            const products = await apiCall(url);
            renderProducts(products);
        } catch (error) {
            DOMElements.productList.innerHTML = `<p class="text-danger">Failed to load products.</p>`;
        }
    }

    async function fetchCart() {
        if (!state.token) return;
        try {
            const cartItems = await apiCall('/cart');
            renderCart(cartItems);
        } catch (error) {
            console.error('Could not fetch cart.');
        }
    }

    async function handleLogin(e) {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        try {
            const data = await apiCall('/auth/login', 'POST', { email, password });
            state.token = data.token;
            localStorage.setItem('token', data.token);
            updateUIForAuthState();
            DOMElements.loginModal.hide();
        } catch (error) {
            document.getElementById('login-error').textContent = error.message;
            document.getElementById('login-error').classList.remove('d-none');
        }
    }

    async function handleSignup(e) {
        e.preventDefault();
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        const signupError = document.getElementById('signup-error');
         if (!emailPattern.test(email)) {
            signupError.textContent = 'कृपया एक मान्य ईमेल एड्रेस दर्ज करें।';
            signupError.classList.remove('d-none');
            return; // आगे की प्रक्रिया रोक दें
        }
        try {
            const data = await apiCall('/auth/signup', 'POST', { email, password });
            state.token = data.token;
            localStorage.setItem('token', data.token);
            updateUIForAuthState();
            DOMElements.signupModal.hide();
        } catch (error) {
            document.getElementById('signup-error').textContent = error.message;
            document.getElementById('signup-error').classList.remove('d-none');
        }
    }

    function handleLogout() {
        state.token = null;
        localStorage.removeItem('token');
        updateUIForAuthState();
        switchView('shop');
    }

    // --- PUBLIC API (exposed via window.app) ---
    window.app = {
        addToCart: async (itemId) => {
            if (!state.token) {
                DOMElements.loginModal.show();
                return;
            }
            try {
                await apiCall('/cart/add', 'POST', { itemId, qty: 1 });
                await fetchCart();
            } catch (error) {
                // Error already logged by apiCall
            }
        },
        removeFromCart: async (itemId) => {
            try {
                await apiCall('/cart/update', 'PUT', { itemId, qty: 0 });
                await fetchCart(); // Refresh cart view
            } catch (error) {
                // Error already logged by apiCall
            }
        }
    };

    // --- EVENT LISTENERS ---
    document.getElementById('filter-btn').addEventListener('click', fetchProducts);
    document.getElementById('login-submit-btn').addEventListener('click', handleLogin);
    document.getElementById('signup-submit-btn').addEventListener('click', handleSignup);
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
    document.getElementById('cart-nav-btn').addEventListener('click', () => switchView('cart'));
    document.getElementById('back-to-shop-btn').addEventListener('click', () => switchView('shop'));
    document.getElementById('forgot-submit-btn').addEventListener('click', handleForgotPassword);

    // और async function handleSignup के ऊपर यह नया फंक्शन जोड़ें
    async function handleForgotPassword(e) {
        e.preventDefault();
        const email = document.getElementById('forgot-email').value;
        const msgDiv = document.getElementById('forgot-msg');
        try {
            const data = await apiCall('/auth/forgot-password', 'POST', { email });
            msgDiv.textContent = data.message;
            msgDiv.className = 'alert alert-success'; // सफल होने पर हरा रंग
        } catch (error) {
            msgDiv.textContent = error.message;
            msgDiv.className = 'alert alert-danger'; // एरर पर लाल रंग
        }
        msgDiv.classList.remove('d-none');
    }

    // --- INITIALIZATION ---
    function init() {
        updateUIForAuthState();
        fetchProducts();
    }

    init();
});

function showError(message) {
    // This is a placeholder for a more sophisticated notification system
    alert(`Error: ${message}`);
}
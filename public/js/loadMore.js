const productGrid = document.getElementById("productGrid");
const loadMoreBtn = document.getElementById("loadMoreBtn");
const loadingMessage = document.getElementById("loadingMessage");
const errorMessage = document.getElementById("errorMessage");

const loginModalOverlay = document.getElementById("loginModalOverlay");
const closeModalBtn = document.getElementById("closeModalBtn");
const cancelModalBtn = document.getElementById("cancelModalBtn");
const toastNotification = document.getElementById("toastNotification");
const cartBadge = document.getElementById("cartBadge");

let nextCursor = null;
let isLoading = false;
let hasMore = true;

// Toast helper
function showToast(message, isError = false) {
    if (!toastNotification) return;
    toastNotification.textContent = message;
    toastNotification.className = "toast-notification " + (isError ? "toast-error" : "toast-success");
    toastNotification.hidden = false;
    toastNotification.classList.add("toast-show");

    setTimeout(() => {
        toastNotification.classList.remove("toast-show");
        setTimeout(() => {
            toastNotification.hidden = true;
        }, 300);
    }, 3000);
}

// Modal open/close helpers
function openLoginModal(productId) {
    if (loginModalOverlay) {
        const loginLink = loginModalOverlay.querySelector(".modal-login-btn");
        if (loginLink && productId) {
            loginLink.href = `/auth/login?redirect=${encodeURIComponent(window.location.pathname)}`;
        }
        loginModalOverlay.hidden = false;
        document.body.style.overflow = "hidden";
    }
}

function closeLoginModal() {
    if (loginModalOverlay) {
        loginModalOverlay.hidden = true;
        document.body.style.overflow = "";
    }
}

if (closeModalBtn) closeModalBtn.addEventListener("click", closeLoginModal);
if (cancelModalBtn) cancelModalBtn.addEventListener("click", closeLoginModal);
if (loginModalOverlay) {
    loginModalOverlay.addEventListener("click", (e) => {
        if (e.target === loginModalOverlay) {
            closeLoginModal();
        }
    });
}
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && loginModalOverlay && !loginModalOverlay.hidden) {
        closeLoginModal();
    }
});

// Add to Cart handler
async function handleAddToCart(productId, productTitle) {
    if (!window.IS_USER_LOGGED_IN) {
        openLoginModal(productId);
        return;
    }

    try {
        const response = await fetch("/api/cart/add", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify({ productId, quantity: 1 })
        });

        if (response.status === 401) {
            window.IS_USER_LOGGED_IN = false;
            openLoginModal(productId);
            return;
        }

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Failed to add product to cart.");
        }

        // Update badge count
        if (cartBadge && typeof data.cartCount !== "undefined") {
            cartBadge.textContent = data.cartCount;
            cartBadge.classList.add("badge-bounce");
            setTimeout(() => cartBadge.classList.remove("badge-bounce"), 400);
        }

        showToast(data.message || `"${productTitle}" added to cart!`);
    } catch (err) {
        showToast(err.message, true);
    }
}

// Load products using cursor pagination
async function loadProducts() {
    if (isLoading || !hasMore) {
        return;
    }

    isLoading = true;
    if (loadMoreBtn) loadMoreBtn.disabled = true;
    loadingMessage.hidden = false;
    loadingMessage.textContent = "Loading products...";
    errorMessage.hidden = true;

    try {
        let url = "/api/products";
        if (nextCursor) {
            url += `?cursor=${encodeURIComponent(nextCursor)}`;
        }

        const response = await fetch(url);
        if (!response.ok) {
            const result = await response.json().catch(() => ({}));
            throw new Error(result.message || result.error || "Unable to load products.");
        }

        const data = await response.json();

        data.products.forEach((product) => {
            const card = document.createElement("div");
            card.className = "product-card";

            // Clickable Image Wrap
            const imageLink = document.createElement("a");
            imageLink.href = `/products/${product._id}`;
            imageLink.className = "product-image-link";

            const imageWrap = document.createElement("div");
            imageWrap.className = "product-image-wrap";

            const image = document.createElement("img");
            image.src = product.thumbnail || "/images/placeholder.svg";
            image.alt = product.title;
            image.loading = "lazy";
            image.onerror = function () {
                this.onerror = null;
                this.src = "/images/placeholder.svg";
            };
            imageWrap.appendChild(image);
            imageLink.appendChild(imageWrap);

            // Product Info
            const info = document.createElement("div");
            info.className = "product-info";

            if (product.category) {
                const category = document.createElement("span");
                category.className = "product-category";
                category.textContent = product.category;
                info.appendChild(category);
            }

            const titleLink = document.createElement("a");
            titleLink.href = `/products/${product._id}`;
            titleLink.className = "product-title-link";
            const title = document.createElement("h3");
            title.textContent = product.title;
            titleLink.appendChild(title);
            info.appendChild(titleLink);

            const price = document.createElement("div");
            price.className = "product-price";
            price.textContent = `$${Number(product.price || 0).toFixed(2)}`;
            info.appendChild(price);

            // Card Action Buttons
            const actionsWrap = document.createElement("div");
            actionsWrap.className = "product-card-actions";

            const addToCartBtn = document.createElement("button");
            addToCartBtn.type = "button";
            addToCartBtn.className = "primary-btn add-to-cart-btn";
            addToCartBtn.innerHTML = "<span>🛒</span> Add to Cart";
            addToCartBtn.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                handleAddToCart(product._id, product.title);
            });

            const detailsLink = document.createElement("a");
            detailsLink.href = `/products/${product._id}`;
            detailsLink.className = "secondary-btn view-details-link";
            detailsLink.textContent = "Show Details";

            actionsWrap.append(addToCartBtn, detailsLink);
            info.appendChild(actionsWrap);

            card.append(imageLink, info);
            productGrid.appendChild(card);
        });

        nextCursor = data.nextCursor;
        hasMore = data.hasMore;

        if (loadMoreBtn) {
            loadMoreBtn.hidden = !hasMore;
        }

        loadingMessage.textContent = hasMore
            ? ""
            : "You have reached the end of the products.";
    } catch (error) {
        errorMessage.textContent = error.message;
        errorMessage.hidden = false;
        loadingMessage.textContent = "";
    } finally {
        isLoading = false;
        if (loadMoreBtn) loadMoreBtn.disabled = false;
    }
}

if (loadMoreBtn) {
    loadMoreBtn.addEventListener("click", loadProducts);
}

// Initial fetch
loadProducts();
const productGrid = document.getElementById("productGrid");
const loadMoreBtn = document.getElementById("loadMoreBtn");
const loadingMessage = document.getElementById("loadingMessage");
const errorMessage = document.getElementById("errorMessage");

let nextCursor = null;
let isLoading = false;
let hasMore = true;

async function loadProducts() {
    if (isLoading || !hasMore) {
        return;
    }

    isLoading = true;
    loadMoreBtn.disabled = true;
    loadingMessage.hidden = false;
    loadingMessage.textContent = "Loading products...";
    errorMessage.hidden = true;

    try {
        let url = "/api/products";

        if (nextCursor) {
            url += `?cursor=${encodeURIComponent(nextCursor)}`;
        }

        const response = await fetch(url);

        if (response.status === 401 || response.redirected) {
            window.location.href = "/auth/login";
            return;
        }

        if (!response.ok) {
            const result = await response.json().catch(() => ({}));

            throw new Error(
                result.message || "Unable to load products."
            );
        }

        const data = await response.json();

        data.products.forEach((product) => {
            const card = document.createElement("a");
            card.className = "product-card";
            card.href = `/products/${product._id}`;

            const image = document.createElement("img");
            image.src = product.thumbnail || "/images/placeholder.png";
            image.alt = product.title;
            image.loading = "lazy";

            const title = document.createElement("h3");
            title.textContent = product.title;

            card.append(image, title);
            productGrid.appendChild(card);
        });

        nextCursor = data.nextCursor;
        hasMore = data.hasMore;

        loadMoreBtn.hidden = !hasMore;

        loadingMessage.textContent = hasMore
            ? ""
            : "You have reached the end of the products.";
    } catch (error) {
        errorMessage.textContent = error.message;
        errorMessage.hidden = false;
        loadingMessage.textContent = "";
    } finally {
        isLoading = false;
        loadMoreBtn.disabled = false;
    }
}

loadMoreBtn.addEventListener("click", loadProducts);

loadProducts();
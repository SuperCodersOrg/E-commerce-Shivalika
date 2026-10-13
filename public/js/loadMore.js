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
                result.message || result.error || "Unable to load products."
            );
        }

        const data = await response.json();

        data.products.forEach((product) => {
            const card = document.createElement("a");
            card.className = "product-card";
            card.href = `/products/${product._id}`;

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

            const info = document.createElement("div");
            info.className = "product-info";

            if (product.category) {
                const category = document.createElement("span");
                category.className = "product-category";
                category.textContent = product.category;
                info.appendChild(category);
            }

            const title = document.createElement("h3");
            title.textContent = product.title;
            info.appendChild(title);

            const price = document.createElement("div");
            price.className = "product-price";
            price.textContent = `$${Number(product.price || 0).toFixed(2)}`;
            info.appendChild(price);

            card.append(imageWrap, info);
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
const Product = require("../models/Product");

const importProductsIfEmpty = async () => {
    const count = await Product.countDocuments();

    if (count > 0) {
        console.log(`Found ${count} products in MongoDB. Import skipped.`);
        return;
    }

    console.log(
        "Product collection is empty. Importing products from DummyJSON..."
    );

    const response = await fetch(
        "https://dummyjson.com/products?limit=0",
        {
            signal: AbortSignal.timeout(15000)
        }
    );

    if (!response.ok) {
        throw new Error(`DummyJSON returned HTTP ${response.status}`);
    }

    const data = await response.json();

    if (!Array.isArray(data.products)) {
        throw new Error(
            "DummyJSON response did not contain a products array"
        );
    }

    const products = data.products.map((product) => ({
        externalId: product.id,
        title: product.title,
        description: product.description || "",
        category: product.category || "other",
        price: product.price || 0,
        thumbnail: product.thumbnail || "",
        images: Array.isArray(product.images) ? product.images : [],
        brand: product.brand || "",
        specifications: {}
    }));

    if (products.length === 0) {
        console.warn("DummyJSON returned no products; nothing was imported.");
        return;
    }

    await Product.insertMany(products, { ordered: false });

    console.log(`${products.length} products imported successfully.`);
};

module.exports = { importProductsIfEmpty };
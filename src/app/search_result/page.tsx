"use client";
import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import Navbar from "../../components/navbar";
import Footer from "../../components/footer";
import { getAuth } from "firebase/auth";
import { doc, updateDoc, arrayUnion, getDoc, setDoc, deleteDoc } from "firebase/firestore";
import { Filter, Heart } from "lucide-react";

interface Product {
    id: string;
    name?: string;
    title?: string;
    price?: number;
    image?: string;
    images?: string[];
    category?: string;
    condition?: string;
    brand?: string;
    sold?: boolean;
    seller?: string;
    sellerProfilePicture?: string;
    sellerId?: string;
}

export default function SearchPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const query = searchParams?.get("query")?.toLowerCase() || "";
    const [results, setResults] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchInput, setSearchInput] = useState(query);

    // Dynamic filter states
    const [categories, setCategories] = useState<string[]>([]);
    const [conditions, setConditions] = useState<string[]>([]);
    const [brands, setBrands] = useState<string[]>([]);
    const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

    // Filter states
    const [selectedFilters, setSelectedFilters] = useState({
        category: '',
        condition: '',
        brand: ''
    });
    const [showFilters, setShowFilters] = useState(false);
    const [filtersHovered, setFiltersHovered] = useState(false);

    // Fetch filter options from database
    const fetchFilterOptions = async () => {
        try {
            const productsSnapshot = await getDocs(collection(db, "products"));
            const categoriesSet = new Set<string>();
            const conditionsSet = new Set<string>();
            const brandsSet = new Set<string>();

            productsSnapshot.docs.forEach(doc => {
                const data = doc.data();
                
                // Extract category
                if (data.category && data.category.trim()) {
                    categoriesSet.add(data.category.trim());
                }
                
                // Extract condition
                if (data.condition && data.condition.trim()) {
                    conditionsSet.add(data.condition.trim());
                }
                
                // Extract brand - check if it's a direct field or extract from name/title
                if (data.brand && data.brand.trim()) {
                    brandsSet.add(data.brand.trim());
                } else {
                    // Try to extract brand from name or title
                    const itemName = (data.name || data.title || '').toLowerCase();
                    const commonBrands = ['zara', 'h&m', 'nike', 'adidas', 'coach', "levi's", 'uniqlo'];
                    
                    for (const brand of commonBrands) {
                        if (itemName.includes(brand.toLowerCase())) {
                            brandsSet.add(brand.charAt(0).toUpperCase() + brand.slice(1));
                            break;
                        }
                    }
                }
            });

            // Convert sets to sorted arrays
            setCategories(Array.from(categoriesSet).sort());
            setConditions(Array.from(conditionsSet).sort());
            setBrands(Array.from(brandsSet).sort());
            
        } catch (error) {
            console.error("Error fetching filter options:", error);
            // Fallback to default values
            setCategories(['Tops', 'Bottoms', 'Dresses', 'Outerwear', 'Shoes', 'Bags', 'Accessories']);
            setConditions(['Brand New', 'Like New', 'Lightly Used', 'Well Used', 'Heavily Used']);
            setBrands(['Zara', 'H&M', 'Nike', 'Adidas', 'Coach', "Levi's", 'Uniqlo', 'Other']);
        }
    };

    // Fetch favorites
    const fetchFavorites = async () => {
        try {
            const auth = getAuth();
            const user = auth.currentUser;
            if (!user) return;
            const itemsRef = collection(db, "favorites", user.uid, "items");
            const snapshot = await getDocs(itemsRef);
            setFavoriteIds(snapshot.docs.map(doc => doc.id));
        } catch (error) {
            console.error("Error fetching favorites:", error);
        }
    };

    useEffect(() => {
        const initializeData = async () => {
            await Promise.all([fetchFilterOptions(), fetchFavorites()]);
        };
        initializeData();
    }, []);

    useEffect(() => {
        const fetchResults = async () => {
            setLoading(true);
            try {
                const snapshot = await getDocs(collection(db, "products"));
                let items = snapshot.docs
                    .map(doc => ({ id: doc.id, ...doc.data() } as Product))
                    .filter(item => !item.sold); // Only show items that are not sold

                // Fetch seller info for each product
                const itemsWithSeller = await Promise.all(items.map(async item => {
                    let sellerUsername = "Unknown Seller";
                    let sellerProfilePicture = "/api/placeholder/40/40";
                    if (item.sellerId) {
                        const sellerRef = doc(db, "users", item.sellerId);
                        const sellerSnap = await getDoc(sellerRef);
                        if (sellerSnap.exists()) {
                            const sellerData = sellerSnap.data();
                            sellerUsername = sellerData.username || "Unknown Seller";
                            sellerProfilePicture = sellerData.profilePhotoUrl || "/api/placeholder/40/40";
                        }
                    }
                    return {
                        ...item,
                        seller: sellerUsername,
                        sellerProfilePicture: sellerProfilePicture
                    };
                }));

                // Check if any filters are applied
                const hasFilters = selectedFilters.category || selectedFilters.condition || selectedFilters.brand;

                let filteredItems = itemsWithSeller;

                // If there are filters applied, ignore search query and show filtered results
                if (hasFilters) {
                    if (selectedFilters.category) {
                        filteredItems = filteredItems.filter(item =>
                            item.category?.toLowerCase() === selectedFilters.category.toLowerCase()
                        );
                    }
                    if (selectedFilters.condition) {
                        filteredItems = filteredItems.filter(item =>
                            item.condition &&
                            item.condition.trim().toLowerCase() === selectedFilters.condition.trim().toLowerCase()
                        );
                    }
                    if (selectedFilters.brand) {
                        if (selectedFilters.brand === "Other") {
                            const allBrands = brands.map(b => b.toLowerCase()).filter(b => b !== "other");
                            filteredItems = filteredItems.filter(item => {
                                const name = item.name?.toLowerCase() || "";
                                const title = item.title?.toLowerCase() || "";
                                const brand = item.brand?.toLowerCase() || "";
                                return !allBrands.some(brandName =>
                                    name.includes(brandName) || title.includes(brandName) || brand.includes(brandName)
                                );
                            });
                        } else {
                            filteredItems = filteredItems.filter(item =>
                                item.name?.toLowerCase().includes(selectedFilters.brand.toLowerCase()) ||
                                item.title?.toLowerCase().includes(selectedFilters.brand.toLowerCase()) ||
                                item.brand?.toLowerCase().includes(selectedFilters.brand.toLowerCase())
                            );
                        }
                    }
                } else if (query) {
                    // If no filters but has search query, apply search
                    filteredItems = filteredItems.filter(item =>
                        (item.name && item.name.toLowerCase().includes(query)) ||
                        (item.title && item.title.toLowerCase().includes(query))
                    );
                }
                // If no filters and no query, show all unsold products

                setResults(filteredItems);
            } catch (error) {
                console.error("Error fetching search results:", error);
                setResults([]);
            }
            setLoading(false);
        };

        fetchResults();
    }, [query, selectedFilters, brands]);

    // Save/remove favourite handler
    const handleSaveFavourite = async (item: Product) => {
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) {
            alert("Please log in to save favourites.");
            return;
        }

        try {
            const itemRef = doc(db, "favorites", user.uid, "items", item.id);

            if (favoriteIds.includes(item.id)) {
                // Remove from favourites
                await deleteDoc(itemRef);
                setFavoriteIds(prev => prev.filter(id => id !== item.id));
            } else {
                // Add to favourites
                await setDoc(itemRef, item);
                setFavoriteIds(prev => [...prev, item.id]);
            }
        } catch (error) {
            console.error("Error updating favorites:", error);
            alert("Error updating favorites. Please try again.");
        }
    };

    // Use router for navigation instead of window.location.href
    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchInput.trim()) {
            router.push(`/search_result?query=${encodeURIComponent(searchInput.trim())}`);
        } else {
            // If search is empty, go to all products page
            router.push('/search_result');
        }
    };

    const handleFilterChange = (filterType: keyof typeof selectedFilters, value: string) => {
        setSelectedFilters(prev => ({
            ...prev,
            [filterType]: value
        }));
        
        // Clear search input when applying filters
        if (value !== '' && searchInput !== '') {
            setSearchInput('');
            // Update URL to remove query parameter
            router.replace('/search_result');
        }
    };

    return (
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
            <Navbar />
            <div style={{ flex: 1 }}>
                <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "2rem" }}>
                    {/* Search Bar & Filters Hover Container */}
                    <div
                        style={{ position: "relative", marginBottom: "2rem" }}
                        onMouseEnter={() => setFiltersHovered(true)}
                        onMouseLeave={() => setFiltersHovered(false)}
                    >
                        <form onSubmit={handleSearch} style={{ display: "flex" }}>
                            <input
                                type="text"
                                value={searchInput}
                                onChange={e => setSearchInput(e.target.value)}
                                placeholder="Search products..."
                                style={{
                                    flex: 1,
                                    padding: "0.75rem",
                                    borderRadius: "8px 0 0 8px",
                                    border: "1px solid #ccc",
                                    fontSize: "1rem"
                                }}
                            />
                            <button
                                type="submit"
                                style={{
                                    padding: "0.75rem 1.5rem",
                                    borderRadius: "0 8px 8px 0",
                                    border: "none",
                                    background: "#c9a26d",
                                    color: "black",
                                    cursor: "pointer"
                                }}
                            >
                                Search
                            </button>
                            <button
                                type="button"
                                style={{
                                    marginLeft: "1rem",
                                    background: filtersHovered ? "#c9a26d" : "#eee",
                                    color: filtersHovered ? "white" : "#666",
                                    border: "none",
                                    borderRadius: "8px",
                                    padding: "0.75rem 1.5rem",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center"
                                }}
                                tabIndex={-1}
                            >
                                <Filter size={20} />
                            </button>
                        </form>
                        {/* Filters Panel on Hover */}
                        {filtersHovered && (
                            <section
                                style={{
                                    position: "absolute",
                                    top: "100%",
                                    left: 0,
                                    width: "100%",
                                    background: 'rgba(255, 255, 255, 0.95)',
                                    backdropFilter: 'blur(10px)',
                                    borderRadius: '20px',
                                    padding: '2rem',
                                    boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                                    zIndex: 10
                                }}
                                onMouseEnter={() => setFiltersHovered(true)}
                                onMouseLeave={() => setFiltersHovered(false)}
                            >
                                <h3 style={{ marginBottom: '1.5rem', color: '#333' }}>Filters</h3>
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                                    gap: '1.5rem'
                                }}>
                                    {/* Category Filter */}
                                    <div>
                                        <label style={{ 
                                            fontWeight: '600', 
                                            color: '#333', 
                                            marginBottom: '0.5rem', 
                                            display: 'block',
                                            fontSize: '0.9rem'
                                        }}>
                                            Category
                                        </label>
                                        <select
                                            value={selectedFilters.category}
                                            onChange={(e) => handleFilterChange('category', e.target.value)}
                                            style={{
                                                width: '100%',
                                                padding: '0.75rem',
                                                border: '1px solid #ddd',
                                                borderRadius: '8px',
                                                fontSize: '0.9rem',
                                                background: 'white',
                                                color: '#333',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <option value="">All Categories</option>
                                            {categories.map(category => (
                                                <option key={category} value={category}>
                                                    {category}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Condition Filter */}
                                    <div>
                                        <label style={{ 
                                            fontWeight: '600', 
                                            color: '#333', 
                                            marginBottom: '0.5rem', 
                                            display: 'block',
                                            fontSize: '0.9rem'
                                        }}>
                                            Condition
                                        </label>
                                        <select
                                            value={selectedFilters.condition}
                                            onChange={(e) => handleFilterChange('condition', e.target.value)}
                                            style={{
                                                width: '100%',
                                                padding: '0.75rem',
                                                border: '1px solid #ddd',
                                                borderRadius: '8px',
                                                fontSize: '0.9rem',
                                                background: 'white',
                                                color: '#333',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <option value="">All Conditions</option>
                                            {conditions.map(condition => (
                                                <option key={condition} value={condition}>
                                                    {condition}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Brand Filter */}
                                    <div>
                                        <label style={{ 
                                            fontWeight: '600', 
                                            color: '#333', 
                                            marginBottom: '0.5rem', 
                                            display: 'block',
                                            fontSize: '0.9rem'
                                        }}>
                                            Brand
                                        </label>
                                        <select
                                            value={selectedFilters.brand}
                                            onChange={(e) => handleFilterChange('brand', e.target.value)}
                                            style={{
                                                width: '100%',
                                                padding: '0.75rem',
                                                border: '1px solid #ddd',
                                                borderRadius: '8px',
                                                fontSize: '0.9rem',
                                                background: 'white',
                                                color: '#333',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <option value="">All Brands</option>
                                            {brands.map(brand => (
                                                <option key={brand} value={brand}>
                                                    {brand}
                                                </option>
                                            ))}
                                            {/* Add "Other" option if not already present */}
                                            {!brands.includes('Other') && (
                                                <option value="Other">Other</option>
                                            )}
                                        </select>
                                    </div>
                                </div>
                                <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
                                    <button
                                        onClick={() => {
                                            setSelectedFilters({
                                                category: '', condition: '', brand: ''
                                            });
                                            setSearchInput('');
                                            router.replace('/search_result');
                                        }}
                                        style={{
                                            background: 'transparent',
                                            color: '#666',
                                            border: '1px solid #ddd',
                                            padding: '0.5rem 1rem',
                                            borderRadius: '8px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Clear All
                                    </button>
                                </div>
                            </section>
                        )}
                    </div>

                    {/* Dynamic Header */}
                    {(() => {
                        const hasFilters = selectedFilters.category || selectedFilters.condition || selectedFilters.brand;
                        const hasSearch = query && query.trim() !== '';
                        
                        if (hasFilters && !hasSearch) {
                            const activeFilters = [];
                            if (selectedFilters.category) activeFilters.push(selectedFilters.category);
                            if (selectedFilters.condition) activeFilters.push(selectedFilters.condition);
                            if (selectedFilters.brand) activeFilters.push(selectedFilters.brand);
                            
                            return (
                                <h2 style={{ fontSize: "2rem", fontWeight: "bold", marginBottom: "1.5rem" }}>
                                    Filtered Results: {activeFilters.join(', ')}
                                </h2>
                            );
                        } else if (hasSearch && !hasFilters) {
                            return (
                                <h2 style={{ fontSize: "2rem", fontWeight: "bold", marginBottom: "1.5rem" }}>
                                    Search Results for "{query}"
                                </h2>
                            );
                        } else if (!hasSearch && !hasFilters) {
                            return (
                                <h2 style={{ fontSize: "2rem", fontWeight: "bold", marginBottom: "1.5rem" }}>
                                    All Products
                                </h2>
                            );
                        } else {
                            return (
                                <h2 style={{ fontSize: "2rem", fontWeight: "bold", marginBottom: "1.5rem" }}>
                                    Results
                                </h2>
                            );
                        }
                    })()}

                    {loading ? (
                        <div style={{ 
                            display: 'flex', 
                            justifyContent: 'center', 
                            alignItems: 'center', 
                            minHeight: '200px',
                            fontSize: '1.2rem',
                            color: '#666'
                        }}>
                            Loading...
                        </div>
                    ) : results.length === 0 ? (
                        <div style={{ 
                            textAlign: 'center', 
                            padding: '3rem', 
                            fontSize: '1.2rem', 
                            color: '#666' 
                        }}>
                            {(() => {
                                const hasFilters = selectedFilters.category || selectedFilters.condition || selectedFilters.brand;
                                const hasSearch = query && query.trim() !== '';
                                
                                if (hasFilters && !hasSearch) {
                                    return "No products found matching the selected filters.";
                                } else if (hasSearch && !hasFilters) {
                                    return `No results found for "${query}".`;
                                } else if (!hasSearch && !hasFilters) {
                                    return "No products available at the moment.";
                                } else {
                                    return "No results found.";
                                }
                            })()}
                        </div>
                    ) : (
                        <div style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                            gap: "1.5rem"
                        }}>
                            {results.map(item => (
                                <div key={item.id} style={{
                                    background: "#fff",
                                    borderRadius: "15px",
                                    boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
                                    overflow: "hidden",
                                    position: "relative",
                                    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                                    cursor: "pointer"
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-5px)';
                                    e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.1)';
                                }}
                                onClick={() => router.push(`/view_item?id=${item.id}`)}>
                                    
                                    {/* Favorite Button */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleSaveFavourite(item);
                                        }}
                                        style={{
                                            position: "absolute",
                                            top: "10px",
                                            right: "10px",
                                            background: "rgba(255, 255, 255, 0.9)",
                                            border: "none",
                                            borderRadius: "50%",
                                            width: "35px",
                                            height: "35px",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            cursor: "pointer",
                                            zIndex: 10
                                        }}
                                        title="Save as Favourite"
                                    >
                                        <Heart
                                            size={18}
                                            fill={favoriteIds.includes(item.id) ? '#ff4757' : 'none'}
                                            color={favoriteIds.includes(item.id) ? '#ff4757' : '#666'}
                                        />
                                    </button>

                                    {/* Item Image */}
                                    <div style={{
                                        width: '100%',
                                        height: '220px',
                                        background: '#f9f9f9',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        overflow: 'hidden'
                                    }}>
                                        <img
                                            src={item.image || (item.images && item.images[0]) || "https://via.placeholder.com/220"}
                                            alt={item.name || item.title || "Product"}
                                            style={{
                                                width: '100%',
                                                height: '100%',
                                                objectFit: 'cover'
                                            }}
                                        />
                                    </div>

                                    {/* Item Details */}
                                    <div style={{ padding: "1.25rem" }}>
                                        {/* Product Name */}
                                        <h4 style={{
                                            margin: 0,
                                            fontSize: '1.1rem',
                                            fontWeight: '600',
                                            color: '#333',
                                            lineHeight: '1.3',
                                            marginBottom: '0.5rem'
                                        }}>
                                            {item.name || item.title}
                                        </h4>

                                        {/* Price */}
                                        <div style={{
                                            fontSize: '1.25rem',
                                            fontWeight: '700',
                                            color: '#c9a26d',
                                            marginBottom: '0.75rem'
                                        }}>
                                            RM {item.price}
                                        </div>

                                        {/* Seller Info */}
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                            marginBottom: '0.75rem'
                                        }}>
                                            {item.sellerProfilePicture ? (
                                                <img
                                                    src={item.sellerProfilePicture}
                                                    alt={`${item.seller || 'Seller'} profile`}
                                                    style={{
                                                        width: '24px',
                                                        height: '24px',
                                                        borderRadius: '50%',
                                                        objectFit: 'cover',
                                                        border: '1px solid #ddd'
                                                    }}
                                                />
                                            ) : (
                                                <div style={{
                                                    width: '24px',
                                                    height: '24px',
                                                    borderRadius: '50%',
                                                    background: '#c9a26d',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: 'white',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 'bold'
                                                }}>
                                                    {(item.seller || 'U')[0].toUpperCase()}
                                                </div>
                                            )}
                                            <span style={{
                                                fontSize: '0.875rem',
                                                color: '#666',
                                                fontWeight: '500'
                                            }}>
                                                {item.seller || 'Unknown Seller'}
                                            </span>
                                        </div>

                                        {/* Category, Condition, and Brand badges */}
                                        <div style={{
                                            display: 'flex',
                                            gap: '0.5rem',
                                            flexWrap: 'wrap'
                                        }}>
                                            {item.category && (
                                                <span style={{
                                                    background: '#f0f8ff',
                                                    color: '#4a90e2',
                                                    padding: '0.25rem 0.5rem',
                                                    borderRadius: '12px',
                                                    fontSize: '0.75rem',
                                                    fontWeight: '500'
                                                }}>
                                                    {item.category}
                                                </span>
                                            )}
                                            {item.condition && (
                                                <span style={{
                                                    background: '#f9f7f1',
                                                    color: '#c9a26d',
                                                    padding: '0.25rem 0.5rem',
                                                    borderRadius: '12px',
                                                    fontSize: '0.75rem',
                                                    fontWeight: '500'
                                                }}>
                                                    {item.condition}
                                                </span>
                                            )}
                                            {item.brand && (
                                                <span style={{
                                                    background: '#f9f9f9',
                                                    color: '#666',
                                                    padding: '0.25rem 0.5rem',
                                                    borderRadius: '12px',
                                                    fontSize: '0.75rem'
                                                }}>
                                                    {item.brand}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            <Footer />
        </div>
    );
}
"use client";
import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import Navbar from "../../components/navbar";
import Footer from "../../components/footer";
import { getAuth } from "firebase/auth";
import { doc, updateDoc, arrayUnion, getDoc, setDoc } from "firebase/firestore";
import { Filter } from "lucide-react";

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
}

const categories = ['Tops', 'Bottoms', 'Dresses', 'Outerwear', 'Shoes', 'Bags', 'Accessories'];
const conditions = ['Brand New','Like New', 'Lightly Used', 'Well Used', 'Heavily Used'];
const brands = ['Zara', 'H&M', 'Nike', 'Adidas', 'Coach', "Levi's", 'Uniqlo', 'Other'];

export default function SearchPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const query = searchParams?.get("query")?.toLowerCase() || "";
    const [results, setResults] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchInput, setSearchInput] = useState(query);

    // Filter states
    const [selectedFilters, setSelectedFilters] = useState({
        category: '',
        condition: '',
        brand: ''
    });
    const [showFilters, setShowFilters] = useState(false);
    const [filtersHovered, setFiltersHovered] = useState(false);

    useEffect(() => {
        const fetchResults = async () => {
            setLoading(true);
            const snapshot = await getDocs(collection(db, "products"));
            let items = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() } as Product))
                .filter(item =>
                    (item.name && item.name.toLowerCase().includes(query)) ||
                    (item.title && item.title.toLowerCase().includes(query))
                );
            // Apply filters
            if (selectedFilters.category) {
                items = items.filter(item => item.category?.toLowerCase() === selectedFilters.category.toLowerCase());
            }
            if (selectedFilters.condition) {
                items = items.filter(item =>
                    item.condition &&
                    item.condition.trim().toLowerCase() === selectedFilters.condition.trim().toLowerCase()
                );
            }
            if (selectedFilters.brand) {
                if (selectedFilters.brand === "Other") {
                    const allBrands = brands.map(b => b.toLowerCase()).filter(b => b !== "other");
                    items = items.filter(item => {
                        const name = item.name?.toLowerCase() || "";
                        const title = item.title?.toLowerCase() || "";
                        return !allBrands.some(brand =>
                            name.includes(brand) || title.includes(brand)
                        );
                    });
                } else {
                    items = items.filter(item =>
                        item.name?.toLowerCase().includes(selectedFilters.brand.toLowerCase()) ||
                        item.title?.toLowerCase().includes(selectedFilters.brand.toLowerCase())
                    );
                }
            }
            setResults(items);
            setLoading(false);
        };
        if (query) fetchResults();
        else setResults([]);
    }, [query, selectedFilters]);

    // Save as favourite handler
    const handleSaveFavourite = async (productId: string) => {
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) {
            alert("Please log in to save favourites.");
            return;
        }
        const favRef = doc(db, "favorites", user.uid);
        const favSnap = await getDoc(favRef);
        if (favSnap.exists()) {
            await updateDoc(favRef, {
                items: arrayUnion(productId)
            });
        } else {
            await setDoc(favRef, { items: [productId] });
        }
        alert("Saved to favourites!");
    };

    // Use router for navigation instead of window.location.href
    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchInput.trim()) {
            router.push(`/search_result?query=${encodeURIComponent(searchInput.trim())}`);
        }
    };

    const handleFilterChange = (filterType: keyof typeof selectedFilters, value: string) => {
        setSelectedFilters(prev => ({
            ...prev,
            [filterType]: prev[filterType] === value ? '' : value
        }));
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
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                                    gap: '2rem'
                                }}>
                                    {/* Category Filter */}
                                    <div>
                                        <label style={{ fontWeight: '600', color: '#333', marginBottom: '0.5rem', display: 'block' }}>
                                            Category
                                        </label>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                            {categories.map(category => (
                                                <button
                                                    key={category}
                                                    onClick={() => handleFilterChange('category', category)}
                                                    style={{
                                                        padding: '0.4rem 0.8rem',
                                                        border: `1px solid ${selectedFilters.category === category ? '#c9a26d' : '#ddd'}`,
                                                        background: selectedFilters.category === category ? '#c9a26d' : 'white',
                                                        color: selectedFilters.category === category ? 'white' : '#333',
                                                        borderRadius: '20px',
                                                        fontSize: '0.875rem',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s ease'
                                                    }}
                                                >
                                                    {category}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Condition Filter */}
                                    <div>
                                        <label style={{ fontWeight: '600', color: '#333', marginBottom: '0.5rem', display: 'block' }}>
                                            Condition
                                        </label>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                            {conditions.map(condition => (
                                                <button
                                                    key={condition}
                                                    onClick={() => handleFilterChange('condition', condition)}
                                                    style={{
                                                        padding: '0.4rem 0.8rem',
                                                        border: `1px solid ${selectedFilters.condition === condition ? '#c9a26d' : '#ddd'}`,
                                                        background: selectedFilters.condition === condition ? '#c9a26d' : 'white',
                                                        color: selectedFilters.condition === condition ? 'white' : '#333',
                                                        borderRadius: '20px',
                                                        fontSize: '0.875rem',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s ease'
                                                    }}
                                                >
                                                    {condition}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Brand Filter */}
                                    <div>
                                        <label style={{ fontWeight: '600', color: '#333', marginBottom: '0.5rem', display: 'block' }}>
                                            Brand
                                        </label>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                            {brands.map(brand => (
                                                <button
                                                    key={brand}
                                                    onClick={() => handleFilterChange('brand', brand)}
                                                    style={{
                                                        padding: '0.4rem 0.8rem',
                                                        border: `1px solid ${selectedFilters.brand === brand ? '#c9a26d' : '#ddd'}`,
                                                        background: selectedFilters.brand === brand ? '#c9a26d' : 'white',
                                                        color: selectedFilters.brand === brand ? 'white' : '#333',
                                                        borderRadius: '20px',
                                                        fontSize: '0.875rem',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s ease'
                                                    }}
                                                >
                                                    {brand}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
                                    <button
                                        onClick={() => setSelectedFilters({
                                            category: '', condition: '', brand: ''
                                        })}
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

                    <h2 style={{ fontSize: "2rem", fontWeight: "bold", marginBottom: "1.5rem" }}>
                        Search Results for "{query}"
                    </h2>
                    {loading ? (
                        <div>Loading...</div>
                    ) : results.length === 0 ? (
                        <div>No results found.</div>
                    ) : (
                        <div style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                            gap: "1.5rem"
                        }}>
                            {results.map(item => (
                                <div key={item.id} style={{
                                    background: "#fff",
                                    borderRadius: "12px",
                                    boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
                                    padding: "1rem",
                                    position: "relative"
                                }}>
                                    <div
                                        style={{ cursor: "pointer" }}
                                        onClick={() => router.push(`/view_item?id=${item.id}`)}
                                    >
                                        <img
                                            src={item.image || (item.images && item.images[0]) || "https://via.placeholder.com/200"}
                                            alt={item.name || item.title || "Product"}
                                            style={{ borderRadius: "8px", width: "100%", height: "140px", objectFit: "cover" }}
                                        />
                                        <div style={{ fontWeight: "bold", marginTop: "0.5rem" }}>
                                            {item.name || item.title}
                                        </div>
                                        <div>RM {item.price}</div>
                                    </div>
                                    <button
                                        style={{
                                            position: "absolute",
                                            top: "16px",
                                            right: "16px",
                                            background: "none",
                                            border: "none",
                                            cursor: "pointer",
                                            padding: 0
                                        }}
                                        title="Save as Favourite"
                                        onClick={e => {
                                            e.stopPropagation();
                                            handleSaveFavourite(item.id);
                                        }}
                                    >
                                        <svg
                                            width="28"
                                            height="28"
                                            viewBox="0 0 24 24"
                                            fill="#ff4081"
                                            stroke="#ff4081"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            style={{ display: "block" }}
                                        >
                                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41 0.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                                        </svg>
                                    </button>
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
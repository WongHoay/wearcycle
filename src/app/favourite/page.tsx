"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../../components/navbar";
import Footer from "../../components/footer";

// Type for favourite item
type FavouriteItem = {
    id: string;
    name: string;
    image: string;
    description?: string;
    price?: string;
    seller?: string;
};

// Fetch favourites from localStorage (simulate saved items)
const getFavourites = (): FavouriteItem[] => {
    if (typeof window === "undefined") return [];
    const data = localStorage.getItem("favourites");
    return data ? JSON.parse(data) : [];
};

// Remove item from favourites
const removeFromFavourites = (itemId: string): void => {
    if (typeof window === "undefined") return;
    const favourites = getFavourites();
    const updatedFavourites = favourites.filter(item => item.id !== itemId);
    localStorage.setItem("favourites", JSON.stringify(updatedFavourites));
};

const FavouritePage: React.FC = () => {
    const [favourites, setFavourites] = useState<FavouriteItem[]>([]);
    const router = useRouter();

    useEffect(() => {
        setFavourites(getFavourites());
    }, []);

    const handleRemoveFromFavourites = (itemId: string) => {
        removeFromFavourites(itemId);
        setFavourites(prev => prev.filter(item => item.id !== itemId));
    };

    const handleItemClick = (itemId: string) => {
        // Navigate to item detail page
        router.push(`/items/${itemId}`);
    };

    const styles = {
        favouritePage: {
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column" as const,
        },
        main: {
            flex: 1,
            padding: "32px",
            maxWidth: "1200px",
            margin: "0 auto",
            width: "100%",
        },
        title: {
            fontSize: "2rem",
            fontWeight: "bold",
            marginBottom: "2rem",
            color: "#222",
        },
        emptyState: {
            textAlign: "center" as const,
            padding: "64px 32px",
            color: "#666",
            fontSize: "1.1rem",
        },
        itemsList: {
            listStyle: "none",
            padding: 0,
            margin: 0,
        },
        itemCard: {
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "24px",
            background: "#fafafa",
            padding: "16px",
            borderRadius: "12px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            transition: "transform 0.2s ease, box-shadow 0.2s ease",
            cursor: "pointer",
            position: "relative" as const,
        },
        itemCardHover: {
            transform: "translateY(-2px)",
            boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
        },
        itemImage: {
            borderRadius: "8px",
            objectFit: "cover" as const,
            flexShrink: 0,
        },
        itemContent: {
            flex: 1,
            minWidth: 0,
        },
        itemName: {
            margin: 0,
            fontSize: "1.25rem",
            fontWeight: "600",
            color: "#222",
            marginBottom: "8px",
        },
        itemDescription: {
            margin: 0,
            color: "#666",
            fontSize: "0.9rem",
            lineHeight: "1.4",
        },
        itemPrice: {
            margin: "8px 0 0 0",
            fontSize: "1.1rem",
            fontWeight: "bold",
            color: "#2c5aa0",
        },
        itemSeller: {
            margin: "4px 0 0 0",
            fontSize: "0.85rem",
            color: "#888",
        },
        removeButton: {
            position: "absolute" as const,
            top: "16px",
            right: "16px",
            background: "#ff4757",
            color: "white",
            border: "none",
            borderRadius: "50%",
            width: "32px",
            height: "32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            fontSize: "14px",
            transition: "all 0.2s ease",
        },
        removeButtonHover: {
            background: "#ff3742",
            transform: "scale(1.1)",
        },
        itemCount: {
            fontSize: "1rem",
            color: "#666",
            marginBottom: "24px",
        },
    };

    return (
        <div style={styles.favouritePage}>
            <Navbar />
            <main style={styles.main}>
                <h1 style={styles.title}>Your Favourite Items</h1>
                
                {favourites.length > 0 && (
                    <p style={styles.itemCount}>
                        {favourites.length} item{favourites.length !== 1 ? 's' : ''} saved
                    </p>
                )}

                {favourites.length === 0 ? (
                    <div style={styles.emptyState}>
                        <p>No favourite items saved yet.</p>
                        <p>Start browsing and save items you love!</p>
                    </div>
                ) : (
                    <ul style={styles.itemsList}>
                        {favourites.map((item) => (
                            <li
                                key={item.id}
                                style={styles.itemCard}
                                onClick={() => handleItemClick(item.id)}
                                onMouseEnter={(e) => {
                                    Object.assign(e.currentTarget.style, styles.itemCardHover);
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = "translateY(0)";
                                    e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)";
                                }}
                            >
                                <img
                                    src={item.image}
                                    alt={item.name}
                                    width={120}
                                    height={120}
                                    style={styles.itemImage}
                                />
                                <div style={styles.itemContent}>
                                    <h2 style={styles.itemName}>{item.name}</h2>
                                    {item.description && (
                                        <p style={styles.itemDescription}>
                                            {item.description}
                                        </p>
                                    )}
                                    {item.price && (
                                        <p style={styles.itemPrice}>
                                            {item.price}
                                        </p>
                                    )}
                                    {item.seller && (
                                        <p style={styles.itemSeller}>
                                            Sold by {item.seller}
                                        </p>
                                    )}
                                </div>
                                <button
                                    style={styles.removeButton}
                                    onClick={(e) => {
                                        e.stopPropagation(); // Prevent item click when removing
                                        handleRemoveFromFavourites(item.id);
                                    }}
                                    onMouseEnter={(e) => {
                                        Object.assign(e.currentTarget.style, styles.removeButtonHover);
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = "#ff4757";
                                        e.currentTarget.style.transform = "scale(1)";
                                    }}
                                    title="Remove from favourites"
                                >
                                    ×
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </main>
            <Footer />
        </div>
    );
};

export default FavouritePage;
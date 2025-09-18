"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../../components/navbar";
import Footer from "../../components/footer";
import { getAuth } from "firebase/auth";
import { collection, getDocs, doc, deleteDoc } from "firebase/firestore";
import { db } from "../../firebaseConfig";

// Type for favourite item
type FavouriteItem = {
    id: string;
    name: string;
    image: string;
    description?: string;
    price?: string;
    seller?: string;
};

const FavouritePage: React.FC = () => {
    const [favourites, setFavourites] = useState<FavouriteItem[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const fetchFavourites = async () => {
            setLoading(true);
            const auth = getAuth();
            const user = auth.currentUser;
            if (!user) {
                setFavourites([]);
                setLoading(false);
                return;
            }
            const itemsRef = collection(db, "favorites", user.uid, "items");
            const snapshot = await getDocs(itemsRef);
            const items: FavouriteItem[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FavouriteItem));
            setFavourites(items);
            setLoading(false);
        };
        fetchFavourites();
    }, []);

    const handleItemClick = (itemId: string) => {
        // Navigate to item detail page
        router.push(`/view_item?id=${itemId}`);
    };

    const handleRemoveFavourite = async (itemId: string) => {
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) return;
        const itemRef = doc(db, "favorites", user.uid, "items", itemId);
        await deleteDoc(itemRef);
        setFavourites(prev => prev.filter(item => item.id !== itemId));
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
                {loading ? (
                    <div style={styles.emptyState}>Loading...</div>
                ) : favourites.length > 0 ? (
                    <>
                        <p style={styles.itemCount}>
                            {favourites.length} item{favourites.length !== 1 ? 's' : ''} saved
                        </p>
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
                                        src={item.image || item.images?.[0] || "https://via.placeholder.com/120"}
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
                                    {/* Heart icon for removing favourite */}
                                    <button
                                        onClick={e => {
                                            e.stopPropagation();
                                            handleRemoveFavourite(item.id);
                                        }}
                                        style={{
                                            position: "absolute",
                                            top: "16px",
                                            right: "16px",
                                            background: "none",
                                            border: "none",
                                            cursor: "pointer",
                                            padding: 0
                                        }}
                                        title="Remove from Favourites"
                                    >
                                        <svg
                                            width="28"
                                            height="28"
                                            viewBox="0 0 24 24"
                                            fill="#ff4757"
                                            stroke="#ff4757"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            style={{ display: "block" }}
                                        >
                                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41 0.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                                        </svg>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </>
                ) : (
                    <div style={styles.emptyState}>
                        <p>No favourite items saved yet.</p>
                        <p>Start browsing and save items you love!</p>
                    </div>
                )}
            </main>
            <Footer />
        </div>
    );
};

export default FavouritePage;
"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../../components/navbar";
import Footer from "../../components/footer";
import { getAuth } from "firebase/auth";
import { doc, getDoc, collection, getDocs, arrayRemove, updateDoc } from "firebase/firestore";
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
            // Get favorite IDs
            const favRef = doc(db, "favorites", user.uid);
            const favSnap = await getDoc(favRef);
            const favIds: string[] = favSnap.exists() ? favSnap.data().items || [] : [];
            if (favIds.length === 0) {
                setFavourites([]);
                setLoading(false);
                return;
            }
            // Fetch product details for each favorite
            const productsRef = collection(db, "products");
            const productsSnap = await getDocs(productsRef);
            const items: FavouriteItem[] = [];
            productsSnap.forEach(docSnap => {
                if (favIds.includes(docSnap.id)) {
                    const data = docSnap.data();
                    items.push({
                        id: docSnap.id,
                        name: data.name || data.title || "",
                        image: data.image || data.images?.[0] || "",
                        description: data.description || "",
                        price: data.price ? `RM ${data.price}` : "",
                        seller: data.seller || "",
                    });
                }
            });
            setFavourites(items);
            setLoading(false);
        };
        fetchFavourites();
    }, []);

    const handleItemClick = (itemId: string) => {
        // Navigate to item detail page
        router.push(`/items/${itemId}`);
    };

    const handleRemoveFavourite = async (itemId: string) => {
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) return;
        const favRef = doc(db, "favorites", user.uid);
        await updateDoc(favRef, {
            items: arrayRemove(itemId)
        });
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
                                        type="button"
                                        onClick={e => {
                                            e.stopPropagation();
                                            handleRemoveFavourite(item.id);
                                        }}
                                        style={{
                                            position: "absolute",
                                            top: "16px",
                                            right: "16px",
                                            background: "#fff",
                                            border: "1px solid #c9a26d",
                                            color: "#c9a26d",
                                            borderRadius: "8px",
                                            padding: "4px 10px",
                                            fontWeight: "bold",
                                            cursor: "pointer",
                                            fontSize: "0.9rem"
                                        }}
                                        title="Remove from favourites"
                                    >
                                        Remove
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
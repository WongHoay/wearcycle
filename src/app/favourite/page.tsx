"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../../components/navbar";
import Footer from "../../components/footer";
import { getAuth } from "firebase/auth";
import { collection, getDocs, doc, deleteDoc, getDoc } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { Heart, MapPin } from "lucide-react";

// Type for favourite item - matching HomePage Product interface
type FavouriteItem = {
    id: string;
    name?: string;
    title?: string;
    image?: string;
    images?: string[];
    price?: number;
    originalPrice?: number;
    category?: string;
    brand?: string;
    condition?: string;
    seller?: string | {
        username: string;
        avatar?: string;
    };
    sellerProfilePicture?: string;
    sellerId?: string;
    location?: string;
    size?: string;
    sold?: boolean;
    rating?: number;
    createdAt?: any;
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

            try {
                const itemsRef = collection(db, "favorites", user.uid, "items");
                const snapshot = await getDocs(itemsRef);

                const itemsWithNulls = await Promise.all(snapshot.docs.map(async docSnap => {
                    const data = docSnap.data() as FavouriteItem;
                    // Only include items that are not sold
                    if (data.sold) return null;

                    let sellerObj: { username: string; avatar?: string } | undefined = undefined;
                    if (data.sellerId) {
                        const sellerRef = doc(db, "users", data.sellerId);
                        const sellerSnap = await getDoc(sellerRef);
                        if (sellerSnap.exists()) {
                            const sellerData = sellerSnap.data();
                            sellerObj = {
                                username: sellerData.username || "Unknown Seller",
                                avatar: sellerData.profilePhotoUrl || "/api/placeholder/40/40"
                            };
                        }
                    }

                    return {
                        ...data,
                        id: docSnap.id,
                        seller: sellerObj
                    };
                }));

                const items = itemsWithNulls.filter((item): item is NonNullable<typeof item> => item !== null);
                setFavourites(items);
            } catch (error) {
                console.error("Error fetching favourites:", error);
                setFavourites([]);
            }
            setLoading(false);
        };

        fetchFavourites();
    }, []);

    const handleItemClick = (itemId: string) => {
        console.log("Navigating to item:", itemId);
        router.push(`/view_item?id=${itemId}`);
    };

    const handleRemoveFavourite = async (itemId: string) => {
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) return;
        
        try {
            console.log("Removing favorite:", itemId);
            const itemRef = doc(db, "favorites", user.uid, "items", itemId);
            await deleteDoc(itemRef);
            setFavourites(prev => prev.filter(item => item.id !== itemId));
            console.log("Successfully removed favorite");
        } catch (error) {
            console.error("Error removing favourite:", error);
        }
    };

    return (
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
            <Navbar />
            <div style={{ flex: 1, padding: "2rem", maxWidth: "1200px", margin: "0 auto", width: "100%" }}>
                <h1 style={{ fontSize: "2.5rem", fontWeight: "bold", marginBottom: "1rem", color: "#333" }}>
                    Your Favourite Items
                </h1>
                
                {loading ? (
                    <div style={{ 
                        display: 'flex', 
                        justifyContent: 'center', 
                        alignItems: 'center', 
                        minHeight: '200px',
                        fontSize: '1.2rem',
                        color: '#666'
                    }}>
                        Loading your favourites...
                    </div>
                ) : favourites.length > 0 ? (
                    <>
                        <p style={{ fontSize: "1rem", color: "#666", marginBottom: "2rem" }}>
                            {favourites.length} item{favourites.length !== 1 ? 's' : ''} saved
                        </p>
                        
                        {/* Grid layout for favorites - matching HomePage style */}
                        <div style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                            gap: "1.5rem"
                        }}>
                            {favourites.map((item) => (
                                <div
                                    key={item.id}
                                    style={{
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
                                    onClick={() => handleItemClick(item.id)}
                                >
                                    {/* Remove Favorite Button */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleRemoveFavourite(item.id);
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
                                        title="Remove from Favourites"
                                    >
                                        <Heart
                                            size={18}
                                            fill="#ff4757"
                                            color="#ff4757"
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
                                            src={item.image || item.images?.[0] || "https://via.placeholder.com/220"}
                                            alt={item.name || item.title || "Product"}
                                            style={{
                                                width: '100%',
                                                height: '100%',
                                                objectFit: 'cover'
                                            }}
                                        />
                                    </div>

                                    {/* Item Details - matching HomePage layout */}
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
                                            RM {item.price || 0}
                                            {item.originalPrice && (
                                                <span style={{
                                                    fontSize: '0.875rem',
                                                    color: '#999',
                                                    textDecoration: 'line-through',
                                                    marginLeft: '0.5rem',
                                                    fontWeight: '400'
                                                }}>
                                                    RM {item.originalPrice}
                                                </span>
                                            )}
                                        </div>

                                        {/* Seller Info */}
                                        {item.seller && typeof item.seller === "object" && (
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.5rem',
                                                marginBottom: '0.75rem'
                                            }}>
                                                <img
                                                    src={item.seller.avatar || "/api/placeholder/40/40"}
                                                    alt={item.seller.username}
                                                    style={{
                                                        width: '24px',
                                                        height: '24px',
                                                        borderRadius: '50%',
                                                        objectFit: 'cover',
                                                        border: '1px solid #ddd'
                                                    }}
                                                />
                                                <span style={{
                                                    fontSize: '0.875rem',
                                                    color: '#666',
                                                    fontWeight: '500'
                                                }}>
                                                    {item.seller.username}
                                                </span>
                                                {item.rating && (
                                                    <span style={{ fontSize: '0.75rem', color: '#666' }}>
                                                        ★ {item.rating}
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                        {/* Category, Condition, Brand, and Size badges */}
                                        <div style={{
                                            display: 'flex',
                                            gap: '0.5rem',
                                            marginBottom: '0.75rem',
                                            flexWrap: 'wrap'
                                        }}>
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
                                            {item.size && (
                                                <span style={{
                                                    background: '#f9f9f9',
                                                    color: '#666',
                                                    padding: '0.25rem 0.5rem',
                                                    borderRadius: '12px',
                                                    fontSize: '0.75rem'
                                                }}>
                                                    Size {item.size}
                                                </span>
                                            )}
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

                                        {/* Location */}
                                        {item.location && (
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.25rem',
                                                color: '#888',
                                                fontSize: '0.875rem'
                                            }}>
                                                <MapPin size={12} />
                                                {item.location}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                ) : (
                    <div style={{ 
                        textAlign: 'center', 
                        padding: '4rem 2rem', 
                        color: '#666',
                        fontSize: '1.2rem'
                    }}>
                        <div style={{ 
                            fontSize: '3rem', 
                            marginBottom: '1rem',
                            opacity: 0.3
                        }}>
                            💕
                        </div>
                        <h2 style={{ 
                            fontSize: '1.5rem', 
                            fontWeight: '600', 
                            marginBottom: '1rem',
                            color: '#333'
                        }}>
                            No favourite items yet
                        </h2>
                        <p style={{ marginBottom: '2rem' }}>
                            Start browsing and save items you love!
                        </p>
                        <button
                            onClick={() => router.push('/search_result')}
                            style={{
                                background: '#c9a26d',
                                color: 'white',
                                border: 'none',
                                padding: '0.75rem 2rem',
                                borderRadius: '25px',
                                fontSize: '1rem',
                                fontWeight: '600',
                                cursor: 'pointer'
                            }}
                        >
                            Browse Products
                        </button>
                    </div>
                )}
            </div>
            <Footer />
        </div>
    );
};

export default FavouritePage;
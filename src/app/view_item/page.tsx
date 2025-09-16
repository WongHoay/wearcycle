"use client";
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Navbar from '../../components/navbar';
import Footer from '../../components/footer';
import { getAuth } from "firebase/auth";
import { doc, setDoc, getDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { useRouter } from "next/navigation";

interface ItemDetail {
    id: string;
    name: string;
    price: number;
    description: string;
    images: string[];
    category: string;
    condition: string;
    seller: {
        name: string;
        rating: number;
        avatar: string;
    };
    specifications: { [key: string]: string };
    reviews: Array<{
        id: string;
        user: string;
        rating: number;
        comment: string;
        date: string;
    }>;
}

export default function ViewItemPage() {
    const searchParams = useSearchParams();
    const itemId = searchParams?.get('id');
    const [item, setItem] = useState<ItemDetail | null>(null);
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);
    const router = useRouter();

    useEffect(() => {
        if (!itemId) return;
        const fetchItem = async () => {
            const docRef = doc(db, "products", itemId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                setItem({
                    id: itemId,
                    name: data.name || data.title || "Unnamed Item",
                    price: data.price,
                    description: data.description || "",
                    images: data.images || [data.image] || [],
                    category: data.category || "",
                    condition: data.condition || "",
                    seller: {
                        name: data.seller || "Unknown Seller",
                        rating: data.rating || 0,
                        avatar: data.sellerAvatar || "/api/placeholder/50/50"
                    },
                    specifications: data.specifications || {},
                    reviews: data.reviews || []
                });
            }
        };
        fetchItem();
    }, [itemId]);

    const handleAddToCart = async () => {
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) {
            alert("Please log in to add items to your cart.");
            return;
        }
        const cartRef = doc(db, "carts", user.uid);
        const cartSnap = await getDoc(cartRef);
        if (cartSnap.exists()) {
            await updateDoc(cartRef, {
                items: arrayUnion(itemId)
            });
        } else {
            await setDoc(cartRef, { items: [itemId] });
        }
        alert("Item added to your cart!");
    };

    const handleBuyNow = () => {
        router.push(`/checkout?id=${itemId}`);
    };

    if (!item) return <div className="p-4">Loading...</div>;

    return (
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
            <Navbar />
            <div style={{ flex: 1, maxWidth: "1200px", margin: "0 auto", padding: "32px 16px" }}>
                <div style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "40px",
                    alignItems: "flex-start"
                }}>
                    {/* Image Gallery */}
                    <div>
                        <div style={{
                            width: "100%",
                            height: "400px",
                            background: "#f9f9f9",
                            borderRadius: "16px",
                            overflow: "hidden",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            marginBottom: "16px"
                        }}>
                            <Image
                                src={item.images[selectedImageIndex]}
                                alt={item.name}
                                width={400}
                                height={400}
                                style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                    borderRadius: "16px"
                                }}
                            />
                        </div>
                        <div style={{ display: "flex", gap: "12px", overflowX: "auto" }}>
                            {item.images.map((image, index) => (
                                <button
                                    key={index}
                                    onClick={() => setSelectedImageIndex(index)}
                                    style={{
                                        border: selectedImageIndex === index ? "2px solid #c9a26d" : "2px solid #eee",
                                        borderRadius: "8px",
                                        padding: 0,
                                        background: "none",
                                        cursor: "pointer",
                                        width: "70px",
                                        height: "70px",
                                        overflow: "hidden"
                                    }}
                                >
                                    <Image
                                        src={image}
                                        alt={`${item.name} ${index + 1}`}
                                        width={70}
                                        height={70}
                                        style={{
                                            width: "100%",
                                            height: "100%",
                                            objectFit: "cover",
                                            borderRadius: "8px"
                                        }}
                                    />
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Item Details */}
                    <div>
                        <h1 style={{ fontSize: "2rem", fontWeight: "bold", marginBottom: "8px" }}>{item.name}</h1>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "18px" }}>
                            <span style={{ fontSize: "2rem", fontWeight: "bold", color: "#d32f2f" }}>RM {item.price}</span>
                            <span style={{
                                background: "#e0f2f1",
                                color: "#388e3c",
                                padding: "4px 12px",
                                borderRadius: "8px",
                                fontSize: "1rem",
                                fontWeight: "500"
                            }}>
                                {item.condition}
                            </span>
                        </div>

                        {/* Seller Info */}
                        <div style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                            marginBottom: "18px",
                            background: "#f5f5f5",
                            padding: "12px",
                            borderRadius: "8px"
                        }}>
                            <Image
                                src={item.seller.avatar}
                                alt={item.seller.name}
                                width={40}
                                height={40}
                                style={{ borderRadius: "50%" }}
                            />
                            <div>
                                <div style={{ fontWeight: "600" }}>{item.seller.name}</div>
                                <div style={{ fontSize: "0.95rem", color: "#666" }}>
                                    ⭐ {item.seller.rating} rating
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div style={{ display: "flex", gap: "16px", marginBottom: "24px" }}>
                            <button
                                style={{
                                    flex: 1,
                                    background: "#1976d2",
                                    color: "#fff",
                                    padding: "12px",
                                    borderRadius: "8px",
                                    border: "none",
                                    fontWeight: "bold",
                                    fontSize: "1rem",
                                    cursor: "pointer"
                                }}
                                onClick={handleAddToCart}
                            >
                                Add to Cart
                            </button>
                            <button
                                style={{
                                    flex: 1,
                                    background: "#d32f2f",
                                    color: "#fff",
                                    padding: "12px",
                                    borderRadius: "8px",
                                    border: "none",
                                    fontWeight: "bold",
                                    fontSize: "1rem",
                                    cursor: "pointer"
                                }}
                                onClick={handleBuyNow}
                            >
                                Buy Now
                            </button>
                        </div>

                        {/* Specifications */}
                        <div style={{ borderTop: "1px solid #eee", paddingTop: "18px" }}>
                            <h3 style={{ fontWeight: "600", marginBottom: "12px" }}>Specifications</h3>
                            <div>
                                {Object.entries(item.specifications).length === 0 ? (
                                    <span style={{ color: "#888" }}>No specifications provided.</span>
                                ) : (
                                    Object.entries(item.specifications).map(([key, value]) => (
                                        <div key={key} style={{ display: "flex", marginBottom: "6px" }}>
                                            <span style={{ width: "120px", color: "#666" }}>{key}:</span>
                                            <span>{value}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Description */}
                <div style={{ marginTop: "40px", borderTop: "1px solid #eee", paddingTop: "24px" }}>
                    <h3 style={{ fontSize: "1.3rem", fontWeight: "600", marginBottom: "12px" }}>Description</h3>
                    <p style={{ color: "#444", fontSize: "1rem", lineHeight: "1.7" }}>{item.description}</p>
                </div>

                {/* Reviews */}
                <div style={{ marginTop: "40px", borderTop: "1px solid #eee", paddingTop: "24px" }}>
                    <h3 style={{ fontSize: "1.3rem", fontWeight: "600", marginBottom: "16px" }}>Reviews</h3>
                    <div>
                        {item.reviews.length === 0 ? (
                            <span style={{ color: "#888" }}>No reviews yet.</span>
                        ) : (
                            item.reviews.map((review) => (
                                <div key={review.id} style={{
                                    border: "1px solid #eee",
                                    borderRadius: "8px",
                                    padding: "16px",
                                    marginBottom: "16px"
                                }}>
                                    <div style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        marginBottom: "8px"
                                    }}>
                                        <span style={{ fontWeight: "600" }}>{review.user}</span>
                                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                            <span style={{ color: "#fbc02d", fontSize: "1.1rem" }}>
                                                {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                                            </span>
                                            <span style={{ fontSize: "0.95rem", color: "#888" }}>{review.date}</span>
                                        </div>
                                    </div>
                                    <p style={{ color: "#444", fontSize: "1rem" }}>{review.comment}</p>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    );
}
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
        username: string;
        rating: number;
        avatar: string;
    };
    specifications: { [key: string]: string };
    reviews: Array<{
        id: string;
        username: string;
        rating: number;
        comment: string;
        date: string;
    }>;
}

interface BidDetail extends ItemDetail {
    currentBid: number;
    minIncrement: number;
    endDate: string;
    bids: Array<{
        userId: string;
        amount: number;
        timestamp: string;
    }>;
}

export default function ViewItemPage() {
    const searchParams = useSearchParams();
    const itemId = searchParams?.get('id');
    const [item, setItem] = useState<ItemDetail | BidDetail | null>(null);
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);
    const [itemType, setItemType] = useState<"product" | "bid" | null>(null);
    const [bidAmount, setBidAmount] = useState<number>(0);
    const [placingBid, setPlacingBid] = useState(false);
    const [bidError, setBidError] = useState<string>("");
    const [highestBidderUsername, setHighestBidderUsername] = useState<string>("");
    const router = useRouter();

    useEffect(() => {
        if (!itemId) return;
        const fetchItem = async () => {
            // Try products first
            const docRef = doc(db, "products", itemId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                setItemType("product");
                const data = docSnap.data();

                // Fetch seller info from users collection
                let seller = {
                    username: "Unknown Seller",
                    rating: 0,
                    avatar: "/api/placeholder/50/50"
                };
                if (data.sellerId) {
                    const sellerRef = doc(db, "users", data.sellerId);
                    const sellerSnap = await getDoc(sellerRef);
                    if (sellerSnap.exists()) {
                        const sellerData = sellerSnap.data();
                        seller = {
                            username: sellerData.username || "Unknown Seller",
                            rating: sellerData.rating || 0,
                            avatar: sellerData.profilePhotoUrl || "/api/placeholder/50/50"
                        };
                    }
                }

                setItem({
                    id: itemId,
                    name: data.name || data.title || "Unnamed Item",
                    price: data.price,
                    description: data.description || "",
                    images: data.images || [data.image] || [],
                    category: data.category || "",
                    condition: data.condition || "",
                    seller,
                    specifications: data.specifications || {},
                    reviews: data.reviews || []
                });
            } else {
                // Try bids collection
                const bidRef = doc(db, "bids", itemId);
                const bidSnap = await getDoc(bidRef);
                if (bidSnap.exists()) {
                    setItemType("bid");
                    const data = bidSnap.data();

                    // Fetch seller info
                    let seller = {
                        username: "Unknown Seller",
                        rating: 0,
                        avatar: "/api/placeholder/50/50"
                    };
                    if (data.sellerId) {
                        const sellerRef = doc(db, "users", data.sellerId);
                        const sellerSnap = await getDoc(sellerRef);
                        if (sellerSnap.exists()) {
                            const sellerData = sellerSnap.data();
                            seller = {
                                username: sellerData.username || "Unknown Seller",
                                rating: sellerData.rating || 0,
                                avatar: sellerData.profilePhotoUrl || "/api/placeholder/50/50"
                            };
                        }
                    }

                    setItem({
                        id: itemId,
                        name: data.name || data.title || "Unnamed Bid Item",
                        price: data.price || 0,
                        description: data.description || "",
                        images: data.images || [data.image] || [],
                        category: data.category || "",
                        condition: data.condition || "",
                        seller,
                        specifications: data.specifications || {},
                        reviews: data.reviews || [],
                        currentBid: Number(data.currentBid) || 0,
                        minIncrement: Number(data.minIncrement) || 1,
                        endDate: data.endDate || "",
                        bids: data.bids || []
                    });

                    setBidAmount((Number(data.currentBid) || 0) + (Number(data.minIncrement) || 1));

                    // Fetch highest bidder's username
                    if (data.bids && data.bids.length > 0) {
                        const highestBid = data.bids.reduce((max: any, bid: any) => bid.amount > max.amount ? bid : max, data.bids[0]);
                        const bidderRef = doc(db, "users", highestBid.userId);
                        const bidderSnap = await getDoc(bidderRef);
                        if (bidderSnap.exists()) {
                            const bidderData = bidderSnap.data();
                            setHighestBidderUsername(bidderData.username || highestBid.userId);
                        } else {
                            setHighestBidderUsername(highestBid.userId);
                        }
                    } else {
                        setHighestBidderUsername("");
                    }
                } else {
                    setItemType(null);
                    setItem(null);
                }
            }
        };
        fetchItem();
    }, [itemId]);

    // Product actions
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

    // Bidding actions
    const handlePlaceBid = async () => {
        setBidError("");
        setPlacingBid(true);
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) {
            setBidError("Please log in to place a bid.");
            setPlacingBid(false);
            return;
        }
        if (!item || itemType !== "bid") {
            setBidError("Item not loaded.");
            setPlacingBid(false);
            return;
        }
        const bidItem = item as BidDetail;
        if (bidAmount < bidItem.currentBid + bidItem.minIncrement) {
            setBidError(`Bid must be at least RM ${(bidItem.currentBid + bidItem.minIncrement).toFixed(2)}`);
            setPlacingBid(false);
            return;
        }

        try {
            const bidRef = doc(db, "bids", bidItem.id);
            await updateDoc(bidRef, {
                bids: arrayUnion({
                    userId: user.uid,
                    amount: bidAmount,
                    timestamp: new Date().toISOString(),
                }),
                currentBid: bidAmount
            });
            setBidError("");
            alert("Bid placed successfully!");
            setPlacingBid(false);
            // Optionally, refresh bid info
            // You may want to refetch the bid item here
        } catch (err) {
            setBidError("Failed to place bid. Please try again.");
            setPlacingBid(false);
        }
    };

    if (!item) return <div className="p-4">Loading...</div>;

    // Product view
    if (itemType === "product") {
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
                                    alt={item.seller.username}
                                    width={40}
                                    height={40}
                                    style={{ borderRadius: "50%" }}
                                />
                                <div>
                                    <div style={{ fontWeight: "600" }}>{item.seller.username}</div>
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
                                            <span style={{ fontWeight: "600" }}>{review.username}</span>
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

    // Bid view
    if (itemType === "bid") {
        const bidItem = item as BidDetail;
        const now = new Date();
        const ended = bidItem && new Date(bidItem.endDate) < now;
        const hasBids = bidItem && bidItem.bids && bidItem.bids.length > 0;
        const highestBid = hasBids && bidItem.bids
            ? bidItem.bids.reduce((max, bid) => bid.amount > max.amount ? bid : max, bidItem.bids[0])
            : null;

        if (ended) {
            if (!hasBids) {
                // No bids, remove from bidding list (hide from bidders)
                return (
                    <div>
                        <Navbar />
                        <div style={{ textAlign: "center", padding: "64px" }}>
                            <h2>Bidding Ended</h2>
                            <p>No bids were placed. This item is no longer available.</p>
                        </div>
                        <Footer />
                    </div>
                );
            } else {
                // There are bids, show winner and proceed to checkout
                return (
                    <div>
                        <Navbar />
                        <div style={{ textAlign: "center", padding: "64px" }}>
                            <h2>Bidding Ended</h2>
                            <p>
                                Winner: <strong>{highestBidderUsername}</strong> <br />
                                Winning Bid: <strong>RM {highestBid?.amount}</strong>
                            </p>
                            <button
                                style={{
                                    background: "#1976d2",
                                    color: "#fff",
                                    padding: "12px 32px",
                                    borderRadius: "8px",
                                    border: "none",
                                    fontWeight: "bold",
                                    fontSize: "1.1rem",
                                    cursor: "pointer",
                                    marginTop: "24px"
                                }}
                                onClick={() => {
                                    // Only allow winner to proceed
                                    const auth = getAuth();
                                    const user = auth.currentUser;
                                    if (user && highestBid && user.uid === highestBid.userId) {
                                        window.location.href = `/checkout?id=${bidItem.id}&type=bid`;
                                    } else {
                                        alert("Only the winning bidder can proceed to checkout.");
                                    }
                                }}
                            >
                                Proceed to Checkout
                            </button>
                        </div>
                        <Footer />
                    </div>
                );
            }
        }

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
                                    src={bidItem.images[selectedImageIndex]}
                                    alt={bidItem.name}
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
                                {bidItem.images.map((image, index) => (
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
                                            alt={`${bidItem.name} ${index + 1}`}
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

                        {/* Bid Item Details */}
                        <div>
                            <h1 style={{ fontSize: "2rem", fontWeight: "bold", marginBottom: "8px" }}>{bidItem.name}</h1>
                            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "18px" }}>
                                <span style={{ fontSize: "2rem", fontWeight: "bold", color: "#d32f2f" }}>Current Bid: RM {bidItem.currentBid}</span>
                                <span style={{
                                    background: "#e0f2f1",
                                    color: "#388e3c",
                                    padding: "4px 12px",
                                    borderRadius: "8px",
                                    fontSize: "1rem",
                                    fontWeight: "500"
                                }}>
                                    {bidItem.condition}
                                </span>
                            </div>
                            <div style={{ marginBottom: "12px", color: "#666" }}>
                                Minimum Increment: RM {bidItem.minIncrement}
                            </div>
                            <div style={{ marginBottom: "12px", color: "#666" }}>
                                End Date: {bidItem.endDate}
                            </div>
                            {/* Latest Bidding Price */}
                            {bidItem.price !== undefined && hasBids && highestBid && (
                                <div style={{ marginBottom: "12px", color: "#1976d2", fontWeight: "bold" }}>
                                    Latest Bidding Price: RM {(bidItem.price + highestBid.amount).toFixed(2)}
                                    <br />
                                    Highest Bidder: {highestBidderUsername}
                                </div>
                            )}

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
                                    src={bidItem.seller.avatar}
                                    alt={bidItem.seller.username}
                                    width={40}
                                    height={40}
                                    style={{ borderRadius: "50%" }}
                                />
                                <div>
                                    <div style={{ fontWeight: "600" }}>{bidItem.seller.username}</div>
                                    <div style={{ fontSize: "0.95rem", color: "#666" }}>
                                        ⭐ {bidItem.seller.rating} rating
                                    </div>
                                </div>
                            </div>

                            {/* Place Bid Form */}
                            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "24px" }}>
                                <label style={{ fontWeight: "bold" }}>Your Bid (RM):</label>
                                <input
                                    type="number"
                                    min={bidItem.currentBid + bidItem.minIncrement}
                                    value={bidAmount}
                                    onChange={e => setBidAmount(Number(e.target.value))}
                                    style={{
                                        padding: "8px",
                                        borderRadius: "8px",
                                        border: "1px solid #ccc",
                                        fontSize: "1rem",
                                        marginBottom: "8px"
                                    }}
                                    disabled={placingBid}
                                />
                                <button
                                    style={{
                                        background: "#c9a26d",
                                        color: "#fff",
                                        padding: "12px",
                                        borderRadius: "8px",
                                        border: "none",
                                        fontWeight: "bold",
                                        fontSize: "1rem",
                                        cursor: "pointer"
                                    }}
                                    onClick={handlePlaceBid}
                                    disabled={placingBid}
                                >
                                    {placingBid ? "Placing Bid..." : "Place Bid"}
                                </button>
                                {bidError && <span style={{ color: "red", fontWeight: "bold" }}>{bidError}</span>}
                            </div>

                            {/* Specifications */}
                            <div style={{ borderTop: "1px solid #eee", paddingTop: "18px" }}>
                                <h3 style={{ fontWeight: "600", marginBottom: "12px" }}>Specifications</h3>
                                <div>
                                    <span style={{ color: "#888" }}>No specifications provided.</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Description */}
                    <div style={{ marginTop: "40px", borderTop: "1px solid #eee", paddingTop: "24px" }}>
                        <h3 style={{ fontSize: "1.3rem", fontWeight: "600", marginBottom: "12px" }}>Description</h3>
                        <p style={{ color: "#444", fontSize: "1rem", lineHeight: "1.7" }}>{bidItem.description}</p>
                    </div>
                </div>
                <Footer />
            </div>
        );
    }

    // Not found
    return (
        <div>
            <Navbar />
            <div style={{ textAlign: "center", padding: "64px" }}>
                <h2>Item not found</h2>
                <p>This item does not exist.</p>
            </div>
            <Footer />
        </div>
    );
}
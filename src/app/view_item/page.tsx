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
    brand?: string;
    size?: string;
    seller: {
        username: string;
        avatar: string;
    };
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
    productName?: string;
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
                    avatar: "/api/placeholder/50/50"
                };
                if (data.sellerId) {
                    const sellerRef = doc(db, "users", data.sellerId);
                    const sellerSnap = await getDoc(sellerRef);
                    if (sellerSnap.exists()) {
                        const sellerData = sellerSnap.data();
                        seller = {
                            username: sellerData.username || "Unknown Seller",
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
                    brand: data.brand || "",
                    size: data.size || ""
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
                        avatar: "/api/placeholder/50/50"
                    };
                    if (data.sellerId) {
                        const sellerRef = doc(db, "users", data.sellerId);
                        const sellerSnap = await getDoc(sellerRef);
                        if (sellerSnap.exists()) {
                            const sellerData = sellerSnap.data();
                            seller = {
                                username: sellerData.username || "Unknown Seller",
                                avatar: sellerData.profilePhotoUrl || "/api/placeholder/50/50"
                            };
                        }
                    }

                    setItem({
                        id: itemId,
                        name: data.productName || data.title || "Unnamed Bid Item",
                        price: data.price || 0,
                        description: data.description || "",
                        images: data.images || [data.image] || [],
                        category: data.category || "",
                        condition: data.condition || "",
                        seller,
                        brand: data.brand || "",
                        size: data.size || "",
                        currentBid: Number(data.currentBid) || 0,
                        minIncrement: Number(data.minIncrement) || 1,
                        endDate: data.endDate || "",
                        bids: data.bids || [],
                        productName: data.productName || ""
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

    const handleBuyNow = async () => {
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) {
            alert("Please log in to buy items.");
            return;
        }
        // Do NOT add to cart!
        router.push(`/checkout?id=${itemId}&type=product`);
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

            // Find previous highest bidder before updating
            let previousHighestBid = null;
            if (bidItem.bids && bidItem.bids.length > 0) {
                previousHighestBid = bidItem.bids.reduce((max, bid) => bid.amount > max.amount ? bid : max, bidItem.bids[0]);
            }

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

            // Fetch emails for notifications
            const bidderEmail = user.email;
            const bidderName = user.displayName || user.email;
            const itemTitle = bidItem.name || bidItem.productName;
            const itemId = bidItem.id;

            // Fetch previous highest bidder's email if outbid
            let outbidEmail = null;
            if (previousHighestBid && previousHighestBid.userId !== user.uid) {
                const prevBidderRef = doc(db, "users", previousHighestBid.userId);
                const prevBidderSnap = await getDoc(prevBidderRef);
                if (prevBidderSnap.exists()) {
                    outbidEmail = prevBidderSnap.data().email;
                }
            }

            // Fetch seller email if you want to notify seller of new bid
            let sellerEmail = null;
            if (bidItem.seller && bidItem.seller.username !== "Unknown Seller") {
                const bidRef = doc(db, "bids", itemId);
                const bidSnap = await getDoc(bidRef);
                if (bidSnap.exists()) {
                    const bidData = bidSnap.data();
                    if (bidData.sellerId) {
                        const sellerRef = doc(db, "users", bidData.sellerId);
                        const sellerSnap = await getDoc(sellerRef);
                        if (sellerSnap.exists()) {
                            sellerEmail = sellerSnap.data().email;
                        }
                    }
                }
            }

            // Send emails via your API
            await fetch("/api/send-email", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type: "new_bid",
                    data: {
                        bidderEmail,
                        bidderName,
                        bidAmount,
                        itemTitle,
                        itemId,
                        sellerEmail,
                        outbidEmail: outbidEmail
                            ? {
                                bidderEmail: outbidEmail,
                                currentBid: bidAmount,
                                itemTitle,
                                itemId,
                                minIncrement: bidItem.minIncrement,
                                previousBidderId: previousHighestBid?.userId,
                                bidderId: user.uid
                            }
                            : null
                    }
                })
            });

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
                                <span style={{ fontSize: "2rem", fontWeight: "normal", color: "#121212" }}>RM {item.price}</span>
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
                                <span style={{ fontWeight: "500" }}>{item.seller.username}</span>
                            </div>

                            {/* Action Buttons */}
                            <div style={{ display: "flex", gap: "16px", marginBottom: "24px" }}>
                                <button
                                    style={{
                                        flex: 1,
                                        background: "#cd984d",
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
                                        background: "#008080",
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

                            {/* Product Details */}
                            <div style={{ borderTop: "1px solid #eee", paddingTop: "18px" }}>
                                <h3 style={{ fontWeight: "600", marginBottom: "12px" }}>Details</h3>
                                <div>
                                    <div style={{ display: "flex", marginBottom: "6px" }}>
                                        <span style={{ width: "120px", color: "#666" }}>Brand:</span>
                                        <span>{item.brand || "N/A"}</span>
                                    </div>
                                    <div style={{ display: "flex", marginBottom: "6px" }}>
                                        <span style={{ width: "120px", color: "#666" }}>Size:</span>
                                        <span>{item.size || "N/A"}</span>
                                    </div>
                                    <div style={{ display: "flex", marginBottom: "6px" }}>
                                        <span style={{ width: "120px", color: "#666" }}>Category:</span>
                                        <span>{item.category || "N/A"}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Description */}
                    <div style={{ marginTop: "40px", borderTop: "1px solid #eee", paddingTop: "24px" }}>
                        <h3 style={{ fontSize: "1.3rem", fontWeight: "600", marginBottom: "12px" }}>Description</h3>
                        <p style={{ color: "#444", fontSize: "1rem", lineHeight: "1.7" }}>{item.description}</p>
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
                    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
                        <Navbar />
                        <div style={{ flex: 1 }}>
                            <div style={{ textAlign: "center", padding: "64px" }}>
                                <h2>Bidding Ended</h2>
                                <p>No bids were placed. This item is no longer available.</p>
                            </div>
                        </div>
                        <Footer />
                    </div>
                );
            } else {
                // There are bids, show winner and proceed to checkout
                return (
                    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
                        <Navbar />
                        <div style={{ flex: 1 }}>
                            <div style={{ textAlign: "center", padding: "64px" }}>
                                <h2>Bidding Ended</h2>
                                <p>
                                    Winner: <strong>{highestBidderUsername}</strong> <br />
                                    Winning Bid: <strong>RM {highestBid?.amount}</strong>
                                </p>
                                <button
                                    style={{
                                        background: "#cd984d",
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
                                    alt={bidItem.name || bidItem.productName || "Bid Item"}
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
                                            alt={`${bidItem.name || bidItem.productName || "Bid Item"} ${index + 1}`}
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
                            <h1 style={{ fontSize: "2rem", fontWeight: "bold", marginBottom: "8px" }}>
                                {bidItem.name || bidItem.productName || "Unnamed Bid Item"}
                            </h1>
                            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "18px" }}>
                                <span style={{ fontSize: "2rem", fontWeight: "bold", color: "black" }}>
                                    Item Price: RM {bidItem.price}
                                </span>
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
                                Time Remaining: {
                                    (() => {
                                        const end = new Date(bidItem.endDate);
                                        const now = new Date();
                                        const diff = end.getTime() - now.getTime();
                                        if (diff <= 0) return "Ended";
                                        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                                        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
                                        const minutes = Math.floor((diff / (1000 * 60)) % 60);
                                        return `${days}d ${hours}h ${minutes}m`;
                                    })()
                                }
                            </div>
                            <div style={{ marginBottom: "12px", color: "#666" }}>
                                Minimum Increment: RM {bidItem.minIncrement}
                            </div>
                            <div style={{ marginBottom: "12px", color: "#666" }}>
                                End Date: {bidItem.endDate}
                            </div>
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
                                <span style={{ fontWeight: "500" }}>{bidItem.seller.username}</span>
                            </div>

                            {/* Place Bid Form */}
                            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "24px" }}>
                                <div style={{
                                    background: "#e3f2fd",
                                    border: "1px solid #90caf9",
                                    borderRadius: "8px",
                                    padding: "12px",
                                    marginBottom: "16px",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "10px"
                                }}>
                                    <span style={{
                                        display: "inline-block",
                                        width: "24px",
                                        height: "24px",
                                        background: "#1976d2",
                                        color: "#fff",
                                        borderRadius: "50%",
                                        textAlign: "center",
                                        lineHeight: "24px",
                                        fontWeight: "bold",
                                        fontSize: "1.1rem"
                                    }}>✉️</span>
                                    <div>
                                        <strong>Email Notifications Enabled</strong>
                                        <div style={{ fontSize: "0.97rem", color: "#1976d2" }}>
                                            You’ll receive email updates if someone outbids you or when the auction ends.
                                        </div>
                                    </div>
                                </div>

                                <label style={{ fontWeight: "bold" }}>Your Bid (RM):</label>
                                <input
                                    type="number"
                                    min={bidItem.minIncrement}
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

                            {/* Show brand, size, category directly */}
                            <div style={{ borderTop: "1px solid #eee", paddingTop: "18px" }}>
                                <h3 style={{ fontWeight: "600", marginBottom: "12px" }}>Details</h3>
                                <div>
                                    <div style={{ display: "flex", marginBottom: "6px" }}>
                                        <span style={{ width: "120px", color: "#666" }}>Brand:</span>
                                        <span>{bidItem.brand || "N/A"}</span>
                                    </div>
                                    <div style={{ display: "flex", marginBottom: "6px" }}>
                                        <span style={{ width: "120px", color: "#666" }}>Size:</span>
                                        <span>{bidItem.size || "N/A"}</span>
                                    </div>
                                    <div style={{ display: "flex", marginBottom: "6px" }}>
                                        <span style={{ width: "120px", color: "#666" }}>Category:</span>
                                        <span>{bidItem.category || "N/A"}</span>
                                    </div>
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
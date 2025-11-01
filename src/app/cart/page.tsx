'use client'

import React, { useState, useEffect } from "react";
import Navbar from "../../components/navbar";
import { getAuth } from "firebase/auth";
import { doc, getDoc, collection, getDocs, setDoc } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { useRouter } from "next/navigation";
import { useFirebaseUser } from "../../hooks/useFirebaseUser";

interface CartItem {
    id: string;
    name: string;
    price: number;
    image: string;
    size: string;
    sellerId: string; 
}

const checkboxStyle = {
    accentColor: "#008080",
    width: "22px",
    height: "22px",
    borderRadius: "6px",
    border: "2px solid #008080",
    cursor: "pointer",
    marginRight: "4px",
    boxShadow: "0 1px 2px rgba(0,0,0,0.07)"
};

export default function CartPage() {
    const { user, loadingUser } = useFirebaseUser();
    const [cartItems, setCartItems] = useState<CartItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [sellerInfo, setSellerInfo] = useState<{ [sellerId: string]: { name: string; avatar: string } }>({});
    const [userStatus, setUserStatus] = useState("active");
    const router = useRouter();

    useEffect(() => {
        if (loadingUser) return; // Wait until user is loaded
        const fetchCart = async () => {
            setLoading(true);
            if (!user) {
                setCartItems([]);
                setLoading(false);
                return;
            }
            const cartRef = doc(db, "carts", user.uid);
            const cartSnap = await getDoc(cartRef);
            const cartIds: string[] = cartSnap.exists() ? cartSnap.data().items || [] : [];
            if (cartIds.length === 0) {
                setCartItems([]);
                setLoading(false);
                return;
            }
            const productsRef = collection(db, "products");
            const productsSnap = await getDocs(productsRef);
            const items: CartItem[] = [];
            productsSnap.forEach(docSnap => {
                if (cartIds.includes(docSnap.id)) {
                    const data = docSnap.data();
                    items.push({
                        id: docSnap.id,
                        name: data.name || data.title || "",
                        price: Number(data.price),
                        image: data.image || data.images?.[0] || "",
                        size: data.size || "",
                        sellerId: data.sellerId || "",
                    });
                }
            });
            setCartItems(items);
            setLoading(false);
        };
        fetchCart();
    }, [user, loadingUser]);

    useEffect(() => {
        const fetchSellers = async () => {
            const sellerIds = Array.from(new Set(cartItems.map(item => item.sellerId)));
            const info: { [sellerId: string]: { name: string; avatar: string } } = {};
            for (const sellerId of sellerIds) {
                if (!sellerId) continue;
                const sellerRef = doc(db, "users", sellerId); // or "sellers"
                const sellerSnap = await getDoc(sellerRef);
                if (sellerSnap.exists()) {
                    const data = sellerSnap.data();
                    info[sellerId] = {
                        name: data.displayName || data.name || data.username || "Unknown Seller",
                        avatar: data.avatar || data.photoURL || data.profilePhotoUrl || "/default_avatar.png"
                    };
                } else {
                    info[sellerId] = {
                        name: "Unknown Seller",
                        avatar: "/default_avatar.png"
                    };
                }
            }
            setSellerInfo(info);
        };
        if (cartItems.length > 0) fetchSellers();
    }, [cartItems]);

    const removeItem = async (id: string) => {
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) return;
        const cartRef = doc(db, "carts", user.uid);
        const cartSnap = await getDoc(cartRef);
        if (cartSnap.exists()) {
            const items: string[] = cartSnap.data().items || [];
            const updatedItems = items.filter(itemId => itemId !== id);
            await setDoc(cartRef, { items: updatedItems });
        }
        setCartItems(prev => prev.filter(item => item.id !== id));
    };

    // Get the seller of the first selected item
    const selectedSeller = selectedIds.length > 0
        ? cartItems.find(item => item.id === selectedIds[0])?.sellerId
        : null;

    const handleCheckboxChange = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(itemId => itemId !== id) : [...prev, id]
        );
    };

    const totalPrice = cartItems
        .filter(item => selectedIds.includes(item.id))
        .reduce((sum, item) => sum + item.price, 0);

    const handleCheckout = () => {
        if (selectedIds.length === 0) {
            alert("Please select at least one item to checkout.");
            return;
        }
        // Get selected items
        const selectedItems = cartItems.filter(item => selectedIds.includes(item.id));
        // Get all unique sellers
        const sellers = Array.from(new Set(selectedItems.map(item => item.sellerId)));
        if (sellers.length > 1) {
            alert("You can only checkout items from the same seller. Please select items from one seller only.");
            return;
        }
        localStorage.setItem("checkoutItems", JSON.stringify(selectedIds));
        router.push("/checkout");
    };

    // Group cart items by sellerId
    const sellerGroups: { [sellerId: string]: CartItem[] } = {};
    cartItems.forEach(item => {
        if (!sellerGroups[item.sellerId]) sellerGroups[item.sellerId] = [];
        sellerGroups[item.sellerId].push(item);
    });

    useEffect(() => {
        const fetchUserStatus = async () => {
            const auth = getAuth();
            const user = auth.currentUser;
            if (user) {
                const userDoc = await getDoc(doc(db, "users", user.uid));
                if (userDoc.exists()) {
                    setUserStatus(userDoc.data().status || "active");
                }
            }
        };
        fetchUserStatus();
    }, []);

    if (loadingUser) {
        return <div style={{ padding: 40, textAlign: "center" }}>Loading...</div>;
    }

    if (userStatus === "suspended") {
        return (
            <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#f5f5f5" }}>
                <Navbar />
                <main style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center" }}>
                    <div style={{
                        background: "#fff",
                        padding: "32px",
                        borderRadius: "12px",
                        boxShadow: "0 2px 16px #aaa",
                        textAlign: "center",
                        minWidth: "320px"
                    }}>
                        <h2 style={{ color: "#c0392b", marginBottom: "16px" }}>Account Suspended</h2>
                        <p style={{ color: "#c0392b", fontWeight: "bold", marginBottom: "24px" }}>
                            Your account is suspended. You cannot checkout or purchase items.
                        </p>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <>
            <Navbar />
            {loading ? (
                <div className="min-h-screen flex items-center justify-center">Loading...</div>
            ) : cartItems.length === 0 ? (
                <div className="min-h-screen bg-gray-50 py-12">
                    <div className="max-w-4xl mx-auto px-4 text-center">
                        <h1 className="text-3xl font-bold text-gray-900 mb-8">Your Cart</h1>
                        <div className="bg-white rounded-lg shadow-md p-12">
                            <p className="text-gray-500 text-lg mb-6">Your cart is empty</p>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="min-h-screen bg-gray-50 py-12">
                    <div className="max-w-7xl mx-auto px-6">
                        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">Your Cart</h1>
                        <div className="space-y-8">
                            {Object.entries(sellerGroups).map(([sellerId, items]) => {
                                const sellerTotal = items
                                    .filter(item => selectedIds.includes(item.id))
                                    .reduce((sum, item) => sum + item.price, 0);
                                const sellerSelectedCount = items.filter(item => selectedIds.includes(item.id)).length;
                                return (
                                    <div key={sellerId} className="bg-white rounded-xl shadow-md p-8 border border-gray-100">
                                        <div className="flex items-center justify-between mb-6">
                                            <div className="flex items-center gap-3 font-bold text-lg truncate">
                                                <img
                                                    src={sellerInfo[sellerId]?.avatar || "/default_avatar.png"}
                                                    alt={sellerInfo[sellerId]?.name || "Seller"}
                                                    className="w-10 h-10 rounded-full object-cover border"
                                                />
                                                <span>{sellerInfo[sellerId]?.name || "Unknown Seller"}</span>
                                            </div>
                                            <div className="text-gray-500 text-sm">{items.length} item{items.length > 1 ? "s" : ""}</div>
                                        </div>
                                        <table className="w-full mb-4">
                                            <tbody>
                                                {items.map(item => (
                                                    <tr key={item.id} className="border-b">
                                                        <td className="py-4 text-center">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedIds.includes(item.id)}
                                                                onChange={() => handleCheckboxChange(item.id)}
                                                                style={checkboxStyle}
                                                            />
                                                        </td>
                                                        <td className="py-4 flex items-center">
                                                            <img src={item.image} alt={item.name} className="w-16 h-16 object-cover rounded mr-4" />
                                                            <span className="font-medium">{item.name}</span>
                                                        </td>
                                                        <td className="py-4 text-center">{item.size}</td>
                                                        <td className="py-4 text-center">RM {item.price.toFixed(2)}</td>
                                                        <td className="py-4 text-center">
                                                            <button
                                                                onClick={() => removeItem(item.id)}
                                                                className="text-red-500 hover:underline"
                                                            >
                                                                Remove
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        <div className="flex justify-between items-center mt-2">
                                            <span className="font-bold text-lg">
                                                {sellerSelectedCount} item{sellerSelectedCount !== 1 ? "s" : ""} selected
                                            </span>
                                            <span className="font-bold text-lg">
                                                RM {sellerTotal.toFixed(2)}
                                            </span>
                                        </div>
                                        <button
                                            className={`mt-4 w-full py-3 rounded-lg font-bold text-white text-lg transition shadow-lg ${
                                                sellerSelectedCount === 0
                                                    ? "bg-gray-300 cursor-not-allowed"
                                                    : "bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800"
                                            }`}
                                            disabled={sellerSelectedCount === 0}
                                            onClick={() => {
                                                // Only checkout selected items from this seller
                                                const sellerSelectedIds = items.filter(item => selectedIds.includes(item.id)).map(item => item.id);
                                                if (sellerSelectedIds.length === 0) return;
                                                localStorage.setItem("checkoutItems", JSON.stringify(sellerSelectedIds));
                                                router.push("/checkout");
                                            }}
                                        >
                                            Checkout
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
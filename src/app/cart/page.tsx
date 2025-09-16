'use client'

import React, { useState, useEffect } from "react";
import Navbar from "../../components/navbar";
import { getAuth } from "firebase/auth";
import { doc, getDoc, collection, getDocs, setDoc } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { useRouter } from "next/navigation";

interface CartItem {
    id: string;
    name: string;
    price: number;
    image: string;
    size: string;
}

export default function CartPage() {
    const [cartItems, setCartItems] = useState<CartItem[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const fetchCart = async () => {
            setLoading(true);
            const auth = getAuth();
            const user = auth.currentUser;
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
                    });
                }
            });
            setCartItems(items);
            setLoading(false);
        };
        fetchCart();
    }, []);

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

    const totalPrice = cartItems.reduce((sum, item) => sum + item.price, 0);

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
                    <div className="max-w-4xl mx-auto px-4">
                        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">Your Cart</h1>
                        <div className="bg-white rounded-lg shadow-md p-8">
                            <table className="w-full mb-8">
                                <thead>
                                    <tr className="border-b">
                                        <th className="py-2 text-left">Product</th>
                                        <th className="py-2 text-center">Size</th>
                                        <th className="py-2 text-center">Price</th>
                                        <th className="py-2"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {cartItems.map(item => (
                                        <tr key={item.id} className="border-b">
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
                            <div className="flex justify-between items-center">
                                <span className="text-xl font-bold">Total: RM {totalPrice.toFixed(2)}</span>
                                <button
                                    className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 font-semibold"
                                    onClick={() => router.push("/checkout")}
                                >
                                    Checkout
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
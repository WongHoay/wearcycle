'use client'

import React, { useState, useEffect } from "react";
import Navbar from "../../components/navbar";

interface CartItem {
    id: string;
    name: string;
    price: number;
    image: string;
    size: string;
    quantity: number;
}

export default function CartPage() {
    const [cartItems, setCartItems] = useState<CartItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Load cart items from localStorage or API
        const savedCart = localStorage.getItem('cart');
        if (savedCart) {
            setCartItems(JSON.parse(savedCart));
        }
        setLoading(false);
    }, []);

    const updateQuantity = (id: string, newQuantity: number) => {
        if (newQuantity <= 0) {
            removeItem(id);
            return;
        }
        const updatedItems = cartItems.map(item =>
            item.id === id ? { ...item, quantity: newQuantity } : item
        );
        setCartItems(updatedItems);
        localStorage.setItem('cart', JSON.stringify(updatedItems));
    };

    const removeItem = (id: string) => {
        const updatedItems = cartItems.filter(item => item.id !== id);
        setCartItems(updatedItems);
        localStorage.setItem('cart', JSON.stringify(updatedItems));
    };

    const totalPrice = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

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
                                        <th className="py-2 text-center">Quantity</th>
                                        <th className="py-2 text-center">Total</th>
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
                                            <td className="py-4 text-center">${item.price.toFixed(2)}</td>
                                            <td className="py-4 text-center">
                                                <input
                                                    type="number"
                                                    min={1}
                                                    value={item.quantity}
                                                    onChange={e => updateQuantity(item.id, Number(e.target.value))}
                                                    className="w-16 px-2 py-1 border rounded text-center"
                                                />
                                            </td>
                                            <td className="py-4 text-center font-semibold">
                                                ${(item.price * item.quantity).toFixed(2)}
                                            </td>
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
                                <span className="text-xl font-bold">Total: ${totalPrice.toFixed(2)}</span>
                                <button
                                    className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 font-semibold"
                                    onClick={() => alert("Proceed to checkout")}
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
"use client";
import { useEffect, useState } from "react";
import { getAuth } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import Navbar from "../../components/navbar";

export default function CheckoutPage() {
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState("");
  const [address, setAddress] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [phone, setPhone] = useState("");

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
      if (cartSnap.exists()) {
        const cartData = cartSnap.data();
        const items = [];
        for (const itemId of cartData.items || []) {
          // Try products first
          let itemRef = doc(db, "products", itemId);
          let itemSnap = await getDoc(itemRef);
          if (itemSnap.exists()) {
            items.push({ id: itemId, ...itemSnap.data(), type: "product" });
            continue;
          }
          // Try bids
          itemRef = doc(db, "bids", itemId);
          itemSnap = await getDoc(itemRef);
          if (itemSnap.exists()) {
            items.push({ id: itemId, ...itemSnap.data(), type: "bid" });
          }
        }
        setCartItems(items);
      } else {
        setCartItems([]);
      }
      setLoading(false);
    };
    fetchCart();
  }, []);

  const handleDelete = async (itemId: string) => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return;
    const cartRef = doc(db, "carts", user.uid);
    const cartSnap = await getDoc(cartRef);
    if (cartSnap.exists()) {
      const cartData = cartSnap.data();
      const newItems = (cartData.items || []).filter((id: string) => id !== itemId);
      await updateDoc(cartRef, { items: newItems });
      setCartItems(cartItems.filter(item => item.id !== itemId));
    }
  };

  const totalAmount = cartItems.reduce((sum, item) => {
    if (item.type === "product") return sum + (item.price || 0);
    if (item.type === "bid") return sum + (item.currentBid || 0);
    return sum;
  }, 0);

  return (
    <div style={{ background: "#f5f5f5", minHeight: "100vh" }}>
      <Navbar />
      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "2rem" }}>
        <h2 style={{ fontSize: "2rem", fontWeight: "bold", marginBottom: "2rem" }}>Order Summary</h2>
        {loading ? (
          <div>Loading cart...</div>
        ) : cartItems.length === 0 ? (
          <div>No items in your cart.</div>
        ) : (
          <div style={{ background: "#e6cfa7", borderRadius: "12px", padding: "1.5rem", marginBottom: "2rem" }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <input type="checkbox" checked readOnly style={{ marginRight: "1rem" }} />
              <img
                src={cartItems[0].image || (cartItems[0].images && cartItems[0].images[0]) || "https://via.placeholder.com/100"}
                alt={cartItems[0].name || cartItems[0].title}
                style={{ width: "100px", height: "100px", objectFit: "cover", borderRadius: "8px", marginRight: "1.5rem" }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: "bold", fontSize: "1.1rem" }}>
                  {cartItems[0].name || cartItems[0].title}
                </div>
                <button
                  onClick={() => handleDelete(cartItems[0].id)}
                  style={{
                    marginTop: "0.5rem",
                    background: "#222",
                    color: "#fff",
                    border: "none",
                    borderRadius: "6px",
                    padding: "6px 16px",
                    cursor: "pointer"
                  }}
                >
                  Delete
                </button>
              </div>
              <div style={{ fontWeight: "bold", fontSize: "1.1rem" }}>
                {cartItems[0].type === "product"
                  ? <>RM {cartItems[0].price}</>
                  : <>RM {cartItems[0].currentBid}</>
                }
              </div>
            </div>
          </div>
        )}

        {/* Cart Summary */}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2rem" }}>
          <div>
            <h3 style={{ fontSize: "1.3rem", fontWeight: "bold" }}>Cart Summary</h3>
            <p style={{ color: "#666" }}>Check the items and their total.</p>
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", marginBottom: "0.5rem" }}>
              <span role="img" aria-label="items" style={{ fontSize: "1.5rem", marginRight: "0.5rem" }}>🛍️</span>
              <span style={{ fontWeight: "bold" }}>Total Items</span>
              <span style={{ marginLeft: "1rem" }}>{cartItems.length}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center" }}>
              <span role="img" aria-label="amount" style={{ fontSize: "1.5rem", marginRight: "0.5rem" }}>💲</span>
              <span style={{ fontWeight: "bold" }}>Total Amount</span>
              <span style={{ marginLeft: "1rem" }}>RM{Number(totalAmount).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Shipping Information */}
        <div style={{ background: "#fff", borderRadius: "12px", padding: "2rem", marginBottom: "2rem" }}>
          <h3 style={{ fontSize: "1.3rem", fontWeight: "bold", marginBottom: "1rem" }}>Shipping Information</h3>
          <p style={{ color: "#666", marginBottom: "1.5rem" }}>Please fill out your shipping details.</p>
          <form>
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ fontWeight: "bold" }}>Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="John Doe"
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "6px",
                  border: "1px solid #ccc",
                  marginTop: "6px"
                }}
              />
            </div>
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ fontWeight: "bold" }}>Address</label>
              <input
                type="text"
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="123 Main St, City, Country"
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "6px",
                  border: "1px solid #ccc",
                  marginTop: "6px"
                }}
              />
            </div>
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ fontWeight: "bold" }}>Zip Code</label>
              <input
                type="text"
                value={zipCode}
                onChange={e => setZipCode(e.target.value)}
                placeholder="12345"
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "6px",
                  border: "1px solid #ccc",
                  marginTop: "6px"
                }}
              />
            </div>
            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ fontWeight: "bold" }}>Phone Number</label>
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="(123) 456-7890"
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "6px",
                  border: "1px solid #ccc",
                  marginTop: "6px"
                }}
              />
            </div>
            <button
              type="button"
              style={{
                background: "#111",
                color: "#fff",
                padding: "14px 32px",
                borderRadius: "8px",
                border: "none",
                fontWeight: "bold",
                fontSize: "1.1rem",
                cursor: "pointer",
                width: "100%",
                marginTop: "1rem"
              }}
              onClick={() => alert("Continue to payment...")}
            >
              Continue to Payment
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
"use client";
import { useEffect, useState } from "react";
import { getAuth } from "firebase/auth";
import { doc, getDoc, updateDoc, setDoc, collection, getDocs, deleteDoc } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import Navbar from "../../components/navbar";
import { useSearchParams } from "next/navigation";

interface UserAddress {
  id: string;
  fullName?: string;
  address?: string;
  zipCode?: string;
  state?: string;
  phone?: string;
}

export default function CheckoutPage() {
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState("");
  const [address, setAddress] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [phone, setPhone] = useState("");
  const [bidItem, setBidItem] = useState<any>(null);
  const [singleProduct, setSingleProduct] = useState<any>(null);

  // Multiple addresses
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const itemId = searchParams?.get("id");
  const itemType = searchParams?.get("type");

  // Fetch cart or single product
  useEffect(() => {
    if (itemId && itemType === "product") {
      const fetchProduct = async () => {
        setLoading(true);
        const productRef = doc(db, "products", itemId);
        const productSnap = await getDoc(productRef);
        if (productSnap.exists()) {
          setSingleProduct({ id: itemId, ...productSnap.data(), type: "product" });
        }
        setLoading(false);
      };
      fetchProduct();
      return;
    }
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
          let itemRef = doc(db, "products", itemId);
          let itemSnap = await getDoc(itemRef);
          if (itemSnap.exists()) {
            items.push({ id: itemId, ...itemSnap.data(), type: "product" });
            continue;
          }
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
  }, [itemId, itemType]);

  // Fetch bid item
  useEffect(() => {
    if (itemId && itemType === "bid") {
      const fetchBidItem = async () => {
        setLoading(true);
        const bidRef = doc(db, "bids", itemId);
        const bidSnap = await getDoc(bidRef);
        if (bidSnap.exists()) {
          setBidItem({ id: itemId, ...bidSnap.data(), type: "bid" });
        }
        setLoading(false);
      };
      fetchBidItem();
    }
  }, [itemId, itemType]);

  // Fetch addresses subcollection
  useEffect(() => {
    const fetchAddresses = async () => {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;
      const addressesRef = collection(db, "users", user.uid, "addresses");
      const addressesSnap = await getDocs(addressesRef);
      const addrList = addressesSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as UserAddress));
      setAddresses(addrList);
      if (addrList.length > 0) {
        setSelectedAddressId(addrList[0].id);
        setFullName(addrList[0].fullName || "");
        setAddress(addrList[0].address || "");
        setZipCode(addrList[0].zipCode || "");
        setState(addrList[0].state || "");
        setPhone(addrList[0].phone || "");
      }
    };
    fetchAddresses();
  }, []);

  // Save new address to subcollection
  const handleSaveAddress = async () => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return;
    const addressesRef = collection(db, "users", user.uid, "addresses");
    const newAddress = {
      fullName,
      address,
      zipCode,
      state,
      phone
    };
    await setDoc(doc(addressesRef), newAddress);
    alert("Address saved!");
    // Refresh addresses
    const addressesSnap = await getDocs(addressesRef);
    const addrList = addressesSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    setAddresses(addrList);
    setSelectedAddressId(addrList[addrList.length - 1].id);
  };

  // Select address from list
  const handleSelectAddress = (id: string) => {
    setSelectedAddressId(id);
    const addr = addresses.find(a => a.id === id);
    setFullName(addr?.fullName || "");
    setAddress(addr?.address || "");
    setZipCode(addr?.zipCode || "");
    setState(addr?.state || "");
    setPhone(addr?.phone || "");
  };

  // Delete address
  const handleDeleteAddress = async (id: string) => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return;
    await deleteDoc(doc(db, "users", user.uid, "addresses", id)); // Delete from Firestore
    setAddresses(addresses.filter(a => a.id !== id)); // Remove from local state
    if (selectedAddressId === id) {
      // If deleted address was selected, clear form or select another
      if (addresses.length > 1) {
        const remaining = addresses.filter(a => a.id !== id);
        if (remaining.length > 0) {
          handleSelectAddress(remaining[0].id);
        } else {
          setSelectedAddressId(null);
          setFullName("");
          setAddress("");
          setZipCode("");
          setState("");
          setPhone("");
        }
      } else {
        setSelectedAddressId(null);
        setFullName("");
        setAddress("");
        setZipCode("");
        setState("");
        setPhone("");
      }
    }
  };

  // Remove item from cart
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

  // Calculate total amount
  let totalAmount = 0;
  if (singleProduct) {
    totalAmount = Number(singleProduct.price || 0);
  } else if (bidItem) {
    totalAmount = bidItem.bids && bidItem.bids.length > 0
      ? bidItem.bids.reduce((max: any, bid: any) => bid.amount > max.amount ? bid : max, bidItem.bids[0]).amount
      : Number(bidItem.currentBid || 0);
  } else {
    totalAmount = cartItems.reduce((sum, item) => {
      if (item.type === "product") return sum + Number(item.price || 0);
      if (item.type === "bid") return sum + Number(item.currentBid || 0);
      return sum;
    }, 0);
  }

  return (
    <div style={{ background: "#f5f5f5", minHeight: "100vh" }}>
      <Navbar />
      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "2rem" }}>
        <h2 style={{ fontSize: "2rem", fontWeight: "bold", marginBottom: "2rem" }}>Order Summary</h2>
        {loading ? (
          <div>Loading...</div>
        ) : singleProduct ? (
          <div style={{ background: "#e6cfa7", borderRadius: "12px", padding: "1.5rem", marginBottom: "2rem", display: "flex", alignItems: "center" }}>
            <img
              src={singleProduct.image || (singleProduct.images && singleProduct.images[0]) || "https://via.placeholder.com/100"}
              alt={singleProduct.name || singleProduct.title}
              style={{ width: "100px", height: "100px", objectFit: "cover", borderRadius: "8px", marginRight: "1.5rem" }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: "bold", fontSize: "1.1rem" }}>
                {singleProduct.name || singleProduct.title || "Unnamed Product"}
              </div>
              <div style={{ margin: "0.5rem 0", color: "#333" }}>
                <span>Brand: {singleProduct.brand || singleProduct.specifications?.brand || "N/A"}</span>
                <span style={{ marginLeft: "1.5rem" }}>Size: {singleProduct.size || singleProduct.specifications?.size || "N/A"}</span>
                <span style={{ marginLeft: "1.5rem" }}>Category: {singleProduct.category || "N/A"}</span>
              </div>
            </div>
            <div style={{ fontWeight: "bold", fontSize: "1.1rem" }}>
              RM {singleProduct.price}
            </div>
          </div>
        ) : bidItem ? (
          <div style={{ background: "#e6cfa7", borderRadius: "12px", padding: "1.5rem", marginBottom: "2rem" }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <img
                src={bidItem.image || (bidItem.images && bidItem.images[0]) || "https://via.placeholder.com/100"}
                alt={bidItem.name || bidItem.title}
                style={{ width: "100px", height: "100px", objectFit: "cover", borderRadius: "8px", marginRight: "1.5rem" }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: "bold", fontSize: "1.1rem" }}>
                  {bidItem.name || bidItem.title || bidItem.productName || "Unnamed Bid Item"}
                </div>
                <div style={{ margin: "0.5rem 0", color: "#333" }}>
                  <span>Brand: {bidItem.brand || bidItem.specifications?.brand || "N/A"}</span>
                  <span style={{ marginLeft: "1.5rem" }}>Size: {bidItem.size || bidItem.specifications?.size || "N/A"}</span>
                  <span style={{ marginLeft: "1.5rem" }}>Category: {bidItem.category || "N/A"}</span>
                </div>
              </div>
              <div style={{ fontWeight: "bold", fontSize: "1.1rem" }}>
                Winning Bid: RM {bidItem.bids && bidItem.bids.length > 0
                  ? bidItem.bids.reduce((max: any, bid: any) => bid.amount > max.amount ? bid : max, bidItem.bids[0]).amount
                  : bidItem.currentBid}
              </div>
            </div>
          </div>
        ) : cartItems.length === 0 ? (
          <div>No items in your cart.</div>
        ) : (
          cartItems.map(item => (
            <div key={item.id} style={{ background: "#e6cfa7", borderRadius: "12px", padding: "1.5rem", marginBottom: "2rem", display: "flex", alignItems: "center" }}>
              <img
                src={item.image || (item.images && item.images[0]) || "https://via.placeholder.com/100"}
                alt={item.name || item.title}
                style={{ width: "100px", height: "100px", objectFit: "cover", borderRadius: "8px", marginRight: "1.5rem" }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: "bold", fontSize: "1.1rem" }}>
                  {item.name || item.title}
                </div>
                <button
                  onClick={() => handleDelete(item.id)}
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
                {item.type === "product"
                  ? <>RM {item.price}</>
                  : <>RM {item.currentBid}</>
                }
              </div>
            </div>
          ))
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
              <span style={{ marginLeft: "1rem" }}>
                {singleProduct ? 1 : bidItem ? 1 : cartItems.length}
              </span>
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
          <p style={{ color: "#666", marginBottom: "1.5rem" }}>Select or add your shipping address.</p>
          {/* Address selection */}
          {addresses.length > 0 && (
            <div style={{ marginBottom: "1.5rem" }}>
              <div style={{ fontWeight: "bold", marginBottom: "8px" }}>Saved Addresses:</div>
              {addresses.map(addr => (
                <div key={addr.id} style={{ marginBottom: "8px", display: "flex", alignItems: "center" }}>
                  <input
                    type="radio"
                    checked={selectedAddressId === addr.id}
                    onChange={() => handleSelectAddress(addr.id)}
                    style={{ marginRight: "8px" }}
                  />
                  <span>
                    {addr.fullName}, {addr.address}
                  </span>
                  <button
                    type="button"
                    style={{
                      marginLeft: "12px",
                      background: "#d32f2f",
                      color: "#fff",
                      border: "none",
                      borderRadius: "6px",
                      padding: "4px 10px",
                      cursor: "pointer",
                      fontSize: "0.9rem"
                    }}
                    onClick={() => handleDeleteAddress(addr.id)}
                  >
                    Delete
                  </button>
                </div>
              ))}
              <button
                type="button"
                style={{
                  marginTop: "10px",
                  background: "#008080",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  padding: "8px 18px",
                  cursor: "pointer",
                  fontWeight: "bold"
                }}
                onClick={() => {
                  setSelectedAddressId(null);
                  setFullName("");
                  setAddress("");
                  setZipCode("");
                  setState("");
                  setPhone("");
                }}
              >
                + Add New Address
              </button>
            </div>
          )}
          {/* Address form */}
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
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ fontWeight: "bold" }}>State</label>
              <input
                type="text"
                value={state}
                onChange={e => setState(e.target.value)}
                placeholder="State"
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
                background: "#008080",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                padding: "10px 24px",
                cursor: "pointer",
                width: "100%",
                marginBottom: "1rem"
              }}
              onClick={handleSaveAddress}
            >
              Save this address
            </button>
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
                marginTop: "0.5rem"
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
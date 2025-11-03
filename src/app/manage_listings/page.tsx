"use client";
import React, { useState, useEffect } from 'react';
import Navbar from '../../components/navbar';
import { getDocs, collection, query, where, doc, updateDoc, deleteDoc, getDoc } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { getAuth, onAuthStateChanged } from "firebase/auth";

interface Listing {
  id: string;
  title: string;
  description: string;
  price?: number;
  image: string;
  imageUrl?: string;
  images?: string[];
  color?: string;
  neck?: string;
  pattern?: string;
  details?: string;
  pocket?: string;
  fitting?: string;
  current_bid: number;
  min_bid: number;
  minIncrement?: number;
  total_bids: number;
  latest_bidder: string;
  endDate: string;
  created_at: string;
  status: 'active' | 'sold' | 'bidding' | 'ended';
  category_id: number;
  sold?: boolean;
  soldAt?: string;
  sellerId: string;
  orderId?: string;
  productId?: string;
  productName?: string;
  bids?: { [bidId: string]: { amount: number; userId: string; timestamp: string; username?: string } };
}

type TabType = 'active' | 'sold' | 'bidding';

const ManageListingsPage: React.FC = () => {
  const [products, setProducts] = useState<Listing[]>([]);
  const [bids, setBids] = useState<Listing[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('active');
  const [loading, setLoading] = useState<boolean>(true);
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState<string>("");
  const [editPrice, setEditPrice] = useState<number>(0);
  const [editDescription, setEditDescription] = useState<string>("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [orderDetails, setOrderDetails] = useState<any>(null);

  const auth = getAuth();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthLoading(false);
      if (user) {
        fetchData(user.uid);
      } else {
        setProducts([]);
        setBids([]);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [auth]);

  const fetchData = async (userId: string) => {
    setLoading(true);
    try {
      const activeQuery = query(
        collection(db, "products"),
        where("sellerId", "==", userId),
        where("sold", "==", false)
      );
      const activeSnap = await getDocs(activeQuery);
      const activeListings = activeSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Listing[];

      const soldQuery = query(
        collection(db, "products"),
        where("sellerId", "==", userId),
        where("sold", "==", true)
      );
      const soldSnap = await getDocs(soldQuery);
      const soldListings = soldSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Listing[];

      const bidsQuery = query(
        collection(db, "bids"),
        where("sellerId", "==", userId)
      );
      const bidsSnap = await getDocs(bidsQuery);
      const biddingListings = bidsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Listing[];

      setProducts([...activeListings, ...soldListings]);
      setBids(biddingListings);
    } catch (error) {
      console.error("Error fetching listings:", error);
    } finally {
      setLoading(false);
    }
  };

  // Update fetchBidInfo to fetch latest bidder's name and calculate current bid amount
  const fetchBidInfo = async (listing: Listing) => {
    let minIncrement = listing.minIncrement || 0;
    let latestBidder = "None";
    let productName = listing.productName || listing.title || "Unknown Product";
    let latestBidAmount = 0;

    // Read bids from the listing itself
    if (listing.bids && typeof listing.bids === 'object') {
      const bidArray = Object.values(listing.bids) as any[];
      if (bidArray.length > 0) {
        // Find latest bid by timestamp
        const latestBid = bidArray.reduce((a, b) => (new Date(a.timestamp) > new Date(b.timestamp) ? a : b));
        latestBidAmount = latestBid.amount || 0;
        minIncrement = latestBid.increment || minIncrement;
        // Fetch bidder name from users table
        if (latestBid.userId) {
          try {
            const userRef = doc(db, "users", latestBid.userId);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
              const userData = userSnap.data();
              latestBidder = userData.username || userData.name || "Unknown User";
            } else {
              latestBidder = "Unknown User";
            }
          } catch {
            latestBidder = "Unknown User";
          }
        }
      }
    }

    // Current bid amount is listing.price + latest bid amount
    const currentBid = Number(listing.price || 0) + Number(latestBidAmount);

    return { currentBid, minIncrement, latestBidder, productName };
  };

  const handleTabChange = (tab: TabType) => setActiveTab(tab);

  const formatPrice = (price: number | undefined) => `RM ${Number(price || 0).toFixed(2)}`;

  const getTabCount = (tab: TabType) => {
    if (tab === 'active') return products.filter(p => p.sold === false).length;
    if (tab === 'sold') return products.filter(p => p.sold === true).length;
    if (tab === 'bidding') return bids.length;
    return 0;
  };

  const filteredListings =
    activeTab === 'active'
      ? products.filter(p => p.sold === false)
      : activeTab === 'sold'
      ? products.filter(p => p.sold === true)
      : bids;

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>): void => {
    const target = e.target as HTMLImageElement;
    target.style.display = 'none';
    const container = target.parentElement;
    if (container) {
      container.innerHTML = '<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background-color: #e9ecef; color: #6c757d; font-size: 14px; text-align: center;">No Image</div>';
    }
  };

  const getImageUrl = (listing: Listing): string | null => {
    if (listing.image && listing.image.trim()) return listing.image;
    if (listing.imageUrl && listing.imageUrl.trim()) return listing.imageUrl;
    if (listing.images && listing.images.length > 0 && listing.images[0].trim()) return listing.images[0];
    return null;
  };

  const handleEditClick = (listing: Listing) => {
    if (activeTab !== 'active') return;
    setEditId(listing.id);
    setEditTitle(listing.title || '');
    setEditPrice(listing.price || 0);
    setEditDescription(listing.description || '');
  };

  const handleEditSave = async () => {
    if (!editId || !currentUser) return;
    try {
      await updateDoc(doc(db, "products", editId), {
        title: editTitle,
        price: editPrice,
        description: editDescription,
        updatedAt: new Date().toISOString(),
      });
      setProducts(prevProducts =>
        prevProducts.map(product =>
          product.id === editId
            ? { ...product, title: editTitle, price: editPrice, description: editDescription }
            : product
        )
      );
      setEditId(null);
      setEditTitle('');
      setEditPrice(0);
      setEditDescription('');
    } catch (error) {
      console.error("Error updating product:", error);
      alert("Failed to update product. Please try again.");
    }
  };

  const handleEditCancel = () => {
    setEditId(null);
    setEditTitle('');
    setEditPrice(0);
    setEditDescription('');
  };

  const handleDelete = async (id: string) => {
    if (!currentUser) return;
    if (!window.confirm('Are you sure you want to delete this listing?')) {
      return;
    }
    try {
      await deleteDoc(doc(db, "products", id));
      setProducts(products.filter(p => p.id !== id));
    } catch (error) {
      console.error("Error deleting product:", error);
      alert("Failed to delete product. Please try again.");
    }
  };

  const handleViewDetails = async (listing: Listing) => {
    if (!listing.orderId) {
      alert("No order details found for this item.");
      return;
    }
    try {
      const orderRef = doc(db, "orders", listing.orderId);
      const orderSnap = await getDoc(orderRef);
      if (orderSnap.exists()) {
        const orderData = { id: orderSnap.id, ...orderSnap.data() };

        // Fetch product details for each item
        if (Array.isArray((orderData as any).items)) {
          const productPromises = (orderData as any).items.map(async (productId: string) => {
            const productRef = doc(db, "products", productId);
            const productSnap = await getDoc(productRef);
            if (productSnap.exists()) {
              return { id: productSnap.id, ...productSnap.data() };
            }
            return { id: productId, name: "Unknown Product", price: 0, images: [] };
          });
          (orderData as any).items = await Promise.all(productPromises);
        }

        setOrderDetails(orderData);
        setShowOrderDetails(true);
      } else {
        alert("Order not found.");
      }
    } catch (error) {
      alert("Failed to fetch order details.");
    }
  };

  const formatFullDate = (date: any): string => {
    if (!date) return "N/A";
    const dateObj = date?.toDate ? date.toDate() : new Date(date);
    return isNaN(dateObj.getTime())
      ? "N/A"
      : dateObj.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "awaiting_payment":
        return { background: "#fef3c7", color: "#92400e" };
      case "payment_confirmed":
        return { background: "#ecfdf5", color: "#065f46" };
      case "pending":
        return { background: "#dbeafe", color: "#1e40af" };
      case "shipped":
        return { background: "#e0e7ff", color: "#3730a3" };
      case "completed":
        return { background: "#d1fae5", color: "#065f46" };
      case "cancelled":
        return { background: "#fee2e2", color: "#991b1b" };
      case "awaiting_verification":
        return { background: "#f3e8ff", color: "#7c3aed" };
      case "refunded":
        return { background: "#fef2f2", color: "#dc2626" };
      default:
        return { background: "#f3f4f6", color: "#374151" };
    }
  };

  const getTrackingStatus = (status: string, orderDate: any, shippedDate: any, completedDate: any) => {
    const steps = [
      { label: "Order Placed", date: orderDate, completed: true },
      { label: "Processing", date: orderDate, completed: status === "pending" || status === "preparing" || status === "processing" || status === "shipped" || status === "completed" },
      { label: "Shipped", date: shippedDate, completed: status === "shipped" || status === "completed" },
      { label: "Delivered", date: completedDate, completed: status === "completed" }
    ];
    return steps;
  };

  const OrderDetailsModal = ({
    order,
    onClose
  }: {
    order: any;
    onClose: () => void;
  }) => {
    if (!order) return null;

    return (
      <div style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 20
      }}>
        <div style={{
          backgroundColor: "#fff",
          borderRadius: 12,
          maxWidth: 800,
          width: "100%",
          maxHeight: "90vh",
          overflow: "auto",
          position: "relative"
        }}>
          {/* Modal Header */}
          <div style={{
            padding: "20px 24px",
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            position: "sticky",
            top: 0,
            backgroundColor: "#fff",
            zIndex: 1
          }}>
            <h2 style={{
              fontSize: "1.25rem",
              fontWeight: 700,
              color: "#1f2937",
              margin: 0
            }}>
              Order Details
            </h2>
            <button
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                fontSize: "1.5rem",
                cursor: "pointer",
                color: "#6b7280",
                padding: 4
              }}
            >
              ×
            </button>
          </div>

          {/* Modal Content */}
          <div style={{ padding: "24px" }}>
            {/* Order Info */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 24,
              marginBottom: 32
            }}>
              <div>
                <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "#374151", marginBottom: 8 }}>
                  Order Information
                </h3>
                <div style={{ fontSize: "0.9rem", color: "#6b7280", lineHeight: 1.6 }}>
                  <p><strong>Order ID:</strong> {order.id || order.orderId}</p>
                  <p><strong>Order Date:</strong> {formatFullDate(order.createdAt || order.orderDate)}</p>
                  <p><strong>Status:</strong>
                    <span style={{
                      marginLeft: 8,
                      padding: "2px 8px",
                      borderRadius: 4,
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      textTransform: "capitalize",
                      ...getStatusStyle(order.status)
                    }}>
                      {order.status?.replace('_', ' ')}
                    </span>
                  </p>
                  <p><strong>Total Amount:</strong> RM {(order.amount || order.total || 0).toFixed(2)}</p>
                </div>
              </div>
              <div>
                <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "#374151", marginBottom: 8 }}>
                  Buyer Information
                </h3>
                <div style={{ fontSize: "0.9rem", color: "#6b7280", lineHeight: 1.6 }}>
                  <p><strong>Name:</strong> {order.buyerName || order.buyer?.name || "N/A"}</p>
                  {(order.buyerPhone || order.buyer?.phone) && (
                    <p><strong>Phone:</strong> {order.buyerPhone || order.buyer?.phone}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Shipping Address */}
            <div style={{ marginBottom: 32 }}>
              <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "#374151", marginBottom: 8 }}>
                Shipping Address
              </h3>
              <div style={{
                background: "#f9fafb",
                padding: 16,
                borderRadius: 8,
                fontSize: "0.9rem",
                color: "#6b7280",
                lineHeight: 1.6
              }}>
                <p style={{ fontWeight: 600, color: "#374151" }}>
                  {order.shippingAddress?.fullName}
                </p>
                <p>{order.shippingAddress?.addressLine1}</p>
                {order.shippingAddress?.addressLine2 && (
                  <p>{order.shippingAddress.addressLine2}</p>
                )}
                <p>
                  {order.shippingAddress?.city}, {order.shippingAddress?.state} {order.shippingAddress?.postalCode}
                </p>
                <p>{order.shippingAddress?.country}</p>
                {order.shippingAddress?.phone && (
                  <p><strong>Phone:</strong> {order.shippingAddress.phone}</p>
                )}
              </div>
            </div>

            {/* Tracking Information */}
            <div style={{ marginBottom: 32 }}>
              <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "#374151", marginBottom: 8 }}>
                Tracking Information
              </h3>
              <div style={{ position: "relative" }}>
                {getTrackingStatus(
                  order.status,
                  order.createdAt || order.orderDate,
                  order.shippedDate,
                  order.completedDate
                ).map((step, index, array) => (
                  <div key={index} style={{
                    display: "flex",
                    alignItems: "flex-start",
                    marginBottom: index === array.length - 1 ? 0 : 24,
                    position: "relative"
                  }}>
                    {/* Timeline line */}
                    {index < array.length - 1 && (
                      <div style={{
                        position: "absolute",
                        left: 11,
                        top: 24,
                        width: 2,
                        height: 24,
                        background: step.completed ? "#10b981" : "#e5e7eb"
                      }} />
                    )}
                    {/* Timeline dot */}
                    <div style={{
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      background: step.completed ? "#10b981" : "#e5e7eb",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 16,
                      flexShrink: 0
                    }}>
                      {step.completed && (
                        <div style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: "white"
                        }} />
                      )}
                    </div>
                    {/* Timeline content */}
                    <div style={{ flex: 1 }}>
                      <p style={{
                        margin: 0,
                        fontSize: "0.9rem",
                        fontWeight: step.completed ? 600 : 400,
                        color: step.completed ? "#374151" : "#9ca3af"
                      }}>
                        {step.label}
                      </p>
                      {step.date && step.completed && (
                        <p style={{
                          margin: 0,
                          fontSize: "0.8rem",
                          color: "#6b7280",
                          marginTop: 2
                        }}>
                          {formatFullDate(step.date)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Items Ordered */}
            <div style={{ marginBottom: 32 }}>
              <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "#374151", marginBottom: 16 }}>
                Items Ordered
              </h3>
              {(order.items || []).map((item: any, index: number) => (
                <div key={index} style={{
                  display: "flex",
                  gap: 16,
                  padding: 16,
                  border: "1px solid #e5e7eb",
                  borderRadius: 8,
                  marginBottom: 12,
                  alignItems: "center"
                }}>
                  <div style={{
                    width: 80,
                    height: 80,
                    borderRadius: 8,
                    overflow: "hidden",
                    background: "#f9fafb",
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}>
                    {item.images && item.images.length > 0 ? (
                      <img
                        src={item.images[0]}
                        alt={item.title}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover"
                        }}
                      />
                    ) : (
                      <div style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "1.5rem"
                      }}>
                        📦
                      </div>
                    )}
                  </div>
                  <br />
                  <div style={{ flex: 1 }}>
                    <p style={{
                      margin: 0,
                      fontSize: "0.9rem",
                      fontWeight: 600,
                      color: "#374151",
                      marginBottom: 4
                    }}>
                      {item.title}
                    </p>
                    <p style={{
                      margin: 0,
                      fontSize: "0.9rem",
                      color: "#6b7280"
                    }}>
                      RM {(Number(item.price) || 0).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const getCurrentBid = (listing: Listing) => {
    if (listing.bids && typeof listing.bids === 'object') {
      // bids is a map: { bidId: { amount, userId, timestamp } }
      const bidArray = Object.values(listing.bids) as any[];
      if (bidArray.length === 0) return listing.price || 0;
      return Math.max(...bidArray.map(bid => bid.amount));
    }
    return listing.price || 0;
  };

  const getLatestBidder = (listing: Listing): string => {
    if (listing.bids && typeof listing.bids === 'object') {
      const bidArray = Object.values(listing.bids) as any[];
      if (bidArray.length === 0) return 'None';
      // Find the bid with the latest timestamp
      const latestBid = bidArray.reduce((a, b) => (new Date(a.timestamp) > new Date(b.timestamp) ? a : b));
      // If username is present, use it
      if (latestBid.username) return latestBid.username;
      // Otherwise, fetch from users table using userId
      if (latestBid.userId) {
        // This must be async, so you need to fetch and store it in listing.latest_bidder when you fetch bids
        // For synchronous display, show userId or 'Unknown'
        return latestBid.userId;
      }
      return 'Unknown';
    }
    return 'None';
  };

  useEffect(() => {
    const fetchAllBidInfo = async () => {
      if (activeTab === "bidding") {
        setLoading(true);
        const updatedBids = await Promise.all(
          bids.map(async (listing) => {
            const bidInfo = await fetchBidInfo(listing);
            return {
              ...listing,
              current_bid: bidInfo.currentBid,
              min_bid: bidInfo.minIncrement,
              latest_bidder: bidInfo.latestBidder,
              productName: bidInfo.productName,
            };
          })
        );
        setBids(updatedBids);
        setLoading(false);
      }
    };
    fetchAllBidInfo();
    // eslint-disable-next-line
  }, [activeTab]);

  if (authLoading) {
    return (
      <div style={{ minHeight: "100vh", background: "#f8f9fa", fontFamily: "system-ui, sans-serif" }}>
        <Navbar />
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <div style={{ fontSize: '18px', color: '#6c757d' }}>Loading...</div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div style={{ minHeight: "100vh", background: "#f8f9fa", fontFamily: "system-ui, sans-serif" }}>
        <Navbar />
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <div style={{ textAlign: 'center', color: '#6c757d' }}>
            <h2>Please log in to view your listings</h2>
            <button
              onClick={() => window.location.href = '/login'}
              style={{
                backgroundColor: '#c49660',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '6px',
                fontSize: '16px',
                fontWeight: 500,
                cursor: 'pointer',
                marginTop: '20px'
              }}
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "#f8f9fa",
      fontFamily: "system-ui, sans-serif"
    }}>
      <Navbar />

      {/* Header Section */}
      <div style={{
        backgroundColor: 'white',
        padding: '20px 30px',
        borderBottom: '1px solid #e9ecef',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: '30px',
        maxWidth: '1200px',
        margin:'auto',  
      }}>
        <h1 style={{
          fontSize: '24px',
          fontWeight: 600,
          color: '#2c3e50',
          margin: 0,
        }}>My Listings</h1>
        <button
          style={{
            backgroundColor: '#c49660',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            ...(hoveredButton === 'sell' ? { backgroundColor: '#b8885a' } : {}),
          }}
          onMouseEnter={() => setHoveredButton('sell')}
          onMouseLeave={() => setHoveredButton(null)}
          onClick={() => window.location.href = '/sell_form'}
        >
          Sell
        </button>
      </div>

      {/* Tab Navigation */}
      <div style={{
        backgroundColor: 'white',
        borderBottom: '1px solid #e9ecef',
        maxWidth: '1200px',
        margin:'auto', 
      }}>
        <div style={{
          display: 'flex',
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 30px',
        }}>
          {(['active', 'sold', 'bidding'] as TabType[]).map((tab) => (
            <button
              key={tab}
              style={{
                padding: '10px 10px',
                border: 'none',
                backgroundColor: 'transparent',
                color: activeTab === tab ? 'black' : '#6c757d',
                fontSize: '16px',
                fontWeight: 500,
                cursor: 'pointer',
                borderBottomWidth: '3px',
                borderBottomStyle: 'solid',
                borderBottomColor: activeTab === tab ? '#c49660' : 'transparent',
                transition: 'all 0.3s ease',
                position: 'relative',
                flex: 1,
              }}
              onClick={() => handleTabChange(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {getTabCount(tab) > 0 && ` (${getTabCount(tab)})`}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '20px',
        backgroundColor:'white',  
      }}>
        {loading ? (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            fontSize: '16px',
            color: '#6c757d',
          }}>Loading listings...</div>
        ) : filteredListings.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            color: '#6c757d',
            backgroundColor: 'white',
            borderRadius: '12px',
            border: '1px solid #e9ecef',
          }}>
            <p>No {activeTab} listings found.</p>
          </div>
        ) : (
          filteredListings.map((listing) => (
            <div key={listing.id} style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '25px',
              marginBottom: '20px',
              boxShadow: '0 2px 10px rgba(0, 0, 0, 0.08)',
              border: '1px solid #e9ecef',
              display: 'flex',
              gap: '25px',
              alignItems: 'flex-start',
            }}>
              {/* Product Image */}
              <div style={{
                width: '120px',
                height: '140px',
                borderRadius: '8px',
                overflow: 'hidden',
                backgroundColor: '#f8f9fa',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid #e9ecef',
              }}>
                {getImageUrl(listing) ? (
                  <img
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                    src={getImageUrl(listing)!}
                    alt={listing.title}
                    onError={handleImageError}
                  />
                ) : (
                  <div style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#e9ecef',
                    color: '#6c757d',
                    fontSize: '14px',
                    textAlign: 'center',
                  }}>
                    No Image
                  </div>
                )}
              </div>

              {/* Product Details */}
              <div style={{ flex: 1 }}>
                {/* Edit form for active tab */}
                {editId === listing.id && activeTab === 'active' ? (
                  <>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                      placeholder="Product title"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #ddd',
                        borderRadius: '6px',
                        fontSize: '16px',
                        marginBottom: '10px',
                        fontFamily: 'inherit',
                      }}
                    />
                    <input
                      type="number"
                      value={editPrice}
                      onChange={e => setEditPrice(Number(e.target.value))}
                      placeholder="Price"
                      step="0.01"
                      min="0"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #ddd',
                        borderRadius: '6px',
                        fontSize: '16px',
                        marginBottom: '10px',
                        fontFamily: 'inherit',
                      }}
                    />
                    <textarea
                      value={editDescription}
                      onChange={e => setEditDescription(e.target.value)}
                      placeholder="Product description"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #ddd',
                        borderRadius: '6px',
                        fontSize: '14px',
                        marginBottom: '10px',
                        fontFamily: 'inherit',
                        minHeight: '80px',
                        resize: 'vertical',
                      }}
                    />
                    <div style={{
                      display: 'flex',
                      gap: '8px',
                      marginTop: '10px',
                    }}>
                      <button
                        style={{
                          backgroundColor: '#22c55e',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '8px 16px',
                          fontWeight: 600,
                          fontSize: '14px',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                        }}
                        onClick={handleEditSave}
                      >
                        Save
                      </button>
                      <button
                        style={{
                          backgroundColor: '#6c757d',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '8px 16px',
                          fontWeight: 600,
                          fontSize: '14px',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                        }}
                        onClick={handleEditCancel}
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <h3 style={{
                      fontSize: '16px',
                      fontWeight: 600,
                      color: '#2c3e50',
                      margin: '0 0 15px 0',
                      lineHeight: '1.4',
                    }}>{listing.title}</h3>
                    {listing.productName &&(
                      <div style={{ color: "black", marginBottom: 8, lineHeight: '1.4', fontWeight:500 }}>
                        Product: {listing.productName}
                      </div>
                    )}
                    {listing.description && (
                      <div style={{ color: "black", marginBottom: 8, lineHeight: '1.4' }}>
                        Description: {listing.description}
                      </div>
                    )}
                    {listing.price !== undefined && (
                      <div style={{ color: "#2c3e50", fontWeight: 600, marginBottom: 10, fontSize: 16 }}>
                        Price: {formatPrice(listing.price)}
                      </div>
                    )}

                    {/* Buttons for active tab */}
                    {activeTab === 'active' && (
                      <div style={{
                        display: 'flex',
                        gap: '8px',
                        marginTop: '10px',
                      }}>
                        <button
                          style={{
                            backgroundColor: '#c9a26d',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '6px 14px',
                            fontWeight: 600,
                            fontSize: '14px',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                          }}
                          onClick={() => handleEditClick(listing)}
                        >
                          Edit
                        </button>
                        <button
                          style={{
                            backgroundColor: '#ef4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '6px 14px',
                            fontWeight: 600,
                            fontSize: '14px',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                          }}
                          onClick={() => handleDelete(listing.id)}
                        >
                          Delete
                        </button>
                      </div>
                    )}

                    {/* Buttons for sold tab */}
                    {activeTab === 'sold' && (
                      <div style={{
                        display: 'flex',
                        gap: '8px',
                        marginTop: '10px',
                      }}>
                        <button
                          style={{
                            backgroundColor: '#c9a26d',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '6px 14px',
                            fontWeight: 600,
                            fontSize: '14px',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                          }}
                          onClick={() => handleViewDetails(listing)}
                        >
                          View Details
                        </button>
                        {/* Sold date */}
                        <span style={{
                          marginLeft: '16px',
                          color: '#6c757d',
                          fontSize: '14px',
                          alignSelf: 'center'
                        }}>
                          Sold on: {listing.soldAt
                            ? (() => {
                                // Firestore Timestamp object
                                if (typeof listing.soldAt === 'object' && listing.soldAt !== null && 'seconds' in listing.soldAt) {
                                  return new Date((listing.soldAt as any).seconds * 1000).toLocaleDateString();
                                }
                                // ISO string or Date string
                                const d = new Date(listing.soldAt);
                                return isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString();
                              })()
                            : 'N/A'}
                        </span>
                      </div>
                    )}
                  </>
                )}

                {/* Bid Information Grid - Only show for bidding tab */}
                {activeTab === 'bidding' && (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '20px',
                    marginBottom: '15px',
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '12px', color: '#6c757d', fontWeight: 500, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Current Bid Amount
                      </span>
                      <span style={{ fontSize: '16px', fontWeight: 600, color: '#e74c3c' }}>
                        {formatPrice(listing.current_bid)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '12px', color: '#6c757d', fontWeight: 500, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Min Bid
                      </span>
                      <span style={{ fontSize: '16px', fontWeight: 600, color: '#2c3e50' }}>
                        {formatPrice(listing.min_bid)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '12px', color: '#6c757d', fontWeight: 500, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Latest Bidder
                      </span>
                      <span style={{ fontSize: '16px', fontWeight: 600, color: '#2c3e50' }}>
                        {listing.latest_bidder}
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <span style={{ fontSize: '12px', color: '#6c757d', fontWeight: 500, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        End Date
                      </span>
                      {(() => {
                        const endDate = listing.endDate ? new Date(listing.endDate) : null;
                        if (!endDate || isNaN(endDate.getTime())) return <span style={{ fontSize: '16px', color: '#2c3e50' }}>N/A</span>;
                        const now = new Date();
                        const diffMs = endDate.getTime() - now.getTime();
                        const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                        const ended = diffMs < 0 || listing.status === 'ended' || listing.status === 'sold';
                        return (
                          <>
                            <span style={{ fontSize: '16px', color: '#2c3e50', fontWeight: 600 }}>
                              {endDate.toLocaleDateString()}
                            </span>
                            {!ended ? (
                              <span style={{ marginLeft: 8, color: '#c49660', fontWeight: 600 }}>
                                {daysLeft} day{daysLeft !== 1 ? 's' : ''} left
                              </span>
                            ) : (
                              <span style={{
                                marginLeft: 8,
                                backgroundColor: '#FBD9D3',
                                color: 'red',
                                borderRadius: '20px',
                                fontSize: '12px',
                                fontWeight: 600,
                                padding: '4px 12px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                letterSpacing: '0.5px'
                              }}>
                                <span style={{
                                  width: '8px',
                                  height: '8px',
                                  borderRadius: '50%',
                                  backgroundColor: 'Red',
                                  display: 'inline-block'
                                }}></span>
                                ENDED
                              </span>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {/* Status Badge */}
                {listing.status === 'ended' && (
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 12px',
                    backgroundColor: '#e8f5e8',
                    color: '#28a745',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    marginTop: '10px',
                  }}>
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: '#28a745',
                    }}></div>
                    Ended
                  </div>
                )}
              </div>
            </div>
          ))
        )}

        {/* Order Details Modal */}
        {showOrderDetails && (
          <OrderDetailsModal 
            order={orderDetails} 
            onClose={() => setShowOrderDetails(false)} 
          />
        )}
      </div>
    </div>
  );
};

export default ManageListingsPage;
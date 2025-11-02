"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../../components/navbar";
import { getAuth } from "firebase/auth";
import { db } from "../../firebaseConfig";
import { collection, getDocs, query, where, doc, getDoc } from "firebase/firestore";

// Update your Order interface to match your Firestore structure
interface Order {
  id: string;
  status?: string;
  delivery?: string;
  seller?: string;
  total?: number;
  quantity?: number;
  items?: Array<{
    productName?: string;
    productImage?: string;
    [key: string]: any;
  }>;
  shippingAddress?: {
    fullName?: string;
    phone?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
  };
  orderDetails?: {
    orderNo?: string;
    createdAt?: string;
    status?: string;
    buyerInfo?: {
      name?: string;
      phone?: string;
    };
    shippingAddress?: {
      name?: string;
      phone?: string;
      address?: string;
    };
    tracking?: Array<{
      status: string;
      date?: string;
      completed: boolean;
    }>;
    [key: string]: any;
  };
  product?: {
    name?: string;
    image?: string;
  };
  productName?: string;
  productImage?: string;
  [key: string]: any;
}

const TABS = [
  { key: "toPay", label: "To pay" },
  { key: "inProgress", label: "In progress" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
];

const MyPurchasesPage = () => {
  const [activeTab, setActiveTab] = useState("inProgress");
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const router = useRouter();

  function toDateString(ts: any) {
    if (!ts) return "Invalid Date";
    if (typeof ts === "string") return ts;
    if (ts.seconds) {
      return new Date(ts.seconds * 1000).toLocaleString("en-MY", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    }
    return "Invalid Date";
  }

  useEffect(() => {
    const fetchOrders = async () => {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const ordersRef = collection(db, "orders");
      const q = query(ordersRef, where("userId", "==", user.uid));
      const snapshot = await getDocs(q);

      const ordersArr: Order[] = [];
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        let productName = "";
        let productImage = "";
        let sellerUsername = "Unknown Seller";
        let sellerProfilePhotoUrl = "/default-avatar.png";
        let quantity = Array.isArray(data.items) ? data.items.length : 1;

        // Fetch product info for the first item
        if (Array.isArray(data.items) && data.items.length > 0) {
          const productId = data.items[0];
          let productData: any = {};
          try {
            const prodSnap = await getDoc(doc(db, "products", productId));
            if (prodSnap.exists()) {
              productData = prodSnap.data();
              productName = productData.title || productData.name || "Unknown Product";
              productImage = productData.images?.[0] || productData.image || "/placeholder.jpg";
              // Fetch seller info from users table using sellerId from product
              if (productData.sellerId) {
                const sellerSnap = await getDoc(doc(db, "users", productData.sellerId));
                if (sellerSnap.exists()) {
                  const sellerData = sellerSnap.data();
                  sellerUsername = sellerData.username || sellerData.name || "Unknown Seller";
                  sellerProfilePhotoUrl = sellerData.profilePhotoUrl || "/default-avatar.png";
                }
              }
            }
          } catch {}
        }

        // Build tracking info based on available dates
        const tracking: Array<{ status: string; date?: string; completed: boolean }> = [];
        tracking.push({
          status: "Order Placed",
          date: toDateString(data.createdAt),
          completed: !!data.createdAt
        });
        tracking.push({
          status: "Processing",
          date: toDateString(data.createdAt),
          completed: !!data.createdAt
        });
        tracking.push({
          status: "Shipped",
          date: toDateString(data.shippedDate),
          completed: !!data.shippedDate
        });

        ordersArr.push({
          id: docSnap.id,
          status: data.status || "completed",
          total: data.amount || 0,
          quantity,
          items: [{
            productName,
            productImage
          }],
          sellerUsername,
          sellerProfilePhotoUrl,
          shippingAddress: data.shippingAddress,
          orderDetails: {
            createdAt: toDateString(data.createdAt),
            buyerInfo: {
              name: data.buyerName,
              phone: data.buyerPhone,
            },
            shippingAddress: {
              name: data.shippingAddress?.fullName,
              phone: data.shippingAddress?.phone,
              address: data.shippingAddress?.addressLine1,
            },
            tracking,
          },
        });
      }
      setOrders(ordersArr);
    };
    fetchOrders();
  }, []);

  // Filter orders by tab
  const filteredOrders = orders.filter(order => order.status === activeTab);

  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order);
    setShowOrderDetails(true);
  };

  const OrderDetailsModal = ({ order, onClose }: { order: Order; onClose: () => void }) => {
    // Helper for status badge style
    const getStatusStyle = (status: string) => {
      switch (status) {
        case "completed":
          return { background: "#d1fae5", color: "#065f46" };
        case "inProgress":
          return { background: "#dbeafe", color: "#1e40af" };
        case "cancelled":
          return { background: "#fee2e2", color: "#991b1b" };
        case "toPay":
          return { background: "#fef3c7", color: "#92400e" };
        default:
          return { background: "#f3f4f6", color: "#374151" };
      }
    };

    // Helper for tracking steps
    const getTrackingSteps = () => {
      const tracking = order.orderDetails?.tracking || [];
      return [
        ...tracking,
        { status: "Delivered", completed: order.status === "completed" }
      ];
    };

    // Helper for full date formatting
    const formatFullDate = (date?: string) => {
      if (!date) return "N/A";
      const d = new Date(date);
      return d.toLocaleString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    };

    return (
      <div style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 20
      }}>
        <div style={{
          background: "#fff",
          borderRadius: 12,
          maxWidth: 1100,
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
                  <p><strong>Order ID:</strong> {order.id}</p>
                  <p><strong>Order Date:</strong> {order.orderDetails?.createdAt}</p>
                  <p><strong>Status:</strong>
                    <span style={{
                      marginLeft: 8,
                      padding: "2px 8px",
                      borderRadius: 4,
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      textTransform: "capitalize",
                      ...getStatusStyle(order.status || "")
                    }}>
                      {order.status?.replace('_', ' ') || "N/A"}
                    </span>
                  </p>
                  <p><strong>Total Amount:</strong> RM {(order.total || 0).toFixed(2)}</p>
                </div>
              </div>
              <div>
                <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "#374151", marginBottom: 8 }}>
                  Buyer Information
                </h3>
                <div style={{ fontSize: "0.9rem", color: "#6b7280", lineHeight: 1.6 }}>
                  <p><strong>Name:</strong> {order.orderDetails?.buyerInfo?.name || order.shippingAddress?.fullName || "N/A"}</p>
                  <p><strong>Phone:</strong> {order.orderDetails?.buyerInfo?.phone || order.shippingAddress?.phone || "N/A"}</p>
                </div>
              </div>
            </div>

            {/* Shipping Address */}
            {(order.shippingAddress || order.orderDetails?.shippingAddress) && (
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
                    {order.shippingAddress?.fullName || order.orderDetails?.shippingAddress?.name}
                  </p>
                  <p>
                    {order.shippingAddress?.addressLine1 ||
                      order.orderDetails?.shippingAddress?.address}
                  </p>
                  {order.shippingAddress?.addressLine2 && (
                    <p>{order.shippingAddress?.addressLine2}</p>
                  )}
                  <p>
                    {order.shippingAddress?.city || ""} {order.shippingAddress?.state || ""} {order.shippingAddress?.postalCode || ""}
                  </p>
                  <p>{order.shippingAddress?.country || ""}</p>
                  <p>
                    <strong>Phone:</strong> {order.shippingAddress?.phone || order.orderDetails?.shippingAddress?.phone}
                  </p>
                </div>
              </div>
            )}

            {/* Tracking Information */}
            <div style={{ marginBottom: 32 }}>
              <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "#374151", marginBottom: 8 }}>
                Tracking Information
              </h3>
              <div>
                {(order.orderDetails?.tracking || []).map((track, idx, arr) => (
                  <div key={idx} style={{
                    display: "flex",
                    alignItems: "flex-start",
                    marginBottom: 0,
                    position: "relative"
                  }}>
                    {/* Timeline dot */}
                    <div style={{
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      background: "#22c55e",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 16,
                      flexShrink: 0,
                      position: "relative"
                    }}>
                      <div style={{
                        width: 12,
                        height: 12,
                        borderRadius: "50%",
                        background: "#fff"
                      }} />
                      {/* Vertical line except for last item */}
                      {idx < arr.length - 1 && (
                        <div style={{
                          position: "absolute",
                          left: "50%",
                          top: 24,
                          width: 2,
                          height: 32,
                          background: "#e5e7eb",
                          transform: "translateX(-50%)"
                        }} />
                      )}
                    </div>
                    {/* Timeline content */}
                    <div style={{ flex: 1 }}>
                      <p style={{
                        margin: 0,
                        fontSize: "0.95rem",
                        fontWeight: 600,
                        color: "#374151"
                      }}>
                        {track.status}
                      </p>
                      {track.date && (
                        <p style={{
                          margin: 0,
                          fontSize: "0.85rem",
                          color: "#6b7280"
                        }}>
                          {track.date}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                {/* Delivered step (greyed out) */}
                <div style={{
                  display: "flex",
                  alignItems: "flex-start",
                  marginBottom: 0,
                  position: "relative"
                }}>
                  <div style={{
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    background: "#e5e7eb",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 16,
                    flexShrink: 0
                  }}>
                    <div style={{
                      width: 12,
                      height: 12,
                      borderRadius: "50%",
                      background: "#fff"
                    }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{
                      margin: 0,
                      fontSize: "0.95rem",
                      fontWeight: 600,
                      color: "#9ca3af"
                    }}>
                      Delivered
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Items Ordered */}
            <div style={{ marginBottom: 32 }}>
              <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "#374151", marginBottom: 16 }}>
                Items Ordered
              </h3>
              {order.items?.map((item, index) => (
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
                    width: 60,
                    height: 60,
                    borderRadius: 8,
                    overflow: "hidden",
                    background: "#f9fafb",
                    flexShrink: 0
                  }}>
                    {item.productImage ? (
                      <img
                        src={item.productImage}
                        alt={item.productName}
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
                  <div style={{ flex: 1 }}>
                    <p style={{
                      margin: 0,
                      fontSize: "0.9rem",
                      fontWeight: 600,
                      color: "#374151",
                      marginBottom: 4
                    }}>
                      {item.productName}
                    </p>
                    <p style={{
                      margin: 0,
                      fontSize: "0.8rem",
                      color: "#6b7280"
                    }}>
                      Quantity: 1 • RM {(order.total || 0).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div style={{
              display: "flex",
              gap: 12,
              justifyContent: "flex-end",
              paddingTop: 24,
              borderTop: "1px solid #e5e7eb"
            }}>
              <button
                onClick={onClose}
                style={{
                  padding: "10px 20px",
                  background: "#6b7280",
                  color: "white",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: "0.9rem",
                  fontWeight: 500
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#f8f9fa",
      fontFamily: "system-ui, sans-serif"
    }}>
      <Navbar />
      <div style={{
        maxWidth: 1200,
        margin: "0 auto",
        padding: "24px 20px",
        background: "#f8f9fa"
      }}>
        {/* Header */}
        <div style={{
          display: "flex",
          alignItems: "center",
          marginBottom: 24,
          gap: 12
        }}>
          <button
            style={{
              background: "none",
              border: "none",
              fontSize: 16,
              cursor: "pointer",
              color: "#212529"
            }}
            onClick={() => router.push("/homepage")}
          >
            ←
          </button>
          <h1 style={{
            fontSize: 20,
            fontWeight: "600",
            margin: 0,
            color: "#212529"
          }}>
            My purchases
          </h1>
        </div>

        {/* Main Container with tabs and orders in the same box */}
        <div style={{
          background: "#fff",
          borderRadius: 12,
          boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
          maxWidth: 1100,
          margin: "0 auto",
          overflow: "hidden",
          border: "1px solid #eee"
        }}>
          {/* Tabs */}
          <div style={{
            display: "flex",
            borderBottom: "1px solid #e9ecef"
          }}>
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  background: "none",
                  border: "none",
                  color: activeTab === tab.key ? "#8b7355" : "#6c757d",
                  fontWeight: "500",
                  fontSize: 17,
                  padding: "22px 0 16px 0",
                  borderBottom: activeTab === tab.key ? "2.5px solid #c9a26d" : "2.5px solid transparent",
                  cursor: "pointer",
                  flex: 1,
                  textAlign: "center",
                  transition: "all 0.2s ease"
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Orders Content */}
          {filteredOrders.length === 0 ? (
            <div style={{
              textAlign: "center",
              color: "#6c757d",
              fontSize: 18,
              padding: "80px 20px"
            }}>
              No active orders
            </div>
          ) : (
            filteredOrders.map(order => {
              const item = order.items && order.items[0] ? order.items[0] : {};
              const productName = item.productName || "Unknown Product";
              const productImage = item.productImage || "/placeholder.jpg";
              const deliveryStatus =
                activeTab === "toPay"
                  ? "🕒 Awaiting payment"
                  : activeTab === "inProgress"
                  ? order.status === "shipping"
                    ? "📦 Shipping in progress"
                    : "🚚 Delivery in progress"
                  : activeTab === "completed"
                  ? "✅ Delivered"
                  : activeTab === "cancelled"
                  ? "❌ Cancelled"
                  : "";
              // Seller info (replace with actual seller info if available)
              const sellerName = order.sellerUsername || "Unknown Seller";
              const sellerProfilePhotoUrl = order.sellerProfilePic || "/default-avatar.png"; // Add this field if available
              const quantity = order.items ? order.items.length : 1;
              const total = order.total || 0;

              return (
                <div key={order.id} style={{
                  padding: "32px 40px 32px 40px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 0
                }}>
                  {/* Delivery Status */}
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 12
                  }}>
                    <span style={{ fontSize: 20 }}>🚚</span>
                    <span style={{
                      fontSize: 16,
                      color: "#c9a26d",
                      fontWeight: "600"
                    }}>
                      {deliveryStatus}
                    </span>
                  </div>

                  {/* Seller */}
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    marginBottom: 18
                  }}>
                    <img
                      src={sellerProfilePhotoUrl}
                      alt={sellerName}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        objectFit: "cover",
                        background: "#eee"
                      }}
                    />
                    <span style={{
                      fontWeight: "600",
                      fontSize: 16,
                      color: "#212529"
                    }}>
                      {sellerName}
                    </span>
                  </div>

                  {/* Product Row */}
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 18,
                    marginBottom: 0
                  }}>
                    <img
                      src={productImage}
                      alt={productName}
                      style={{
                        width: 60,
                        height: 60,
                        borderRadius: 8,
                        objectFit: "cover"
                      }}
                    />
                    <div style={{
                      fontWeight: "500",
                      fontSize: 16,
                      color: "#212529",
                      marginBottom: 2,
                      lineHeight: 1.2
                    }}>
                      {productName}
                    </div>
                  </div>

                  {/* Bottom Row: Item count, View Details, Total */}
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginTop: 24
                  }}>
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 16
                    }}>
                      <span style={{
                        fontSize: 15,
                        color: "#6c757d"
                      }}>
                        {quantity} item
                      </span>
                      <button
                        onClick={() => handleViewDetails(order)}
                        style={{
                          background: "#c9a26d",
                          color: "#fff",
                          border: "none",
                          borderRadius: 6,
                          padding: "10px 22px",
                          fontWeight: "600",
                          fontSize: 15,
                          cursor: "pointer"
                        }}
                      >
                        View Details
                      </button>
                    </div>
                    <div style={{
                      fontWeight: "600",
                      fontSize: 18,
                      color: "#212529"
                    }}>
                      Total: <span style={{ color: "#212529", fontWeight: 700, marginLeft: 8 }}>RM{total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Order Details Modal */}
      {showOrderDetails && selectedOrder && (
        <OrderDetailsModal 
          order={selectedOrder} 
          onClose={() => setShowOrderDetails(false)} 
        />
      )}
    </div>
  );
};

export default MyPurchasesPage;
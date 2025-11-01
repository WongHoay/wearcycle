"use client";
import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy, doc, updateDoc, getDoc, addDoc } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { getAuth } from "firebase/auth";
import { useRouter } from "next/navigation";
import Navbar from '../../components/navbar';

const TABS = [
  { key: "all", label: "All Sales" },
  { key: "awaiting_payment", label: "Awaiting Payment" },
  { key: "payment_confirmed", label: "Payment Confirmed" },
  { key: "pending", label: "Preparing" },
  { key: "shipped", label: "Shipped" },
  { key: "completed", label: "Completed" },
  { key: "refunded", label: "Refunded" },
];

const TAB_ACTIVE_COLOR = "#c9a26d";
const PLATFORM_FEE_RATE = 0.1; // 10% platform fee

interface Sale {
  id: string;
  itemId: string;
  itemName: string;
  itemImage: string;
  buyerId: string;
  buyerName: string;
  buyerEmail: string;
  price: number;
  status: string;
  orderDate: any;
  shippedDate?: any;
  completedDate?: any;
  paymentStatus: string;
  shippingAddress?: string;
  notes?: string;
  refundedAt?: any;
  refundReason?: string;
}

interface GroupedSale {
  orderId: string;
  items: Sale[];
  status: string;
  orderDate: any;
  buyerName: string;
  totalPrice: number;
  totalEarnings: number;
  totalPlatformFees: number;
}

interface OrderDetails {
  orderId: string;
  orderDate: any;
  shippedDate?: any;
  completedDate?: any;
  status: string;
  paymentStatus: string;
  trackingNumber?: string;
  shippingMethod?: string;
  estimatedDelivery?: any;
  shipping?: {
    courier: string;
    trackingNumber: string;
    estimatedDelivery?: any;
    notes?: string;
    shippedAt: any;
  };
  shippingAddress: {
    fullName: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone?: string;
  };
  items: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
    image?: string;
  }>;
  buyer: {
    name: string;
    email: string;
    phone?: string;
  };
  notes?: string;
  amount: number;
}

interface PayoutNotification {
  id: string;
  amount: number;
  status: string;
  createdAt: any;
  paidAt?: any;
  itemName?: string;
  platformFee: number;
  grossAmount: number;
}

// Enhanced Shipping Modal Component
const ShippingModal = ({ order, onClose, onSubmit }: {
  order: GroupedSale;
  onClose: () => void;
  onSubmit: (shippingData: any) => void;
}) => {
  const [courier, setCourier] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [estimatedDelivery, setEstimatedDelivery] = useState('');
  const [notes, setNotes] = useState('');

  // Popular courier suggestions for placeholder/help text
  const popularCouriers = [
    'Pos Malaysia', 'GDex', 'City-Link Express', 'J&T Express', 
    'Ninja Van', 'DHL', 'FedEx', 'Shopee Express', 'Lalamove', 'GrabExpress'
  ];

  const handleSubmit = () => {
    if (!courier.trim()) {
      alert('Please enter a courier name');
      return;
    }
    
    if (!trackingNumber.trim()) {
      alert('Please enter a tracking number');
      return;
    }

    const shippingData = {
      courier: courier.trim(),
      trackingNumber: trackingNumber.trim(),
      estimatedDelivery: estimatedDelivery || null,
      notes: notes.trim(),
      shippedAt: new Date(),
      shippedBy: 'seller'
    };

    onSubmit(shippingData);
  };

  // Get tomorrow's date as default minimum for estimated delivery
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowString = tomorrow.toISOString().split('T')[0];

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        padding: 20
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'white',
          padding: 30,
          borderRadius: 12,
          maxWidth: 500,
          width: '100%',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ 
          fontSize: '1.25rem', 
          fontWeight: 600, 
          marginBottom: 20, 
          color: '#1f2937' 
        }}>
          📦 Mark Order as Shipped
        </h3>
        
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: 10 }}>
            <strong>Order:</strong> #{order.orderId?.slice(0, 8)} - {order.buyerName}
          </div>
          <div style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: 10 }}>
            <strong>Total Amount:</strong> RM {order.totalPrice?.toFixed(2)}
          </div>
          <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>
            <strong>Items:</strong> {order.items?.length || 0} item(s)
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ 
            display: 'block', 
            fontSize: '0.9rem', 
            fontWeight: 500, 
            color: '#374151', 
            marginBottom: 8 
          }}>
            Courier Service: *
          </label>
          <input
            type="text"
            value={courier}
            onChange={(e) => setCourier(e.target.value)}
            placeholder="e.g., Pos Malaysia, J&T Express, DHL..."
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid #d1d5db',
              borderRadius: 6,
              fontSize: '0.9rem'
            }}
          />
          <div style={{ 
            fontSize: '0.8rem', 
            color: '#6b7280', 
            marginTop: 4 
          }}>
            Popular: {popularCouriers.slice(0, 5).join(', ')}, etc.
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ 
            display: 'block', 
            fontSize: '0.9rem', 
            fontWeight: 500, 
            color: '#374151', 
            marginBottom: 8 
          }}>
            Tracking Number: *
          </label>
          <input
            type="text"
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
            placeholder="Enter tracking number..."
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid #d1d5db',
              borderRadius: 6,
              fontSize: '0.9rem'
            }}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ 
            display: 'block', 
            fontSize: '0.9rem', 
            fontWeight: 500, 
            color: '#374151', 
            marginBottom: 8 
          }}>
            Estimated Delivery Date (Optional):
          </label>
          <input
            type="date"
            value={estimatedDelivery}
            onChange={(e) => setEstimatedDelivery(e.target.value)}
            min={tomorrowString}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid #d1d5db',
              borderRadius: 6,
              fontSize: '0.9rem'
            }}
          />
        </div>

        <div style={{ marginBottom: 25 }}>
          <label style={{ 
            display: 'block', 
            fontSize: '0.9rem', 
            fontWeight: 500, 
            color: '#374151', 
            marginBottom: 8 
          }}>
            Shipping Notes (Optional):
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any special instructions or notes..."
            rows={3}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid #d1d5db',
              borderRadius: 6,
              fontSize: '0.9rem',
              resize: 'vertical'
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '12px 20px',
              background: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: 500
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            style={{
              flex: 1,
              padding: '12px 20px',
              background: '#a7967e',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: 500
            }}
          >
            📦 Mark as Shipped
          </button>
        </div>
      </div>
    </div>
  );
};

const SalesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("all");
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [showDetailsModal, setShowDetailsModal] = useState<boolean>(false);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<OrderDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState<boolean>(false);
  const [payoutNotifications, setPayoutNotifications] = useState<PayoutNotification[]>([]);
  const [showPayoutNotification, setShowPayoutNotification] = useState<boolean>(false);
  const [recentPayouts, setRecentPayouts] = useState<PayoutNotification[]>([]);
  
  // Enhanced shipping modal states
  const [showShippingModal, setShowShippingModal] = useState<boolean>(false);
  const [selectedShippingOrder, setSelectedShippingOrder] = useState<GroupedSale | null>(null);
  
  const router = useRouter();

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      if (currentUser) {
        fetchSales(currentUser);
        fetchPayoutNotifications(currentUser);
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const fetchPayoutNotifications = async (currentUser?: any) => {
    try {
      const authUser = currentUser || user;
      if (!authUser) return;

      // Fetch payouts for this seller
      const payoutsRef = collection(db, "payouts");
      const q = query(
        payoutsRef, 
        where("sellerId", "==", authUser.uid),
        orderBy("createdAt", "desc")
      );
      
      const snapshot = await getDocs(q);
      const fetchedPayouts: PayoutNotification[] = [];
      
      for (const payoutDoc of snapshot.docs) {
        const payoutData = payoutDoc.data();
        fetchedPayouts.push({
          id: payoutDoc.id,
          amount: payoutData.amount || 0,
          status: payoutData.status || 'pending',
          createdAt: payoutData.createdAt,
          paidAt: payoutData.paidAt,
          itemName: payoutData.itemDetails?.itemName || 'Product',
          platformFee: payoutData.platformFee || 0,
          grossAmount: payoutData.grossAmount || 0
        });
      }
      
      setPayoutNotifications(fetchedPayouts);
      
      // Check for recent paid payouts (within last 7 days)
      const recentPaidPayouts = fetchedPayouts.filter(payout => {
        if (payout.status === 'paid' && payout.paidAt) {
          const paidDate = payout.paidAt.toDate ? payout.paidAt.toDate() : new Date(payout.paidAt);
          const daysDiff = (new Date().getTime() - paidDate.getTime()) / (1000 * 60 * 60 * 24);
          return daysDiff <= 7;
        }
        return false;
      });
      
      if (recentPaidPayouts.length > 0) {
        setRecentPayouts(recentPaidPayouts);
        setShowPayoutNotification(true);
      }
    } catch (error) {
      console.error("Error fetching payout notifications:", error);
    }
  };

  const fetchSales = async (currentUser?: any) => {
    setLoading(true);
    try {
      const authUser = currentUser || user;
      if (!authUser) {
        setSales([]);
        setLoading(false);
        return;
      }

      const ordersRef = collection(db, "orders");
      const q = query(ordersRef, orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);

      const fetchedSales: Sale[] = [];

      for (const orderDoc of snapshot.docs) {
        const orderData = orderDoc.data();

        if (orderData.items && Array.isArray(orderData.items)) {
          for (let i = 0; i < orderData.items.length; i++) {
            const itemId = orderData.items[i];

            // Try products collection
            let itemDoc = await getDoc(doc(db, "products", itemId));
            let collectionName = "products";

            // If not found, try items collection
            if (!itemDoc.exists()) {
              itemDoc = await getDoc(doc(db, "items", itemId));
              collectionName = "items";
            }

            // If still not found, try bids collection
            if (!itemDoc.exists()) {
              itemDoc = await getDoc(doc(db, "bids", itemId));
              collectionName = "bids";
            }

            if (itemDoc.exists()) {
              const itemData = itemDoc.data();

              if (itemData.sellerId === authUser.uid) {
                fetchedSales.push({
                  id: `${orderDoc.id}_${itemId}`,
                  itemId: itemId,
                  itemName: itemData.name || itemData.title || itemData.listingName || "Bid Item",
                  itemImage: itemData.image || itemData.images?.[0] || "",
                  buyerId: orderData.userId,
                  buyerName: orderData.buyerName || orderData.userName || "Buyer",
                  buyerEmail: orderData.buyerEmail || orderData.userEmail || "",
                  price: itemData.price || itemData.currentBid || 0,
                  status: orderData.status || "pending",
                  orderDate: orderData.createdAt,
                  shippedDate: orderData.shippedDate,
                  completedDate: orderData.completedDate,
                  paymentStatus: orderData.paymentStatus || "paid",
                  shippingAddress: orderData.shippingAddress,
                  notes: orderData.note || orderData.notes || "",
                  refundedAt: orderData.refundedAt,
                  refundReason: orderData.refundReason
                } as Sale);
              }
            }
          }
        }
      }

      setSales(fetchedSales);
    } catch (error) {
      setSales([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderDetails = async (orderId: string) => {
    setDetailsLoading(true);
    try {
      const orderDoc = await getDoc(doc(db, "orders", orderId));
      if (orderDoc.exists()) {
        const orderData = orderDoc.data();
        
        // Fetch item details for all items in the order
        const itemsWithDetails = [];
        if (orderData.items && Array.isArray(orderData.items)) {
          for (const itemId of orderData.items) {
            try {
              let itemDoc = await getDoc(doc(db, "products", itemId));
              if (!itemDoc.exists()) {
                itemDoc = await getDoc(doc(db, "items", itemId));
              }
              
              if (itemDoc.exists()) {
                const itemData = itemDoc.data();
                itemsWithDetails.push({
                  id: itemId,
                  name: itemData.name || itemData.title || "Product",
                  price: itemData.price || 0,
                  quantity: 1,
                  image: itemData.image || itemData.images?.[0] || ""
                });
              }
            } catch (error) {
              console.error("Error fetching item details:", error);
            }
          }
        }

        const orderDetails: OrderDetails = {
          orderId: orderId,
          orderDate: orderData.createdAt,
          shippedDate: orderData.shippedDate,
          completedDate: orderData.completedDate,
          status: orderData.status || "pending",
          paymentStatus: orderData.paymentStatus || "paid",
          trackingNumber: orderData.trackingNumber || "",
          shippingMethod: orderData.shippingMethod || "Standard Shipping",
          estimatedDelivery: orderData.estimatedDelivery,
          shipping: orderData.shipping || null,
          shippingAddress: orderData.shippingAddress || {
            fullName: orderData.buyerName || "N/A",
            addressLine1: "Address not provided",
            city: "N/A",
            state: "N/A",
            postalCode: "N/A",
            country: "Malaysia"
          },
          items: itemsWithDetails,
          buyer: {
            name: orderData.buyerName || orderData.userName || "N/A",
            email: orderData.buyerEmail || orderData.userEmail || "N/A",
            phone: orderData.buyerPhone || ""
          },
          notes: orderData.notes || orderData.note || "",
          amount: orderData.amount || 0
        };

        setSelectedOrderDetails(orderDetails);
        setShowDetailsModal(true);
      }
    } catch (error) {
      console.error("Error fetching order details:", error);
    } finally {
      setDetailsLoading(false);
    }
  };

  // Enhanced handleUpdateStatus function with shipping data support
  const handleUpdateStatus = async (saleId: string, newStatus: string, shippingData?: any) => {
    try {
      const orderId = saleId.split('_')[0];
      const orderRef = doc(db, "orders", orderId);
      
      const updateData: any = { status: newStatus };
      
      if (newStatus === "shipped") {
        updateData.shippedDate = new Date();
        
        // Add shipping information if provided
        if (shippingData) {
          updateData.shipping = {
            courier: shippingData.courier,
            trackingNumber: shippingData.trackingNumber,
            estimatedDelivery: shippingData.estimatedDelivery ? new Date(shippingData.estimatedDelivery) : null,
            notes: shippingData.notes,
            shippedAt: new Date()
          };
          
          // Also set the legacy trackingNumber field for backward compatibility
          updateData.trackingNumber = shippingData.trackingNumber;
        }
      } else if (newStatus === "completed") {
        updateData.completedDate = new Date();
      }
      
      await updateDoc(orderRef, updateData);
      
      // Send notification to buyer if shipped
      if (newStatus === "shipped" && shippingData) {
        try {
          const orderDoc = await getDoc(orderRef);
          if (orderDoc.exists()) {
            const orderData = orderDoc.data();

            // Create notification (already in your code)
            const notificationData = {
              userId: orderData.userId,
              type: 'order_shipped',
              title: 'Order Shipped!',
              message: `Your order has been shipped via ${getCourierDisplayName(shippingData.courier)}. Tracking: ${shippingData.trackingNumber}`,
              data: {
                orderId: orderId,
                courier: shippingData.courier,
                trackingNumber: shippingData.trackingNumber
              },
              read: false,
              createdAt: new Date()
            };
            await addDoc(collection(db, 'notifications'), notificationData);

            // Send email to buyer
            await fetch("/api/send-email", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                type: "order_shipped",
                data: {
                  buyerEmail: orderData.buyerEmail || orderData.userEmail,
                  buyerName: orderData.buyerName || orderData.userName,
                  orderId,
                  courier: shippingData.courier,
                  trackingNumber: shippingData.trackingNumber,
                  estimatedDelivery: shippingData.estimatedDelivery,
                  notes: shippingData.notes,
                  shippingAddress: orderData.shippingAddress,
                  items: orderData.items,
                  totalAmount: orderData.amount,
                  orderDate: orderData.createdAt
                }
              })
            });
          }
        } catch (notificationError) {
          console.error('⚠️ Failed to send notification or email:', notificationError);
        }
      }
      
      // Update local state
      setSales(prev => prev.map(sale => 
        sale.id === saleId 
          ? { ...sale, status: newStatus, ...(updateData.shippedDate && { shippedDate: updateData.shippedDate }) }
          : sale
      ));

      // Update modal if it's showing the same order
      if (selectedOrderDetails && selectedOrderDetails.orderId === orderId) {
        setSelectedOrderDetails(prev => prev ? {
          ...prev,
          status: newStatus,
          ...(updateData.shippedDate && { shippedDate: updateData.shippedDate }),
          ...(updateData.shipping && { shipping: updateData.shipping })
        } : null);
      }
      
      alert(`✅ Order ${newStatus === 'shipped' ? 'marked as shipped' : 'status updated'} successfully!`);
      
    } catch (error) {
      console.error("Error updating sale status:", error);
      alert('❌ Error updating order status');
    }
  };

  // Enhanced shipping functions
  const handleMarkAsShipped = (group: GroupedSale) => {
    setSelectedShippingOrder(group);
    setShowShippingModal(true);
  };

  const handleShippingSubmit = async (shippingData: any) => {
    if (!selectedShippingOrder) return;

    console.log('📦 Marking order as shipped with data:', shippingData);

    // Update all items in this order with shipping data
    for (const item of selectedShippingOrder.items) {
      await handleUpdateStatus(item.id, "shipped", shippingData);
    }
    
    setShowShippingModal(false);
    setSelectedShippingOrder(null);
  };

  const getCourierDisplayName = (courierValue: string) => {
    // Since courier is now a text input, just return the value as entered
    // No need for mapping since sellers enter the courier name directly
    return courierValue || 'Unknown Courier';
  };

  const handleUpdateTrackingNumber = async (orderId: string, trackingNumber: string) => {
    try {
      const orderRef = doc(db, "orders", orderId);
      await updateDoc(orderRef, { trackingNumber });
      
      // Update modal
      if (selectedOrderDetails && selectedOrderDetails.orderId === orderId) {
        setSelectedOrderDetails(prev => prev ? {
          ...prev,
          trackingNumber
        } : null);
      }
    } catch (error) {
      console.error("Error updating tracking number:", error);
    }
  };

  const formatTimeRemaining = (date: any): string => {
    if (!date) return "No date";
    
    const saleDate = date.toDate ? date.toDate() : new Date(date);
    const now = new Date();
    const diffTime = now.getTime() - saleDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return "Today";
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return saleDate.toLocaleDateString();
    }
  };

  const formatFullDate = (date: any): string => {
    if (!date) return "N/A";
    const dateObj = date.toDate ? date.toDate() : new Date(date);
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calculateEarnings = (price: number): number => {
    return price;
  };

  const calculateOrderPlatformFee = (totalOrderPrice: number): number => {
    return totalOrderPrice * PLATFORM_FEE_RATE;
  };

  const calculateOrderEarnings = (totalOrderPrice: number): number => {
    return totalOrderPrice * (1 - PLATFORM_FEE_RATE);
  };

  // Group sales by order ID
  const groupedSales = sales.reduce((groups, sale) => {
    const orderId = sale.id.split('_')[0];
    if (!groups[orderId]) {
      groups[orderId] = [];
    }
    groups[orderId].push(sale);
    return groups;
  }, {} as Record<string, Sale[]>);

  // Convert grouped sales back to array format for filtering
  const groupedSalesArray: GroupedSale[] = Object.entries(groupedSales).map(([orderId, items]) => ({
    orderId,
    items,
    status: items[0].status,
    orderDate: items[0].orderDate,
    buyerName: items[0].buyerName,
    totalPrice: items.reduce((sum, item) => sum + (Number(item.price) || 0), 0),
    totalEarnings: 0,
    totalPlatformFees: 0
  })).map(group => ({
    ...group,
    totalPlatformFees: calculateOrderPlatformFee(group.totalPrice),
    totalEarnings: calculateOrderEarnings(group.totalPrice)
  }));

  const activeGroupedSales = groupedSalesArray.filter(group => group.status !== 'refunded');
  
  const totalRevenue = activeGroupedSales.reduce((sum, group) => sum + group.totalPrice, 0);
  const totalEarnings = calculateOrderEarnings(totalRevenue);
  const totalPlatformFees = calculateOrderPlatformFee(totalRevenue);
  const awaitingPaymentCount = activeGroupedSales.filter(s => s.status === 'awaiting_payment').length;
  const paymentConfirmedCount = activeGroupedSales.filter(s => s.status === 'payment_confirmed').length;
  const pendingCount = activeGroupedSales.filter(s => s.status === 'pending').length;
  const shippedCount = activeGroupedSales.filter(s => s.status === 'shipped').length;
  const completedCount = activeGroupedSales.filter(s => s.status === 'completed').length;
  const awaitingVerificationCount = activeGroupedSales.filter(s => s.status === 'awaiting_verification').length;
  const cancelledCount = activeGroupedSales.filter(s => s.status === 'cancelled').length;
  const refundedCount = groupedSalesArray.filter(s => s.status === 'refunded').length;

  const filteredGroupedSales = groupedSalesArray.filter(group => {
    if (activeTab === "all") {
      return group.status !== 'refunded';
    }
    if (activeTab === "refunded") {
      return group.status === 'refunded';
    }
    return group.status === activeTab;
  });

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

  if (authLoading) {
    return (
      <div style={{ 
        minHeight: "100vh", 
        background: "#f5f5f5", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center" 
      }}>
        <div style={{ color: "#666", fontSize: "1.1rem" }}>Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ minHeight: "100vh", background: "#f5f5f5", fontFamily: "system-ui, sans-serif" }}>
        <Navbar />
        <div style={{ textAlign: "center", padding: "100px 20px" }}>
          <div style={{ fontSize: "4rem", marginBottom: 20 }}>🔒</div>
          <h2 style={{ fontSize: "1.5rem", color: "#374151", marginBottom: 12 }}>
            Please log in to view your sales
          </h2>
          <p style={{ color: "#6b7280", marginBottom: 24, fontSize: "1rem" }}>
            You need to be logged in to access the sales dashboard
          </p>
          <button 
            onClick={() => router.push('/login')}
            style={{
              padding: "12px 24px",
              background: "#c9a26d",
              color: "white",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              fontSize: "1rem",
              fontWeight: 600
            }}
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f5", fontFamily: "system-ui, sans-serif" }}>
      <Navbar />
      
      {/* Payout Notification Banner */}
      {showPayoutNotification && recentPayouts.length > 0 && (
        <div style={{
          background: "linear-gradient(135deg, #4CAF50 0%, #45a049 100%)",
          color: "white",
          padding: "20px",
          margin: "0",
          position: "relative"
        }}>
          <button
            onClick={() => setShowPayoutNotification(false)}
            style={{
              position: "absolute",
              top: "10px",
              right: "20px",
              background: "none",
              border: "none",
              color: "white",
              fontSize: "1.5rem",
              cursor: "pointer",
              opacity: 0.8
            }}
          >
            ×
          </button>
          <div style={{ maxWidth: 1000, margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
              <div style={{ fontSize: "1.5rem" }}>💰</div>
              <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 600 }}>
                Payout Received!
              </h3>
            </div>
            {recentPayouts.map((payout, index) => (
              <div key={payout.id} style={{ 
                background: "rgba(255,255,255,0.1)", 
                padding: "15px", 
                borderRadius: 8, 
                marginBottom: index < recentPayouts.length - 1 ? 10 : 0 
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>
                      RM {payout.amount.toFixed(2)} transferred for "{payout.itemName}"
                    </div>
                    <div style={{ fontSize: "0.9rem", opacity: 0.9 }}>
                      Gross: RM {payout.grossAmount.toFixed(2)} • Platform Fee: RM {payout.platformFee.toFixed(2)}
                    </div>
                  </div>
                  <div style={{ fontSize: "0.9rem", opacity: 0.9 }}>
                    {formatFullDate(payout.paidAt)}
                  </div>
                </div>
              </div>
            ))}
            <div style={{ fontSize: "0.9rem", marginTop: 10, opacity: 0.9 }}>
              🏦 Payment should reflect in your account within 1-2 business days
            </div>
          </div>
        </div>
      )}

      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "30px 0" }}>
        {/* Header */}
        <div style={{
          padding: "16px 20px",
          background: "#fff",
          borderBottom: "1px solid #e5e7eb",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <div>
            <h1 style={{
              fontSize: "1.5rem",
              fontWeight: 700,
              color: "#1f2937",
              margin: 0,
              marginBottom: 4
            }}>
              My Sales
            </h1>
            <p style={{ 
              fontSize: "0.85rem", 
              color: "#6b7280", 
              margin: 0 
            }}>
              {sales.length} total sales • RM {totalRevenue.toFixed(2)} gross • RM {totalEarnings.toFixed(2)} earnings
            </p>
          </div>
          
          {/* Payout Summary */}
          {payoutNotifications.length > 0 && (
            <div style={{
              background: "#f0f9ff",
              padding: "12px 16px",
              borderRadius: 8,
              border: "1px solid #bfdbfe",
              textAlign: "right"
            }}>
              <div style={{ fontSize: "0.8rem", color: "#1e40af", marginBottom: 4 }}>
                YOUR PAYOUTS
              </div>
              <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#1e40af" }}>
                RM {payoutNotifications.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0).toFixed(2)}
              </div>
              <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                {payoutNotifications.filter(p => p.status === 'paid').length} paid • {payoutNotifications.filter(p => p.status === 'pending').length} pending
              </div>
            </div>
          )}
        </div>

        {/* Summary Cards */}
        {activeTab === "all" && !loading && sales.length > 0 && (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 12,
            padding: 20,
            background: "#fff",
            borderBottom: "1px solid #e5e7eb"
          }}>
            {awaitingPaymentCount > 0 && (
              <div style={{
                padding: 12,
                background: "#fef3c7",
                borderRadius: 8,
                border: "1px solid #fde68a"
              }}>
                <div style={{ fontSize: "0.7rem", color: "#92400e", fontWeight: 600, marginBottom: 2 }}>
                  AWAITING PAYMENT
                </div>
                <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "#92400e" }}>
                  {awaitingPaymentCount}
                </div>
              </div>
            )}
            {paymentConfirmedCount > 0 && (
              <div style={{
                padding: 12,
                background: "#ecfdf5",
                borderRadius: 8,
                border: "1px solid #a7f3d0"
              }}>
                <div style={{ fontSize: "0.7rem", color: "#065f46", fontWeight: 600, marginBottom: 2 }}>
                  PAYMENT CONFIRMED
                </div>
                <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "#065f46" }}>
                  {paymentConfirmedCount}
                </div>
              </div>
            )}
            <div style={{
              padding: 12,
              background: "#dbeafe",
              borderRadius: 8,
              border: "1px solid #bfdbfe"
            }}>
              <div style={{ fontSize: "0.7rem", color: "#1e40af", fontWeight: 600, marginBottom: 2 }}>
                PREPARING
              </div>
              <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "#1e40af" }}>
                {pendingCount}
              </div>
            </div>
            <div style={{
              padding: 12,
              background: "#dbeafe",
              borderRadius: 8,
              border: "1px solid #bfdbfe"
            }}>
              <div style={{ fontSize: "0.7rem", color: "#1e40af", fontWeight: 600, marginBottom: 2 }}>
                SHIPPED
              </div>
              <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "#1e40af" }}>
                {shippedCount}
              </div>
            </div>
            <div style={{
              padding: 12,
              background: "#d1fae5",
              borderRadius: 8,
              border: "1px solid #a7f3d0"
            }}>
              <div style={{ fontSize: "0.7rem", color: "#065f46", fontWeight: 600, marginBottom: 2 }}>
                COMPLETED
              </div>
              <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "#065f46" }}>
                {completedCount}
              </div>
            </div>
            <div style={{
              padding: 12,
              background: "#f0f9ff",
              borderRadius: 8,
              border: "1px solid #bfdbfe"
            }}>
              <div style={{ fontSize: "0.7rem", color: "#1e40af", fontWeight: 600, marginBottom: 2 }}>
                TOTAL EARNINGS
              </div>
              <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "#1e40af" }}>
                RM {totalEarnings.toFixed(2)}
              </div>
            </div>
            {awaitingVerificationCount > 0 && (
              <div style={{
                padding: 12,
                background: "#f3e8ff",
                borderRadius: 8,
                border: "1px solid #e9d5ff"
              }}>
                <div style={{ fontSize: "0.7rem", color: "#7c3aed", fontWeight: 600, marginBottom: 2 }}>
                  VERIFYING
                </div>
                <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "#7c3aed" }}>
                  {awaitingVerificationCount}
                </div>
              </div>
            )}
            {cancelledCount > 0 && (
              <div style={{
                padding: 12,
                background: "#fee2e2",
                borderRadius: 8,
                border: "1px solid #fecaca"
              }}>
                <div style={{ fontSize: "0.7rem", color: "#991b1b", fontWeight: 600, marginBottom: 2 }}>
                  CANCELLED
                </div>
                <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "#991b1b" }}>
                  {cancelledCount}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "refunded" && refundedCount > 0 && (
          <div style={{
            background: "#fff",
            padding: 20,
            borderBottom: "1px solid #e5e7eb"
          }}>
            <div style={{
              padding: 16,
              background: "#f8fafc",
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              textAlign: "center"
            }}>
              <div style={{ fontSize: "2rem", marginBottom: 8 }}>🔄</div>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 600, color: "#1e293b", marginBottom: 4 }}>
                Refunded Orders
              </h3>
              <p style={{ color: "#64748b", fontSize: "0.9rem", marginBottom: 12 }}>
                These orders were refunded and items have been released back to marketplace
              </p>
              <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#ef4444" }}>
                {refundedCount} order{refundedCount !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={{
          display: "flex",
          background: "#fff",
          borderBottom: "1px solid #e5e7eb",
          overflowX: "auto"
        }}>
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                flex: 1,
                background: "none",
                border: "none",
                color: activeTab === tab.key ? "#1f2937" : "#6b7280",
                fontWeight: activeTab === tab.key ? 600 : 400,
                fontSize: "0.95rem",
                padding: "14px 16px",
                borderBottom: activeTab === tab.key ? `3px solid ${TAB_ACTIVE_COLOR}` : "3px solid transparent",
                cursor: "pointer",
                transition: "all 0.2s",
                whiteSpace: "nowrap"
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div style={{ fontSize: "0.9rem", color: "#9ca3af" }}>Loading sales...</div>
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredGroupedSales.length === 0 && (
          <div style={{
            textAlign: "center",
            padding: "80px 20px",
            background: "#fff"
          }}>
            <div style={{ fontSize: "3rem", marginBottom: 12 }}>📦</div>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 600, color: "#6b7280", marginBottom: 8 }}>
              {activeTab === "all" ? "No sales yet" : `No ${activeTab} sales`}
            </h3>
            <p style={{ color: "#9ca3af", fontSize: "0.9rem", marginBottom: 20 }}>
              {activeTab === "all"
                ? "Your sold items will appear here"
                : `No ${activeTab} sales found`}
            </p>
          </div>
        )}

        {/* Sales Grid */}
        {!loading && filteredGroupedSales.length > 0 && (
          <div>
            {filteredGroupedSales.map(group => (
              <div
                key={group.orderId}
                style={{
                  background: "#fff",
                  borderBottom: "1px solid #e5e7eb",
                  padding: "28px 32px",
                  marginBottom: 18,
                  cursor: "pointer",
                  borderRadius: 12,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                  position: "relative"
                }}
                onClick={() => fetchOrderDetails(group.orderId)}
              >
                {/* Order Header */}
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 20,
                  paddingBottom: 12,
                  borderBottom: "1px solid #f3f4f6"
                }}>
                  <div>
                    <h3 style={{
                      fontSize: "1.1rem",
                      fontWeight: 600,
                      color: "#1f2937",
                      margin: 0,
                      marginBottom: 4
                    }}>
                      Order #{group.orderId.substring(0, 30)}
                    </h3>
                    <div style={{ fontSize: "0.9rem", color: "#6b7280" }}>
                      <span>Buyer: </span>
                      <span style={{ fontWeight: 600, color: "black" }}>
                        {group.buyerName}
                      </span>
                      <span style={{ margin: "0 12px" }}>•</span>
                      <span>Date: </span>
                      <span style={{ fontWeight: 600 }}>
                        {formatTimeRemaining(group.orderDate)}
                      </span>
                    </div>
                  </div>
                  
                  {/* Order Total */}
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "black", marginBottom: 2 }}>
                      RM {group.totalPrice.toFixed(2)} → RM {group.totalEarnings.toFixed(2)}
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>
                      {group.items.length} item{group.items.length > 1 ? 's' : ''}
                    </div>
                  </div>
                </div>

                {/* Items in this order */}
                <div style={{
                  display: "grid",
                  gap: 16,
                  marginBottom: 16
                }}>
                  {group.items.map((sale, itemIndex) => (
                    <div key={sale.id} style={{
                      display: "flex",
                      gap: 16,
                      alignItems: "center",
                      padding: "12px 16px",
                      background: "#f8fafc",
                      borderRadius: 8,
                      border: "1px solid #e2e8f0"
                    }}>
                      {/* Item Image */}
                      <div style={{
                        width: 60,
                        height: 60,
                        flexShrink: 0,
                        borderRadius: 8,
                        overflow: "hidden",
                        background: "#f9fafb",
                        border: "1px solid #e5e7eb"
                      }}>
                        {sale.itemImage ? (
                          <img
                            src={sale.itemImage}
                            alt={sale.itemName}
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

                      {/* Item Details */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h4 style={{
                          fontSize: "0.95rem",
                          fontWeight: 600,
                          color: "#1f2937",
                          margin: 0,
                          marginBottom: 4,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap"
                        }}>
                          {sale.itemName}
                        </h4>
                        <div style={{ fontSize: "0.85rem", color: "#6b7280" }}>
                          RM {(Number(sale.price) || 0).toFixed(2)}
                        </div>
                      </div>

                      {/* Item Price Only */}
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "#374151" }}>
                          RM {(Number(sale.price) || 0).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                
                {/* Order Summary & Status */}
                <div style={{
                  background: "#f8fafc",
                  padding: "12px 16px",
                  borderRadius: 8,
                  border: "1px solid #e2e8f0",
                  marginBottom: 16
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "#1e293b" }}>
                      Order Summary
                    </div>
                    <div style={{ fontSize: "0.85rem", color: "#64748b" }}>
                      {group.status === "completed" ? "✅ Order Completed - Payout Processed" : 
                       group.status === "awaiting_payment" ? "⏳ Awaiting Payment Confirmation" :
                       group.status === "payment_confirmed" ? "💳 Payment Confirmed - Ready to Prepare" :
                       group.status === "pending" ? "📦 Preparing for Shipment" :
                       group.status === "shipped" ? "🚚 Shipped - Awaiting Buyer Confirmation" :
                       group.status === "refunded" ? "🔄 Order Refunded - Items Available for Sale" : "⏳ Pending Release"}
                    </div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: 4 }}>
                    <span style={{ color: "#64748b" }}>Total Sale:</span>
                    <span style={{ color: "#64748b" }}>RM {group.totalPrice.toFixed(2)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: 4 }}>
                    <span style={{ color: "#64748b" }}>Platform Fee ({(PLATFORM_FEE_RATE * 100).toFixed(0)}%):</span>
                    <span style={{ color: "#64748b" }}>-RM {group.totalPlatformFees.toFixed(2)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem", fontWeight: 600 }}>
                    <span style={{ color: "#1e293b" }}>Your Total Earnings:</span>
                    <span style={{ color: "#059669" }}>RM {group.totalEarnings.toFixed(2)}</span>
                  </div>
                </div>

                {/* Status & Actions */}
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <span style={{
                      padding: "4px 10px",
                      borderRadius: 6,
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      textTransform: "capitalize",
                      ...getStatusStyle(group.status)
                    }}>
                      {group.status.replace('_', ' ')}
                    </span>
                    {/* Only show paid status for non-refunded orders */}
                    {group.status !== "refunded" && (
                      <span style={{
                        padding: "4px 10px",
                        background: "#f0fdf4",
                        color: "#166534",
                        borderRadius: 6,
                        fontSize: "0.8rem",
                        fontWeight: 600,
                        textTransform: "capitalize"
                      }}>
                        paid
                      </span>
                    )}
                    {/* Show simple message for refunded orders */}
                    {group.status === "refunded" && (
                      <span style={{
                        padding: "4px 10px",
                        background: "#f0f9ff",
                        color: "#1e40af",
                        borderRadius: 6,
                        fontSize: "0.8rem",
                        fontWeight: 600
                      }}>
                        ✅ Items Re-listed
                      </span>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: 12 }}>
                    {/* Action buttons based on order status and workflow */}
                    {group.status === "awaiting_payment" && (
                      <div style={{
                        padding: "10px 18px",
                        background: "#fef3c7",
                        color: "#92400e",
                        border: "1px solid #fde68a",
                        borderRadius: 8,
                        fontSize: "0.85rem",
                        fontWeight: 600
                      }}>
                        ⏳ Waiting for Admin Payment Confirmation
                      </div>
                    )}
                    {group.status === "payment_confirmed" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          group.items.forEach(item => {
                            handleUpdateStatus(item.id, "pending");
                          });
                        }}
                        style={{
                          padding: "10px 18px",
                          background: "#10b981",
                          color: "#fff",
                          border: "none",
                          borderRadius: 8,
                          fontSize: "0.95rem",
                          fontWeight: 600,
                          cursor: "pointer"
                        }}
                      >
                        🚀 Start Preparing Order
                      </button>
                    )}
                    {group.status === "pending" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkAsShipped(group);
                        }}
                        style={{
                          padding: "10px 18px",
                          background: "#a7967e",
                          color: "#fff",
                          border: "none",
                          borderRadius: 8,
                          fontSize: "0.95rem",
                          fontWeight: 600,
                          cursor: "pointer"
                        }}
                      >
                        📦 Mark as Shipped
                      </button>
                    )}
                    {group.status === "shipped" && (
                      <div style={{
                        padding: "10px 18px",
                        background: "#e0e7ff",
                        color: "#3730a3",
                        border: "1px solid #c7d2fe",
                        borderRadius: 8,
                        fontSize: "0.85rem",
                        fontWeight: 600
                      }}>
                        🚚 Shipped - Awaiting buyer confirmation
                      </div>
                    )}
                    {group.status === "completed" && (
                      <div style={{
                        padding: "10px 18px",
                        background: "#d1fae5",
                        color: "#065f46",
                        border: "1px solid #a7f3d0",
                        borderRadius: 8,
                        fontSize: "0.85rem",
                        fontWeight: 600
                      }}>
                        ✅ Order Completed
                      </div>
                    )}
                    {group.status === "awaiting_verification" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          group.items.forEach(item => {
                            handleUpdateStatus(item.id, "pending");
                          });
                        }}
                        style={{
                          padding: "10px 18px",
                          background: "#7c3aed",
                          color: "#fff",
                          border: "none",
                          borderRadius: 8,
                          fontSize: "0.95rem",
                          fontWeight: 600,
                          cursor: "pointer"
                        }}
                      >
                        Mark as Preparing
                      </button>
                    )}
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        fetchOrderDetails(group.orderId);
                      }}
                      style={{
                        padding: "10px 18px",
                        background: "#f3f4f6",
                        color: "#374151",
                        border: "1px solid #d1d5db",
                        borderRadius: 8,
                        fontSize: "0.95rem",
                        fontWeight: 500,
                        cursor: "pointer"
                      }}
                    >
                      {detailsLoading ? "Loading..." : "View Details"}
                    </button>
                  </div>
                </div>

                {/* Arrow */}
                <div style={{
                  position: "absolute",
                  right: "20px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#d1d5db"
                }}>
                  <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Enhanced Shipping Modal */}
      {showShippingModal && selectedShippingOrder && (
        <ShippingModal
          order={selectedShippingOrder}
          onClose={() => {
            setShowShippingModal(false);
            setSelectedShippingOrder(null);
          }}
          onSubmit={handleShippingSubmit}
        />
      )}

      {/* Order Details Modal */}
      {showDetailsModal && selectedOrderDetails && (
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
                onClick={() => setShowDetailsModal(false)}
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
                    <p><strong>Order ID:</strong> {selectedOrderDetails.orderId}</p>
                    <p><strong>Order Date:</strong> {formatFullDate(selectedOrderDetails.orderDate)}</p>
                    <p><strong>Status:</strong> 
                      <span style={{
                        marginLeft: 8,
                        padding: "2px 8px",
                        borderRadius: 4,
                        fontSize: "0.8rem",
                        fontWeight: 600,
                        textTransform: "capitalize",
                        ...getStatusStyle(selectedOrderDetails.status)
                      }}>
                        {selectedOrderDetails.status.replace('_', ' ')}
                      </span>
                    </p>
                    <p><strong>Payment:</strong> {selectedOrderDetails.paymentStatus}</p>
                    <p><strong>Total Amount:</strong> RM {selectedOrderDetails.amount.toFixed(2)}</p>
                  </div>
                </div>

                <div>
                  <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "#374151", marginBottom: 8 }}>
                    Buyer Information
                  </h3>
                  <div style={{ fontSize: "0.9rem", color: "#6b7280", lineHeight: 1.6 }}>
                    <p><strong>Name:</strong> {selectedOrderDetails.buyer.name}</p>
                    {selectedOrderDetails.buyer.phone && (
                      <p><strong>Phone:</strong> {selectedOrderDetails.buyer.phone}</p>
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
                  <p style={{ fontWeight: 600, color: "#374151" }}>{selectedOrderDetails.shippingAddress.fullName}</p>
                  <p>{selectedOrderDetails.shippingAddress.addressLine1}</p>
                  {selectedOrderDetails.shippingAddress.addressLine2 && (
                    <p>{selectedOrderDetails.shippingAddress.addressLine2}</p>
                  )}
                  <p>
                    {selectedOrderDetails.shippingAddress.city}, {selectedOrderDetails.shippingAddress.state} {selectedOrderDetails.shippingAddress.postalCode}
                  </p>
                  <p>{selectedOrderDetails.shippingAddress.country}</p>
                  {selectedOrderDetails.shippingAddress.phone && (
                    <p><strong>Phone:</strong> {selectedOrderDetails.shippingAddress.phone}</p>
                  )}
                </div>
              </div>

              {/* Enhanced Shipping Display */}
              {selectedOrderDetails.shipping && (
                <div style={{ marginBottom: 20 }}>
                  <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "#374151", marginBottom: 8 }}>
                    Shipping Details
                  </h3>
                  <div style={{
                    background: "#f0f9ff",
                    padding: 15,
                    borderRadius: 8,
                    border: "1px solid #bfdbfe",
                    marginBottom: 16
                  }}>
                    <div style={{ display: "grid", gap: 8, fontSize: "0.9rem", color: "#1e40af" }}>
                      <div>
                        <strong>Courier:</strong> {getCourierDisplayName(selectedOrderDetails.shipping.courier)}
                      </div>
                      <div>
                        <strong>Tracking Number:</strong> {selectedOrderDetails.shipping.trackingNumber}
                      </div>
                      {selectedOrderDetails.shipping.estimatedDelivery && (
                        <div>
                          <strong>Estimated Delivery:</strong> {formatFullDate(selectedOrderDetails.shipping.estimatedDelivery)}
                        </div>
                      )}
                      <div>
                        <strong>Shipped Date:</strong> {formatFullDate(selectedOrderDetails.shipping.shippedAt)}
                      </div>
                      {selectedOrderDetails.shipping.notes && (
                        <div>
                          <strong>Notes:</strong> {selectedOrderDetails.shipping.notes}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Tracking Information */}
              <div style={{ marginBottom: 32 }}>
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 16
                }}>
                  <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "#374151", margin: 0 }}>
                    Tracking Information
                  </h3>
                  {selectedOrderDetails.status === "shipped" && !selectedOrderDetails.shipping && (
                    <button
                      onClick={() => {
                        const trackingNumber = prompt("Enter tracking number:");
                        if (trackingNumber) {
                          handleUpdateTrackingNumber(selectedOrderDetails.orderId, trackingNumber);
                        }
                      }}
                      style={{
                        padding: "6px 12px",
                        background: "#c9a26d",
                        color: "white",
                        border: "none",
                        borderRadius: 6,
                        fontSize: "0.8rem",
                        cursor: "pointer"
                      }}
                    >
                      Add Tracking
                    </button>
                  )}
                </div>
                
                {selectedOrderDetails.trackingNumber && !selectedOrderDetails.shipping && (
                  <div style={{
                    background: "#f0f9ff",
                    padding: 12,
                    borderRadius: 8,
                    marginBottom: 16,
                    border: "1px solid #e0f2fe"
                  }}>
                    <p style={{ margin: 0, fontSize: "0.9rem", color: "#0369a1" }}>
                      <strong>Tracking Number:</strong> {selectedOrderDetails.trackingNumber}
                    </p>
                  </div>
                )}

                {/* Order Progress */}
                <div style={{ position: "relative" }}>
                  {getTrackingStatus(
                    selectedOrderDetails.status,
                    selectedOrderDetails.orderDate,
                    selectedOrderDetails.shippedDate,
                    selectedOrderDetails.completedDate
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

              {/* Order Items */}
              <div style={{ marginBottom: 32 }}>
                <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "#374151", marginBottom: 16 }}>
                  Items Ordered
                </h3>
                {selectedOrderDetails.items.map((item, index) => (
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
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
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
                        {item.name}
                      </p>
                      <p style={{
                        margin: 0,
                        fontSize: "0.8rem",
                        color: "#6b7280"
                      }}>
                        Quantity: {item.quantity} • RM {(Number(item.price) || 0).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Notes */}
              {selectedOrderDetails.notes && (
                <div style={{ marginBottom: 24 }}>
                  <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "#374151", marginBottom: 8 }}>
                    Order Notes
                  </h3>
                  <div style={{
                    background: "#f9fafb",
                    padding: 16,
                    borderRadius: 8,
                    fontSize: "0.9rem",
                    color: "#6b7280",
                    lineHeight: 1.6
                  }}>
                    {selectedOrderDetails.notes}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{
                display: "flex",
                gap: 12,
                justifyContent: "flex-end",
                paddingTop: 24,
                borderTop: "1px solid #e5e7eb"
              }}>
                {selectedOrderDetails.status === "pending" && (
                  <button
                    onClick={() => {
                      setShowDetailsModal(false);
                                            const orderGroup = groupedSalesArray.find(g => g.orderId === selectedOrderDetails.orderId);
                                            if (orderGroup) {
                                              handleMarkAsShipped(orderGroup);
                                            }
                                          }}
                                          style={{
                                            padding: "10px 20px",
                                            background: "#a7967e",
                                            color: "white",
                                            border: "none",
                                            borderRadius: 6,
                                            cursor: "pointer",
                                            fontSize: "0.9rem",
                                            fontWeight: 500
                                          }}
                                        >
                                          Mark as Shipped
                                        </button>
                                      )}
                                      <button
                                        onClick={() => setShowDetailsModal(false)}
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
                            )}
                          </div>
                        );
                      };
                      
                      export default SalesPage;
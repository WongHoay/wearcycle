"use client";
import React, { useEffect, useState } from 'react';
import { collection, getDocs, doc, updateDoc, query, orderBy, getDoc, addDoc, where } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { useRouter } from 'next/navigation';

interface Order {
  id: string;
  userId: string;
  buyerName?: string;
  userName?: string;
  sellerId?: string;
  sellerName?: string;
  items?: string[];
  amount?: number;
  status: string;
  paymentStatus?: string;
  paymentProof?: string;
  createdAt?: any;
  paymentConfirmedAt?: any;
  paymentVerifiedAt?: any;
  paymentRejectedAt?: any;
  shippedDate?: any;
  completedDate?: any;
  rejectionReason?: string;
  refundStatus?: string;
  shippingAddress?: string | {
    fullName?: string;
    phone?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
}

interface Product {
  id: string;
  name?: string;
  title?: string;
  description?: string;
  price?: number;
  images?: string[];
  image?: string;
  brand?: string;
  category?: string;
  condition?: string;
}

interface Refund {
  id: string;
  orderId: string;
  buyerId: string;
  buyerName: string;
  amount: number;
  status: string;
  reason: string;
  createdAt: any;
  processedAt?: any;
  adminNotes?: string;
  itemsReleased?: number;
}

// Refund Form Component
const RefundForm = ({ onSubmit, onCancel }: { onSubmit: (details: { method: string; reference: string; notes: string }) => void; onCancel: () => void }) => {
  const [method, setMethod] = useState('bank_transfer');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = () => {
    if (!reference.trim()) {
      alert('Please enter a transaction reference number');
      return;
    }
    
    onSubmit({ method, reference: reference.trim(), notes: notes.trim() });
  };

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <label style={{ 
          display: 'block', 
          fontSize: '0.9rem', 
          fontWeight: 500, 
          color: '#374151', 
          marginBottom: 8 
        }}>
          Refund Method:
        </label>
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 12px',
            border: '1px solid #d1d5db',
            borderRadius: 6,
            fontSize: '0.9rem',
            background: 'white'
          }}
        >
          <option value="bank_transfer">Bank Transfer</option>
          <option value="ewallet">E-Wallet</option>
        </select>
      </div>

      <div style={{ marginBottom: 20 }}>
        <label style={{ 
          display: 'block', 
          fontSize: '0.9rem', 
          fontWeight: 500, 
          color: '#374151', 
          marginBottom: 8 
        }}>
          Transaction Reference Number: *
        </label>
        <input
          type="text"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder="Enter transaction reference..."
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
          Additional Notes (Optional):
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any additional notes..."
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
          onClick={onCancel}
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
            background: '#059669',
            color: 'white',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: '0.9rem',
            fontWeight: 500
          }}
        >
          ✅ Complete Refund
        </button>
      </div>
    </>
  );
};

// Migration Utility Component
const AdminMigrationUtility = () => {
  const [migrating, setMigrating] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const [completed, setCompleted] = useState(false);

  const addLog = (message: string) => {
    setResults(prev => [...prev, message]);
    console.log(message);
  };

  const migrateRejectedOrders = async () => {
    setMigrating(true);
    setResults([]);
    setCompleted(false);
    
    try {
      addLog('🔄 Starting migration of rejected orders to refunds collection...');
      
      // Find all orders with rejected payment status
      const q = query(
        collection(db, 'orders'), 
        where('paymentStatus', '==', 'rejected')
      );
      
      const snapshot = await getDocs(q);
      const rejectedOrders = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Order));
      
      addLog(`📋 Found ${rejectedOrders.length} rejected orders to migrate`);
      
      let migratedCount = 0;
      let skippedCount = 0;
      
      for (const order of rejectedOrders) {
        try {
          addLog(`🔍 Processing order: ${order.id.slice(0, 8)}...`);
          
          // Check if refund record already exists
          const existingRefundsQuery = query(
            collection(db, 'refunds'),
            where('orderId', '==', order.id)
          );
          const existingRefunds = await getDocs(existingRefundsQuery);
          
          if (!existingRefunds.empty) {
            addLog(`⏭️ Refund record already exists, skipping...`);
            skippedCount++;
            continue;
          }
          
          // Get buyer information
          let buyerName = order.buyerName || order.userName || 'Unknown Buyer';
          let buyerEmail = '';
          
          if (order.userId) {
            try {
              const userDoc = await getDoc(doc(db, 'users', order.userId));
              if (userDoc.exists()) {
                const userData = userDoc.data();
                buyerEmail = userData.email || '';
                if (!buyerName || buyerName === 'Unknown Buyer') {
                  buyerName = userData.displayName || userData.name || buyerName;
                }
              }
            } catch (userError) {
              addLog(`⚠️ Could not fetch user data for order`);
            }
          }
          
          // Count released items
          const itemsCount = order.items ? order.items.length : 0;
          
          // Create refund record
          const refundData = {
            orderId: order.id,
            buyerId: order.userId || '',
            buyerName: buyerName,
            buyerEmail: buyerEmail,
            amount: order.amount || 0,
            originalPaymentProof: order.paymentProof || '',
            status: 'pending_manual_refund',
            method: 'bank_transfer',
            reason: order.rejectionReason || 'Payment verification failed',
            createdAt: order.paymentRejectedAt || order.createdAt || new Date(),
            processedBy: null,
            processedAt: null,
            refundProof: null,
            adminNotes: `Migrated from rejected order. Original rejection: ${order.rejectionReason || 'No reason provided'}`,
            itemsReleased: itemsCount,
            migrated: true,
            migratedAt: new Date()
          };
          
          // Add refund record
          const refundRef = await addDoc(collection(db, 'refunds'), refundData);
          
          // Update order status if needed
          const orderUpdateData: any = {};
          
          if (order.status !== 'pending_refund' && order.status !== 'refunded') {
            orderUpdateData.status = 'pending_refund';
          }
          
          if (!order.refundStatus) {
            orderUpdateData.refundStatus = 'pending_manual_refund';
          }
          
          orderUpdateData.migratedToRefunds = true;
          orderUpdateData.migratedAt = new Date();
          
          await updateDoc(doc(db, 'orders', order.id), orderUpdateData);
          
          migratedCount++;
          addLog(`✅ Successfully migrated order #${order.id.slice(0, 8)}`);
          
        } catch (orderError) {
          addLog(`❌ Error migrating order ${order.id.slice(0, 8)}: ${orderError}`);
        }
      }
      
      addLog(`🎉 Migration completed!`);
      addLog(`✅ Successfully migrated: ${migratedCount} orders`);
      addLog(`⏭️ Skipped (already existed): ${skippedCount} orders`);
      addLog(`📊 Total processed: ${rejectedOrders.length} orders`);
      
      if (migratedCount > 0) {
        addLog(`📋 Next: Refresh the page to see refunds in "Pending Manual Refunds" section`);
      }
      
      setCompleted(true);
      
    } catch (error) {
      addLog(`❌ Migration failed: ${error}`);
    } finally {
      setMigrating(false);
    }
  };

  return (
    <div style={{ 
      marginTop: 30, 
      padding: 20, 
      background: '#fff', 
      borderRadius: 12, 
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      border: '1px solid #e5e7eb'
    }}>
      <h3 style={{ 
        fontSize: '1.2rem', 
        fontWeight: 600, 
        marginBottom: 15, 
        color: '#1f2937',
        display: 'flex',
        alignItems: 'center',
        gap: 8
      }}>
        🔧 Migration Utility - Convert Existing Rejected Orders
      </h3>
      
      <div style={{ 
        marginBottom: 20, 
        padding: 15, 
        background: '#eff6ff', 
        borderRadius: 8,
        border: '1px solid #3b82f6'
      }}>
        <p style={{ fontSize: '0.9rem', color: '#1e40af', margin: 0 }}>
          <strong>Run this once:</strong> This will migrate your existing rejected orders (like LYqOmWvk, fZgpXnP, etc.) 
          into proper refund records so they appear in the "Pending Manual Refunds" section below.
        </p>
      </div>

      <button
        onClick={migrateRejectedOrders}
        disabled={migrating}
        style={{
          padding: '12px 24px',
          background: migrating ? '#9ca3af' : '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: 8,
          cursor: migrating ? 'not-allowed' : 'pointer',
          fontWeight: 600,
          fontSize: '1rem',
          marginBottom: 20
        }}
      >
        {migrating ? '🔄 Migrating...' : '🚀 Start Migration'}
      </button>

      {results.length > 0 && (
        <div style={{
          background: '#f8fafc',
          borderRadius: 8,
          padding: 15,
          border: '1px solid #e2e8f0',
          maxHeight: 400,
          overflowY: 'auto'
        }}>
          <h4 style={{ 
            fontSize: '1rem', 
            fontWeight: 600, 
            marginBottom: 10, 
            color: '#374151' 
          }}>
            Migration Log:
          </h4>
          {results.map((result, index) => (
            <div 
              key={index} 
              style={{ 
                fontSize: '0.85rem', 
                color: '#4b5563', 
                marginBottom: 4,
                fontFamily: 'monospace'
              }}
            >
              {result}
            </div>
          ))}
        </div>
      )}

      {completed && (
        <div style={{
          marginTop: 15,
          padding: 12,
          background: '#ecfdf5',
          borderRadius: 6,
          border: '1px solid #10b981'
        }}>
          <div style={{ 
            color: '#059669', 
            fontSize: '0.9rem', 
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            ✅ Migration completed! Refresh the page to see the refunds in the "Pending Manual Refunds" section.
          </div>
        </div>
      )}
    </div>
  );
};

const RefundManagement = ({ fetchOrders }: { fetchOrders: () => void }) => {
  const [pendingRefunds, setPendingRefunds] = useState<Refund[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRefund, setSelectedRefund] = useState<Refund | null>(null);

  useEffect(() => {
    fetchPendingRefunds();
  }, []);

  const fetchPendingRefunds = async () => {
    try {
      const q = query(
        collection(db, 'refunds'), 
        where('status', '==', 'pending_manual_refund'),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const refunds = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Refund));
      setPendingRefunds(refunds);
    } catch (error) {
      console.error('Error fetching pending refunds:', error);
    } finally {
      setLoading(false);
    }
  };

  const markRefundCompleted = async (refundId: string, refundDetails: any) => {
    try {
      console.log(`🔄 Processing refund completion for refund ID: ${refundId}`);
      
      // Get the refund document to find the orderId
      const refundDoc = await getDoc(doc(db, 'refunds', refundId));
      
      if (!refundDoc.exists()) {
        throw new Error('Refund document not found');
      }
      
      const refundData = refundDoc.data();
      console.log('📄 Refund data:', refundData);
      
      const orderId = refundData.orderId;
      console.log(`📋 Order ID from refund: ${orderId}`);
      
      if (!orderId) {
        throw new Error('Order ID not found in refund record');
      }

      // Update refund record first
      await updateDoc(doc(db, 'refunds', refundId), {
        status: 'completed',
        processedAt: new Date(),
        processedBy: 'admin',
        refundMethod: refundDetails.method,
        refundReference: refundDetails.reference,
        adminNotes: refundDetails.notes || ''
      });
      console.log('✅ Refund record updated');

      // Update order status to refunded
      await updateDoc(doc(db, 'orders', orderId), {
        status: 'refunded',
        refundCompletedAt: new Date(),
        refundProcessedBy: 'admin'
      });
      console.log('✅ Order status updated to refunded');

      alert('✅ Refund marked as completed! Order status updated to refunded.');
      
      // Refresh both the refunds list and orders list
      fetchPendingRefunds();
      fetchOrders(); // This will refresh the orders table to show new status
      
      setSelectedRefund(null); // Close modal
      
    } catch (error) {
      console.error('❌ Error marking refund as completed:', error);
      alert(`❌ Error updating refund status: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
    }
  };

  const handleCompleteRefund = (refund: Refund) => {
    setSelectedRefund(refund);
  };

  const handleModalSubmit = (refundDetails: any) => {
    if (selectedRefund) {
      markRefundCompleted(selectedRefund.id, refundDetails);
    }
  };

  if (loading) return <div>Loading refunds...</div>;

  return (
    <>
      <div style={{ marginTop: 30, padding: 20, background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: 20, color: '#1f2937' }}>
          🔄 Pending Manual Refunds ({pendingRefunds.length})
        </h3>
        
        {pendingRefunds.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#6b7280', padding: 20 }}>
            No pending refunds - Run migration above if you have rejected orders that need refund tracking
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 15 }}>
            {pendingRefunds.map(refund => (
              <div key={refund.id} style={{
                padding: 16,
                border: '1px solid #fde68a',
                borderRadius: 8,
                background: '#fef3c7'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: '#92400e' }}>
                      Order #{refund.orderId?.slice(0, 8)} - {refund.buyerName}
                    </div>
                    <div style={{ fontSize: '0.9rem', color: '#92400e', marginTop: 4 }}>
                      Amount: RM {refund.amount?.toFixed(2)} • Reason: {refund.reason}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#92400e', marginTop: 2 }}>
                      Created: {refund.createdAt?.toDate?.()?.toLocaleDateString() || 'N/A'}
                      {refund.itemsReleased && ` • ${refund.itemsReleased} items released`}
                    </div>
                  </div>
                  <button
                    onClick={() => handleCompleteRefund(refund)}
                    style={{
                      padding: '8px 16px',
                      background: '#059669',
                      color: 'white',
                      border: 'none',
                      borderRadius: 6,
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '0.9rem'
                    }}
                  >
                    ✅ Mark Refund Completed
                  </button>
                </div>
                
                {refund.adminNotes && (
                  <div style={{ 
                    marginTop: 10, 
                    padding: 8, 
                    background: '#fff', 
                    borderRadius: 4,
                    fontSize: '0.8rem',
                    color: '#6b7280'
                  }}>
                    <strong>Notes:</strong> {refund.adminNotes}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* -Custom Refund Completion Modal- */}
      {selectedRefund && (
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
            zIndex: 1000,
            padding: 20
          }}
          onClick={() => setSelectedRefund(null)}
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
              Complete Refund
            </h3>
            
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: 10 }}>
                <strong>Order:</strong> #{selectedRefund.orderId?.slice(0, 8)} - {selectedRefund.buyerName}
              </div>
              <div style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: 10 }}>
                <strong>Amount:</strong> RM {selectedRefund.amount?.toFixed(2)}
              </div>
              <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>
                <strong>Reason:</strong> {selectedRefund.reason}
              </div>
            </div>

            <RefundForm 
              onSubmit={handleModalSubmit}
              onCancel={() => setSelectedRefund(null)}
            />
          </div>
        </div>
      )}
    </>
  );
};

const AdminOrdersPage = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderProducts, setOrderProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    let filtered = orders;

    if (statusFilter !== 'all') {
      if (statusFilter === 'pending_payment') {
        filtered = filtered.filter(order => order.paymentStatus === 'pending_verification');
      } else {
        filtered = filtered.filter(order => order.status === statusFilter);
      }
    }
                                     
    if (search) {
      filtered = filtered.filter(order =>
        order.id.toLowerCase().includes(search.toLowerCase()) ||
        order.buyerName?.toLowerCase().includes(search.toLowerCase()) ||
        order.userName?.toLowerCase().includes(search.toLowerCase())
      );
    }

    setFilteredOrders(filtered);
  }, [search, statusFilter, orders]);

  const createPayoutForCompletedOrder = async (orderId: string) => {
    try {
      console.log(`🔄 Creating payouts for completed order: ${orderId}`);
      
      const orderDoc = await getDoc(doc(db, 'orders', orderId));
      if (!orderDoc.exists()) {
        throw new Error(`Order ${orderId} not found`);
      }

      const order = { id: orderDoc.id, ...orderDoc.data() } as Order;
      const orderItems = order.items || [];

      if (orderItems.length === 0) {
        console.log(`⚠️ Order ${orderId} has no items, skipping payout creation`);
        return;
      }

      let createdPayoutsCount = 0;

      for (const item of orderItems) {
        try {
          let sellerId = null;
          let sellerName = null;
          let sellerEmail = null;
          let productId = null;
          let itemPrice = 0;
          let itemName = 'Unknown Item';

          if (typeof item === 'string') {
            productId = item;
            console.log(`📦 Item is product ID: ${productId}`);
          } else {
            console.log(`⚠️ Unexpected item format:`, item);
            continue;
          }

          if (productId) {
            console.log(`🔍 Looking up product ${productId}...`);
            const productDoc = await getDoc(doc(db, 'products', productId));
            
            if (productDoc.exists()) {
              const productData = productDoc.data();
              console.log(`📄 Product data found:`, productData);
              
              sellerId = productData.sellerId;
              sellerName = productData.sellerName;
              sellerEmail = productData.sellerEmail;
              itemPrice = productData.price || 0;
              itemName = productData.name || productData.title || 'Unknown Item';
              
              if (sellerId) {
                console.log(`✅ Found seller: ${sellerName} (${sellerId})`);
              } else {
                console.log(`⚠️ Product exists but missing sellerId`);
                continue;
              }
            } else {
              console.log(`❌ Product ${productId} not found`);
              continue;
            }
          }

          if (sellerId && itemPrice > 0) {
            const PLATFORM_FEE_RATE = 0.10;
            let itemPriceNum = typeof itemPrice === "string" ? parseFloat(itemPrice) : itemPrice;
            if (isNaN(itemPriceNum)) itemPriceNum = 0;
            const itemTotal = itemPriceNum;
            const platformFee = itemTotal * PLATFORM_FEE_RATE;
            const netAmount = itemTotal - platformFee;

            console.log(`💰 Calculating: ${itemTotal} - ${platformFee.toFixed(2)} = ${netAmount.toFixed(2)}`);

            if (netAmount > 0) {
              const sellerDoc = await getDoc(doc(db, 'users', sellerId));
              const sellerBankDetails = sellerDoc.exists() ? sellerDoc.data()?.bankDetails : null;

              const payoutData = {
                sellerId: sellerId,
                sellerName: sellerName || 'Unknown Seller',
                sellerEmail: sellerEmail || '',
                amount: parseFloat(netAmount.toFixed(2)),
                platformFee: parseFloat(platformFee.toFixed(2)),
                grossAmount: parseFloat(itemTotal.toFixed(2)),
                ordersCount: 1,
                orderIds: [orderId],
                itemDetails: {
                  productId: productId,
                  bidId: null,
                  itemPrice: itemPrice,
                  quantity: 1,
                  itemName: itemName
                },
                status: 'pending',
                createdAt: new Date(),
                bankDetails: sellerBankDetails || null
              };

              await addDoc(collection(db, 'payouts'), payoutData);
              console.log(`✅ Created payout for ${sellerName}: RM ${netAmount.toFixed(2)}`);
              createdPayoutsCount++;

              try {
                const notificationData = {
                  userId: sellerId,
                  type: 'payout_pending',
                  title: 'Payout Pending',
                  message: `Your payout of RM ${netAmount.toFixed(2)} is ready for processing. Order: ${orderId}`,
                  data: {
                    orderId: orderId,
                    amount: netAmount
                  },
                  read: false,
                  createdAt: new Date()
                };
                await addDoc(collection(db, 'notifications'), notificationData);
                console.log(`📧 Notification sent to seller ${sellerId}`);
              } catch (notificationError) {
                console.error('⚠️ Failed to send notification:', notificationError);
              }
            }
          }
        } catch (error) {
          console.error(`❌ Error processing item:`, error);
        }
      }

      console.log(`🎉 Created ${createdPayoutsCount} payouts for order ${orderId}`);
    } catch (error) {
      console.error(`❌ Error creating payouts for order ${orderId}:`, error);
    }
  };

  const fetchOrders = async () => {
    try {
      const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const ordersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Order));
      setOrders(ordersData);
      setFilteredOrders(ordersData);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderProducts = async (items: { id: string, type?: string }[]) => {
    console.log('fetching products for items', items);
    setLoadingProducts(true);
    try {
      const products: Product[] = [];
      for (const item of items) {
        let productData: Product | null = null;
        if (!item.type || item.type === "product") {
          const productDoc = await getDoc(doc(db, 'products', item.id));
          if (productDoc.exists()) {
            productData = { ...productDoc.data(), id: item.id } as Product;
          }
        }
        if (!productData && (!item.type || item.type === "bid")) {
          const bidDoc = await getDoc(doc(db, 'bids', item.id));
          if (bidDoc.exists()) {
            productData = { ...bidDoc.data(), id: item.id } as Product;
          }
        }
        products.push(
          productData || { id: item.id, name: 'Item Not Found', price: 0 }
        );
      }
      setOrderProducts(products);
    } catch (error) {
      console.error('Error fetching order products:', error);
      setOrderProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleViewOrder = async (order: Order) => {
    setSelectedOrder(order);
    if (order.items && order.items.length > 0) {
      const items = order.items.map((item: any) =>
        typeof item === "string" ? { id: item } : item
      );
      await fetchOrderProducts(items);
    } else {
      setOrderProducts([]);
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    const statusMessages = {
      'payment_verified': 'Verify payment and release order to seller?',
      'payment_rejected': 'Reject payment? Buyer will need to resubmit payment proof.',
      'shipped': 'Mark order as shipped?',
      'completed': 'Mark order as completed and create payouts?'
    };
    
    const message = statusMessages[newStatus as keyof typeof statusMessages] || `Update order status to ${newStatus}?`;
    
    if (!confirm(message)) return;

    try {
      const updateData: any = {};
      
      if (newStatus === 'payment_verified') {
        updateData.paymentStatus = 'verified';
        updateData.paymentVerifiedAt = new Date();
        updateData.verifiedBy = 'admin';
        updateData.status = 'pending'; // Update order status to pending after verification
      } else if (newStatus === 'payment_rejected') {
        updateData.paymentStatus = 'rejected';
        updateData.paymentRejectedAt = new Date();
        updateData.rejectedBy = 'admin';
      } else {
        updateData.status = newStatus;
        
        if (newStatus === 'shipped') {
          updateData.shippedDate = new Date();
        } else if (newStatus === 'completed') {
          updateData.completedDate = new Date();
        }
      }

      await updateDoc(doc(db, 'orders', orderId), updateData);
      
      if (newStatus === 'completed') {
        console.log(`🔄 Order marked as completed, creating payouts...`);
        await createPayoutForCompletedOrder(orderId);
      }
      
      if (newStatus === 'payment_verified') {
        console.log(`📧 Sending payment verified notification to seller...`);
      }
      
      if (newStatus === 'payment_rejected') {
        console.log(`📧 Sending payment rejection notification to buyer...`);
      }
      
      const successMessage = newStatus === 'payment_verified' ? '✅ Payment verified! Order released to seller.' :
                            newStatus === 'payment_rejected' ? '❌ Payment rejected. Buyer will be notified.' :
                            'Order updated successfully';
      
      alert(successMessage);
      fetchOrders();
      setSelectedOrder(null);
    } catch (error) {
      console.error('Error updating order:', error);
      alert('Error updating order');
    }
  };

  const handlePaymentRejection = async (orderId: string, reason: string) => {
    try {
      // Fetch order
      const orderDoc = await getDoc(doc(db, "orders", orderId));
      if (!orderDoc.exists()) throw new Error("Order not found");
      const order = orderDoc.data() as Order;

      // Fetch user's email from users collection using userId
      let userEmail = "";
      if (order.userId) {
        const userDoc = await getDoc(doc(db, "users", order.userId));
        if (userDoc.exists()) {
          userEmail = userDoc.data().email || "";
        }
      }

      // 1. Update order with rejection details - FIXED: Don't set status to 'refunded' yet
      const updateData = {
        status: 'pending_refund', // Changed from 'refunded' to 'pending_refund'
        paymentStatus: 'rejected',
        paymentRejectedAt: new Date(),
        rejectedBy: 'admin',
        rejectionReason: reason,
        refundStatus: 'pending_manual_refund',
        refundMethod: 'manual_transfer'
      };

      await updateDoc(doc(db, 'orders', orderId), updateData);

      // 2. Release items back to marketplace
      console.log('📦 Releasing items back to marketplace...');
      const items = order.items || [];
      let releasedItems: any[] = [];

      for (const itemId of items) {
        try {
          // Check if it's a product
          let itemRef = doc(db, "products", itemId);
          let itemSnap = await getDoc(itemRef);
          
          if (itemSnap.exists()) {
            const itemData = itemSnap.data();
            await updateDoc(itemRef, {
              sold: false,
              soldAt: null,
              buyerId: null,
              orderId: null,
              releasedAt: new Date(),
              releaseReason: reason
            });
            releasedItems.push({
              itemId,
              itemName: itemData.name || itemData.title || "Product",
              itemPrice: itemData.price || 0,
              sellerId: itemData.sellerId,
              sellerEmail: itemData.sellerEmail,
              sellerName: itemData.sellerName
            });
            console.log(`✅ Product ${itemId} released`);
          } else {
            // Check if it's a bid
            itemRef = doc(db, "bids", itemId);
            itemSnap = await getDoc(itemRef);
            
            if (itemSnap.exists()) {
              const itemData = itemSnap.data();
              await updateDoc(itemRef, {
                status: "active",
                soldAt: null,
                winnerId: null,
                orderId: null,
                releasedAt: new Date(),
                releaseReason: reason
              });
              releasedItems.push({
                itemId,
                itemName: itemData.title || itemData.name || "Bid Item",
                itemPrice: itemData.currentBid || itemData.price || 0,
                sellerId: itemData.sellerId,
                sellerEmail: itemData.sellerEmail,
                sellerName: itemData.sellerName
              });
              console.log(`✅ Bid ${itemId} released`);
            }
          }
        } catch (error) {
          console.error(`❌ Failed to release item ${itemId}:`, error);
        }
      }

      // 3. Create refund record for admin tracking
      const refundData = {
        orderId: orderId,
        buyerId: order.userId,
        buyerName: order.buyerName || order.userName,
        amount: order.amount || 0,
        originalPaymentProof: order.paymentProof || '',
        status: 'pending_manual_refund',
        method: 'bank_transfer',
        reason: reason,
        createdAt: new Date(),
        processedBy: null,
        processedAt: null,
        refundProof: null,
        adminNotes: `Payment rejected: ${reason}`,
        itemsReleased: releasedItems.length
      };

      await addDoc(collection(db, 'refunds'), refundData);

      // 4. Send email to buyer about rejection and refund process
      console.log(`📧 Sending refund notification to buyer...`);
      await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'refund',
          data: {
            buyerEmail: userEmail,
            buyerName: order.buyerName || order.userName,
            orderId: orderId,
            refundAmount: order.amount,
            reason: reason
          }
        }),
      });

      // 5. Notify sellers about item release
      console.log(`📧 Sending seller notifications...`);
      const sellerGroups: { [key: string]: { email: string; name: string; items: any[] } } = {};
      
      releasedItems.forEach(item => {
        if (item.sellerId && item.sellerEmail) {
          if (!sellerGroups[item.sellerId]) {
            sellerGroups[item.sellerId] = {
              email: item.sellerEmail,
              name: item.sellerName || 'Seller',
              items: []
            };
          }
          sellerGroups[item.sellerId].items.push(item);
        }
      });

      // Send notification to each seller
      for (const sellerId in sellerGroups) {
        const seller = sellerGroups[sellerId];
        try {
          await fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'seller_refund_notification',
              data: {
                sellerEmail: seller.email,
                sellerName: seller.name,
                orderId: orderId,
                buyerName: order.buyerName || order.userName,
                items: seller.items,
                refundReason: reason,
                refundAmount: order.amount || 0,
                processedDate: new Date().toLocaleString()
              }
            })
          });
          console.log(`✅ Seller notification sent to: ${seller.email}`);
        } catch (emailError) {
          console.error(`❌ Failed to send seller notification:`, emailError);
        }
      }

      alert(`✅ Payment rejected and refund process initiated!\n\n` +
            `• Buyer will be notified about rejection and refund process\n` +
            `• ${releasedItems.length} items released back to marketplace\n` +
            `• Sellers notified about item release\n` +
            `• Refund request added to admin queue\n` +
            `• Amount: RM ${order.amount?.toFixed(2) || '0.00'}\n` +
            `• Reason: ${reason}\n\n` +
            `Next: Wait for buyer to reply with bank details, then process manual refund.`);

      fetchOrders();
      setSelectedOrder(null);
    } catch (error) {
      console.error('Error processing payment rejection:', error);
      alert('Error processing payment rejection');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'awaiting_payment': return { background: '#fef3c7', color: '#92400e' };
      case 'payment_confirmed': return { background: '#ecfdf5', color: '#065f46' };
      case 'pending': return { background: '#dbeafe', color: '#1e40af' };
      case 'pending_refund': return { background: '#fef2f2', color: '#dc2626' };
      case 'shipped': return { background: '#e0e7ff', color: '#3730a3' };
      case 'completed': return { background: '#d1fae5', color: '#065f46' };
      case 'cancelled': return { background: '#fee2e2', color: '#991b1b' };
      case 'refunded': return { background: '#fef2f2', color: '#dc2626' };
      default: return { background: '#f3f4f6', color: '#374151' };
    }
  };

  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString();
  };

  const getProductName = (product: Product) => {
    return product.name || product.title || 'Unnamed Product';
  };

  const getProductImage = (product: Product) => {
    if (product.images && product.images.length > 0) {
      return product.images[0];
    }
    return product.image || null;
  };

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Loading orders...</div>;
  }

  return (
    <div style={{ padding: 30 }}>
      <div style={{ marginBottom: 30 }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: 10, color: '#1f2937' }}>
          Order Management
        </h1>
        <p style={{ color: '#6b7280' }}>Total Orders: {orders.length}</p>
        
        {/* Payment Verification Info */}
        <div style={{
          marginTop: 20,
          padding: 20,
          background: '#eff6ff',
          borderRadius: 12,
          border: '1px solid #3b82f6'
        }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e40af', marginBottom: 10 }}>
            💳 Payment Verification Workflow:
          </h3>
          <div style={{ fontSize: '0.9rem', color: '#1e40af', lineHeight: 1.6 }}>
            <strong>1. Review Payment Proof</strong> → <strong>2. Verify/Reject Payment</strong> → 
            <strong>3. Order Released to Seller</strong> → <strong>4. Track to Completion</strong>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 15, marginBottom: 20, flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Search by Order ID or Buyer..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: 1,
            minWidth: 250,
            padding: '12px 16px',
            border: '1px solid #d1d5db',
            borderRadius: 8,
            fontSize: '0.95rem'
          }}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            padding: '12px 16px',
            border: '1px solid #d1d5db',
            borderRadius: 8,
            fontSize: '0.95rem',
            background: 'white',
            cursor: 'pointer'
          }}
        >
          <option value="all">All Orders</option>
          <option value="pending_payment">🔍 Pending Payment Verification</option>
          <option value="pending">Preparing</option>
          <option value="pending_refund">Pending Refund</option>
          <option value="shipped">Shipped</option>
          <option value="completed">Completed</option>
          <option value="refunded">Refunded</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Orders Table */}
      <div style={{ background: 'white', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Order ID</th>
              <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Buyer</th>
              <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Items</th>
              <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Amount</th>
              <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Payment</th>
              <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Status</th>
              <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Date</th>
              <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
                  No orders found
                </td>
              </tr>
            ) : (
              filteredOrders.map(order => (
                <tr key={order.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '16px', color: '#1f2937', fontSize: '0.85rem' }}>
                    #{order.id.slice(0, 8)}
                  </td>
                  <td style={{ padding: '16px', color: '#1f2937' }}>
                    {order.buyerName || order.userName || 'Unknown'}
                  </td>
                  <td style={{ padding: '16px', color: '#6b7280' }}>
                    {order.items?.length || 0} item(s)
                  </td>
                  <td style={{ padding: '16px', color: '#1f2937', fontWeight: 600 }}>
                    RM {order.amount?.toFixed(2) || '0.00'}
                  </td>
                  <td style={{ padding: '16px' }}>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: 8,
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      ...(order.paymentStatus === 'verified' 
                        ? { background: '#ecfdf5', color: '#065f46' }
                        : order.paymentStatus === 'rejected'
                        ? { background: '#fee2e2', color: '#991b1b' }
                        : { background: '#fef3c7', color: '#92400e' })
                    }}>
                      {order.paymentStatus === 'verified' ? '✅ Verified' : 
                       order.paymentStatus === 'rejected' ? '❌ Rejected' : '⏳ Pending'}
                    </span>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: 12,
                      fontSize: '0.85rem',
                      fontWeight: 500,
                      textTransform: 'capitalize',
                      ...getStatusColor(order.status)
                    }}>
                      {order.status}
                    </span>
                  </td>
                  <td style={{ padding: '16px', color: '#6b7280', fontSize: '0.9rem' }}>
                    {formatDate(order.createdAt)}
                  </td>
                  <td style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {/* Special button for payment verification */}
                      {order.paymentStatus === 'pending_verification' && order.paymentProof && (
                        <button
                          onClick={() => handleViewOrder(order)}
                          style={{
                            padding: '6px 12px',
                            background: '#f59e0b',
                            color: 'white',
                            border: 'none',
                            borderRadius: 6,
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: 500
                          }}
                        >
                          🔍 Review Payment
                        </button>
                      )}
                      
                      {/* Regular view button */}
                      {!(order.paymentStatus === 'pending_verification' && order.paymentProof) && (
                        <button
                          onClick={() => handleViewOrder(order)}
                          style={{
                            padding: '6px 12px',
                            background: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: 6,
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: 500
                          }}
                        >
                          View
                        </button>
                      )}
                      
                      {/* Admin marks as delivered */}
                      {order.status === 'shipped' && order.paymentStatus === 'verified' && (
                        <button
                          onClick={() => handleUpdateStatus(order.id, 'completed')}
                          style={{
                            padding: '6px 12px',
                            background: '#10b981',
                            color: 'white',
                            border: 'none',
                            borderRadius: 6,
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: 500
                          }}
                        >
                          ✅ Mark Delivered
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Migration Utility */}
      <AdminMigrationUtility />

      {/* Refund Management Section */}
      <RefundManagement fetchOrders={fetchOrders} />

      {/* Order Details Modal */}
      {selectedOrder && (
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
            zIndex: 1000,
            padding: 20
          }}
          onClick={() => setSelectedOrder(null)}
        >
          <div
            style={{
              background: 'white',
              padding: 30,
              borderRadius: 12,
              maxWidth: 700,
              width: '100%',
              maxHeight: '100vh',
              overflowY: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 20, color: '#1f2937' }}>
              Order Details & Payment Verification
            </h2>
            
            <div style={{ marginBottom: 20 }}>
              <strong style={{ color: '#6b7280' }}>Order ID:</strong>
              <div style={{ marginTop: 5, color: '#1f2937' }}>#{selectedOrder.id}</div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <strong style={{ color: '#6b7280' }}>Buyer:</strong>
              <div style={{ marginTop: 5, color: '#1f2937' }}>
                {selectedOrder.buyerName || selectedOrder.userName || 'Unknown'}
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <strong style={{ color: '#6b7280' }}>Total Amount:</strong>
              <div style={{ marginTop: 5, color: '#1f2937', fontSize: '1.25rem', fontWeight: 700 }}>
                RM {selectedOrder.amount?.toFixed(2) || '0.00'}
              </div>
            </div>

            {/* Payment Status */}
            {selectedOrder.paymentStatus && (
              <div style={{ marginBottom: 20 }}>
                <strong style={{ color: '#6b7280' }}>Payment Status:</strong>
                <div style={{ marginTop: 5 }}>
                  <span style={{
                    padding: '6px 12px',
                    borderRadius: 12,
                    fontSize: '0.9rem',
                    fontWeight: 500,
                    display: 'inline-block',
                    ...(selectedOrder.paymentStatus === 'verified' 
                      ? { background: '#ecfdf5', color: '#065f46' }
                      : selectedOrder.paymentStatus === 'rejected'
                      ? { background: '#fee2e2', color: '#991b1b' }
                      : { background: '#fef3c7', color: '#92400e' })
                  }}>
                    {selectedOrder.paymentStatus === 'verified' ? '✅ Payment Verified' : 
                     selectedOrder.paymentStatus === 'rejected' ? '❌ Payment Rejected' :
                     '⏳ Pending Verification'}
                  </span>
                </div>
              </div>
            )}

            {/* Payment Proof Section */}
            {selectedOrder.paymentProof && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ 
                  marginTop: 10, 
                  padding: 15, 
                  background: '#f8fafc', 
                  borderRadius: 8, 
                  border: '1px solid #e2e8f0' 
                }}>
                  <img
                    src={selectedOrder.paymentProof}
                    alt="Payment Proof"
                    style={{
                      maxWidth: '100%',
                      maxHeight: 400,
                      borderRadius: 8,
                      border: '1px solid #e5e7eb',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                      cursor: 'pointer'
                    }}
                    onClick={() => window.open(selectedOrder.paymentProof, '_blank')}
                  />
                  <div style={{ 
                    marginTop: 10, 
                    fontSize: '0.85rem', 
                    color: '#6b7280',
                    textAlign: 'center'
                  }}>
                    Click image to view full size
                  </div>
                </div>
                
                {/* FIXED: Proper payment verification buttons */}
                {selectedOrder.paymentStatus === 'pending_verification' && (
                  <div style={{ 
                    marginTop: 15, 
                    padding: 15, 
                    background: '#fef3c7', 
                    borderRadius: 8,
                    border: '1px solid #fde68a'
                  }}>
                    <div style={{ 
                      fontSize: '1rem', 
                      fontWeight: 600, 
                      color: '#92400e', 
                      marginBottom: 10,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8
                    }}>
                      📋 Payment Verification Required
                    </div>
                    <div style={{ fontSize: '0.9rem', color: '#92400e', marginBottom: 15 }}>
                      Review the payment proof above and verify if the payment matches the order amount of RM {selectedOrder.amount?.toFixed(2)}.
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button
                        onClick={() => handleUpdateStatus(selectedOrder.id, 'payment_verified')}
                        style={{
                          flex: 1,
                          padding: '12px 16px',
                          background: '#10b981',
                          color: 'white',
                          border: 'none',
                          borderRadius: 6,
                          cursor: 'pointer',
                          fontSize: '0.9rem',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6
                        }}
                      >
                        ✅ Verify Payment
                      </button>
                      <button
                        onClick={() => {
                          const reason = prompt('Please provide a reason for rejection:');
                          if (reason && reason.trim()) {
                            handlePaymentRejection(selectedOrder.id, reason.trim());
                          }
                        }}
                        style={{
                          flex: 1,
                          padding: '12px 16px',
                          background: '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: 6,
                          cursor: 'pointer',
                          fontSize: '0.9rem',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6
                        }}
                      >
                        ❌ Reject & Refund
                      </button>
                    </div>
                  </div>
                )}

                {selectedOrder.paymentStatus === 'verified' && (
                  <div style={{ 
                    marginTop: 15, 
                    padding: 12, 
                    background: '#ecfdf5', 
                    borderRadius: 6,
                    border: '1px solid #10b981'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: '1.2rem' }}>✅</span>
                      <span style={{ color: '#059669', fontSize: '0.9rem', fontWeight: 600 }}>
                        Payment verified and order released to seller
                      </span>
                    </div>
                    {selectedOrder.paymentVerifiedAt && (
                      <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: 5 }}>
                        Verified on: {formatDate(selectedOrder.paymentVerifiedAt)}
                      </div>
                    )}
                  </div>
                )}

                {selectedOrder.paymentStatus === 'rejected' && (
                  <div style={{ 
                    marginTop: 15, 
                    padding: 12, 
                    background: '#fee2e2', 
                    borderRadius: 6,
                    border: '1px solid #ef4444'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: '1.2rem' }}>❌</span>
                      <span style={{ color: '#991b1b', fontSize: '0.9rem', fontWeight: 600 }}>
                        Payment rejected - refund process initiated
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Order Status */}
            <div style={{ marginBottom: 20 }}>
              <strong style={{ color: '#6b7280' }}>Order Status:</strong>
              <div style={{ marginTop: 5 }}>
                <span style={{
                  padding: '6px 12px',
                  borderRadius: 12,
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  textTransform: 'capitalize',
                  display: 'inline-block',
                  ...getStatusColor(selectedOrder.status)
                }}>
                  {selectedOrder.status}
                </span>
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <strong style={{ color: '#6b7280' }}>Order Date:</strong>
              <div style={{ marginTop: 5, color: '#1f2937' }}>
                {formatDate(selectedOrder.createdAt)}
              </div>
            </div>

            {/* Shipping Address */}
            {selectedOrder.shippingAddress && typeof selectedOrder.shippingAddress === 'object' ? (
              <div style={{ marginBottom: 20 }}>
                <strong style={{ color: '#6b7280' }}>Shipping Address:</strong>
                <div style={{ marginTop: 5, color: '#1f2937', whiteSpace: 'pre-line' }}>
                  {selectedOrder.shippingAddress.fullName && <div>{selectedOrder.shippingAddress.fullName}</div>}
                  {selectedOrder.shippingAddress.phone && <div>{selectedOrder.shippingAddress.phone}</div>}
                  {selectedOrder.shippingAddress.addressLine1 && <div>{selectedOrder.shippingAddress.addressLine1}</div>}
                  {selectedOrder.shippingAddress.addressLine2 && <div>{selectedOrder.shippingAddress.addressLine2}</div>}
                  {selectedOrder.shippingAddress.city && <div>{selectedOrder.shippingAddress.city}</div>}
                  {selectedOrder.shippingAddress.postalCode && <div>{selectedOrder.shippingAddress.postalCode}</div>}
                  {selectedOrder.shippingAddress.state && <div>{selectedOrder.shippingAddress.state}</div>}
                  {selectedOrder.shippingAddress.country && <div>{selectedOrder.shippingAddress.country}</div>}
                </div>
              </div>
            ) : selectedOrder.shippingAddress ? (
              <div style={{ marginBottom: 20 }}>
                <strong style={{ color: '#6b7280' }}>Shipping Address:</strong>
                <div style={{ marginTop: 5, color: '#1f2937' }}>
                  {selectedOrder.shippingAddress}
                </div>
              </div>
            ) : null}

            {/* Items Section */}
            <div style={{ marginBottom: 20 }}>
              <strong style={{ color: '#6b7280' }}>Items Purchased:</strong>
              {loadingProducts ? (
                <div style={{ marginTop: 10, textAlign: 'center', color: '#6b7280' }}>
                  Loading product details...
                </div>
              ) : orderProducts.length > 0 ? (
                <div style={{ marginTop: 15 }}>
                  {orderProducts.map((product: Product, index: number) => (
                    <div key={index} style={{
                      display: 'flex',
                      padding: 15,
                      background: '#f9fafb',
                      borderRadius: 8,
                      marginBottom: 10,
                      border: '1px solid #e5e7eb'
                    }}>
                      <div style={{ marginRight: 15 }}>
                        {getProductImage(product) ? (
                          <img
                            src={getProductImage(product) || ''}
                            alt={getProductName(product)}
                            style={{
                              width: 80,
                              height: 80,
                              objectFit: 'cover',
                              borderRadius: 8,
                              border: '1px solid #e5e7eb'
                            }}
                          />
                        ) : (
                          <div style={{
                            width: 80,
                            height: 80,
                            background: '#e5e7eb',
                            borderRadius: 8,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#6b7280',
                            fontSize: '0.8rem'
                          }}>
                            No Image
                          </div>
                        )}
                      </div>
                      
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, color: '#1f2937', marginBottom: 8, fontSize: '1.1rem' }}>
                          {getProductName(product)}
                        </div>
                        
                        {product.brand && (
                          <div style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: 4 }}>
                            Brand: {product.brand}
                          </div>
                        )}
                        
                        {product.category && (
                          <div style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: 4 }}>
                            Category: {product.category}
                          </div>
                        )}
                        
                        <div style={{ color: '#059669', fontSize: '1rem', fontWeight: 600, marginTop: 8 }}>
                          RM {product.price ? Number(product.price).toFixed(2) : '0.00'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ marginTop: 10, color: '#6b7280', fontStyle: 'italic' }}>
                  No items found for this order
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 25 }}>
              <button
                onClick={() => setSelectedOrder(null)}
                style={{
                  flex: 1,
                  padding: '12px 20px',
                  background: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '1rem'
                }}
              >
                Close
              </button>
              
              {/* Admin Action Button for Delivery Confirmation */}
              {selectedOrder.status === 'shipped' && selectedOrder.paymentStatus === 'verified' && (
                <button
                  onClick={() => handleUpdateStatus(selectedOrder.id, 'completed')}
                  style={{
                    flex: 1,
                    padding: '12px 20px',
                    background: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '1rem'
                  }}
                >
                  ✅ Mark as Delivered
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOrdersPage;
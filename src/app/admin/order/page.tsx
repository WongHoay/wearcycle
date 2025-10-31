"use client";
import React, { useEffect, useState } from 'react';
import { collection, getDocs, doc, updateDoc, query, orderBy, getDoc, CollectionReference, DocumentData, addDoc } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { useRouter } from 'next/navigation';

interface Order {
  id: string;
  userId: string;
  buyerName?: string;
  userName?: string;
  sellerId?: string;
  sellerName?: string;
  items?: string[]; // Array of product IDs
  amount?: number;
  status: string;
  createdAt?: any;
  shippedDate?: any;
  completedDate?: any;
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

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter);
    }
                                     
    // Filter by search
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
      
      // Get the completed order
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

      // Process each item in the order
      for (const item of orderItems) {
        try {
          console.log(`🔍 Processing item:`, item);
          
          let sellerId = null;
          let sellerName = null;
          let sellerEmail = null;
          let productId = null;
          let itemPrice = 0;
          let itemName = 'Unknown Item';

          // Handle item format - your items are just string IDs
          if (typeof item === 'string') {
            productId = item;
            console.log(`📦 Item is product ID: ${productId}`);
          } else {
            console.log(`⚠️ Unexpected item format:`, item);
            continue;
          }

          // Look up product details
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

          // Create payout if seller found
          if (sellerId && itemPrice > 0) {
            const PLATFORM_FEE_RATE = 0.10;
            let itemPriceNum = typeof itemPrice === "string" ? parseFloat(itemPrice) : itemPrice;
            if (isNaN(itemPriceNum)) itemPriceNum = 0;
            const itemTotal = itemPriceNum;
            const platformFee = itemTotal * PLATFORM_FEE_RATE;
            const netAmount = itemTotal - platformFee;

            console.log(`💰 Calculating: ${itemTotal} - ${platformFee.toFixed(2)} = ${netAmount.toFixed(2)}`);

            if (netAmount > 0) {
              // Get seller's bank details
              const sellerDoc = await getDoc(doc(db, 'users', sellerId));
              const sellerBankDetails = sellerDoc.exists() ? sellerDoc.data()?.bankDetails : null;

              // Create payout record
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

              // Send notification to seller
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

  // Fetch product details for selected order
  const fetchOrderProducts = async (items: { id: string, type?: string }[]) => {
    console.log('fetching products for items', items);
    setLoadingProducts(true);
    try {
      const products: Product[] = [];
      for (const item of items) {
        let productData: Product | null = null;
        // Try products table first
        if (!item.type || item.type === "product") {
          const productDoc = await getDoc(doc(db, 'products', item.id));
          if (productDoc.exists()) {
            productData = { ...productDoc.data(), id: item.id } as Product;
          }
        }
        // If not found, try bids table
        if (!productData && (!item.type || item.type === "bid")) {
          const bidDoc = await getDoc(doc(db, 'bids', item.id));
          if (bidDoc.exists()) {
            productData = { ...bidDoc.data(), id: item.id } as Product;
          }
        }
        // If still not found, add placeholder
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
    console.log('order items', order.items);
    if (order.items && order.items.length > 0) {
      // If items are strings, convert to objects
      const items = order.items.map((item: any) =>
        typeof item === "string" ? { id: item } : item
      );
      console.log('items to fetch', items);
      await fetchOrderProducts(items);
    } else {
      setOrderProducts([]);
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    if (!confirm(`Update order status to ${newStatus}?`)) return;

    try {
      const updateData: any = { status: newStatus };
      
      if (newStatus === 'shipped') {
        updateData.shippedDate = new Date();
      } else if (newStatus === 'completed') {
        updateData.completedDate = new Date();
      }

      // Update the order status
      await updateDoc(doc(db, 'orders', orderId), updateData);
      
      // If order is being marked as completed, create payouts automatically
      if (newStatus === 'completed') {
        console.log(`🔄 Order marked as completed, creating payouts...`);
        await createPayoutForCompletedOrder(orderId);
      }
      
      alert('Order status updated successfully');
      fetchOrders();
    } catch (error) {
      console.error('Error updating order:', error);
      alert('Error updating order status');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return { background: '#fef3c7', color: '#92400e' };
      case 'shipped': return { background: '#dbeafe', color: '#1e40af' };
      case 'completed': return { background: '#d1fae5', color: '#065f46' };
      case 'cancelled': return { background: '#fee2e2', color: '#991b1b' };
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
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="shipped">Shipped</option>
          <option value="completed">Completed</option>
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
              <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Status</th>
              <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Date</th>
              <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
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
                    <div style={{ display: 'flex', gap: 8 }}>
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
                      {order.status === 'pending' && (
                        <button
                          onClick={() => handleUpdateStatus(order.id, 'shipped')}
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
                          Ship
                        </button>
                      )}
                      {order.status === 'shipped' && (
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
                          Complete
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
              maxHeight: '90vh',
              overflow: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 20, color: '#1f2937' }}>
              Order Details
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
              <strong style={{ color: '#6b7280' }}>Status:</strong>
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
              <strong style={{ color: '#6b7280' }}>Total Amount:</strong>
              <div style={{ marginTop: 5, color: '#1f2937', fontSize: '1.25rem', fontWeight: 700 }}>
                RM {selectedOrder.amount?.toFixed(2) || '0.00'}
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <strong style={{ color: '#6b7280' }}>Order Date:</strong>
              <div style={{ marginTop: 5, color: '#1f2937' }}>
                {formatDate(selectedOrder.createdAt)}
              </div>
            </div>

            {selectedOrder.status === 'completed' && selectedOrder.completedDate && (
              <div style={{ marginBottom: 20 }}>
                <strong style={{ color: '#6b7280' }}>Completed At:</strong>
                <div style={{ marginTop: 5, color: '#1f2937' }}>
                  {formatDate(selectedOrder.completedDate)}
                </div>
              </div>
            )}

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

            {/* Items Section - Improved */}
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
                      {/* Product Image */}
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
                      
                      {/* Product Details */}
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
                        
                        {product.condition && (
                          <div style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: 4 }}>
                            Condition: {product.condition}
                          </div>
                        )}
                        
                        <div style={{ color: '#059669', fontSize: '1rem', fontWeight: 600, marginTop: 8 }}>
                          RM {product.price ? Number(product.price).toFixed(2) : '0.00'}
                        </div>
                        
                        {product.description && (
                          <div style={{ 
                            color: '#6b7280', 
                            fontSize: '0.85rem', 
                            marginTop: 8,
                            maxHeight: '60px',
                            overflow: 'hidden'
                          }}>
                            {product.description.length > 100 
                              ? product.description.substring(0, 100) + '...'
                              : product.description
                            }
                          </div>
                        )}
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
              {selectedOrder.status !== 'completed' && selectedOrder.status !== 'cancelled' && (
                <button
                  onClick={() => {
                    const nextStatus = selectedOrder.status === 'pending' ? 'shipped' : 'completed';
                    handleUpdateStatus(selectedOrder.id, nextStatus);
                    setSelectedOrder(null);
                  }}
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
                  {selectedOrder.status === 'pending' ? 'Mark as Shipped' : 'Mark as Completed'}
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

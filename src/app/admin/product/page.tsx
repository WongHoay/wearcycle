"use client";
import React, { useEffect, useState } from 'react';
import { collection, getDocs, doc, deleteDoc, updateDoc, addDoc } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';

interface Product {
  id: string;
  name?: string;
  title?: string;
  price: number;
  image?: string;
  images?: string[];
  seller?: string;
  sellerId?: string;
  sellerUsername?: string;
  sellerProfilePicture?: string;
  status?: string;
  category?: string;
  condition?: string;
  createdAt?: any;
  sold?: boolean;
}

const AdminProductsPage = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  // New state for reason modals
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [actionType, setActionType] = useState<'flag' | 'remove'>('flag');
  const [actionProductId, setActionProductId] = useState('');
  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    let filtered = products;

    // Filter by status
    if (statusFilter !== 'all') {
      if (statusFilter === 'active') {
        filtered = filtered.filter(p => (!p.status || p.status === 'active') && !p.sold);
      } else if (statusFilter === 'sold') {
        filtered = filtered.filter(p => p.status === 'sold' || p.sold === true);
      } else {
        filtered = filtered.filter(p => p.status === statusFilter);
      }
    }

    // Filter by search
    if (search) {
      filtered = filtered.filter(product =>
        product.name?.toLowerCase().includes(search.toLowerCase()) ||
        product.title?.toLowerCase().includes(search.toLowerCase()) ||
        product.seller?.toLowerCase().includes(search.toLowerCase())
      );
    }

    setFilteredProducts(filtered);
  }, [search, statusFilter, products]);

  const fetchProducts = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'products'));
      const productsData: Product[] = [];

      for (const docSnap of snapshot.docs) {
        const product = { id: docSnap.id, ...docSnap.data() } as Product;

        // Fetch seller info if sellerId exists
        if (product.sellerId) {
          const sellerSnap = await getDocs(
            collection(db, 'users')
          );
          const sellerDoc = sellerSnap.docs.find(u => u.id === product.sellerId);
          if (sellerDoc) {
            const sellerData = sellerDoc.data();
            product.sellerUsername = sellerData.username || '';
            product.sellerProfilePicture = sellerData.profilePictureUrl || '';
          }
        }

        productsData.push(product);
      }

      setProducts(productsData);
      setFilteredProducts(productsData);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendNotificationToSeller = async (sellerId: string, type: 'product_flagged' | 'product_removed', productName: string, productId: string, reason: string) => {
    if (!sellerId) return;

    try {
      const message = type === 'product_flagged' 
        ? `Your product "${productName}" has been flagged for review. Reason: ${reason}. Please review our guidelines and make necessary changes.`
        : `Your product "${productName}" has been removed from the marketplace. Reason: ${reason}. Please contact support if you believe this was an error.`;

      await addDoc(collection(db, 'notifications'), {
        userId: sellerId,
        type: type,
        message: message,
        productId: productId,
        productName: productName,
        reason: reason,
        createdAt: new Date(),
        read: false,
        actionBy: 'admin' // You might want to get actual admin info
      });
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  };

  const handleRemoveProduct = async (productId: string, reason: string) => {
    try {
      const product = products.find(p => p.id === productId);
      if (!product) return;

      // Send notification to seller before deletion
      if (product.sellerId) {
        await sendNotificationToSeller(
          product.sellerId, 
          'product_removed', 
          product.name || product.title || 'Untitled Product',
          productId,
          reason
        );
      }

      // Delete the product
      await deleteDoc(doc(db, 'products', productId));
      
      alert('Product removed successfully and seller notified');
      fetchProducts();
    } catch (error) {
      console.error('Error removing product:', error);
      alert('Error removing product');
    }
  };

  const handleFlagProduct = async (productId: string, reason: string) => {
    try {
      const product = products.find(p => p.id === productId);
      if (!product) return;

      // Update product status
      await updateDoc(doc(db, 'products', productId), {
        status: 'flagged',
        flaggedAt: new Date(),
        flagReason: reason
      });

      // Send notification to seller
      if (product.sellerId) {
        await sendNotificationToSeller(
          product.sellerId, 
          'product_flagged', 
          product.name || product.title || 'Untitled Product',
          productId,
          reason
        );
      }

      alert('Product flagged successfully and seller notified');
      fetchProducts();
    } catch (error) {
      console.error('Error flagging product:', error);
      alert('Error flagging product');
    }
  };

  const openReasonModal = (type: 'flag' | 'remove', productId: string) => {
    setActionType(type);
    setActionProductId(productId);
    setSelectedReason('');
    setCustomReason('');
    setShowReasonModal(true);
  };

  const handleReasonSubmit = () => {
    const reason = selectedReason === 'other' ? customReason : selectedReason;
    
    if (!reason.trim()) {
      alert('Please select or enter a reason');
      return;
    }

    if (actionType === 'flag') {
      handleFlagProduct(actionProductId, reason);
    } else {
      handleRemoveProduct(actionProductId, reason);
    }

    setShowReasonModal(false);
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'active': return { background: '#d1fae5', color: '#065f46' };
      case 'sold': return { background: '#dbeafe', color: '#1e40af' };
      case 'flagged': return { background: '#fee2e2', color: '#991b1b' };
      case 'removed': return { background: '#f3f4f6', color: '#374151' };
      default: return { background: '#d1fae5', color: '#065f46' };
    }
  };

  const reasonOptions = [
    { value: 'inappropriate_content', label: 'Inappropriate Content' },
    { value: 'spam', label: 'Spam or Duplicate Listing' },
    { value: 'fake_product', label: 'Fake or Counterfeit Product' },
    { value: 'prohibited_item', label: 'Prohibited Item' },
    { value: 'misleading_description', label: 'Misleading Description' },
    { value: 'price_manipulation', label: 'Price Manipulation' },
    { value: 'terms_violation', label: 'Terms of Service Violation' },
    { value: 'other', label: 'Other (specify below)' }
  ];

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Loading products...</div>;
  }

  return (
    <div style={{ padding: 30 }}>
      <div style={{ marginBottom: 30 }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: 10, color: '#1f2937' }}>
          Product Moderation
        </h1>
        <p style={{ color: '#6b7280' }}>Total Products: {products.length}</p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 15, marginBottom: 20, flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Search by product name or seller..."
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
          <option value="active">Active</option>
          <option value="sold">Sold</option>
          <option value="flagged">Flagged</option>
        </select>
      </div>

      {/* Products Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: 20
      }}>
        {filteredProducts.length === 0 ? (
          <div style={{
            gridColumn: '1/-1',
            padding: 60,
            textAlign: 'center',
            color: '#9ca3af',
            background: 'white',
            borderRadius: 12
          }}>
            No products found
          </div>
        ) : (
          filteredProducts.map(product => (
            <div
              key={product.id}
              style={{
                background: 'white',
                borderRadius: 12,
                overflow: 'hidden',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                transition: 'transform 0.2s',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              {/* Product Image */}
              <div
                style={{
                  width: '100%',
                  height: 200,
                  background: '#f3f4f6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden'
                }}
                onClick={() => setSelectedProduct(product)}
              >
                {product.image || product.images?.[0] ? (
                  <img
                    src={product.image || product.images?.[0]}
                    alt={product.name || product.title}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />
                ) : (
                  <div style={{ fontSize: '3rem' }}>📦</div>
                )}
              </div>

              {/* Product Details */}
              <div style={{ padding: 16 }}>
                <h3
                  style={{
                    fontSize: '1rem',
                    fontWeight: 600,
                    color: '#1f2937',
                    marginBottom: 8,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                  onClick={() => setSelectedProduct(product)}
                >
                  {product.name || product.title || 'Untitled Product'}
                </h3>

                <div style={{ marginBottom: 8 }}>
                  <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#c9a26d' }}>
                    RM {Number(product.price).toFixed(2)}
                  </span>
                </div>

                <div style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  {product.sellerProfilePicture && (
                    <img
                      src={product.sellerProfilePicture}
                      alt={product.sellerUsername}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '1px solid #e5e7eb'
                      }}
                    />
                  )}
                  <span>
                    Seller: {product.sellerUsername || product.seller || 'Unknown'}
                  </span>
                  <span style={{ color: '#00000', fontSize: '0.8rem', marginLeft: 6, fontWeight: 'bold' }}>
                    (ID: {product.sellerId})
                  </span>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <span style={{
                    padding: '4px 10px',
                    borderRadius: 12,
                    fontSize: '0.8rem',
                    fontWeight: 500,
                    textTransform: 'capitalize',
                    ...getStatusColor(product.sold ? 'sold' : (product.status || 'active'))
                  }}>
                    {product.sold ? 'Sold' : (product.status || 'Active')}
                  </span>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => setSelectedProduct(product)}
                    style={{
                      flex: 1,
                      padding: '8px',
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
                  {(!product.status || product.status === 'active') && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openReasonModal('flag', product.id);
                        }}
                        style={{
                          flex: 1,
                          padding: '8px',
                          background: '#f59e0b',
                          color: 'white',
                          border: 'none',
                          borderRadius: 6,
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          fontWeight: 500
                        }}
                      >
                        Flag
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openReasonModal('remove', product.id);
                        }}
                        style={{
                          flex: 1,
                          padding: '8px',
                          background: '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: 6,
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          fontWeight: 500
                        }}
                      >
                        Remove
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Reason Selection Modal */}
      {showReasonModal && (
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
            zIndex: 1001,
            padding: 20
          }}
          onClick={() => setShowReasonModal(false)}
        >
          <div
            style={{
              background: 'white',
              padding: 30,
              borderRadius: 12,
              maxWidth: 500,
              width: '100%',
              maxHeight: '80vh',
              overflow: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 20, color: '#1f2937' }}>
              {actionType === 'flag' ? 'Flag Product' : 'Remove Product'}
            </h2>
            
            <p style={{ color: '#6b7280', marginBottom: 20 }}>
              Please select a reason for {actionType === 'flag' ? 'flagging' : 'removing'} this product:
            </p>

            <div style={{ marginBottom: 20 }}>
              {reasonOptions.map(option => (
                <label
                  key={option.value}
                  style={{
                    display: 'block',
                    marginBottom: 12,
                    cursor: 'pointer',
                    padding: '10px',
                    border: '1px solid #e5e7eb',
                    borderRadius: 6,
                    backgroundColor: selectedReason === option.value ? '#f0f9ff' : 'transparent',
                    borderColor: selectedReason === option.value ? '#3b82f6' : '#e5e7eb'
                  }}
                >
                  <input
                    type="radio"
                    name="reason"
                    value={option.value}
                    checked={selectedReason === option.value}
                    onChange={(e) => setSelectedReason(e.target.value)}
                    style={{ marginRight: 8 }}
                  />
                  {option.label}
                </label>
              ))}
            </div>

            {selectedReason === 'other' && (
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, color: '#374151' }}>
                  Please specify the reason:
                </label>
                <textarea
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Enter the specific reason..."
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: 6,
                    fontSize: '0.95rem',
                    minHeight: 80,
                    resize: 'vertical'
                  }}
                />
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 25 }}>
              <button
                onClick={() => setShowReasonModal(false)}
                style={{
                  flex: 1,
                  padding: '12px 20px',
                  background: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.95rem'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleReasonSubmit}
                style={{
                  flex: 1,
                  padding: '12px 20px',
                  background: actionType === 'flag' ? '#f59e0b' : '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.95rem'
                }}
              >
                {actionType === 'flag' ? 'Flag Product' : 'Remove Product'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Details Modal */}
      {selectedProduct && (
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
          onClick={() => setSelectedProduct(null)}
        >
          <div
            style={{
              background: 'white',
              padding: 30,
              borderRadius: 12,
              maxWidth: 600,
              width: '100%',
              maxHeight: '80vh',
              overflow: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 20, color: '#1f2937' }}>
              Product Details
            </h2>

            {/* Product Image */}
            {(selectedProduct.image || selectedProduct.images?.[0]) && (
              <div style={{
                marginBottom: 20,
                borderRadius: 12,
                overflow: 'auto',
                maxHeight: 300
              }}>
                <img
                  src={selectedProduct.image || selectedProduct.images?.[0]}
                  alt={selectedProduct.name || selectedProduct.title}
                  style={{
                    width: '100%',
                    height: 'auto',
                    objectFit: 'cover'
                  }}
                />
              </div>
            )}

            <div style={{ marginBottom: 15 }}>
              <strong style={{ color: '#6b7280' }}>Product Name:</strong>
              <div style={{ marginTop: 5, color: '#1f2937', fontSize: '1.1rem', fontWeight: 600 }}>
                {selectedProduct.name || selectedProduct.title || 'Untitled Product'}
              </div>
            </div>

            <div style={{ marginBottom: 15 }}>
              <strong style={{ color: '#6b7280' }}>Price:</strong>
              <div style={{ marginTop: 5, color: '#c9a26d', fontSize: '1.5rem', fontWeight: 700 }}>
                RM {Number(selectedProduct.price).toFixed(2)}
              </div>
            </div>

            <div style={{ marginBottom: 15, display: 'flex', alignItems: 'center', gap: 10 }}>
              <strong style={{ color: '#6b7280' }}>Seller:</strong>
              {selectedProduct.sellerProfilePicture && (
                <img
                  src={selectedProduct.sellerProfilePicture}
                  alt={selectedProduct.sellerUsername}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '1px solid #e5e7eb'
                  }}
                />
              )}
              <span style={{ color: '#1f2937', fontWeight: 500 }}>
                {selectedProduct.sellerUsername || selectedProduct.seller || 'Unknown'}
              </span>
              <span style={{ color: '#000000', fontSize: '0.85rem', marginLeft: 6 }}>
                (ID: {selectedProduct.sellerId})
              </span>
            </div>

            {selectedProduct.category && (
              <div style={{ marginBottom: 15 }}>
                <strong style={{ color: '#6b7280' }}>Category:</strong>
                <div style={{ marginTop: 5, color: '#1f2937', textTransform: 'capitalize' }}>
                  {selectedProduct.category}
                </div>
              </div>
            )}

            {selectedProduct.condition && (
              <div style={{ marginBottom: 15 }}>
                <strong style={{ color: '#6b7280' }}>Condition:</strong>
                <div style={{ marginTop: 5, color: '#1f2937' }}>
                  {selectedProduct.condition}
                </div>
              </div>
            )}

            <div style={{ marginBottom: 15 }}>
              <strong style={{ color: '#6b7280' }}>Status:</strong>
              <div style={{ marginTop: 5 }}>
                <span style={{
                  padding: '6px 12px',
                  borderRadius: 12,
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  textTransform: 'capitalize',
                  display: 'inline-block',
                  ...getStatusColor(selectedProduct.sold ? 'sold' : (selectedProduct.status || 'active'))
                }}>
                  {selectedProduct.sold ? 'Sold' : (selectedProduct.status || 'Active')}
                </span>
              </div>
            </div>

            <div style={{ marginBottom: 15 }}>
              <strong style={{ color: '#6b7280' }}>Product ID:</strong>
              <div style={{ marginTop: 5, color: '#6b7280', fontSize: '0.85rem', wordBreak: 'break-all' }}>
                {selectedProduct.id}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 25 }}>
              <button
                onClick={() => setSelectedProduct(null)}
                style={{
                  flex: 1,
                  padding: '10px 20px',
                  background: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                Close
              </button>
              {(!selectedProduct.status || selectedProduct.status === 'active') && (
                <>
                  <button
                    onClick={() => {
                      setSelectedProduct(null);
                      openReasonModal('flag', selectedProduct.id);
                    }}
                    style={{
                      flex: 1,
                      padding: '10px 20px',
                      background: '#f59e0b',
                      color: 'white',
                      border: 'none',
                      borderRadius: 6,
                      cursor: 'pointer',
                      fontWeight: 600
                    }}
                  >
                    Flag
                  </button>
                  <button
                    onClick={() => {
                      setSelectedProduct(null);
                      openReasonModal('remove', selectedProduct.id);
                    }}
                    style={{
                      flex: 1,
                      padding: '10px 20px',
                      background: '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: 6,
                      cursor: 'pointer',
                      fontWeight: 600
                    }}
                  >
                    Remove
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProductsPage;
"use client";
import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, addDoc, getDoc, query, where } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { CheckCircle, XCircle, MessageSquare, AlertTriangle, Clock, ArrowLeft, User } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Appeal {
  id: string;
  productId: string;
  productName: string;
  sellerId: string;
  sellerUsername: string;
  sellerEmail?: string;
  message: string;
  status: 'pending' | 'approved' | 'rejected';
  appealType: string;
  originalFlagReason?: string;
  submittedAt: any;
  reviewedAt?: any;
  reviewedBy?: string;
  adminResponse?: string;
  // Product details (fetched separately)
  product?: {
    name: string;
    title: string;
    price: number;
    image?: string;
    images?: string[];
    status: string;
    flagReason: string;
  };
  // Seller details (fetched separately)
  seller?: {
    username: string;
    profilePictureUrl?: string;
  };
}

const AdminAppealsPage = () => {
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppeal, setSelectedAppeal] = useState<Appeal | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [responseMessage, setResponseMessage] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetchAppeals();
  }, []);

  const fetchAppeals = async () => {
    try {
      console.log('Fetching pending appeals...');
      
      // Simple query without orderBy to avoid index issues
      const appealsRef = collection(db, 'appeals');
      const q = query(appealsRef, where('status', '==', 'pending'));
      
      const snapshot = await getDocs(q);
      console.log('Found appeals:', snapshot.docs.length);
      
      const appealsData: Appeal[] = [];

      for (const docSnap of snapshot.docs) {
        const appeal = { id: docSnap.id, ...docSnap.data() } as Appeal;
        
        // Fetch product details
        try {
          const productRef = doc(db, 'products', appeal.productId);
          const productSnap = await getDoc(productRef);
          if (productSnap.exists()) {
            appeal.product = productSnap.data() as any;
          }
        } catch (error) {
          console.error('Error fetching product:', appeal.productId, error);
        }

        // Fetch seller details
        try {
          const sellerRef = doc(db, 'users', appeal.sellerId);
          const sellerSnap = await getDoc(sellerRef);
          if (sellerSnap.exists()) {
            const sellerData = sellerSnap.data();
            appeal.seller = {
              username: sellerData.username || sellerData.email || 'Unknown',
              profilePictureUrl: sellerData.profilePictureUrl
            };
          }
        } catch (error) {
          console.error('Error fetching seller:', appeal.sellerId, error);
        }

        appealsData.push(appeal);
      }

      // Sort appeals by submission date (newest first) - client-side sorting
      appealsData.sort((a, b) => {
        const dateA = a.submittedAt?.toDate?.() || new Date(a.submittedAt || 0);
        const dateB = b.submittedAt?.toDate?.() || new Date(b.submittedAt || 0);
        return dateB.getTime() - dateA.getTime();
      });
      
      console.log('Processed appeals:', appealsData.length);
      setAppeals(appealsData);
    } catch (error) {
      console.error('Error fetching appeals:', error);
      // Don't show alert for errors, just log them
    } finally {
      setLoading(false);
    }
  };

  // Mark admin notification as read when appeal is processed
  const markAdminNotificationAsRead = async (appealId: string) => {
    try {
      // Find and mark the admin notification as read
      const adminNotifQuery = query(
        collection(db, 'admin_notifications'),
        where('appealId', '==', appealId),
        where('read', '==', false)
      );
      
      const snapshot = await getDocs(adminNotifQuery);
      const promises = snapshot.docs.map(doc => 
        updateDoc(doc.ref, {
          read: true,
          readAt: new Date()
        })
      );
      
      await Promise.all(promises);
      console.log('✅ Admin notification marked as read for appeal:', appealId);
    } catch (error) {
      console.error('❌ Error marking admin notification as read:', error);
    }
  };

  const handleApproveAppeal = async (appeal: Appeal) => {
    setActionLoading(true);
    try {
      // Update appeal status in appeals collection
      await updateDoc(doc(db, 'appeals', appeal.id), {
        status: 'approved',
        adminResponse: responseMessage,
        reviewedAt: new Date(),
        reviewedBy: 'admin'
      });

      // Update product status (remove flag)
      await updateDoc(doc(db, 'products', appeal.productId), {
        status: 'active',
        flagReason: null,
        flaggedAt: null,
        hasActiveAppeal: false,
        latestAppealStatus: 'approved'
      });

      // Send notification to seller
      await addDoc(collection(db, 'notifications'), {
        userId: appeal.sellerId,
        type: 'appeal_response',
        message: `Good news! Your appeal for "${appeal.productName}" has been approved. Your product is now active again.${responseMessage ? ` Admin response: ${responseMessage}` : ''}`,
        productId: appeal.productId,
        productName: appeal.productName,
        appealId: appeal.id,
        createdAt: new Date(),
        read: false,
        actionBy: 'admin'
      });

      // Mark admin notification as read
      await markAdminNotificationAsRead(appeal.id);

      alert('Appeal approved and seller notified!');
      setShowDetailsModal(false);
      setResponseMessage('');
      fetchAppeals(); // Refresh
    } catch (error) {
      console.error('Error approving appeal:', error);
      alert('Error approving appeal: ' + (error as Error).message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectAppeal = async (appeal: Appeal) => {
    if (!responseMessage.trim()) {
      alert('Please provide a reason for rejecting the appeal');
      return;
    }
    
    setActionLoading(true);
    try {
      // Update appeal status in appeals collection
      await updateDoc(doc(db, 'appeals', appeal.id), {
        status: 'rejected',
        adminResponse: responseMessage,
        reviewedAt: new Date(),
        reviewedBy: 'admin'
      });

      // Update product (keep flagged but remove active appeal)
      await updateDoc(doc(db, 'products', appeal.productId), {
        hasActiveAppeal: false,
        latestAppealStatus: 'rejected'
      });

      // Send notification to seller
      await addDoc(collection(db, 'notifications'), {
        userId: appeal.sellerId,
        type: 'appeal_response',
        message: `Your appeal for "${appeal.productName}" has been reviewed and rejected. Your product remains flagged. Admin response: ${responseMessage}`,
        productId: appeal.productId,
        productName: appeal.productName,
        appealId: appeal.id,
        reason: responseMessage,
        createdAt: new Date(),
        read: false,
        actionBy: 'admin'
      });

      // Mark admin notification as read
      await markAdminNotificationAsRead(appeal.id);

      alert('Appeal rejected and seller notified!');
      setShowDetailsModal(false);
      setResponseMessage('');
      fetchAppeals(); // Refresh
    } catch (error) {
      console.error('Error rejecting appeal:', error);
      alert('Error rejecting appeal: ' + (error as Error).message);
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Unknown';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    } catch {
      return 'Unknown';
    }
  };

  if (loading) {
    return (
      <div style={{ 
        padding: 40, 
        textAlign: 'center',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh'
      }}>
        <div>
          <div>Loading appeals...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 30, background: '#f9fafb', minHeight: '100vh' }}>
      <div style={{ marginBottom: 30 }}>
        {/* Header with Back Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
          <button
            onClick={() => router.push('/admin/dashboard')}
            style={{
              background: 'white',
              border: '1px solid #d1d5db',
              borderRadius: 8,
              padding: 8,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 700, color: '#1f2937', margin: 0 }}>
              Product Appeals Management
            </h1>
            <p style={{ color: '#6b7280', marginTop: 4 }}>
              Review and process appeals from sellers whose products have been flagged
            </p>
          </div>
        </div>

        {/* Stats Bar */}
        <div style={{
          display: 'flex',
          gap: 16,
          marginBottom: 20
        }}>
          <div style={{
            background: 'white',
            padding: '12px 16px',
            borderRadius: 8,
            border: '1px solid #e5e7eb',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: 2 }}>
              Pending Appeals
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f59e0b' }}>
              {appeals.length}
            </div>
          </div>
          
          <button 
            onClick={fetchAppeals} 
            style={{ 
              padding: '8px 16px', 
              background: '#3b82f6', 
              color: 'white', 
              border: 'none', 
              borderRadius: 6, 
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: 500
            }}
          >
            Refresh
          </button>
        </div>
      </div>

      {appeals.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '80px 20px',
          background: 'white',
          borderRadius: 12,
          border: '1px solid #e5e7eb'
        }}>
          <MessageSquare size={48} style={{ color: '#9ca3af', margin: '0 auto 16px' }} />
          <h3 style={{ color: '#6b7280', marginBottom: 8, fontSize: '1.25rem', fontWeight: 600 }}>
            No pending appeals
          </h3>
          <p style={{ color: '#9ca3af', fontSize: '1rem' }}>
            All appeals have been reviewed. Great job!
          </p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
          gap: 24
        }}>
          {appeals.map(appeal => (
            <div
              key={appeal.id}
              style={{
                background: 'white',
                borderRadius: 12,
                overflow: 'hidden',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                border: '2px solid #f59e0b',
                transition: 'all 0.2s'
              }}
            >
              {/* Product Image */}
              <div style={{
                width: '100%',
                height: 200,
                background: '#f3f4f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                position: 'relative'
              }}>
                {appeal.product?.image || appeal.product?.images?.[0] ? (
                  <img
                    src={appeal.product.image || appeal.product.images?.[0]}
                    alt={appeal.productName}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />
                ) : (
                  <div style={{ fontSize: '3rem' }}>📦</div>
                )}
                
                {/* Appeal Badge */}
                <div style={{
                  position: 'absolute',
                  top: 12,
                  right: 12,
                  background: '#f59e0b',
                  color: 'white',
                  padding: '6px 10px',
                  borderRadius: '8px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                }}>
                  <Clock size={12} />
                  APPEAL PENDING
                </div>
              </div>

              {/* Appeal Details */}
              <div style={{ padding: 24 }}>
                <h3 style={{
                  fontSize: '1.2rem',
                  fontWeight: 600,
                  color: '#1f2937',
                  marginBottom: 8,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {appeal.productName}
                </h3>

                <div style={{ marginBottom: 16 }}>
                  <span style={{ fontSize: '1.3rem', fontWeight: 700, color: '#c9a26d' }}>
                    RM {Number(appeal.product?.price || 0).toFixed(2)}
                  </span>
                </div>

                {/* Seller Info */}
                <div style={{ 
                  fontSize: '0.95rem', 
                  color: '#6b7280', 
                  marginBottom: 16, 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 10,
                  padding: '8px 12px',
                  background: '#f9fafb',
                  borderRadius: 6
                }}>
                  {appeal.seller?.profilePictureUrl ? (
                    <img
                      src={appeal.seller.profilePictureUrl}
                      alt={appeal.sellerUsername}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '1px solid #e5e7eb'
                      }}
                    />
                  ) : (
                    <User size={20} style={{ color: '#9ca3af' }} />
                  )}
                  <span>Seller: {appeal.seller?.username || appeal.sellerUsername}</span>
                </div>

                {/* Flag Reason */}
                <div style={{
                  background: '#fef2f2',
                  border: '1px solid #fca5a5',
                  borderRadius: '8px',
                  padding: '12px',
                  marginBottom: '16px'
                }}>
                  <div style={{ fontSize: '0.85rem', color: '#991b1b', fontWeight: 600, marginBottom: '4px' }}>
                    Original Flag Reason:
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#991b1b' }}>
                    {appeal.originalFlagReason || appeal.product?.flagReason || 'No reason provided'}
                  </div>
                </div>

                {/* Appeal Message Preview */}
                <div style={{
                  background: '#f0f9ff',
                  border: '1px solid #bae6fd',
                  borderRadius: '8px',
                  padding: '12px',
                  marginBottom: '16px'
                }}>
                  <div style={{ fontSize: '0.85rem', color: '#0c4a6e', fontWeight: 600, marginBottom: '4px' }}>
                    Appeal Message:
                  </div>
                  <div style={{ 
                    fontSize: '0.9rem', 
                    color: '#0c4a6e',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    lineHeight: 1.4
                  }}>
                    {appeal.message}
                  </div>
                </div>

                {/* Appeal Date */}
                <div style={{ fontSize: '0.85rem', color: '#9ca3af', marginBottom: 20 }}>
                  Submitted: {formatDate(appeal.submittedAt)}
                </div>

                {/* Action Button */}
                <button
                  onClick={() => {
                    setSelectedAppeal(appeal);
                    setShowDetailsModal(true);
                  }}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'background-color 0.2s'
                  }}
                >
                  <MessageSquare size={18} />
                  Review Appeal
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Appeal Details Modal */}
      {showDetailsModal && selectedAppeal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: '#fff',
            borderRadius: 16,
            padding: '32px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
            width: '100%',
            maxWidth: 700,
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1f2937', marginBottom: 24 }}>
              Review Product Appeal
            </h2>

            {/* Product Info */}
            <div style={{ marginBottom: 24, padding: '20px', background: '#f9fafb', borderRadius: '12px' }}>
              <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                <div style={{ width: 100, height: 100, borderRadius: '12px', overflow: 'hidden' }}>
                  {selectedAppeal.product?.image || selectedAppeal.product?.images?.[0] ? (
                    <img
                      src={selectedAppeal.product.image || selectedAppeal.product.images?.[0]}
                      alt={selectedAppeal.productName}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{ width: '100%', height: '100%', background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      📦
                    </div>
                  )}
                </div>
                <div>
                  <h3 style={{ fontWeight: 600, marginBottom: 8, fontSize: '1.2rem' }}>
                    {selectedAppeal.productName}
                  </h3>
                  <div style={{ color: '#6b7280', fontSize: '1rem', marginBottom: 4 }}>
                    Price: RM {Number(selectedAppeal.product?.price || 0).toFixed(2)}
                  </div>
                  <div style={{ color: '#6b7280', fontSize: '1rem' }}>
                    Seller: {selectedAppeal.seller?.username || selectedAppeal.sellerUsername}
                  </div>
                </div>
              </div>
            </div>

            {/* Original Flag Reason */}
            <div style={{ marginBottom: 24 }}>
              <h4 style={{ fontWeight: 600, marginBottom: 12, color: '#991b1b', fontSize: '1.1rem' }}>
                <AlertTriangle size={18} style={{ display: 'inline', marginRight: 8 }} />
                Original Flag Reason:
              </h4>
              <div style={{
                background: '#fef2f2',
                border: '1px solid #fca5a5',
                borderRadius: '8px',
                padding: '16px',
                color: '#991b1b',
                fontSize: '1rem',
                lineHeight: 1.5
              }}>
                {selectedAppeal.originalFlagReason || selectedAppeal.product?.flagReason || 'No reason provided'}
              </div>
            </div>

            {/* Appeal Message */}
            <div style={{ marginBottom: 24 }}>
              <h4 style={{ fontWeight: 600, marginBottom: 12, color: '#1976d2', fontSize: '1.1rem' }}>
                <MessageSquare size={18} style={{ display: 'inline', marginRight: 8 }} />
                Seller's Appeal:
              </h4>
              <div style={{
                background: '#f0f9ff',
                border: '1px solid #bae6fd',
                borderRadius: '8px',
                padding: '16px',
                color: '#0c4a6e',
                lineHeight: 1.6,
                fontSize: '1rem'
              }}>
                {selectedAppeal.message}
              </div>
            </div>

            {/* Admin Response */}
            <div style={{ marginBottom: 32 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 12, fontSize: '1.1rem' }}>
                Admin Response (Optional):
              </label>
              <textarea
                value={responseMessage}
                onChange={(e) => setResponseMessage(e.target.value)}
                placeholder="Add a message to the seller (optional for approval, required for rejection)..."
                style={{
                  width: '100%',
                  padding: '16px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  minHeight: '100px',
                  resize: 'vertical',
                  fontFamily: 'inherit'
                }}
              />
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: 16 }}>
              <button
                onClick={() => setShowDetailsModal(false)}
                disabled={actionLoading}
                style={{
                  flex: 1,
                  padding: '14px',
                  background: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  cursor: actionLoading ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  fontSize: '1rem',
                  opacity: actionLoading ? 0.6 : 1
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleRejectAppeal(selectedAppeal)}
                disabled={actionLoading}
                style={{
                  flex: 1,
                  padding: '14px',
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  cursor: actionLoading ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  fontSize: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  opacity: actionLoading ? 0.6 : 1
                }}
              >
                <XCircle size={18} />
                Reject Appeal
              </button>
              <button
                onClick={() => handleApproveAppeal(selectedAppeal)}
                disabled={actionLoading}
                style={{
                  flex: 1,
                  padding: '14px',
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  cursor: actionLoading ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  fontSize: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  opacity: actionLoading ? 0.6 : 1
                }}
              >
                <CheckCircle size={18} />
                Approve Appeal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAppealsPage;
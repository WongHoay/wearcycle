"use client";
import React, { useEffect, useState } from 'react';
import { collection, getDocs, doc, updateDoc, query, orderBy, getDoc } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { DollarSign, Clock, CheckCircle, AlertCircle, CreditCard, Eye, RefreshCw } from 'lucide-react';

interface Payout {
  id: string;
  sellerId: string;
  sellerName: string;
  sellerEmail?: string;
  amount: number;
  platformFee: number;
  grossAmount: number;
  ordersCount: number;
  orderIds: string[];
  status: 'pending' | 'processing' | 'paid' | 'failed';
  createdAt?: any;
  paidAt?: any;
  paymentMethod?: string;
  transactionId?: string;
  bankDetails?: {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
  };
  itemDetails?: {
    productId?: string;
    bidId?: string;
    itemPrice: number;
    quantity: number;
    itemName?: string;
  };
  adminNotes?: string;
}

const PLATFORM_FEE_RATE = 0.10; // 10%

const AdminPayoutsPage = () => {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [pendingPayouts, setPendingPayouts] = useState<Payout[]>([]);
  const [processedPayouts, setProcessedPayouts] = useState<Payout[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'processed'>('pending');
  const [loading, setLoading] = useState(true);
  const [selectedPayout, setSelectedPayout] = useState<Payout | null>(null);
  const [paymentDetails, setPaymentDetails] = useState({
    paymentMethod: 'qr_payment',
    transactionId: '',
    adminNotes: ''
  });

  useEffect(() => {
    fetchPayouts();
  }, []);

  const fetchPayouts = async () => {
    try {
      setLoading(true);
      const payoutsSnapshot = await getDocs(
        query(collection(db, 'payouts'), orderBy('createdAt', 'desc'))
      );
      const existingPayouts: Payout[] = [];
      for (const docSnap of payoutsSnapshot.docs) {
        const payout = { id: docSnap.id, ...docSnap.data() } as Payout;
        // Fetch seller info from users collection
        if (payout.sellerId) {
          const userDoc = await getDoc(doc(db, 'users', payout.sellerId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            payout.sellerName = userData.fullName || userData.username || 'Unknown Seller';
            payout.sellerEmail = userData.email || '';
          } else {
            payout.sellerName = 'Unknown Seller';
            payout.sellerEmail = '';
          }
        }
        existingPayouts.push(payout);
      }
      const pending = existingPayouts.filter(p => p.status === 'pending');
      const processed = existingPayouts.filter(p => ['processing', 'paid', 'failed'].includes(p.status));
      setPendingPayouts(pending);
      setProcessedPayouts(processed);
      setPayouts(existingPayouts);
    } catch (error) {
      alert('Error loading payouts. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePayoutStatus = async (payoutId: string, status: 'processing' | 'paid' | 'failed') => {
    if (!selectedPayout) return;
    const confirmMessage = {
      processing: 'Mark this payout as processing?',
      paid: 'Confirm payment completion?',
      failed: 'Mark this payout as failed?'
    };
    if (!confirm(confirmMessage[status])) return;
    try {
      const updateData: any = {
        status,
        updatedAt: new Date()
      };
      if (status === 'processing') {
        updateData.paymentMethod = paymentDetails.paymentMethod;
        updateData.transactionId = paymentDetails.transactionId;
        updateData.adminNotes = paymentDetails.adminNotes;
      } else if (status === 'paid') {
        updateData.paidAt = new Date();
        updateData.paymentMethod = paymentDetails.paymentMethod;
        updateData.transactionId = paymentDetails.transactionId;
        updateData.adminNotes = paymentDetails.adminNotes;
      }
      await updateDoc(doc(db, 'payouts', payoutId), updateData);
      alert(`✅ Payout ${status === 'paid' ? 'completed' : status} successfully!`);
      setSelectedPayout(null);
      setPaymentDetails({ paymentMethod: 'qr_payment', transactionId: '', adminNotes: '' });
      fetchPayouts();

      // Send email notification if payout is marked as paid
      if (status === 'paid' && selectedPayout?.sellerEmail) {
        await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: selectedPayout.sellerEmail,
            subject: 'Your payout has been processed',
            text: `Hi ${selectedPayout.sellerName}, your payout of RM ${selectedPayout.amount.toFixed(2)} has been completed.`
          })
        });
      }
    } catch (error) {
      alert('Error updating payout status');
    }
  };

  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock size={16} style={{ color: '#f59e0b' }} />;
      case 'processing': return <AlertCircle size={16} style={{ color: '#3b82f6' }} />;
      case 'paid': return <CheckCircle size={16} style={{ color: '#10b981' }} />;
      case 'failed': return <AlertCircle size={16} style={{ color: '#ef4444' }} />;
      default: return <Clock size={16} style={{ color: '#6b7280' }} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return { background: '#fef3c7', color: '#92400e' };
      case 'processing': return { background: '#dbeafe', color: '#1e40af' };
      case 'paid': return { background: '#d1fae5', color: '#065f46' };
      case 'failed': return { background: '#fee2e2', color: '#991b1b' };
      default: return { background: '#f3f4f6', color: '#374151' };
    }
  };

  const totalPendingAmount = pendingPayouts.reduce((sum, p) => sum + p.amount, 0);
  const totalPaidAmount = processedPayouts.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite' }} />
        <div style={{ marginTop: 10 }}>Loading payouts...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: 30 }}>
      {/* Header */}
      <div style={{ marginBottom: 30, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: 10, color: '#1f2937' }}>
            Seller Payouts
          </h1>
          <p style={{ color: '#6b7280' }}>Manage seller payments and payout history</p>
        </div>
        <button
          onClick={fetchPayouts}
          disabled={loading}
          style={{
            padding: '10px 16px',
            background: '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '0.9rem',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            opacity: loading ? 0.6 : 1
          }}
        >
          <RefreshCw size={16} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          Refresh
        </button>
      </div>

      {/* Info Note */}
      <div style={{
        marginBottom: 20,
        padding: 15,
        background: '#ecfdf5',
        borderRadius: 8,
        border: '1px solid #10b981',
        fontSize: '0.9rem',
        color: '#059669'
      }}>
        <strong>Automatic Payout System:</strong> Payouts are created automatically when orders are marked as "completed" in the Orders page.
      </div>

      {/* Summary Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: 20,
        marginBottom: 30
      }}>
        <div style={{
          background: 'white',
          padding: 25,
          borderRadius: 12,
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{ padding: 8, background: '#fef3c7', borderRadius: 8 }}>
              <Clock size={20} style={{ color: '#92400e' }} />
            </div>
            <div>
              <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>Pending Payouts</div>
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#f59e0b' }}>
            RM {totalPendingAmount.toFixed(2)}
          </div>
          <div style={{ fontSize: '0.85rem', color: '#9ca3af', marginTop: 4 }}>
            {pendingPayouts.length} payout(s)
          </div>
        </div>

        <div style={{
          background: 'white',
          padding: 25,
          borderRadius: 12,
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{ padding: 8, background: '#d1fae5', borderRadius: 8 }}>
              <CheckCircle size={20} style={{ color: '#065f46' }} />
            </div>
            <div>
              <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>Total Paid</div>
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#10b981' }}>
            RM {totalPaidAmount.toFixed(2)}
          </div>
          <div style={{ fontSize: '0.85rem', color: '#9ca3af', marginTop: 4 }}>
            {processedPayouts.filter(p => p.status === 'paid').length} payout(s)
          </div>
        </div>

        <div style={{
          background: 'white',
          padding: 25,
          borderRadius: 12,
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{ padding: 8, background: '#dbeafe', borderRadius: 8 }}>
              <DollarSign size={20} style={{ color: '#1e40af' }} />
            </div>
            <div>
              <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>Platform Fees</div>
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#3b82f6' }}>
            {(PLATFORM_FEE_RATE * 100).toFixed(0)}%
          </div>
          <div style={{ fontSize: '0.85rem', color: '#9ca3af', marginTop: 4 }}>
            Commission rate
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: 10,
        marginBottom: 20,
        borderBottom: '2px solid #e5e7eb'
      }}>
        <button
          onClick={() => setActiveTab('pending')}
          style={{
            padding: '12px 24px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'pending' ? '3px solid #c9a26d' : '3px solid transparent',
            color: activeTab === 'pending' ? '#1f2937' : '#6b7280',
            fontWeight: activeTab === 'pending' ? 600 : 400,
            cursor: 'pointer',
            fontSize: '0.95rem',
            transition: 'all 0.2s'
          }}
        >
          Pending ({pendingPayouts.length})
        </button>
        <button
          onClick={() => setActiveTab('processed')}
          style={{
            padding: '12px 24px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'processed' ? '3px solid #c9a26d' : '3px solid transparent',
            color: activeTab === 'processed' ? '#1f2937' : '#6b7280',
            fontWeight: activeTab === 'processed' ? 600 : 400,
            cursor: 'pointer',
            fontSize: '0.95rem',
            transition: 'all 0.2s'
          }}
        >
          Processed ({processedPayouts.length})
        </button>
      </div>

      {/* Payouts Table */}
      <div style={{ background: 'white', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Seller</th>
              <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Amount</th>
              <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Order</th>
              <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Status</th>
              <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Created</th>
              {activeTab === 'processed' && (
                <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Paid Date</th>
              )}
              <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {(activeTab === 'pending' ? pendingPayouts : processedPayouts).length === 0 ? (
              <tr>
                <td colSpan={activeTab === 'processed' ? 7 : 6} style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
                  {activeTab === 'pending' 
                    ? 'No pending payouts. Payouts will appear automatically when orders are completed.' 
                    : 'No processed payouts'}
                </td>
              </tr>
            ) : (
              (activeTab === 'pending' ? pendingPayouts : processedPayouts).map(payout => (
                <tr key={payout.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '16px' }}>
                    <div>
                      <div style={{ fontWeight: 600, color: '#1f2937' }}>
                        {payout.sellerName}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                        {payout.sellerEmail || 'No email'}
                      </div>
                      {payout.itemDetails && (
                        <div style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
                          {payout.itemDetails.itemName || 'Unknown Item'}
                        </div>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <div>
                      <div style={{ fontWeight: 700, color: '#10b981', fontSize: '1.1rem' }}>
                        RM {payout.amount.toFixed(2)}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                        Gross: RM {payout.grossAmount?.toFixed(2)}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#ef4444' }}>
                        Fee: RM {payout.platformFee?.toFixed(2)}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '16px', color: '#6b7280' }}>
                    <div style={{ fontSize: '0.9rem' }}>
                      {payout.orderIds?.[0] || 'N/A'}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
                      {payout.ordersCount} order(s)
                    </div>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {getStatusIcon(payout.status)}
                      <span style={{
                        padding: '4px 12px',
                        borderRadius: 12,
                        fontSize: '0.85rem',
                        fontWeight: 500,
                        textTransform: 'capitalize',
                        ...getStatusColor(payout.status)
                      }}>
                        {payout.status}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '16px', color: '#6b7280', fontSize: '0.85rem' }}>
                    {formatDate(payout.createdAt)}
                  </td>
                  {activeTab === 'processed' && (
                    <td style={{ padding: '16px', color: '#6b7280', fontSize: '0.85rem' }}>
                      {formatDate(payout.paidAt)}
                    </td>
                  )}
                  <td style={{ padding: '16px' }}>
                    <button
                      onClick={() => setSelectedPayout(payout)}
                      style={{
                        padding: '6px 12px',
                        background: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: 6,
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        fontWeight: 500,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                    >
                      <Eye size={14} />
                      {activeTab === 'pending' ? 'Process' : 'View'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Payout Details Modal */}
      {selectedPayout && (
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
          onClick={() => setSelectedPayout(null)}
        >
          <div
            style={{
              background: 'white',
              padding: 30,
              borderRadius: 12,
              maxWidth: 600,
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 20, color: '#1f2937' }}>
              Payout Details
            </h2>
            
            {/* Payout Information */}
            <div style={{ marginBottom: 30, padding: 20, background: '#f9fafb', borderRadius: 8 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div>
                  <strong style={{ color: '#6b7280' }}>Seller:</strong>
                  <div style={{ marginTop: 5, color: '#1f2937' }}>{selectedPayout.sellerName}</div>
                </div>
                <div>
                  <strong style={{ color: '#6b7280' }}>Email:</strong>
                  <div style={{ marginTop: 5, color: '#1f2937' }}>{selectedPayout.sellerEmail || 'N/A'}</div>
                </div>
                <div>
                  <strong style={{ color: '#6b7280' }}>Gross Amount:</strong>
                  <div style={{ marginTop: 5, color: '#1f2937' }}>RM {selectedPayout.grossAmount?.toFixed(2)}</div>
                </div>
                <div>
                  <strong style={{ color: '#6b7280' }}>Platform Fee:</strong>
                  <div style={{ marginTop: 5, color: '#ef4444' }}>-RM {selectedPayout.platformFee?.toFixed(2)}</div>
                </div>
                <div>
                  <strong style={{ color: '#6b7280' }}>Net Amount:</strong>
                  <div style={{ marginTop: 5, color: '#10b981', fontSize: '1.2rem', fontWeight: 700 }}>
                    RM {selectedPayout.amount.toFixed(2)}
                  </div>
                </div>
                <div>
                  <strong style={{ color: '#6b7280' }}>Order ID:</strong>
                  <div style={{ marginTop: 5, color: '#1f2937' }}>{selectedPayout.orderIds?.[0] || 'N/A'}</div>
                </div>
              </div>
            </div>

            {/* Item Details */}
            {selectedPayout.itemDetails && (
              <div style={{ marginBottom: 30, padding: 20, background: '#f0f9ff', borderRadius: 8 }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 15, color: '#1f2937' }}>
                  Item Details
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
                  <div>
                    <strong style={{ color: '#6b7280' }}>Item Name:</strong>
                    <div style={{ marginTop: 5, color: '#1f2937' }}>
                      {selectedPayout.itemDetails.itemName || 'Unknown Item'}
                    </div>
                  </div>
                  <div>
                    <strong style={{ color: '#6b7280' }}>Unit Price:</strong>
                    <div style={{ marginTop: 5, color: '#1f2937' }}>
                      RM {Number(selectedPayout.itemDetails?.itemPrice || 0).toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <strong style={{ color: '#6b7280' }}>Quantity:</strong>
                    <div style={{ marginTop: 5, color: '#1f2937' }}>
                      {selectedPayout.itemDetails.quantity}
                    </div>
                  </div>
                  <div>
                    <strong style={{ color: '#6b7280' }}>Item Type:</strong>
                    <div style={{ marginTop: 5, color: '#1f2937' }}>
                      {selectedPayout.itemDetails.productId ? 'Product' : 
                       selectedPayout.itemDetails.bidId ? 'Bid' : 'Unknown'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Bank Details */}
            {selectedPayout.bankDetails && (
              <div style={{ marginBottom: 30, padding: 20, background: '#eff6ff', borderRadius: 8 }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 15, color: '#1f2937' }}>
                  Bank Details
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
                  <div>
                    <strong style={{ color: '#6b7280' }}>Bank:</strong>
                    <div style={{ marginTop: 5, color: '#1f2937' }}>{selectedPayout.bankDetails.bankName || 'N/A'}</div>
                  </div>
                  <div>
                    <strong style={{ color: '#6b7280' }}>Account:</strong>
                    <div style={{ marginTop: 5, color: '#1f2937' }}>{selectedPayout.bankDetails.accountNumber || 'N/A'}</div>
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <strong style={{ color: '#6b7280' }}>Account Holder:</strong>
                    <div style={{ marginTop: 5, color: '#1f2937' }}>{selectedPayout.bankDetails.accountHolder || 'N/A'}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Payment Processing (for pending payouts) */}
            {selectedPayout.status === 'pending' && (
              <div style={{ marginBottom: 30 }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 15, color: '#1f2937' }}>
                  Process Payment
                </h3>
                <div style={{ marginBottom: 15 }}>
                  <label style={{ display: 'block', marginBottom: 5, fontWeight: 500, color: '#374151' }}>
                    Payment Method:
                  </label>
                  <select
                    value={paymentDetails.paymentMethod}
                    onChange={(e) => setPaymentDetails({...paymentDetails, paymentMethod: e.target.value})}
                    style={{
                      width: '100%',
                      padding: 10,
                      border: '1px solid #d1d5db',
                      borderRadius: 6,
                      fontSize: '0.9rem'
                    }}
                  >
                    <option value="qr_payment">QR Payment</option>
                  </select>
                </div>
                <div style={{ marginBottom: 15 }}>
                  <label style={{ display: 'block', marginBottom: 5, fontWeight: 500, color: '#374151' }}>
                    Transaction Reference:
                  </label>
                  <input
                    type="text"
                    value={paymentDetails.transactionId}
                    onChange={(e) => setPaymentDetails({...paymentDetails, transactionId: e.target.value})}
                    placeholder="Enter transaction ID or reference number"
                    style={{
                      width: '100%',
                      padding: 10,
                      border: '1px solid #d1d5db',
                      borderRadius: 6,
                      fontSize: '0.9rem'
                    }}
                  />
                </div>
                <div style={{ marginBottom: 15 }}>
                  <label style={{ display: 'block', marginBottom: 5, fontWeight: 500, color: '#374151' }}>
                    Payment Screenshot/QR Receipt:
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setPaymentDetails({
                          ...paymentDetails,
                          adminNotes: paymentDetails.adminNotes + `\nPayment proof uploaded: ${file.name}`
                        });
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: 10,
                      border: '1px solid #d1d5db',
                      borderRadius: 6,
                      fontSize: '0.9rem'
                    }}
                  />
                  <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: 5 }}>
                    Upload screenshot of QR payment confirmation
                  </div>
                </div>
                <div style={{ marginBottom: 15 }}>
                  <label style={{ display: 'block', marginBottom: 5, fontWeight: 500, color: '#374151' }}>
                    Admin Notes:
                  </label>
                  <textarea
                    value={paymentDetails.adminNotes}
                    onChange={(e) => setPaymentDetails({...paymentDetails, adminNotes: e.target.value})}
                    placeholder="Add payment details, seller's phone number, or other notes"
                    rows={3}
                    style={{
                      width: '100%',
                      padding: 10,
                      border: '1px solid #d1d5db',
                      borderRadius: 6,
                      fontSize: '0.9rem',
                      resize: 'vertical'
                    }}
                  />
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={() => handleUpdatePayoutStatus(selectedPayout.id, 'processing')}
                    style={{
                      flex: 1,
                      padding: '10px 20px',
                      background: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: 6,
                      cursor: 'pointer',
                      fontWeight: 600
                    }}
                  >
                    Mark as Processing
                  </button>
                  <button
                    onClick={() => handleUpdatePayoutStatus(selectedPayout.id, 'paid')}
                    style={{
                      flex: 1,
                      padding: '10px 20px',
                      background: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: 6,
                      cursor: 'pointer',
                      fontWeight: 600
                    }}
                  >
                    Mark as Paid
                  </button>
                  <button
                    onClick={() => handleUpdatePayoutStatus(selectedPayout.id, 'failed')}
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
                    Mark as Failed
                  </button>
                </div>
              </div>
            )}

            {/* Payment Information (for processed payouts) */}
            {selectedPayout.status !== 'pending' && (
              <div style={{ marginBottom: 30, padding: 20, background: '#f3f4f6', borderRadius: 8 }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 15, color: '#1f2937' }}>
                  Payment Information
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
                  <div>
                    <strong style={{ color: '#6b7280' }}>Method:</strong>
                    <div style={{ marginTop: 5, color: '#1f2937' }}>{selectedPayout.paymentMethod || 'N/A'}</div>
                  </div>
                  <div>
                    <strong style={{ color: '#6b7280' }}>Transaction ID:</strong>
                    <div style={{ marginTop: 5, color: '#1f2937' }}>{selectedPayout.transactionId || 'N/A'}</div>
                  </div>
                  {selectedPayout.adminNotes && (
                    <div style={{ gridColumn: 'span 2' }}>
                      <strong style={{ color: '#6b7280' }}>Notes:</strong>
                      <div style={{ marginTop: 5, color: '#1f2937' }}>{selectedPayout.adminNotes}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <button
              onClick={() => setSelectedPayout(null)}
              style={{
                width: '100%',
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
          </div>
        </div>
      )}

      {/* Info Box */}
      <div style={{
        marginTop: 30,
        padding: 25,
        background: '#eff6ff',
        border: '1px solid #bfdbfe',
        borderRadius: 12
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 15 }}>
          <div style={{ padding: 8, background: '#dbeafe', borderRadius: 8 }}>
            <CreditCard size={20} style={{ color: '#1e40af' }} />
          </div>
          <div style={{ fontSize: '1.1rem', color: '#1e40af', fontWeight: 600 }}>
            Automatic Payout System
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
          <div>
            <h4 style={{ margin: '0 0 10px 0', color: '#1e3a8a', fontSize: '0.95rem', fontWeight: 600 }}>
              How It Works
            </h4>
            <ul style={{ margin: 0, paddingLeft: 20, color: '#1e3a8a', fontSize: '0.9rem', lineHeight: 1.6 }}>
              <li>Payouts created automatically when orders completed</li>
              <li>Individual payouts per product/seller</li>
              <li>Applies 10% platform commission</li>
              <li>Sellers receive instant notifications</li>
            </ul>
          </div>
          <div>
            <h4 style={{ margin: '0 0 10px 0', color: '#1e3a8a', fontSize: '0.95rem', fontWeight: 600 }}>
              Payment Processing
            </h4>
            <ul style={{ margin: 0, paddingLeft: 20, color: '#1e3a8a', fontSize: '0.9rem', lineHeight: 1.6 }}>
              <li>Process payments via QR codes only</li>
              <li>Upload payment screenshots as proof</li>
              <li>Add transaction references and notes</li>
              <li>Mark as processing, paid, or failed</li>
            </ul>
          </div>
        </div>
        <div style={{ 
          marginTop: 20, 
          padding: 15, 
          background: '#ecfdf5', 
          borderRadius: 8,
          border: '1px solid #10b981'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <CheckCircle size={16} style={{ color: '#059669' }} />
            <strong style={{ color: '#059669', fontSize: '0.9rem' }}>Benefits:</strong>
          </div>
          <ul style={{ margin: 0, paddingLeft: 20, color: '#059669', fontSize: '0.85rem', lineHeight: 1.5 }}>
            <li>No manual intervention needed - fully automated</li>
            <li>Immediate payout creation when orders complete</li>
            <li>Sellers get notified instantly</li>
            <li>Reduced admin workload and faster payments</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AdminPayoutsPage;
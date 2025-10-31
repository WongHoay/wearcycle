"use client";
import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy, limit, doc, getDoc, where, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { auth } from '../../../firebaseConfig';
import { useRouter } from 'next/navigation';
import { Bell, MessageSquare, AlertTriangle, CheckCircle, XCircle, Users, Package, ShoppingCart, DollarSign } from 'lucide-react';

interface Stats {
  totalUsers: number;
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
}

interface AdminNotification {
  id: string;
  type: 'product_appeal' | 'product_flagged' | 'user_report' | 'system';
  appealId?: string;
  productId?: string;
  productName?: string;
  sellerId?: string;
  sellerUsername?: string;
  appealMessage?: string;
  flagReason?: string;
  message: string;
  createdAt: any;
  read: boolean;
  status?: string;
}

const AdminDashboard = () => {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalProducts: 0,
    totalOrders: 0,
    totalRevenue: 0
  });
  const [recentActivity, setRecentActivity] = useState<string[]>([]);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const checkAdminPrivileges = async () => {
      const user = auth.currentUser;
      if (!user) {
        setError('You must be logged in as an admin to access this page.');
        return;
      }

      const adminDoc = await getDoc(doc(db, 'admins', user.uid));
      if (!adminDoc.exists()) {
        await auth.signOut();
        setError('Access denied. Admin privileges required.');
        return;
      }
    };

    checkAdminPrivileges();
    fetchStats();
    fetchNotifications();
    
    // Set up real-time notification listener
    setupNotificationListener();
  }, []);

  const setupNotificationListener = () => {
    // Real-time listener for admin notifications
    const q = query(
      collection(db, 'admin_notifications'),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notificationsData: AdminNotification[] = [];
      let unreadCounter = 0;

      snapshot.forEach((doc) => {
        const notification = { id: doc.id, ...doc.data() } as AdminNotification;
        notificationsData.push(notification);
        if (!notification.read) {
          unreadCounter++;
        }
      });

      setNotifications(notificationsData);
      setUnreadCount(unreadCounter);
    });

    return unsubscribe;
  };

  const fetchNotifications = async () => {
    try {
      const q = query(
        collection(db, 'admin_notifications'),
        orderBy('createdAt', 'desc'),
        limit(20)
      );
      
      const snapshot = await getDocs(q);
      const notificationsData: AdminNotification[] = [];
      let unreadCounter = 0;

      snapshot.forEach((doc) => {
        const notification = { id: doc.id, ...doc.data() } as AdminNotification;
        notificationsData.push(notification);
        if (!notification.read) {
          unreadCounter++;
        }
      });

      setNotifications(notificationsData);
      setUnreadCount(unreadCounter);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const fetchStats = async () => {
    try {
      // Fetch users count
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const totalUsers = usersSnapshot.size;

      // Fetch products count
      const productsSnapshot = await getDocs(collection(db, 'products'));
      const totalProducts = productsSnapshot.size;

      // Fetch orders and calculate revenue
      const ordersSnapshot = await getDocs(collection(db, 'orders'));
      const totalOrders = ordersSnapshot.size;
      
      let revenue = 0;
      ordersSnapshot.forEach(doc => {
        const orderData = doc.data();
        if (orderData.totalAmount) {
          revenue += orderData.totalAmount;
        }
      });

      setStats({
        totalUsers,
        totalProducts,
        totalOrders,
        totalRevenue: revenue
      });

      // Fetch recent activity
      const recentOrders = query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(10));
      const recentSnapshot = await getDocs(recentOrders);
      const activities: string[] = [];
      
      recentSnapshot.forEach(doc => {
        const data = doc.data();
        const date = data.createdAt?.toDate().toLocaleDateString() || 'Recently';
        activities.push(`New order #${doc.id.substring(0, 8)} - ${date}`);
      });
      
      setRecentActivity(activities);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      await updateDoc(doc(db, 'admin_notifications', notificationId), {
        read: true,
        readAt: new Date()
      });
      
      // Update local state
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId ? { ...n, read: true } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.read);
      const promises = unreadNotifications.map(n => 
        updateDoc(doc(db, 'admin_notifications', n.id), {
          read: true,
          readAt: new Date()
        })
      );
      await Promise.all(promises);
      
      // Update local state
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'product_appeal':
        return <MessageSquare size={16} style={{ color: '#f59e0b' }} />;
      case 'product_flagged':
        return <AlertTriangle size={16} style={{ color: '#ef4444' }} />;
      case 'user_report':
        return <AlertTriangle size={16} style={{ color: '#f97316' }} />;
      default:
        return <Bell size={16} style={{ color: '#6b7280' }} />;
    }
  };

  const handleNotificationClick = (notification: AdminNotification) => {
    // Mark as read
    if (!notification.read) {
      markNotificationAsRead(notification.id);
    }

    // Navigate based on notification type
    if (notification.type === 'product_appeal') {
      router.push('/admin/appeals');
    } else if (notification.type === 'product_flagged') {
      router.push('/admin/products');
    }
    
    setShowNotifications(false);
  };

  const formatTimeAgo = (date: any) => {
    if (!date) return 'Unknown';
    try {
      const timestamp = date.toDate ? date.toDate() : new Date(date);
      const now = new Date();
      const diffInMinutes = Math.floor((now.getTime() - timestamp.getTime()) / (1000 * 60));
      
      if (diffInMinutes < 1) return 'Just now';
      if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
      if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
      return `${Math.floor(diffInMinutes / 1440)}d ago`;
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
          <div style={{
            width: 40,
            height: 40,
            border: "3px solid #f3f4f6",
            borderTop: "3px solid #3b82f6",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
            margin: "0 auto 16px"
          }} />
          <div>Loading dashboard...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        padding: 40, 
        textAlign: 'center', 
        color: '#ef4444',
        background: '#fef2f2',
        border: '1px solid #fca5a5',
        borderRadius: 8,
        margin: 20
      }}>
        <AlertTriangle size={24} style={{ margin: '0 auto 8px', display: 'block' }} />
        {error}
      </div>
    );
  }

  return (
    <div style={{ padding: 30, background: '#f9fafb', minHeight: '100vh' }}>
      {/* Header with Notifications */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, color: '#1f2937', margin: 0 }}>
            Admin Dashboard
          </h1>
          <p style={{ color: '#6b7280', marginTop: 4, fontSize: '1rem' }}>
            Welcome back! Here's what's happening with your platform.
          </p>
        </div>
        
        {/* Notification Bell */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            style={{
              background: 'white',
              border: '1px solid #d1d5db',
              borderRadius: 8,
              padding: 12,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              position: 'relative',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
            }}
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute',
                top: -8,
                right: -8,
                background: '#ef4444',
                color: 'white',
                borderRadius: '50%',
                width: 20,
                height: 20,
                fontSize: '0.75rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                animation: unreadCount > 0 ? 'pulse 2s infinite' : 'none'
              }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          
          {/* Notifications Dropdown */}
          {showNotifications && (
            <div style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              width: 400,
              maxHeight: 500,
              overflowY: 'auto',
              background: 'white',
              borderRadius: 12,
              boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
              border: '1px solid #e5e7eb',
              zIndex: 1000,
              marginTop: 8
            }}>
              <div style={{
                padding: '16px 20px',
                borderBottom: '1px solid #e5e7eb',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>
                  Notifications ({unreadCount})
                </h3>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#3b82f6',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      fontWeight: 500
                    }}
                  >
                    Mark all read
                  </button>
                )}
              </div>
              
              <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div style={{
                    padding: '40px 20px',
                    textAlign: 'center',
                    color: '#9ca3af'
                  }}>
                    <Bell size={32} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.5 }} />
                    No notifications yet
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <div
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      style={{
                        padding: '16px 20px',
                        borderBottom: '1px solid #f3f4f6',
                        cursor: 'pointer',
                        background: notification.read ? 'white' : '#fef3c7',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = notification.read ? '#f9fafb' : '#fef3c7';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = notification.read ? 'white' : '#fef3c7';
                      }}
                    >
                      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                        <div style={{ marginTop: 2 }}>
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: '0.9rem',
                            fontWeight: notification.read ? 400 : 600,
                            color: '#1f2937',
                            lineHeight: 1.4,
                            marginBottom: 4
                          }}>
                            {notification.message}
                          </div>
                          <div style={{
                            fontSize: '0.8rem',
                            color: '#6b7280'
                          }}>
                            {formatTimeAgo(notification.createdAt)}
                          </div>
                        </div>
                        {!notification.read && (
                          <div style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: '#f59e0b',
                            marginTop: 6
                          }} />
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              {notifications.length > 0 && (
                <div style={{
                  padding: '12px 20px',
                  borderTop: '1px solid #e5e7eb',
                  textAlign: 'center'
                }}>
                  <button
                    onClick={() => {
                      setShowNotifications(false);
                      router.push('/admin/appeals');
                    }}
                    style={{
                      background: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: 6,
                      padding: '8px 16px',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      fontWeight: 500
                    }}
                  >
                    View All Appeals
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: 20,
        marginBottom: 40
      }}>
        <div style={{
          background: 'white',
          padding: 25,
          borderRadius: 12,
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <Users size={24} style={{ color: '#3b82f6' }} />
            <div style={{ fontSize: '0.9rem', color: '#6b7280', fontWeight: 500 }}>Total Users</div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#1f2937' }}>
            {stats.totalUsers.toLocaleString()}
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
            <Package size={24} style={{ color: '#10b981' }} />
            <div style={{ fontSize: '0.9rem', color: '#6b7280', fontWeight: 500 }}>Total Products</div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#1f2937' }}>
            {stats.totalProducts.toLocaleString()}
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
            <ShoppingCart size={24} style={{ color: '#f59e0b' }} />
            <div style={{ fontSize: '0.9rem', color: '#6b7280', fontWeight: 500 }}>Total Orders</div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#1f2937' }}>
            {stats.totalOrders.toLocaleString()}
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
            <DollarSign size={24} style={{ color: '#10b981' }} />
            <div style={{ fontSize: '0.9rem', color: '#6b7280', fontWeight: 500 }}>Total Revenue</div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#10b981' }}>
            RM {stats.totalRevenue.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
          </div>
        </div>

        {/* Pending Actions Card */}
        <div style={{
          background: 'white',
          padding: 25,
          borderRadius: 12,
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          border: unreadCount > 0 ? '2px solid #f59e0b' : '1px solid #e5e7eb',
          transition: 'border-color 0.3s'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <Bell size={24} style={{ color: unreadCount > 0 ? '#f59e0b' : '#6b7280' }} />
            <div style={{ fontSize: '0.9rem', color: '#6b7280', fontWeight: 500 }}>Pending Actions</div>
          </div>
          <div style={{ 
            fontSize: '2rem', 
            fontWeight: 700, 
            color: unreadCount > 0 ? '#f59e0b' : '#1f2937',
            marginBottom: unreadCount > 0 ? 12 : 0
          }}>
            {unreadCount}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={() => router.push('/admin/appeals')}
              style={{
                padding: '8px 16px',
                background: '#f59e0b',
                color: 'white',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: 500,
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#d97706';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#f59e0b';
              }}
            >
              Review Now
            </button>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: 20, color: '#1f2937' }}>
          Quick Actions
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16
        }}>
          <button
            onClick={() => router.push('/admin/appeals')}
            style={{
              background: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              padding: '16px',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.2s',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
            }}
          >
            <MessageSquare size={20} style={{ color: '#f59e0b', marginBottom: 8 }} />
            <div style={{ fontWeight: 600, color: '#1f2937' }}>Review Appeals</div>
            <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>Pending: {unreadCount}</div>
          </button>

          <button
            onClick={() => router.push('/admin/products')}
            style={{
              background: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              padding: '16px',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.2s',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
            }}
          >
            <Package size={20} style={{ color: '#10b981', marginBottom: 8 }} />
            <div style={{ fontWeight: 600, color: '#1f2937' }}>Manage Products</div>
            <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>Flag, approve, delete</div>
          </button>

          <button
            onClick={() => router.push('/admin/users')}
            style={{
              background: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              padding: '16px',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.2s',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
            }}
          >
            <Users size={20} style={{ color: '#3b82f6', marginBottom: 8 }} />
            <div style={{ fontWeight: 600, color: '#1f2937' }}>Manage Users</div>
            <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>View, ban, moderate</div>
          </button>

          <button
            onClick={() => router.push('/admin/orders')}
            style={{
              background: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              padding: '16px',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.2s',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
            }}
          >
            <ShoppingCart size={20} style={{ color: '#f59e0b', marginBottom: 8 }} />
            <div style={{ fontWeight: 600, color: '#1f2937' }}>View Orders</div>
            <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>Transaction history</div>
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div style={{
        background: 'white',
        padding: 25,
        borderRadius: 12,
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        border: '1px solid #e5e7eb'
      }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: 20, color: '#1f2937' }}>
          Recent Activity
        </h2>
        {recentActivity.length === 0 ? (
          <div style={{ color: '#9ca3af', padding: '20px 0', textAlign: 'center' }}>
            <ShoppingCart size={32} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.5 }} />
            No recent activity
          </div>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {recentActivity.map((activity, index) => (
              <li key={index} style={{
                padding: '12px 0',
                borderBottom: index < recentActivity.length - 1 ? '1px solid #e5e7eb' : 'none',
                color: '#374151',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}>
                <div style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: '#10b981'
                }} />
                {activity}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Click outside to close notifications */}
      {showNotifications && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999
          }}
          onClick={() => setShowNotifications(false)}
        />
      )}

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

export default AdminDashboard;
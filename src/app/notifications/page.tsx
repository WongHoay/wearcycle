"use client";
import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { getAuth } from 'firebase/auth';

interface Notification {
  id: string;
  userId: string;
  type: 'product_flagged' | 'product_removed' | 'product_approved' | 'appeal_response';
  message: string;
  productId?: string;
  productName?: string;
  reason?: string;
  createdAt: Timestamp;
  read: boolean;
  readAt?: Timestamp;
  actionBy?: string;
}

type FilterType = 'all' | 'unread' | 'product_flagged' | 'product_removed' | 'product_approved';

interface NotificationsPageProps {
  currentUser?: {
    uid: string;
    email?: string;
    displayName?: string;
  } | null;
}

const NotificationsPage: React.FC<NotificationsPageProps> = ({ currentUser }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Get user from multiple sources
  const getUser = () => {
    // Try currentUser prop first
    if (currentUser?.uid) return currentUser;
    
    // Try Firebase Auth
    try {
      const auth = getAuth();
      if (auth.currentUser) {
        return {
          uid: auth.currentUser.uid,
          email: auth.currentUser.email || undefined,
          displayName: auth.currentUser.displayName || undefined
        };
      }
    } catch (error) {
      console.error('Error getting auth user:', error);
    }
    
    // Try localStorage/sessionStorage
    try {
      const userData = localStorage.getItem('user') || 
                     sessionStorage.getItem('user') || 
                     localStorage.getItem('currentUser');
      if (userData) {
        const parsed = JSON.parse(userData);
        if (parsed?.uid) return parsed;
      }
    } catch (error) {
      console.error('Error getting stored user:', error);
    }
    
    return null;
  };

  const user = getUser();

  useEffect(() => {
    fetchNotifications();
  }, [user]);

  useEffect(() => {
    let filtered = notifications;
    
    if (filter === 'unread') {
      filtered = notifications.filter(n => !n.read);
    } else if (filter !== 'all') {
      filtered = notifications.filter(n => n.type === filter);
    }
    
    setFilteredNotifications(filtered);
  }, [filter, notifications]);

  const fetchNotifications = async (): Promise<void> => {
    if (!user?.uid) {
      setLoading(false);
      setError('Please log in to view notifications');
      return;
    }

    try {
      console.log('📧 Fetching notifications for user:', user.uid);
      
      // Simple query without orderBy to avoid index issues
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', user.uid)
      );

      const snapshot = await getDocs(q);
      console.log('📧 Found notifications:', snapshot.docs.length);
      
      const notificationData: Notification[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Notification));

      // Sort by creation date (newest first) - client-side
      notificationData.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(0);
        const dateB = b.createdAt?.toDate?.() || new Date(0);
        return dateB.getTime() - dateA.getTime();
      });

      setNotifications(notificationData);
      setFilteredNotifications(notificationData);
      setError(null);
    } catch (error) {
      console.error('❌ Error fetching notifications:', error);
      setError('Failed to load notifications');
      setNotifications([]);
      setFilteredNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string): Promise<void> => {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), {
        read: true,
        readAt: new Date()
      });
      // Update local state
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId ? { ...n, read: true } : n
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async (): Promise<void> => {
    try {
      const unreadNotifications = notifications.filter(n => !n.read);
      const promises = unreadNotifications.map(n => 
        updateDoc(doc(db, 'notifications', n.id), {
          read: true,
          readAt: new Date()
        })
      );
      await Promise.all(promises);
      
      // Update local state
      setNotifications(prev => 
        prev.map(n => ({ ...n, read: true }))
      );
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const getNotificationIcon = (type: string): string => {
    switch (type) {
      case 'product_flagged': return '⚠️';
      case 'product_removed': return '🚫';
      case 'product_approved': return '✅';
      case 'appeal_response': return '📝';
      default: return '📢';
    }
  };

  const formatTimeAgo = (date: Timestamp | any): string => {
    try {
      const notificationDate = date?.toDate ? date.toDate() : new Date(date);
      const now = new Date();
      const diffInMinutes = Math.floor((now.getTime() - notificationDate.getTime()) / (1000 * 60));
      
      if (diffInMinutes < 1) return 'Just now';
      if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
      if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
      return `${Math.floor(diffInMinutes / 1440)}d ago`;
    } catch {
      return 'Recently';
    }
  };

  // Error state
  if (error && !user) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2>Please log in to view your notifications</h2>
        <button
          onClick={() => window.location.href = '/login'}
          style={{
            padding: '12px 24px',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: 500
          }}
        >
          Go to Login
        </button>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div>Loading notifications...</div>
        <button
          onClick={fetchNotifications}
          style={{
            marginTop: '16px',
            padding: '8px 16px',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.9rem'
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  const filterOptions = [
    { key: 'all' as FilterType, label: 'All', count: notifications.length },
    { key: 'unread' as FilterType, label: 'Unread', count: notifications.filter(n => !n.read).length },
    { key: 'product_flagged' as FilterType, label: 'Flagged Products', count: notifications.filter(n => n.type === 'product_flagged').length },
    { key: 'product_removed' as FilterType, label: 'Removed Products', count: notifications.filter(n => n.type === 'product_removed').length },
    { key: 'product_approved' as FilterType, label: 'Approved', count: notifications.filter(n => n.type === 'product_approved').length }
  ];

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, margin: 0 }}>
          Notifications
        </h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={fetchNotifications}
            style={{
              padding: '8px 16px',
              background: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: 500
            }}
          >
            Refresh
          </button>
          {notifications.filter(n => !n.read).length > 0 && (
            <button
              onClick={markAllAsRead}
              style={{
                padding: '8px 16px',
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: 500
              }}
            >
              Mark All Read
            </button>
          )}
        </div>
      </div>

      {/* Debug Info */}
      <div style={{ 
        marginBottom: '20px', 
        padding: '10px', 
        background: '#f3f4f6', 
        borderRadius: '6px', 
        fontSize: '0.8rem',
        color: '#6b7280'
      }}>
        <strong>Debug:</strong> User ID: {user?.uid || 'Not logged in'} | 
        Notifications: {notifications.length} | 
        Unread: {notifications.filter(n => !n.read).length}
      </div>

      {/* Filter Buttons */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {filterOptions.map(filterOption => (
          <button
            key={filterOption.key}
            onClick={() => setFilter(filterOption.key)}
            style={{
              padding: '8px 16px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              background: filter === filterOption.key ? '#3b82f6' : 'white',
              color: filter === filterOption.key ? 'white' : '#374151',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {filterOption.label}
            <span style={{
              background: filter === filterOption.key ? 'rgba(255,255,255,0.3)' : '#e5e7eb',
              color: filter === filterOption.key ? 'white' : '#6b7280',
              borderRadius: '10px',
              padding: '2px 6px',
              fontSize: '0.75rem',
              fontWeight: 'bold',
              minWidth: '18px',
              textAlign: 'center'
            }}>
              {filterOption.count}
            </span>
          </button>
        ))}
      </div>

      {/* Error Message */}
      {error && (
        <div style={{
          padding: '16px',
          background: '#fef2f2',
          border: '1px solid #fca5a5',
          borderRadius: '8px',
          color: '#991b1b',
          marginBottom: '20px'
        }}>
          {error}
        </div>
      )}

      {/* Notifications List */}
      <div style={{ background: 'white', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e5e7eb' }}>
        {filteredNotifications.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: '#9ca3af' }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📭</div>
            <h3 style={{ margin: '0 0 8px 0', color: '#6b7280' }}>No notifications found</h3>
            <p style={{ margin: 0 }}>
              {filter === 'all' ? "You're all caught up!" : `No ${filter.replace('_', ' ')} notifications`}
            </p>
            {filter === 'all' && notifications.length === 0 && (
              <button
                onClick={fetchNotifications}
                style={{
                  marginTop: '16px',
                  padding: '8px 16px',
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                Check Again
              </button>
            )}
          </div>
        ) : (
          filteredNotifications.map((notification, index) => (
            <div
              key={notification.id}
              style={{
                padding: '20px',
                borderBottom: index < filteredNotifications.length - 1 ? '1px solid #f3f4f6' : 'none',
                backgroundColor: notification.read ? 'white' : '#fef3c7',
                transition: 'background-color 0.2s'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                <span style={{ 
                  fontSize: '1.5rem', 
                  flexShrink: 0,
                  marginTop: '2px'
                }}>
                  {getNotificationIcon(notification.type)}
                </span>
                
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div>
                      <div style={{
                        fontSize: '0.85rem',
                        color: '#6b7280',
                        textTransform: 'uppercase',
                        fontWeight: 600,
                        letterSpacing: '0.5px',
                        marginBottom: '4px'
                      }}>
                        {notification.type.replace('_', ' ')}
                      </div>
                      <div style={{
                        fontSize: '0.85rem',
                        color: '#9ca3af'
                      }}>
                        {formatTimeAgo(notification.createdAt)}
                      </div>
                    </div>
                    {!notification.read && (
                      <span style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        backgroundColor: '#f59e0b',
                        flexShrink: 0
                      }} />
                    )}
                  </div>
                  
                  <p style={{
                    margin: '0 0 12px 0',
                    fontSize: '1rem',
                    color: '#1f2937',
                    lineHeight: 1.5
                  }}>
                    {notification.message}
                  </p>

                  {notification.productName && (
                    <div style={{
                      background: '#f9fafb',
                      padding: '12px',
                      borderRadius: '6px',
                      marginBottom: '12px'
                    }}>
                      <div style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '4px' }}>
                        Product:
                      </div>
                      <div style={{ fontWeight: 500, color: '#1f2937' }}>
                        {notification.productName}
                      </div>
                    </div>
                  )}

                  {notification.reason && (
                    <div style={{
                      background: '#fef2f2',
                      padding: '12px',
                      borderRadius: '6px',
                      marginBottom: '12px'
                    }}>
                      <div style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '4px' }}>
                        Reason:
                      </div>
                      <div style={{ color: '#991b1b', fontWeight: 500 }}>
                        {notification.reason}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: '10px' }}>
                    {!notification.read && (
                      <button
                        onClick={() => markAsRead(notification.id)}
                        style={{
                          padding: '6px 12px',
                          background: '#6b7280',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          fontWeight: 500
                        }}
                      >
                        Mark as Read
                      </button>
                    )}

                    <button
                      onClick={() => window.location.href = '/manage_listings'}
                      style={{
                        padding: '6px 12px',
                        background: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        fontWeight: 500
                      }}
                    >
                      View My Products
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
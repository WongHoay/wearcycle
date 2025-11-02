"use client";
import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Heart, ShoppingBag, User, ExternalLink, Grid, List, Settings, Bell } from 'lucide-react';
import { collection, query, where, getDocs, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../firebaseConfig';

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

const Navbar: React.FC = () => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  // Close dropdown when click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setNotificationOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle notification bell click - only load when clicked
  const handleNotificationClick = () => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user) {
        window.location.href = '/login';
        return;
      }
      
      if (!notificationOpen) {
        loadNotifications(user.uid);
      }
      setNotificationOpen(!notificationOpen);
    } catch (error) {
      console.error('Auth error:', error);
      // If there's any auth error, redirect to login
      window.location.href = '/login';
    }
  };

  const loadNotifications = async (userId: string) => {
    if (loading) return; // Prevent multiple simultaneous loads
    
    setLoading(true);
    try {
      console.log('🔔 Loading notifications for user:', userId);
      
      // Simple query without orderBy to avoid index issues
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId)
      );

      const snapshot = await getDocs(q);
      console.log('🔔 Found notifications:', snapshot.docs.length);
      
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
      setUnreadCount(notificationData.filter(n => !n.read).length);
    } catch (error) {
      console.error('❌ Error loading notifications:', error);
      setNotifications([]);
      setUnreadCount(0);
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
      setUnreadCount(prev => Math.max(0, prev - 1));
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
      setUnreadCount(0);
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

  // Check if user is logged in for badge display only
  const getCurrentUser = () => {
    try {
      const auth = getAuth();
      return auth.currentUser;
    } catch {
      return null;
    }
  };

  const user = getCurrentUser();

  return (
    <nav style={{ backgroundColor: "#c9a26d" }} >
      <div className="max-w-7xl mx-auto flex items-center justify-between border-amber-200 px-4 py-3">
        {/* Logo/Brand */}
        <Link href="/homepage" style={{ display: "flex", alignItems: "center", textDecoration: "none" }}>
          <img
            src="/images/wearcycle_logo.png"
            style={{ height: "80px", marginRight: "8px" }}
          />
        </Link>

        {/* Right side icons */}
        <div className="flex items-center space-x-4" style={{ position: "relative" }}>
          <Link href="/favourite" aria-label="Favorites">
            <button
              className="text-amber-800 hover:text-amber-900 transition-colors p-1"
              style={{ background: "none", border: "none", cursor: "pointer" }}
            >
              <Heart size={20} />
            </button>
          </Link>
          <Link href="/cart" aria-label="Shopping bag">
            <button
              className="text-amber-800 hover:text-amber-900 transition-colors p-1"
              style={{ background: "none", border: "none", cursor: "pointer" }}
            >
              <ShoppingBag size={20} />
            </button>
          </Link>

          {/* Notification Bell */}
          <div style={{ position: "relative" }} ref={notificationRef}>
            <button
              className="text-amber-800 hover:text-amber-900 transition-colors p-1"
              style={{ background: "none", border: "none", cursor: "pointer", position: "relative" }}
              aria-label="Notifications"
              onClick={handleNotificationClick}
            >
              <Bell size={20} />
              {user && unreadCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-2px',
                  right: '-2px',
                  background: '#ef4444',
                  color: 'white',
                  borderRadius: '50%',
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                  minWidth: '18px',
                  height: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  lineHeight: 1
                }}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {user && notificationOpen && (
              <div style={{
                position: "absolute",
                top: "40px",
                right: 0,
                background: "#fff",
                borderRadius: "8px",
                boxShadow: "0 2px 12px rgba(0,0,0,0.10)",
                minWidth: "350px",
                maxHeight: "400px",
                zIndex: 100,
                border: "1px solid #eee",
                overflow: "hidden"
              }}>
                {/* Header */}
                <div style={{
                  padding: '16px',
                  borderBottom: '1px solid #e5e7eb',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>
                    Notifications
                  </h3>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => loadNotifications(user.uid)}
                      disabled={loading}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#6b7280',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        fontSize: '0.8rem',
                        opacity: loading ? 0.5 : 1
                      }}
                    >
                      {loading ? '...' : '🔄'}
                    </button>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#3b82f6',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          fontWeight: 500
                        }}
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                </div>

                {/* Notifications List */}
                <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                  {loading ? (
                    <div style={{
                      padding: '40px 20px',
                      textAlign: 'center',
                      color: '#9ca3af'
                    }}>
                      <div>Loading...</div>
                    </div>
                  ) : notifications.length === 0 ? (
                    <div style={{
                      padding: '40px 20px',
                      textAlign: 'center',
                      color: '#9ca3af'
                    }}>
                      <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📭</div>
                      <p>No notifications yet</p>
                      <button
                        onClick={() => loadNotifications(user.uid)}
                        style={{
                          marginTop: '8px',
                          padding: '6px 12px',
                          background: '#3b82f6',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.8rem'
                        }}
                      >
                        Refresh
                      </button>
                    </div>
                  ) : (
                    notifications.slice(0, 5).map(notification => (
                      <div
                        key={notification.id}
                        onClick={() => !notification.read && markAsRead(notification.id)}
                        style={{
                          padding: '16px',
                          borderBottom: '1px solid #f3f4f6',
                          cursor: notification.read ? 'default' : 'pointer',
                          backgroundColor: notification.read ? 'transparent' : '#fef3c7',
                          transition: 'background-color 0.2s'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                          <span style={{
                            fontSize: '1.2rem',
                            flexShrink: 0,
                            marginTop: '2px'
                          }}>
                            {getNotificationIcon(notification.type)}
                          </span>
                          
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{
                              margin: 0,
                              fontSize: '0.9rem',
                              color: '#1f2937',
                              lineHeight: 1.4,
                              wordBreak: 'break-word'
                            }}>
                              {notification.message}
                            </p>
                            
                            <div style={{
                              marginTop: '8px',
                              fontSize: '0.75rem',
                              color: '#9ca3af',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}>
                              <span>{formatTimeAgo(notification.createdAt)}</span>
                              {!notification.read && (
                                <span style={{
                                  width: '8px',
                                  height: '8px',
                                  borderRadius: '50%',
                                  backgroundColor: '#f59e0b'
                                }} />
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* -Footer- */}
                {notifications.length > 0 && (
                  <div style={{
                    padding: '12px',
                    borderTop: '1px solid #e5e7eb',
                    textAlign: 'center'
                  }}>
                    <Link href="/notifications" style={{ textDecoration: 'none' }}>
                      <button
                        onClick={() => setNotificationOpen(false)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#3b82f6',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          fontWeight: 500
                        }}
                      >
                        View All Notifications
                      </button>
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* User Profile Dropdown */}
          <div style={{ position: "relative" }} ref={dropdownRef}>
            <button
              className="text-amber-800 hover:text-amber-900 transition-colors p-1"
              style={{ background: "none", border: "none", cursor: "pointer" }}
              aria-label="User account"
              onClick={() => setDropdownOpen((open) => !open)}
            >
              <User size={20} />
            </button>
            {dropdownOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "40px",
                  right: 0,
                  background: "#fff",
                  borderRadius: "8px",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.10)",
                  minWidth: "220px",
                  zIndex: 100,
                  padding: "12px 0",
                  border: "1px solid #eee"
                }}
              >
                <Link href="/user_profile" style={{ textDecoration: "none", color: "#222" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 20px", cursor: "pointer" }}>
                    <User size={18} /> Profile
                  </div>
                </Link>
                <div style={{ padding: "4px 20px", fontWeight: "bold", color: "#888", fontSize: "13px" }}>Buying</div>
                <Link href="/my_purchases" style={{ textDecoration: "none", color: "#222" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 20px", cursor: "pointer" }}>
                    <ShoppingBag size={18} /> My purchases
                  </div>
                </Link>
                <Link href="/favourite" style={{ textDecoration: "none", color: "#222" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 20px", cursor: "pointer" }}>
                    <Heart size={18} /> Likes
                  </div>
                </Link>
                <div style={{ padding: "4px 20px", fontWeight: "bold", color: "#888", fontSize: "13px" }}>Selling</div>
                <Link href="/manage_listings" style={{ textDecoration: "none", color: "#222" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 20px", cursor: "pointer" }}>
                    <Grid size={18} /> Manage listings
                  </div>
                </Link>
                <Link href="/sales" style={{ textDecoration: "none", color: "#222" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 20px", cursor: "pointer" }}>
                    <List size={18} /> My sales
                  </div>
                </Link>
              </div>
            )}
          </div>
          <Link href="/login" aria-label="Log Out">
            <button
              className="text-amber-800 hover:text-amber-900 transition-colors p-1"
              style={{ background: "none", border: "none", cursor: "pointer" }}
            >
              <ExternalLink size={20} />
            </button>
          </Link>
          <Link href="/sell_form" aria-label="Sell">
            <button
              style={{
                background: "#222",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                padding: "8px 18px",
                fontWeight: "500",
                fontSize: "16px",
                cursor: "pointer"
              }}
            >
              Sell
            </button>
          </Link>
          <Link href="/bid_form" aria-label="Bid">
            <button
              style={{
                background: "#fff",
                color: "#222",
                border: "2px solid #222",
                borderRadius: "6px",
                padding: "8px 18px",
                fontWeight: "500",
                fontSize: "16px",
                cursor: "pointer",
                marginLeft: "8px"
              }}
            >
              Bid
            </button>
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
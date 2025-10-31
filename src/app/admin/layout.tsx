"use client";
import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getAuth } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import {
  LayoutDashboard,
  Users,
  ShoppingBag,
  Store,
  DollarSign,
  Folder,
  LogOut,
  Loader2,
  MessageSquare
} from 'lucide-react';

const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Allow access to login page without authentication
  const isLoginPage = pathname === '/admin/login' || pathname === '/admin';

  useEffect(() => {
    if (!isLoginPage) {
      checkAdmin();
    } else {
      setLoading(false);
    }
  }, [isLoginPage]);

  const checkAdmin = async () => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;

      if (!user) {
        router.push('/admin/login');
        return;
      }

      // Check if user exists in admins collection (not users collection)
      const adminDoc = await getDoc(doc(db, 'admins', user.uid));
      
      if (!adminDoc.exists()) {
        alert('Access denied! Admin only.');
        router.push('/admin/login');
        return;
      }

      setIsAdmin(true);
    } catch (error) {
      console.error('Error checking admin:', error);
      router.push('/admin/login');
    } finally {
      setLoading(false);
    }
  };

  const menuItems = [
    { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Users', path: '/admin/user', icon: Users },
    { label: 'Orders', path: '/admin/order', icon: ShoppingBag },
    { label: 'Products', path: '/admin/product', icon: Store },
    { label: 'Appeals', path: '/admin/appeals', icon: MessageSquare },
    { label: 'Payouts', path: '/admin/payout', icon: DollarSign },
    { label: 'Categories', path: '/admin/category', icon: Folder },
  ];

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '1.5rem',
        color: '#666',
        flexDirection: 'column',
        gap: 16
      }}>
        <Loader2
          style={{
            fontSize: '2rem',
            animation: 'spin 1s linear infinite'
          }}
          className="animate-spin"
        />
        <span>Loading...</span>
        <style jsx>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // If it's the login page, render children without the sidebar
  if (isLoginPage) {
    return <>{children}</>;
  }

  // If not admin and not login page, don't render anything (redirect will happen)
  if (!isAdmin) {
    return null;
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      {/* Sidebar */}
      <div style={{
        width: 250,
        background: '#050505',
        color: 'white',
        padding: '20px 0',
        position: 'fixed',
        height: '100vh',
        overflowY: 'auto'
      }}>
        <div style={{
          padding: '0 20px',
          marginBottom: 30,
          borderBottom: '1px solid #374151',
          paddingBottom: 20
        }}>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            margin: 0,
            color: '#c9a26d'
          }}>
            Admin Panel
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#9ca3af', margin: '5px 0 0 0' }}>
            Wear Cycle
          </p>
        </div>

        <nav>
          {menuItems.map(item => {
            const IconComponent = item.icon;
            return (
              <div
                key={item.path}
                onClick={() => router.push(item.path)}
                style={{
                  padding: '12px 20px',
                  cursor: 'pointer',
                  background: pathname === item.path ? '#374151' : 'transparent',
                  borderLeft: pathname === item.path ? '4px solid #c9a26d' : '4px solid transparent',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12
                }}
                onMouseEnter={(e) => {
                  if (pathname !== item.path) {
                    e.currentTarget.style.background = '#374151';
                  }
                }}
                onMouseLeave={(e) => {
                  if (pathname !== item.path) {
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                <IconComponent
                  size={22}
                  color={pathname === item.path ? '#c9a26d' : '#d1d5db'}
                  strokeWidth={2}
                />
                <span style={{
                  fontSize: '0.95rem',
                  fontWeight: pathname === item.path ? 600 : 400
                }}>
                  {item.label}
                </span>
              </div>
            );
          })}
        </nav>

        <div style={{
          position: 'absolute',
          bottom: 20,
          left: 20,
          right: 20,
          padding: '5px',
          background: '#374151',
          borderRadius: 8
        }}>
          <button
            onClick={() => {
              getAuth().signOut();
              router.push('/admin/login');
            }}
            style={{
              width: '100%',
              padding: '10px',
              background: '#c9a26d',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#523E23';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#c9a26d';
            }}
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{
        marginLeft: 250,
        flex: 1,
        background: '#f3f4f6',
        minHeight: '100vh'
      }}>
        {children}
      </div>
    </div>
  );
};

export default AdminLayout;
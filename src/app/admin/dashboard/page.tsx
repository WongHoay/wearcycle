"use client";
import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { auth } from '../../../firebaseConfig';
import { useRouter } from 'next/navigation';

interface Stats {
  totalUsers: number;
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
}

const AdminDashboard = () => {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalProducts: 0,
    totalOrders: 0,
    totalRevenue: 0
  });
  const [recentActivity, setRecentActivity] = useState<string[]>([]);
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
      // Do NOT redirect here; just allow the dashboard to render
    };

    checkAdminPrivileges();
    fetchStats();
  }, []);

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
        activities.push(`New order #${doc.id} - ${date}`);
      });
      
      setRecentActivity(activities);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Loading dashboard...</div>;
  }

  if (error) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'red' }}>{error}</div>;
  }

  return (
    <div style={{ padding: 30 }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: 30, color: '#1f2937' }}>
        Dashboard
      </h1>

      {/* Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 20,
        marginBottom: 40
      }}>
        <div style={{
          background: 'white',
          padding: 25,
          borderRadius: 12,
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>👥</div>
          <div style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: 4 }}>Total Users</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#1f2937' }}>
            {stats.totalUsers}
          </div>
        </div>

        <div style={{
          background: 'white',
          padding: 25,
          borderRadius: 12,
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>🛍️</div>
          <div style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: 4 }}>Total Products</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#1f2937' }}>
            {stats.totalProducts}
          </div>
        </div>

        <div style={{
          background: 'white',
          padding: 25,
          borderRadius: 12,
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>📦</div>
          <div style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: 4 }}>Total Orders</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#1f2937' }}>
            {stats.totalOrders}
          </div>
        </div>

        <div style={{
          background: 'white',
          padding: 25,
          borderRadius: 12,
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>💰</div>
          <div style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: 4 }}>Total Revenue</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#10b981' }}>
            RM {stats.totalRevenue.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div style={{
        background: 'white',
        padding: 25,
        borderRadius: 12,
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: 20, color: '#1f2937' }}>
          Recent Activity
        </h2>
        {recentActivity.length === 0 ? (
          <div style={{ color: '#9ca3af', padding: '20px 0' }}>No recent activity</div>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {recentActivity.map((activity, index) => (
              <li key={index} style={{
                padding: '12px 0',
                borderBottom: index < recentActivity.length - 1 ? '1px solid #e5e7eb' : 'none',
                color: '#374151'
              }}>
                • {activity}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;





















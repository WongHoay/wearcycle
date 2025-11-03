"use client";
import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy, limit, doc, getDoc, where, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { auth } from '../../../firebaseConfig';
import { useRouter } from 'next/navigation';
import { Bell, MessageSquare, AlertTriangle, Users, Package, ShoppingCart, DollarSign, TrendingUp, BarChart3 } from 'lucide-react';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer
} from 'recharts';

interface Stats {
  totalUsers: number;
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
}

interface AdminNotification {
  id: string;
  type: 'product_appeal' | 'product_flagged' | 'user_report' | 'system';
  message: string;
  createdAt: any;
  read: boolean;
}

interface ChartData {
  month: string;
  revenue: number;
  orders: number;
  users: number;
  formattedMonth: string;
}

interface OrderStatusData {
  name: string;
  value: number;
  color: string;
  [key: string]: any;
}

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalProducts: 0,
    totalOrders: 0,
    totalRevenue: 0
  });
  const [recentActivity, setRecentActivity] = useState<string[]>([]);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingAppealsCount, setPendingAppealsCount] = useState<number>(0);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [orderStatusData, setOrderStatusData] = useState<OrderStatusData[]>([]);
  const [timeRange, setTimeRange] = useState<'3months' | '6months' | '1year'>('6months');
  const [rejectedOrders, setRejectedOrders] = useState<{ id: string; amount: number; user: string; reason: string }[]>([]);
  const router = useRouter();

  const convertToDate = (timestamp: any): Date | null => {
    try {
      if (!timestamp) return null;
      if (timestamp instanceof Date) return timestamp;
      if (timestamp && typeof timestamp.toDate === 'function') return timestamp.toDate();
      if (timestamp && timestamp.seconds) return new Date(timestamp.seconds * 1000);
      const date = new Date(timestamp);
      return isNaN(date.getTime()) ? null : date;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    const checkAdminPrivileges = async (): Promise<void> => {
      const user = auth.currentUser;
      if (!user) {
        setError('You must be logged in as an admin to access this page.');
        return;
      }
      try {
        const adminDoc = await getDoc(doc(db, 'admins', user.uid));
        if (!adminDoc.exists()) {
          await auth.signOut();
          setError('Access denied. Admin privileges required.');
          return;
        }
      } catch {
        setError('Error checking admin privileges');
        return;
      }
    };

    checkAdminPrivileges();
    fetchStats();
    fetchNotifications();
    fetchPendingAppeals();
    fetchChartData();
    fetchRefundedOrders();
    const unsubscribe = setupNotificationListener();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [timeRange]);

  const setupNotificationListener = () => {
    try {
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
          if (!notification.read) unreadCounter++;
        });
        setNotifications(notificationsData);
        setUnreadCount(unreadCounter);
      });
      return unsubscribe;
    } catch {
      return undefined;
    }
  };

  const fetchNotifications = async (): Promise<void> => {
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
        if (!notification.read) unreadCounter++;
      });
      setNotifications(notificationsData);
      setUnreadCount(unreadCounter);
    } catch {}
  };

  const fetchStats = async (): Promise<void> => {
    try {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const totalUsers = usersSnapshot.size;
      const productsSnapshot = await getDocs(collection(db, 'products'));
      const totalProducts = productsSnapshot.size;
      const ordersSnapshot = await getDocs(collection(db, 'orders'));
      const totalOrders = ordersSnapshot.size;
      let revenue = 0;
      ordersSnapshot.forEach(doc => {
        const orderData = doc.data();
        if (orderData.status === "completed" && orderData.amount) {
          revenue += orderData.amount * 0.1;
        }
      });
      setStats({
        totalUsers,
        totalProducts,
        totalOrders,
        totalRevenue: revenue
      });

      // Recent activity: orders + appeals
      const recentOrdersQuery = query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(10));
      const recentOrdersSnapshot = await getDocs(recentOrdersQuery);
      const recentAppealsQuery = query(collection(db, 'appeals'), orderBy('createdAt', 'desc'), limit(10));
      const recentAppealsSnapshot = await getDocs(recentAppealsQuery);
      const activities: string[] = [];
      recentOrdersSnapshot.forEach(doc => {
        const data = doc.data();
        const createdAt = convertToDate(data.createdAt);
        const date = createdAt?.toLocaleDateString() || 'Recently';
        activities.push(`New order #${doc.id.substring(0, 8)} - ${date}`);
      });
      recentAppealsSnapshot.forEach(doc => {
        const data = doc.data();
        const createdAt = convertToDate(data.createdAt);
        const date = createdAt?.toLocaleDateString() || 'Recently';
        activities.push(`New appeal #${doc.id.substring(0, 8)} - ${date}`);
      });
      activities.sort((a, b) => {
        const getDate = (str: string) => {
          const match = str.match(/- (\d{1,2}\/\d{1,2}\/\d{2,4})$/);
          return match ? new Date(match[1]).getTime() : 0;
        };
        return getDate(b) - getDate(a);
      });
      setRecentActivity(activities.slice(0, 10));
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingAppeals = async (): Promise<void> => {
    try {
      const q = query(
        collection(db, 'appeals'),
        where('status', '==', 'pending')
      );
      const snapshot = await getDocs(q);
      setPendingAppealsCount(snapshot.size);
    } catch {}
  };

  const fetchChartData = async (): Promise<void> => {
    try {
      const monthsToShow = timeRange === '3months' ? 3 : timeRange === '6months' ? 6 : 12;
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - monthsToShow);
      const ordersSnapshot = await getDocs(collection(db, 'orders'));
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const monthlyData: { [key: string]: { revenue: number; orders: number; users: number } } = {};
      for (let i = monthsToShow - 1; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthlyData[monthKey] = { revenue: 0, orders: 0, users: 0 };
      }
      // Process orders
      const orderStatusCount = { pending: 0, completed: 0, cancelled: 0, processing: 0, refunded: 0 };
      ordersSnapshot.forEach(doc => {
        const orderData = doc.data();
        const createdAt = convertToDate(orderData.createdAt);
        if (createdAt && createdAt >= startDate) {
          const monthKey = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, '0')}`;
          if (monthlyData[monthKey]) {
            monthlyData[monthKey].orders += 1;
            if (orderData.status === 'completed' && orderData.amount) {
              monthlyData[monthKey].revenue += orderData.amount * 0.1;
            }
          }
        }
        // Count all order statuses
        let status = orderData.status;
        if (status && orderStatusCount.hasOwnProperty(status)) {
          orderStatusCount[status as keyof typeof orderStatusCount]++;
        }
      });
      // Process users
      usersSnapshot.forEach(doc => {
        const userData = doc.data();
        const createdAt = convertToDate(userData.createdAt);
        if (createdAt && createdAt >= startDate) {
          const monthKey = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, '0')}`;
          if (monthlyData[monthKey]) {
            monthlyData[monthKey].users += 1;
          }
        }
      });
      // Convert to chart format
      const chartDataArray: ChartData[] = Object.entries(monthlyData).map(([monthKey, data]) => {
        const [year, month] = monthKey.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1);
        return {
          month: monthKey,
          formattedMonth: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
          revenue: Math.round(data.revenue * 100) / 100,
          orders: data.orders,
          users: data.users
        };
      });
      // Create order status data
      const statusColors = {
        completed: '#10b981',
        pending: '#f59e0b',
        processing: '#3b82f6',
        cancelled: '#ef4444',
        refunded: '#b91c1c'
      };
      const orderStatusArray: OrderStatusData[] = Object.entries(orderStatusCount)
        .filter(([_, value]) => value > 0)
        .map(([status, count]) => ({
          name: status.charAt(0).toUpperCase() + status.slice(1),
          value: count,
          color: statusColors[status as keyof typeof statusColors]
        }));
      setChartData(chartDataArray);
      setOrderStatusData(orderStatusArray);
    } catch {
    }
  };

  const fetchRefundedOrders = async (): Promise<void> => {
    try {
      const q = query(
        collection(db, 'orders'),
        where('status', '==', 'refunded'),
        where('rejectionReason', '==', 'wrong_amount')
      );
      const snapshot = await getDocs(q);
      const orders: { id: string; amount: number; user: string; reason: string }[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        orders.push({
          id: doc.id,
          amount: data.amount,
          user: data.userId || 'Unknown',
          reason: data.rejectionReason || 'N/A'
        });
      });
      setRejectedOrders(orders);
    } catch {}
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          backgroundColor: 'white',
          padding: '12px',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}>
          <p style={{ margin: '0 0 8px 0', fontWeight: 600, color: '#1f2937' }}>{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ margin: '4px 0', color: entry.color, fontSize: '0.9rem' }}>
              {entry.dataKey === 'revenue' ? `Revenue: RM ${entry.value?.toFixed(2)}` :
               entry.dataKey === 'orders' ? `Orders: ${entry.value}` :
               `New Users: ${entry.value}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
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
                justifyContent: 'center'
              }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
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
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'BLACK' }}>
            RM {stats.totalRevenue.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
          </div>
        </div>

        {/* Pending Actions Card */}
        <div style={{
          background: 'white',
          padding: 25,
          borderRadius: 12,
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          border: pendingAppealsCount > 0 ? '2px solid #f59e0b' : '1px solid #e5e7eb',
          transition: 'border-color 0.3s'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <Bell size={24} style={{ color: pendingAppealsCount > 0 ? '#f59e0b' : '#6b7280' }} />
            <div style={{ fontSize: '0.9rem', color: '#6b7280', fontWeight: 500 }}>Pending Actions</div>
          </div>
          <div style={{
            fontSize: '2rem',
            fontWeight: 700,
            color: pendingAppealsCount > 0 ? '#f59e0b' : '#1f2937',
            marginBottom: pendingAppealsCount > 0 ? 12 : 0
          }}>
            {pendingAppealsCount}
          </div>
          {pendingAppealsCount > 0 && (
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
            >
              Review Now
            </button>
          )}
        </div>
      </div>

      {/* Time Range Selector */}
      <div style={{ marginBottom: 30 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <TrendingUp size={20} style={{ color: '#3b82f6' }} />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0, color: '#1f2937' }}>
              Analytics Overview
            </h2>
          </div>
          <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
            {(['3months', '6months', '1year'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                style={{
                  padding: '8px 16px',
                  background: timeRange === range ? '#c9a26d' : 'white',
                  color: timeRange === range ? 'white' : '#6b7280',
                  border: '1px solid #d1d5db',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  transition: 'all 0.2s'
                }}
              >
                {range === '3months' ? '3 Months' : range === '6months' ? '6 Months' : '1 Year'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))',
        gap: 30,
        marginBottom: 40
      }}>
        {/* Revenue & Orders Chart */}
        <div style={{
          background: 'white',
          padding: 25,
          borderRadius: 12,
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <BarChart3 size={20} style={{ color: '#10b981' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0, color: '#1f2937' }}>
              Revenue & Orders Trend
            </h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="formattedMonth" stroke="#6b7280" fontSize={12} />
              <YAxis yAxisId="left" stroke="#10b981" fontSize={12} />
              <YAxis yAxisId="right" orientation="right" stroke="#3b82f6" fontSize={12} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="revenue"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
                name="Revenue (RM)"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="orders"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
                name="Orders"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* User Growth Chart */}
        <div style={{
          background: 'white',
          padding: 25,
          borderRadius: 12,
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <Users size={20} style={{ color: '#3b82f6' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0, color: '#1f2937' }}>
              New User Registrations
            </h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="formattedMonth" stroke="#6b7280" fontSize={12} />
              <YAxis stroke="#6b7280" fontSize={12} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="users" fill="#3b82f6" radius={[4, 4, 0, 0]} name="New Users" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Order Status Distribution */}
      {orderStatusData.length > 0 && (
        <div style={{
          background: 'white',
          padding: 25,
          borderRadius: 12,
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          border: '1px solid #e5e7eb',
          marginBottom: 40
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <ShoppingCart size={20} style={{ color: '#f59e0b' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0, color: '#1f2937' }}>
              Order Status Distribution
            </h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={orderStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={120}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {orderStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name) => [`${value} orders`, name]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

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
            {recentActivity.map((activity, index) => {
              const isOrder = activity.startsWith("New order");
              const isAppeal = activity.startsWith("New appeal");
              return (
                <li key={index} style={{
                  padding: '12px 0',
                  borderBottom: index < recentActivity.length - 1 ? '1px solid #e5e7eb' : 'none',
                  color: '#374151',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}>
                  <div style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: isOrder ? '#10b981' : isAppeal ? '#ef4444' : '#d1d5db'
                  }} />
                  {activity}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Refunded Orders Section */}
      {rejectedOrders.length > 0 && (
        <div style={{
          background: 'white',  
          padding: 25,
          borderRadius: 12,
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          border: '1px solid #e5e7eb',
          marginBottom: 40
        }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 20, color: '#ef4444' }}>
            Refunded Orders
          </h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ padding: '12px', textAlign: 'left' }}>Order ID</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>User</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Amount</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Reason</th>
              </tr>
            </thead>
            <tbody>
              {rejectedOrders.map(order => (
                <tr key={order.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '12px' }}>{order.id}</td>
                  <td style={{ padding: '12px' }}>{order.user}</td>
                  <td style={{ padding: '12px' }}>RM {order.amount}</td>
                  <td style={{ padding: '12px', color: '#ef4444', fontWeight: 600 }}>{order.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default AdminDashboard;
"use client";
import React, { useEffect, useState } from 'react';
import { collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { Eye, UserX, UserCheck, AlertTriangle, Search } from 'lucide-react';

interface User {
  id: string;
  username?: string;
  email?: string;
  status?: string;
  createdAt?: any;
  lastLogin?: any;
  totalOrders?: number;
  totalListings?: number;
}

const AdminUsersPage = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userStats, setUserStats] = useState({ active: 0, suspended: 0, banned: 0 });

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    let filtered = users.filter(user =>
      user.username?.toLowerCase().includes(search.toLowerCase()) ||
      user.email?.toLowerCase().includes(search.toLowerCase())
    );

    if (statusFilter !== 'all') {
      filtered = filtered.filter(user => {
        const userStatus = user.status || 'active';
        return userStatus === statusFilter;
      });
    }

    setFilteredUsers(filtered);
  }, [search, statusFilter, users]);

  const fetchUsers = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'users'));
      const usersData = await Promise.all(
        snapshot.docs.map(async (userDoc) => {
          const userData = userDoc.data() as User;
          
          // Get user's order count
          try {
            const ordersSnapshot = await getDocs(
              query(collection(db, 'orders'), where('userId', '==', userDoc.id))
            );
            userData.totalOrders = ordersSnapshot.size;
          } catch (error) {
            userData.totalOrders = 0;
          }

          // Get user's listings count
          try {
            const productsSnapshot = await getDocs(
              query(collection(db, 'products'), where('sellerId', '==', userDoc.id))
            );
            userData.totalListings = productsSnapshot.size;
          } catch (error) {
            userData.totalListings = 0;
          }

          return {
            ...userData,
            id: userDoc.id
          };
        })
      );

      // Calculate stats-
      const stats = usersData.reduce((acc, user) => {
        const userStatus = user.status || 'active';
        
        if (userStatus === 'active') {
          acc.active++;
        } else if (userStatus === 'suspended') {
          acc.suspended++;
        } else if (userStatus === 'banned') {
          acc.banned++;
        }
        
        return acc;
      }, { active: 0, suspended: 0, banned: 0 });

      setUsers(usersData);
      setFilteredUsers(usersData);
      setUserStats(stats);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (userId: string, status: 'active' | 'suspended' | 'banned') => {
    const actions = {
      active: 'reactivate',
      suspended: 'suspend',
      banned: 'ban'
    };
    
    if (!confirm(`Are you sure you want to ${actions[status]} this user?`)) return;

    try {
      await updateDoc(doc(db, 'users', userId), {
        status: status,
        statusUpdatedAt: new Date(),
        statusUpdatedBy: 'admin'
      });
      
      alert(`User ${actions[status]}ed successfully`);
      fetchUsers();
      setSelectedUser(null);
    } catch (error) {
      console.error('Error updating user status:', error);
      alert('Error updating user status');
    }
  };

  const getStatusColor = (status?: string) => {
    const userStatus = status || 'active';
    switch (userStatus) {
      case 'active': return { background: '#d1fae5', color: '#065f46' };
      case 'suspended': return { background: '#fef3c7', color: '#92400e' };
      case 'banned': return { background: '#fee2e2', color: '#991b1b' };
      default: return { background: '#d1fae5', color: '#065f46' };
    }
  };

  const formatDate = (date: any) => {
    if (!date) return 'Never';
    try {
      const d = date.toDate ? date.toDate() : new Date(date);
      return d.toLocaleDateString();
    } catch {
      return 'Unknown';
    }
  };

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Loading users...</div>;
  }

  return (
    <div style={{ padding: 30 }}>
      {/* Header */}
      <div style={{ marginBottom: 30 }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: 10, color: '#1f2937' }}>
          User Management
        </h1>
        <p style={{ color: '#6b7280' }}>Manage user accounts and permissions</p>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginBottom: 30 }}>
        <div style={{ background: 'white', padding: 20, borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ padding: 8, background: '#d1fae5', borderRadius: 8 }}>
              <UserCheck size={20} style={{ color: '#065f46' }} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#6b7280' }}>Active Users</p>
              <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: '#1f2937' }}>{userStats.active}</p>
            </div>
          </div>
        </div>
        
        <div style={{ background: 'white', padding: 20, borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ padding: 8, background: '#fef3c7', borderRadius: 8 }}>
              <AlertTriangle size={20} style={{ color: '#92400e' }} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#6b7280' }}>Suspended</p>
              <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: '#1f2937' }}>{userStats.suspended}</p>
            </div>
          </div>
        </div>
        
        <div style={{ background: 'white', padding: 20, borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ padding: 8, background: '#fee2e2', borderRadius: 8 }}>
              <UserX size={20} style={{ color: '#991b1b' }} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#6b7280' }}>Banned</p>
              <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: '#1f2937' }}>{userStats.banned}</p>
            </div>
          </div>
        </div>
        
        <div style={{ background: 'white', padding: 20, borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ padding: 8, background: '#dbeafe', borderRadius: 8 }}>
              <Search size={20} style={{ color: '#1e40af' }} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#6b7280' }}>Total Users</p>
              <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: '#1f2937' }}>{users.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 15, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 250 }}>
          <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }} />
          <input
            type="text"
            placeholder="Search by username or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              paddingLeft: 40,
              paddingRight: 16,
              paddingTop: 12,
              paddingBottom: 12,
              border: '1px solid #d1d5db',
              borderRadius: 8,
              fontSize: '0.95rem'
            }}
          />
        </div>
        
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
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="banned">Banned</option>
        </select>
      </div>

      {/* Users Table */}
      <div style={{ background: 'white', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>User</th>
              <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Activity</th>
              <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Status</th>
              <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Member Since</th>
              <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
                  No users found
                </td>
              </tr>
            ) : (
              filteredUsers.map(user => {
                const userStatus = user.status || 'active';
                return (
                  <tr key={user.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '16px' }}>
                      <div>
                        <div style={{ fontWeight: 600, color: '#1f2937' }}>
                          {user.username || 'No username'}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                          {user.email}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                        <div>{user.totalOrders || 0} orders</div>
                        <div>{user.totalListings || 0} listings</div>
                      </div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <span style={{
                        padding: '4px 12px',
                        borderRadius: 12,
                        fontSize: '0.85rem',
                        fontWeight: 500,
                        textTransform: 'capitalize',
                        ...getStatusColor(userStatus)
                      }}>
                        {userStatus}
                      </span>
                    </td>
                    <td style={{ padding: '16px', color: '#6b7280', fontSize: '0.9rem' }}>
                      {formatDate(user.createdAt)}
                    </td>
                    <td style={{ padding: '16px' }}>
                      <button
                        onClick={() => setSelectedUser(user)}
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
                        View
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* User Details Modal - Simplified */}
      {selectedUser && (
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
          onClick={() => setSelectedUser(null)}
        >
          <div
            style={{
              background: 'white',
              padding: 30,
              borderRadius: 12,
              maxWidth: 500,
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 20, color: '#1f2937' }}>
              User Details
            </h2>
            
            {/* User Info */}
            <div style={{ marginBottom: 30, padding: 20, background: '#f9fafb', borderRadius: 8 }}>
              <div style={{ marginBottom: 15 }}>
                <strong style={{ color: '#6b7280' }}>Username:</strong>
                <div style={{ marginTop: 5, color: '#1f2937' }}>{selectedUser.username || 'No username'}</div>
              </div>
              <div style={{ marginBottom: 15 }}>
                <strong style={{ color: '#6b7280' }}>Email:</strong>
                <div style={{ marginTop: 5, color: '#1f2937' }}>{selectedUser.email}</div>
              </div>
              <div style={{ marginBottom: 15 }}>
                <strong style={{ color: '#6b7280' }}>Activity:</strong>
                <div style={{ marginTop: 5, color: '#1f2937' }}>
                  {selectedUser.totalOrders || 0} orders • {selectedUser.totalListings || 0} listings
                </div>
              </div>
              <div style={{ marginBottom: 15 }}>
                <strong style={{ color: '#6b7280' }}>Member Since:</strong>
                <div style={{ marginTop: 5, color: '#1f2937' }}>
                  {formatDate(selectedUser.createdAt)}
                </div>
              </div>
              <div>
                <strong style={{ color: '#6b7280' }}>User ID:</strong>
                <div style={{ marginTop: 5, color: '#1f2937', fontSize: '0.85rem', wordBreak: 'break-all' }}>
                  {selectedUser.id}
                </div>
              </div>
            </div>

            {/* Account Status - Simplified */}
            <div style={{ marginBottom: 30 }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 15, color: '#1f2937' }}>
                Account Status
              </h3>
              
              <div style={{ 
                padding: 20, 
                border: '1px solid #e5e7eb', 
                borderRadius: 8,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontWeight: 600, color: '#1f2937', marginBottom: 4 }}>
                    Current Status
                  </div>
                  <span style={{
                    padding: '6px 12px',
                    borderRadius: 12,
                    fontSize: '0.9rem',
                    fontWeight: 500,
                    textTransform: 'capitalize',
                    ...getStatusColor(selectedUser.status)
                  }}>
                    {selectedUser.status || 'Active'}
                  </span>
                </div>

                {/* Action Buttons - Only show relevant ones */}
                <div style={{ display: 'flex', gap: 8 }}>
                  {(!selectedUser.status || selectedUser.status === 'active') && (
                    <>
                      <button
                        onClick={() => handleStatusUpdate(selectedUser.id, 'suspended')}
                        style={{
                          padding: '8px 16px',
                          background: '#f59e0b',
                          color: 'white',
                          border: 'none',
                          borderRadius: 6,
                          cursor: 'pointer',
                          fontSize: '0.9rem',
                          fontWeight: 500
                        }}
                      >
                        Suspend
                      </button>
                      <button
                        onClick={() => handleStatusUpdate(selectedUser.id, 'banned')}
                        style={{
                          padding: '8px 16px',
                          background: '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: 6,
                          cursor: 'pointer',
                          fontSize: '0.9rem',
                          fontWeight: 500
                        }}
                      >
                        Ban
                      </button>
                    </>
                  )}
                  
                  {(selectedUser.status === 'suspended' || selectedUser.status === 'banned') && (
                    <button
                      onClick={() => handleStatusUpdate(selectedUser.id, 'active')}
                      style={{
                        padding: '8px 16px',
                        background: '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: 6,
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        fontWeight: 500
                      }}
                    >
                      Reactivate
                    </button>
                  )}
                </div>
              </div>

              {/* Status Descriptions */}
              <div style={{ marginTop: 15, fontSize: '0.85rem', color: '#6b7280' }}>
                <div style={{ marginBottom: 8 }}>
                  <strong>Active:</strong> User can buy and sell normally
                </div>
                <div style={{ marginBottom: 8 }}>
                  <strong>Suspended:</strong> User can view but cannot buy or sell
                </div>
                <div>
                  <strong>Banned:</strong> User cannot access the platform
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedUser(null)}
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
    </div>
  );
};

export default AdminUsersPage;
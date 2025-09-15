"use client";
import React, { useState, useEffect } from 'react';
import { User, ListingItem } from '../../types/user'; // <-- fix import path
import EditProfileView from '../../components/edit_profile_user'; // <-- fix import path
import Navbar from '../../components/navbar';
import Footer from '../../components/footer';
import { getAuth } from "firebase/auth";
import { getFirestore, doc, getDoc, collection, getDocs, updateDoc } from "firebase/firestore";
import { db } from "../../firebaseConfig"; // Adjust path if needed

interface UserProfileViewProps {
  user: User;
  listings: ListingItem[];
  onUserUpdate?: (updatedUser: User) => void;
}

const UserProfileView: React.FC<UserProfileViewProps> = ({
  user = {
    id: '',
    username: '',
    displayName: '',
    email: '',
    marketplace: '',
    region: '',
    location: '',
    bio: '',
    profilePhotoUrl: '',
    joinDate: '',
    reviewCount: 0,
    rating: 0,
    totalEarnings: 0,
    isVerified: false,
    phoneNumber: '',
    preferences: {},
    createdAt: ''
  },
  listings = [],
  onUserUpdate
}) => {
  const [activeTab, setActiveTab] = useState<'listings' | 'insights' | 'reviews' | 'coins' | 'balance' | 'caroubiz'>('listings');
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [firebaseListings, setFirebaseListings] = useState<ListingItem[]>([]);
  const [loading, setLoading] = useState(true);

  const handleEditProfile = () => {
    setShowEditProfile(true);
  };

  const handleSaveProfile = async (updatedUser: Partial<User>) => {
    const currentUser = getAuth().currentUser;
    if (!currentUser || !firebaseUser) return;

    // Find only changed fields
    const changedFields: Partial<User> = {};
    Object.keys(updatedUser).forEach((key) => {
      // @ts-ignore
      if (updatedUser[key] !== firebaseUser[key]) {
        // @ts-ignore
        changedFields[key] = updatedUser[key];
      }
    });

    // If no changes, just close the edit view
    if (Object.keys(changedFields).length === 0) {
      setShowEditProfile(false);
      return;
    }

    try {
      await updateDoc(doc(db, "users", currentUser.uid), changedFields);
      // Refetch user data after update
      const docSnap = await getDoc(doc(db, "users", currentUser.uid));
      if (docSnap.exists()) {
        setFirebaseUser(docSnap.data() as User);
      }
      setShowEditProfile(false);
    } catch (err) {
      // handle error
    }
  };

  const filteredListings = listings.filter(item =>
    item.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTimeSinceJoined = (joinDate: string) => {
    const now = new Date();
    const joined = new Date(joinDate);
    const diffTime = Math.abs(now.getTime() - joined.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const years = Math.floor(diffDays / 365);
    const remainingDays = diffDays % 365;
    return `${years}y ${remainingDays}d`;
  };

  const getItemEmoji = (category: string): string => {
    const emojiMap: { [key: string]: string } = {
      'tops': '👕',
      'bottoms': '👖',
      'dresses': '👗',
      'outerwear': '🧥',
      'shoes': '👠',
      'accessories': '👜',
    };
    return emojiMap[category] || '👔';
  };

  useEffect(() => {
    const fetchUserData = async () => {
      setLoading(true);
      const currentUser = getAuth().currentUser;
      if (!currentUser) {
        setLoading(false);
        return;
      }
      // Fetch user profile
      const userDoc = await getDoc(doc(db, "users", currentUser.uid));
      if (userDoc.exists()) {
        setFirebaseUser(userDoc.data() as User);
      }
      // Fetch user listings
      const listingsSnapshot = await getDocs(collection(db, "users", currentUser.uid, "listings"));
      const listingsArr: ListingItem[] = [];
      listingsSnapshot.forEach(doc => {
        listingsArr.push({ id: doc.id, ...doc.data() } as ListingItem);
      });
      setFirebaseListings(listingsArr);
      setLoading(false);
    };
    fetchUserData();
  }, []);

  if (showEditProfile) {
    return (
      <>
        <Navbar />
        <EditProfileView
          user={firebaseUser || user}
          onSave={handleSaveProfile}
          onBack={() => setShowEditProfile(false)}
        />
        <Footer />
      </>
    );
  }

  // Minimal styles object for demonstration
  const styles: any = {
    userProfileView: { minHeight: "100vh", background: "#f5f5f5", display: "flex", flexDirection: "column" },
    profileHeaderBg: {},
    container: { maxWidth: 1600, margin: "0 auto", padding: 120, flex: 1 }, // <-- larger container
    profileCard: {
      background: "#fff",
      borderRadius: 16,
      padding: 120,                // <-- much larger padding
      boxShadow: "0 2px 16px #eee",
      marginBottom: 48,
      maxWidth: 1600,              // <-- much wider card
      width: "100%",
      marginLeft: "auto",
      marginRight: "auto"
    },
    profileInfoSection: { display: "flex", alignItems: "center", marginBottom: 16 },
    profileAvatar: { marginRight: 24 },
    avatarImage: { width: 80, height: 80, borderRadius: "50%", objectFit: "cover" },
    avatarPlaceholder: { width: 80, height: 80, borderRadius: "50%", background: "#eee", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32 },
    profileDetails: {},
    profileUsername: { fontWeight: "bold", fontSize: 20 },
    profileDetailsLink: { background: "none", border: "none", color: "#2196f3", cursor: "pointer", fontSize: 14, marginTop: 4 },
    profileStats: { display: "flex", gap: 32, marginTop: 16 },
    statItem: {},
    statValue: { fontWeight: "bold", fontSize: 18 },
    statLabel: { color: "#888", fontSize: 14 },
    editProfileButton: { background: "#222", color: "#fff", border: "none", borderRadius: 6, padding: "8px 18px", fontWeight: 500, fontSize: 16, cursor: "pointer", marginTop: 16 },
    navigationTabs: { display: "flex", gap: 12, marginBottom: 24 },
    navTab: { background: "#eee", border: "none", borderRadius: 6, padding: "8px 18px", fontWeight: 500, fontSize: 16, cursor: "pointer" },
    navTabActive: { background: "#222", color: "#fff" },
    contentSection: {},
    sectionHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
    sectionTitle: { fontSize: 20, fontWeight: "bold" },
    manageListingsLink: { background: "#fff", border: "1px solid #222", borderRadius: 6, padding: "6px 14px", fontWeight: 500, fontSize: 14, cursor: "pointer" },
    searchFilters: { display: "flex", gap: 12, marginBottom: 16 },
    searchInput: { flex: 1, padding: 8, borderRadius: 4, border: "1px solid #ccc", fontSize: 15 },
    filtersButton: { background: "#eee", border: "none", borderRadius: 6, padding: "8px 18px", fontWeight: 500, fontSize: 16, cursor: "pointer" },
    listingsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 24 },
    listingItem: { background: "#fff", borderRadius: 8, boxShadow: "0 1px 4px #eee", padding: 16, display: "flex", flexDirection: "column", alignItems: "center" },
    listingImage: { fontSize: 40, marginBottom: 8 },
    buyerProtection: { fontSize: 12, color: "#2196f3", marginTop: 4 },
    listingInfo: { textAlign: "center" },
    listingTitle: { fontSize: 16, fontWeight: "bold", marginBottom: 4 },
    listingPrice: { color: "#222", fontWeight: "bold", marginBottom: 4 },
    listingCondition: { color: "#888", fontSize: 13 },
    emptyListings: { textAlign: "center", padding: 32, background: "#fff", borderRadius: 8, boxShadow: "0 1px 4px #eee" },
    emptyIcon: { fontSize: 48, marginBottom: 12 },
    emptyTitle: { fontWeight: "bold", fontSize: 20 },
    emptySubtitle: { color: "#888", marginBottom: 12 },
    emptyStats: { display: "flex", gap: 12, justifyContent: "center", marginBottom: 12 },
    viewInsightsLink: { background: "#eee", border: "none", borderRadius: 6, padding: "8px 18px", fontWeight: 500, fontSize: 16, cursor: "pointer", marginRight: 8 },
    promoteButton: { background: "#222", color: "#fff", border: "none", borderRadius: 6, padding: "8px 18px", fontWeight: 500, fontSize: 16, cursor: "pointer" },
    insightsStats: { display: "flex", gap: 24 },
    insightCard: { background: "#fff", borderRadius: 8, boxShadow: "0 1px 4px #eee", padding: 16, flex: 1, textAlign: "center" },
    insightValue: { fontWeight: "bold", fontSize: 20 },
    noReviews: { textAlign: "center", padding: 32, background: "#fff", borderRadius: 8, boxShadow: "0 1px 4px #eee" },
    reviewsList: {},
    reviewSummary: { textAlign: "center", marginBottom: 16 },
    ratingDisplay: { display: "flex", alignItems: "center", justifyContent: "center", gap: 8 },
    ratingValue: { fontWeight: "bold", fontSize: 20 },
    ratingStars: { color: "#FFD700", fontSize: 18 }
  };

  const userData = firebaseUser || user;

  return (
    <div style={styles.userProfileView}>
      <Navbar />
      <div style={styles.profileHeaderBg}></div>
      <div style={styles.container}>
        {/* Profile Card */}
        <div style={styles.profileCard}>
          <div style={styles.profileInfoSection}>
            <div style={styles.profileAvatar}>
              {userData.profilePhotoUrl ? (
                <img src={userData.profilePhotoUrl} alt="Profile" style={styles.avatarImage} />
              ) : (
                <div style={styles.avatarPlaceholder}>
                  🎃
                </div>
              )}
            </div>
            <div style={styles.profileDetails}>
              <div style={styles.profileUsername}>@{userData.username}</div>
              <button style={styles.profileDetailsLink}>
                Profile details <span>›</span>
              </button>
            </div>
          </div>
          <div style={styles.profileStats}>
            <div style={styles.statItem}>
              <div style={styles.statValue}>
                {userData.reviewCount > 0 ? userData.rating : 'N/A'}
              </div>
              <div style={styles.statLabel}>
                {userData.reviewCount > 0 ? `${userData.reviewCount} reviews` : 'No review yet'}
              </div>
            </div>
            <div style={styles.statItem}>
              <div style={styles.statValue}>{getTimeSinceJoined(userData.joinDate)}</div>
              <div style={styles.statLabel}>Joined</div>
            </div>
          </div>
          <button style={styles.editProfileButton} onClick={handleEditProfile}>
            Edit Profile
          </button>
        </div>

        {/* Navigation Tabs */}
        <div style={styles.navigationTabs}>
          <button 
            style={{...styles.navTab, ...(activeTab === 'listings' ? styles.navTabActive : {})}}
            onClick={() => setActiveTab('listings')}
          >
            Listings
          </button>
          <button 
            style={{...styles.navTab, ...(activeTab === 'insights' ? styles.navTabActive : {})}}
            onClick={() => setActiveTab('insights')}
          >
            Insights
          </button>
          <button 
            style={{...styles.navTab, ...(activeTab === 'reviews' ? styles.navTabActive : {})}}
            onClick={() => setActiveTab('reviews')}
          >
            Reviews
          </button>
          {/* <button 
            style={{...styles.navTab, ...(activeTab === 'coins' ? styles.navTabActive : {})}}
            onClick={() => setActiveTab('coins')}
          >
            Coins
          </button>
          <button 
            style={{...styles.navTab, ...(activeTab === 'balance' ? styles.navTabActive : {})}}
            onClick={() => setActiveTab('balance')}
          >
            Balance
          </button> */}
          {/* <button 
            style={{...styles.navTab, ...(activeTab === 'caroubiz' ? styles.navTabActive : {})}}
            onClick={() => setActiveTab('caroubiz')}
          >
            CarouBiz
          </button> */}
        </div>

        {/* Content Section */}
        <div style={styles.contentSection}>
          {activeTab === 'listings' && (
            <div>
              <div style={styles.sectionHeader}>
                <h2 style={styles.sectionTitle}>Listings</h2>
                <button style={styles.manageListingsLink}>Manage listings</button>
              </div>
              
              <div style={styles.searchFilters}>
                <input 
                  type="text" 
                  style={styles.searchInput}
                  placeholder="Search listings..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <button style={styles.filtersButton}>
                  Filters ⚙️
                </button>
              </div>

              {filteredListings.length > 0 ? (
                <div style={styles.listingsGrid}>
                  {filteredListings.map((item) => (
                    <div key={item.id} style={styles.listingItem}>
                      <div style={styles.listingImage}>
                        {getItemEmoji(item.category)}
                        <div style={styles.buyerProtection}>Buyer Protection</div>
                      </div>
                      <div style={styles.listingInfo}>
                        <h3 style={styles.listingTitle}>{item.title}</h3>
                        <div style={styles.listingPrice}>RM{item.price}</div>
                        {item.condition && (
                          <div style={styles.listingCondition}>{item.condition}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={styles.emptyListings}>
                  <div style={styles.emptyIcon}>📱</div>
                  <div style={styles.emptyTitle}>Welcome to SecondStyle!</div>
                  <div style={styles.emptySubtitle}>Start by creating your first listing</div>
                  <div style={styles.emptyStats}>
                    <div>RM0</div>
                    <div>New</div>
                  </div>
                  <button style={styles.viewInsightsLink}>📊 View insights</button>
                  <button style={styles.promoteButton}>Promote</button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'insights' && (
            <div>
              <h2 style={styles.sectionTitle}>Insights</h2>
              <div style={styles.insightsStats}>
                <div style={styles.insightCard}>
                  <h3>Total Views</h3>
                  <div style={styles.insightValue}>
                    {listings.reduce((total, item) => total + item.views, 0)}
                  </div>
                </div>
                <div style={styles.insightCard}>
                  <h3>Active Listings</h3>
                  <div style={styles.insightValue}>
                    {listings.filter(item => item.status === 'active').length}
                  </div>
                </div>
                <div style={styles.insightCard}>
                  <h3>Total Earnings</h3>
                  <div style={styles.insightValue}>RM{user.totalEarnings}</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'reviews' && (
            <div>
              <h2 style={styles.sectionTitle}>Reviews</h2>
              {user.reviewCount === 0 ? (
                <div style={styles.noReviews}>
                  <p>No reviews yet. Start selling to get reviews!</p>
                </div>
              ) : (
                <div style={styles.reviewsList}>
                  <div style={styles.reviewSummary}>
                    <div style={styles.ratingDisplay}>
                      <span style={styles.ratingValue}>{user.rating}</span>
                      <span style={styles.ratingStars}>★★★★★</span>
                    </div>
                    <p>{user.reviewCount} reviews</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default UserProfileView;
"use client";
import React, { useState, useEffect } from 'react';
import { User, ListingItem } from '../../types/user';
import EditProfileView from '../../components/edit_profile_user';
import Navbar from '../../components/navbar';
import Footer from '../../components/footer';
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, getDoc, collection, getDocs, updateDoc } from "firebase/firestore";
import { db } from "../../firebaseConfig";

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
  const [activeTab, setActiveTab] = useState<'listings' | 'insights'>('listings');
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [firebaseListings, setFirebaseListings] = useState<ListingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalLikes, setTotalLikes] = useState(0);

  const handleEditProfile = () => {
    setShowEditProfile(true);
  };

  const handleSaveProfile = async (updatedUser: Partial<User>) => {
    const currentUser = getAuth().currentUser;
    if (!currentUser || !firebaseUser) return;

    const changedFields: Partial<User> = {};
    Object.keys(updatedUser).forEach((key) => {
      // @ts-ignore
      if (updatedUser[key] !== firebaseUser[key]) {
        // @ts-ignore
        changedFields[key] = updatedUser[key];
      }
    });

    if (Object.keys(changedFields).length === 0) {
      setShowEditProfile(false);
      return;
    }

    try {
      await updateDoc(doc(db, "users", currentUser.uid), changedFields);
      const docSnap = await getDoc(doc(db, "users", currentUser.uid));
      if (docSnap.exists()) {
        setFirebaseUser(docSnap.data() as User);
      }
      setShowEditProfile(false);
    } catch (err) {
      // handle error
    }
  };

  const filteredListings = firebaseListings
    .filter(item => !item.sold) // Handles undefined, null, and false
    .filter(item =>
      item.title?.toLowerCase().includes(searchTerm.toLowerCase())
    );

  const getTotalLikes = async () => {
    // Fetch all favorites collections and count how many times user's items appear
    const favoritesSnapshot = await getDocs(collection(db, "favorites"));
    let totalLikes = 0;
    favoritesSnapshot.forEach(userFavDoc => {
      const itemsRef = collection(db, "favorites", userFavDoc.id, "items");
      // For each user's favorites, check if any item matches user's listings
      // You may want to batch this for performance in production
      firebaseListings.forEach(async (listing) => {
        const favItemSnap = await getDoc(doc(itemsRef, listing.id));
        if (favItemSnap.exists()) {
          totalLikes += 1;
        }
      });
    });
    return totalLikes;
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(getAuth(), (currentUser) => {
      if (currentUser) {
        // Fetch user info
        getDoc(doc(db, "users", currentUser.uid)).then(userDoc => {
          if (userDoc.exists()) {
            setFirebaseUser(userDoc.data() as User);
          }
        });

        // Fetch products where sellerId == currentUser.uid
        getDocs(collection(db, "products")).then(productsSnapshot => {
          const productsArr: ListingItem[] = [];
          productsSnapshot.forEach(doc => {
            const data = doc.data();
            if (data.sellerId === currentUser.uid) {
              productsArr.push({ id: doc.id, ...data } as ListingItem);
            }
          });
          setFirebaseListings(productsArr);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchLikes = async () => {
      const likes = await getTotalLikes();
      setTotalLikes(likes);
    };
    if (firebaseListings.length > 0) {
      fetchLikes();
    }
  }, [firebaseListings]);

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

  const userData = firebaseUser || user;

  return (
    <div style={{
      minHeight: "100vh",
      background: "#f8f9fa",
      display: "flex",
      flexDirection: "column"
    }}>
      <Navbar />

      <div style={{
        maxWidth: 900,
        margin: "0 auto",
        padding: "40px 0 0 0",
        flex: 1
      }}>
        {/* Profile Card */}
        <div style={{
          background: "#fff",
          borderRadius: 16,
          padding: "100px 120px 60px 120px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          marginBottom: 24,
          maxWidth: 1100,
          marginLeft: "auto",
          marginRight: "auto",
          textAlign: "left",
          display: "flex",
          flexDirection: "column",
          gap: 20
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div>
                {userData.profilePhotoUrl ? (
                <img
                  src={userData.profilePhotoUrl}
                  alt="Profile"
                  style={{
                  width: 80,
                  height: 80,
                  borderRadius: "50%",
                  objectFit: "cover"
                  }}
                />
                ) : (
                <div style={{
                  width: 80,
                  height: 80,
                  borderRadius: "50%",
                  background: "#e9ecef",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 24,
                  color: "#6c757d"
                }}>
                  👤
                </div>
                )}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 2 }}>
                @{userData.username || "username"}
              </div>
              <div style={{ color: "#888", fontSize: 15 }}>
                📍{userData.region || "state"}
              </div>
              <div style={{ color: "#888", fontSize: 15, marginTop: 2 }}>
                {userData.bio || "No bio available."}
              </div>
            </div>
            <div style={{ flex: 1 }} />
            <button
              style={{
                background: "#212529",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                padding: "10px 20px",
                fontWeight: "500",
                fontSize: 15,
                cursor: "pointer",
                marginLeft: "auto"
              }}
              onClick={handleEditProfile}
            >
              Edit Profile
            </button>
          </div>
          <div style={{
            display: "flex",
            gap: 32,
            marginTop: 18,
            marginBottom: 0
          }}>
            <div style={{ textAlign: "center", flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 16, color: "#212529" }}>
                1months
              </div>
              <div style={{ color: "#888", fontSize: 14 }}>
                Joined
              </div>
            </div>
            <div style={{ textAlign: "center", flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 16, color: "#212529" }}>
                {firebaseListings.length}
              </div>
              <div style={{ color: "#888", fontSize: 14 }}>
                Active Listings
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{
          display: "flex",
          gap: 0,
          marginBottom: 16,
          background: "#fff",
          borderRadius: 8,
          overflow: "hidden",
          boxShadow: "0 2px 4px rgba(0,0,0,0.08)",
          maxWidth: 1100,
          marginLeft: "auto",
          marginRight: "auto",
        }}>
          <button
            style={{
              background: activeTab === 'listings' ? "#212529" : "#fff",
              color: activeTab === 'listings' ? "#fff" : "#212529",
              border: "none",
              padding: "14px 0",
              fontWeight: "500",
              fontSize: 15,
              cursor: "pointer",
              flex: 1,
              transition: "all 0.2s"
            }}
            onClick={() => setActiveTab('listings')}
          >
            Listings
          </button>
          <button
            style={{
              background: activeTab === 'insights' ? "#212529" : "#fff",
              color: activeTab === 'insights' ? "#fff" : "#212529",
              border: "none",
              padding: "14px 0",
              fontWeight: "500",
              fontSize: 15,
              cursor: "pointer",
              flex: 1,
              transition: "all 0.2s",
            }}
            onClick={() => setActiveTab('insights')}
          >
            Insights
          </button>
        </div>

        {/* Listings Section */}
        {activeTab === 'listings' && (
          <div style={{
            background: "#fff",
            borderRadius: 8,
            boxShadow: "0 2px 4px rgba(0,0,0,0.08)",
            padding: "24px",
            maxWidth: 1100,
            marginLeft: "auto",
            marginRight: "auto",
            marginBottom: 40
          }}>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16
            }}>
              <h3 style={{
                fontSize: 16,
                fontWeight: "600",
                margin: 0,
                color: "#212529"
              }}>
                Listings ({firebaseListings.length} active)
              </h3>
                <button 
                style={{
                  background: "#fff",
                  border: "1px solid #dee2e6",
                  borderRadius: 6,
                  padding: "6px 14px",
                  fontWeight: "500",
                  fontSize: 14,
                  cursor: "pointer",
                  color: "#212529"
                }}
                onClick={() => window.location.href = '/manage_listings'}
                >
                Manage listings
                </button>
            </div>
            <div style={{
              display: "flex",
              gap: 12,
              marginBottom: 16
            }}>
              <input
                type="text"
                style={{
                  flex: 1,
                  padding: "10px 14px",
                  borderRadius: 6,
                  border: "1px solid #dee2e6",
                  fontSize: 14,
                  outline: "none",
                  color: "#212529"
                }}
                placeholder="Search listings..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <button style={{
                background: "#f8f9fa",
                border: "1px solid #dee2e6",
                borderRadius: 6,
                padding: "10px 18px",
                fontWeight: "500",
                fontSize: 14,
                cursor: "pointer",
                color: "#212529"
              }}>
                Filters ⚙️
              </button>
            </div>
            {filteredListings.length > 0 ? (
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                gap: 18
              }}>
                {filteredListings.map((item) => (
                  <div key={item.id} style={{
                    background: "#fff",
                    borderRadius: 8,
                    boxShadow: "0 2px 4px rgba(0,0,0,0.08)",
                    overflow: "hidden",
                    cursor: "pointer",
                    transition: "transform 0.2s"
                  }}>
                    <div style={{
                      height: 180,
                      background: "#f8f9fa",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 48,
                      color: "#dee2e6"
                    }}>
                      {(item.images && item.images[0]) ? (
                        <img src={item.images[0]} alt={item.title} style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover"
                        }} />
                      ) : (
                        "👕"
                      )}
                    </div>
                    <div style={{ padding: 12 }}>
                      <h4 style={{
                        fontSize: 13,
                        fontWeight: "600",
                        margin: "0 0 6px 0",
                        color: "#212529"
                      }}>
                        {item.title || "Sample Item"}
                      </h4>
                      <div style={{
                        color: "#212529",
                        fontWeight: "600",
                        fontSize: 15,
                        marginBottom: 2
                      }}>
                        RM{item.price || "0"}
                      </div>
                      <div style={{
                        color: "#6c757d",
                        fontSize: 12
                      }}>
                        {item.condition || "Good condition"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{
                textAlign: "center",
                padding: "40px 20px",
                color: "#888"
              }}>
                No listings found.
              </div>
            )}
          </div>
        )}

        {/* Insights Section */}
        {activeTab === 'insights' && (
          <div style={{
            background: "#fff",
            borderRadius: 8,
            boxShadow: "0 2px 4px rgba(0,0,0,0.08)",
            padding: "24px",
            maxWidth:1100,
            marginLeft: "auto",
            marginRight: "auto",
            marginBottom: 40
          }}>
            <h3 style={{
              fontSize: 18,
              fontWeight: "600",
              marginBottom: 18,
              color: "#212529"
            }}>
              Insights
            </h3>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 18
            }}>
              <div style={{
                background: "#fff",
                borderRadius: 8,
                boxShadow: "0 2px 4px rgba(0,0,0,0.08)",
                padding: 18,
                textAlign: "center"
              }}>
                <h4 style={{
                  margin: "0 0 8px 0",
                  fontSize: 13,
                  color: "#6c757d"
                }}>
                  Total Likes
                </h4>
                <div style={{
                  fontWeight: "600",
                  fontSize: 20,
                  color: "#212529"
                }}>
                  {totalLikes}
                </div>
              </div>
              <div style={{
                background: "#fff",
                borderRadius: 8,
                boxShadow: "0 2px 4px rgba(0,0,0,0.08)",
                padding: 18,
                textAlign: "center"
              }}>
                <h4 style={{
                  margin: "0 0 8px 0",
                  fontSize: 13,
                  color: "#6c757d"
                }}>
                  Active Listings
                </h4>
                <div style={{
                  fontWeight: "600",
                  fontSize: 20,
                  color: "#212529"
                }}>
                  {firebaseListings.length}
                </div>
              </div>
              <div style={{
                background: "#fff",
                borderRadius: 8,
                boxShadow: "0 2px 4px rgba(0,0,0,0.08)",
                padding: 18,
                textAlign: "center"
              }}>
                <h4 style={{
                  margin: "0 0 8px 0",
                  fontSize: 13,
                  color: "#6c757d"
                }}>
                  Total Earnings
                </h4>
                <div style={{
                  fontWeight: "600",
                  fontSize: 20,
                  color: "#212529"
                }}>
                  RM{userData.totalEarnings || 0}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default UserProfileView;
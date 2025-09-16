'use client';
import React, { useEffect, useState } from 'react';
import { Search, Filter, Heart, Star, MapPin } from 'lucide-react';
import Footer from '../../components/footer';
import Navbar from '../../components/navbar';
import { collection, getDocs, query, limit, orderBy } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { useRouter } from "next/navigation";

interface Product {
  id: string;
  name?: string;
  title?: string;
  price: number;
  originalPrice?: number;
  image?: string;
  images?: string[];
  condition: string;
  size: string;
  location: string;
  isFavorite?: boolean;
  createdAt?: any;
  seller?: string;
  rating?: number;
}

interface BidItem {
  id: string;
  productName?: string;
  name?: string;
  description?: string;
  price: number;
  minIncrement: number;
  endDate: string;
  image?: string;
  images?: string[];
  createdAt?: any;
}

const HomePage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilters, setSelectedFilters] = useState({
    category: '',
    condition: '',
    brand: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [featuredItems, setFeaturedItems] = useState<Product[]>([]);
  const [biddingItems, setBiddingItems] = useState<BidItem[]>([]);
  const router = useRouter();

  useEffect(() => {
    const fetchFeatured = async () => {
      const q = query(collection(db, "products"), orderBy("createdAt", "desc"), limit(6));
      const snapshot = await getDocs(q);
      setFeaturedItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
    };
    const fetchBidding = async () => {
      const q = query(collection(db, "bids"), orderBy("createdAt", "desc"), limit(3));
      const snapshot = await getDocs(q);
      setBiddingItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BidItem)));
    };
    fetchFeatured();
    fetchBidding();
  }, []);

  const categories = ['Tops', 'Bottoms', 'Dresses', 'Outerwear', 'Shoes', 'Bags', 'Accessories'];
  const conditions = ['Like New', 'Good', 'Fair', 'Worn'];
  const brands = ['Zara', 'H&M', 'Nike', 'Adidas', 'Coach', "Levi's", 'Uniqlo', 'Other'];

  const handleFilterChange = (filterType: keyof typeof selectedFilters, value: string) => {
    setSelectedFilters(prev => ({
      ...prev,
      [filterType]: prev[filterType] === value ? '' : value
    }));
  };

  const toggleFavorite = (itemId: string) => {
    // In a real app, this would update the backend
    console.log('Toggle favorite for item:', itemId);
  };

  const handleSearchSubmit = () => {
    // Implement search functionality or navigation
    console.log('Search submitted for query:', searchQuery);
    router.push(`/search?query=${encodeURIComponent(searchQuery)}`);
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <Navbar/>
      &nbsp;
      <div style={{
        flex: 1,
        background: 'linear-gradient(135deg, #c9a26d 0%, #8b7355 100%)'
      }}>
        {/* Hero Section */}
        <section style={{
          padding: '4rem 2rem',
          textAlign: 'center',
          color: 'white'
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{
              fontSize: '3.5rem',
              fontWeight: '800',
              marginBottom: '1rem',
              textShadow: '0 4px 12px rgba(0,0,0,0.3)'
            }}>
              Find Your Perfect
              <br />
              <span style={{ color: '#fff3cd' }}>Pre-Loved Fashion</span>
            </h2>
            <p style={{
              fontSize: '1.2rem',
              marginBottom: '3rem',
              opacity: 0.9,
              textShadow: '0 2px 4px rgba(0,0,0,0.3)'
            }}>
              Discover unique secondhand clothing from trusted sellers across Malaysia
            </p>
            {/* Search Bar */}
            <div style={{
              background: 'white',
              borderRadius: '50px',
              padding: '1rem',
              boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
              display: 'flex',
              alignItems: 'center',
              marginBottom: '2rem',
              maxWidth: '600px',
              margin: '0 auto 2rem',
              position: 'relative',
              zIndex: 1
            }}>
              <Search size={24} style={{ color: '#666', marginLeft: '1rem', pointerEvents: 'none' }} />
              <input
                type="text"
                placeholder="Search for clothes, brands, or styles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  flex: 1,
                  border: 'none',
                  outline: 'none',
                  fontSize: '1rem',
                  padding: '0.5rem 1rem',
                  background: 'transparent',
                  color: '#333',
                  width: '100%'
                }}
              />
              <button
                onClick={() => setShowFilters(!showFilters)}
                style={{
                  background: showFilters ? '#8b7355' : '#f0f0f0',
                  color: showFilters ? 'white' : '#666',
                  border: 'none',
                  padding: '0.5rem',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  marginRight: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Filter size={18} />
              </button>
              <button style={{
                background: '#c9a26d',
                color: 'white',
                border: 'none',
                padding: '0.75rem 2rem',
                borderRadius: '25px',
                fontWeight: '600',
                cursor: 'pointer'
              }} onClick={handleSearchSubmit}>
                Search
              </button>
            </div>
          </div>
        </section>

        {/* Filters Panel */}
        {showFilters && (
          <section style={{
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            margin: '0 2rem 2rem',
            borderRadius: '20px',
            padding: '2rem',
            boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
            maxWidth: '1200px',
            marginLeft: 'auto',
            marginRight: 'auto'
          }}>
            <h3 style={{ marginBottom: '1.5rem', color: '#333' }}>Filters</h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '2rem'
            }}>
              {/* Category Filter */}
              <div>
                <label style={{ fontWeight: '600', color: '#333', marginBottom: '0.5rem', display: 'block' }}>
                  Category
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {categories.map(category => (
                    <button
                      key={category}
                      onClick={() => handleFilterChange('category', category)}
                      style={{
                        padding: '0.4rem 0.8rem',
                        border: `1px solid ${selectedFilters.category === category ? '#c9a26d' : '#ddd'}`,
                        background: selectedFilters.category === category ? '#c9a26d' : 'white',
                        color: selectedFilters.category === category ? 'white' : '#333',
                        borderRadius: '20px',
                        fontSize: '0.875rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>

              {/* Condition Filter */}
              <div>
                <label style={{ fontWeight: '600', color: '#333', marginBottom: '0.5rem', display: 'block' }}>
                  Condition
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {conditions.map(condition => (
                    <button
                      key={condition}
                      onClick={() => handleFilterChange('condition', condition)}
                      style={{
                        padding: '0.4rem 0.8rem',
                        border: `1px solid ${selectedFilters.condition === condition ? '#c9a26d' : '#ddd'}`,
                        background: selectedFilters.condition === condition ? '#c9a26d' : 'white',
                        color: selectedFilters.condition === condition ? 'white' : '#333',
                        borderRadius: '20px',
                        fontSize: '0.875rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {condition}
                    </button>
                  ))}
                </div>
              </div>

              {/* Brand Filter */}
              <div>
                <label style={{ fontWeight: '600', color: '#333', marginBottom: '0.5rem', display: 'block' }}>
                  Brand
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {brands.map(brand => (
                    <button
                      key={brand}
                      onClick={() => handleFilterChange('brand', brand)}
                      style={{
                        padding: '0.4rem 0.8rem',
                        border: `1px solid ${selectedFilters.brand === brand ? '#c9a26d' : '#ddd'}`,
                        background: selectedFilters.brand === brand ? '#c9a26d' : 'white',
                        color: selectedFilters.brand === brand ? 'white' : '#333',
                        borderRadius: '20px',
                        fontSize: '0.875rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {brand}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
              <button
                onClick={() => setSelectedFilters({
                  category: '', condition: '', brand: ''
                })}
                style={{
                  background: 'transparent',
                  color: '#666',
                  border: '1px solid #ddd',
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                Clear All
              </button>
              <button style={{
                background: '#c9a26d',
                color: 'white',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                cursor: 'pointer'
              }}>
                Apply Filters
              </button>
            </div>
          </section>
        )}

        {/* Featured Items */}
        <section style={{
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          margin: '2rem',
          borderRadius: '20px',
          padding: '3rem 2rem',
          maxWidth: '1200px',
          marginLeft: 'auto',
          marginRight: 'auto'
        }}>
          <h3 style={{
            fontSize: '2rem',
            fontWeight: '700',
            marginBottom: '2rem',
            textAlign: 'center',
            color: '#333'
          }}>
            Featured Items
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '1.5rem'
          }}>
            {featuredItems.map(item => (
              <div
                key={item.id}
                style={{
                  background: 'white',
                  borderRadius: '15px',
                  overflow: 'hidden',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                  cursor: 'pointer',
                  position: 'relative'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-5px)';
                  e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.1)';
                }}
                onClick={() => router.push(`/view_item?id=${item.id}`)}
              >
                {/* Favorite Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(item.id);
                  }}
                  style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    background: 'rgba(255, 255, 255, 0.9)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '35px',
                    height: '35px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    zIndex: 10
                  }}
                >
                  <Heart
                    size={18}
                    fill={item.isFavorite ? '#ff4757' : 'none'}
                    color={item.isFavorite ? '#ff4757' : '#666'}
                  />
                </button>

                {/* Item Image */}
                <div style={{
                  width: '100%',
                  height: '220px',
                  background: '#f9f9f9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden'
                }}>
                  <img
                    src={item.image || item.images?.[0] || 'https://via.placeholder.com/220'}
                    alt={item.name || item.title}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      borderRadius: '0'
                    }}
                  />
                </div>

                {/* Item Details */}
                <div style={{ padding: '1.25rem' }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '0.5rem'
                  }}>
                    <h4 style={{
                      margin: 0,
                      fontSize: '1.1rem',
                      fontWeight: '600',
                      color: '#333',
                      lineHeight: '1.3'
                    }}>
                      {item.name || item.title}
                    </h4>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{
                        fontSize: '1.25rem',
                        fontWeight: '700',
                        color: '#c9a26d'
                      }}>
                        RM {item.price}
                      </div>
                      {item.originalPrice && (
                        <div style={{
                          fontSize: '0.875rem',
                          color: '#999',
                          textDecoration: 'line-through'
                        }}>
                          RM {item.originalPrice}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.5rem',
                    marginBottom: '0.75rem'
                  }}>
                    <Star size={14} fill="#ffd700" color="#ffd700" />
                    <span style={{ fontSize: '0.875rem', color: '#666' }}>
                      {item.rating ? `${item.rating} • ` : ''}{item.seller}
                    </span>
                  </div>

                  <div style={{
                    display: 'flex',
                    gap: '0.5rem',
                    marginBottom: '0.75rem',
                    flexWrap: 'wrap'
                  }}>
                    <span style={{
                      background: '#f9f7f1',
                      color: '#c9a26d',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      fontWeight: '500'
                    }}>
                      {item.condition}
                    </span>
                    <span style={{
                      background: '#f9f9f9',
                      color: '#666',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '12px',
                      fontSize: '0.75rem'
                    }}>
                      Size {item.size}
                    </span>
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    color: '#888',
                    fontSize: '0.875rem'
                  }}>
                    <MapPin size={12} />
                    {item.location}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Bidding System Section */}
        <section style={{ background: "#e9e1d3", padding: "2rem 0", marginTop: "2rem" }}>
          <div style={{ maxWidth: "900px", margin: "0 auto", textAlign: "center" }}>
            <h2 style={{ fontSize: "2rem", fontWeight: "700", marginBottom: "1rem" }}>Bidding System</h2>
            <p style={{ fontSize: "1.1rem", marginBottom: "2rem" }}>
              Place bids on selected items and compete for the best deals! Our bidding system is transparent and easy to use.
            </p>
            <div style={{
              display: "flex",
              gap: "2rem",
              justifyContent: "center",
              flexWrap: "wrap"
            }}>
              {biddingItems.length === 0 ? (
                <div style={{
                  background: "#fff",
                  borderRadius: "12px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
                  padding: "1.5rem",
                  minWidth: "300px"
                }}>
                  <strong>No active bids yet.</strong>
                  <div style={{ margin: "1rem 0" }}>
                    <img src="https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=200&h=200&fit=crop" alt="Sample" style={{ borderRadius: "8px", width: "100px", height: "100px" }} />
                    <div>Sample Item</div>
                    <div>Current Bid: RM 0</div>
                    <div>Minimum Increment: RM 0</div>
                  </div>
                </div>
              ) : (
                biddingItems.map(bid => (
                  <div key={bid.id} style={{
                    background: "#fff",
                    borderRadius: "12px",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
                    padding: "1.5rem",
                    minWidth: "300px",
                    textAlign: "left"
                  }}>
                    <strong>{bid.productName || bid.name || "Bid Item"}</strong>
                    <div style={{ margin: "1rem 0" }}>
                      <img
                        src={bid.images?.[0] || bid.image || "https://via.placeholder.com/200"}
                        alt={bid.productName || bid.name || "Bid Item"}
                        style={{ borderRadius: "8px", width: "100px", height: "100px", objectFit: "cover" }}
                      />
                      <div>{bid.description}</div>
                      <div>Current Bid: RM {bid.price}</div>
                      <div>Minimum Increment: RM {bid.minIncrement}</div>
                      <div>End Date: {bid.endDate}</div>
                    </div>
                    <button style={{
                      background: "#c9a26d",
                      color: "#fff",
                      border: "none",
                      borderRadius: "8px",
                      padding: "0.5rem 1.5rem",
                      fontWeight: "bold",
                      cursor: "pointer"
                    }}>
                      Start Bidding
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </div>
      <Footer/>
    </div>
  );
};

export default HomePage;
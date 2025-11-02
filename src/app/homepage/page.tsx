'use client';
import React, { useEffect, useState } from 'react';
import { Search, Filter, Heart, MapPin } from 'lucide-react';
import Footer from '../../components/footer';
import Navbar from '../../components/navbar';
import { collection, getDocs, query, limit, orderBy, doc, getDoc, updateDoc, arrayUnion, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { useRouter } from "next/navigation";
import { getAuth } from 'firebase/auth';

interface Seller {
  username: string;
  avatar?: string;
}

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
  category?: string;
  brand?: string;
  isFavorite?: boolean;
  createdAt?: any;
  seller?: string | Seller;
  rating?: number;
  sold?: boolean;
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
  const [appliedFilters, setAppliedFilters] = useState({
    category: '',
    condition: '',
    brand: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [featuredItems, setFeaturedItems] = useState<Product[]>([]);
  const [biddingItems, setBiddingItems] = useState<BidItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<Product[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [conditions, setConditions] = useState<string[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('newest');
  const router = useRouter();

  // Fetch filter options from database
  const fetchFilterOptions = async () => {
    try {
      // Fetch categories from the categories collection
      const categoriesSnapshot = await getDocs(collection(db, "categories"));
      const categoriesList: string[] = [];
      categoriesSnapshot.docs.forEach(doc => {
        const data = doc.data();
        categoriesList.push(data.name || doc.id);
      });
      setCategories(categoriesList.sort());

      // Fetch conditions from the conditions collection
      const conditionsSnapshot = await getDocs(collection(db, "conditions"));
      const conditionsList: string[] = [];
      conditionsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        conditionsList.push(data.name || doc.id);
      });
      setConditions(conditionsList.sort());

      // Fetch brands from the brands collection
      const brandsSnapshot = await getDocs(collection(db, "brands"));
      const brandsList: string[] = [];
      brandsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        brandsList.push(data.name || doc.id);
      });
      setBrands(brandsList.sort());
    } catch (error) {
      console.error("Error fetching filter options:", error);
      // Fallback to default values
      setCategories(['Tops', 'Bottoms', 'Dresses', 'Outerwear', 'Shoes', 'Bags', 'Accessories']);
      setConditions(['Brand New', 'Like New', 'Lightly Used', 'Well Used', 'Heavily Used']);
      setBrands(['Zara', 'H&M', 'Nike', 'Adidas', 'Coach', "Levi's", 'Uniqlo', 'Other']);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      // Fetch filter options first
      await fetchFilterOptions();
      
      // Fetch featured items
      const fetchFeatured = async () => {
        try {
          const q = query(collection(db, "products"), orderBy("createdAt", "desc"), limit(6));
          const snapshot = await getDocs(q);

          // Fetch seller info for each product
          const items: Product[] = await Promise.all(snapshot.docs
            .map(async docSnap => {
              const data = docSnap.data();
              let sellerObj: Seller | undefined = undefined;
              if (data.sellerId) {
                const sellerRef = doc(db, "users", data.sellerId);
                const sellerSnap = await getDoc(sellerRef);
                if (sellerSnap.exists()) {
                  const sellerData = sellerSnap.data();
                  sellerObj = {
                    username: sellerData.username || "Unknown Seller",
                    avatar: sellerData.profilePhotoUrl || "/api/placeholder/40/40"
                  };
                }
              }
              return {
                id: docSnap.id,
                ...data,
                seller: sellerObj
              } as Product;
            })
          );

          setFeaturedItems(items.filter(item => !item.sold));
        } catch (error) {
          console.error("Error fetching featured items:", error);
        }
      };
      
      // Fetch bidding items
      const fetchBidding = async () => {
        try {
          const q = query(collection(db, "bids"), orderBy("createdAt", "desc"), limit(3));
          const snapshot = await getDocs(q);
          const now = new Date();
          // Only show bids that have not ended
          setBiddingItems(snapshot.docs
            .map(doc => {
              const data = doc.data();
              const isExpired = data.endDate && new Date(data.endDate) < now;
              return { id: doc.id, ...data, isExpired } as BidItem & { isExpired: boolean };
            })
            .filter(bid => !bid.isExpired)
          );
        } catch (error) {
          console.error("Error fetching bidding items:", error);
        }
      };
      
      // Fetch favorites
      const fetchFavorites = async () => {
        try {
          const auth = getAuth();
          const user = auth.currentUser;
          if (!user) return;
          const itemsRef = collection(db, "favorites", user.uid, "items");
          const snapshot = await getDocs(itemsRef);
          setFavoriteIds(snapshot.docs.map(doc => doc.id));
        } catch (error) {
          console.error("Error fetching favorites:", error);
        }
      };
      
      await Promise.all([fetchFeatured(), fetchBidding(), fetchFavorites()]);
      setLoading(false);
    };

    fetchData();
  }, []);

  // Helper: filter and search products
  const filterAndSearchProducts = (items: Product[], search: string, filters: typeof appliedFilters) => {
    let result = [...items];

    // Filter by category
    if (filters.category) {
      result = result.filter(item =>
        item.category?.toLowerCase() === filters.category.toLowerCase()
      );
    }
    // Filter by condition
    if (filters.condition) {
      result = result.filter(item =>
        item.condition?.toLowerCase() === filters.condition.toLowerCase()
      );
    }
    // Filter by brand
    if (filters.brand) {
      if (filters.brand === "Other") {
        const allBrands = brands.map(b => b.toLowerCase()).filter(b => b !== "other");
        result = result.filter(item => {
          const name = (item.name || item.title || '').toLowerCase();
          const brand = (item.brand || '').toLowerCase();
          return !allBrands.some(b => name.includes(b) || brand.includes(b));
        });
      } else {
        result = result.filter(item => {
          const name = (item.name || item.title || '').toLowerCase();
          const brand = (item.brand || '').toLowerCase();
          return name.includes(filters.brand.toLowerCase()) || brand.includes(filters.brand.toLowerCase());
        });
      }
    }
    // Search by name/title/brand/category
    if (search.trim()) {
      const term = search.trim().toLowerCase();
      result = result.filter(item => {
        const name = (item.name || item.title || '').toLowerCase();
        const brand = (item.brand || '').toLowerCase();
        const category = (item.category || '').toLowerCase();
        return name.includes(term) || brand.includes(term) || category.includes(term);
      });
    }
    // Sort
    switch (sortBy) {
      case 'newest':
        result.sort((a, b) => {
          const timeA = a.createdAt ? new Date(a.createdAt) : new Date(0);
          const timeB = b.createdAt ? new Date(b.createdAt) : new Date(0);
          return timeB.getTime() - timeA.getTime();
        });
        break;
      case 'lowest-price':
        result.sort((a, b) => a.price - b.price);
        break;
      case 'highest-price':
        result.sort((a, b) => b.price - a.price);
        break;
      default:
        break;
    }
    return result;
  };

  // Apply filters and search when featuredItems, appliedFilters, searchQuery, brands, or sortBy changes
  useEffect(() => {
    setFilteredItems(filterAndSearchProducts(featuredItems, searchQuery, appliedFilters));
  }, [featuredItems, appliedFilters, searchQuery, brands, sortBy]);

  // Filter panel handlers
  const handleFilterChange = (filterType: keyof typeof selectedFilters, value: string) => {
    setSelectedFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const applyFilters = () => {
    setAppliedFilters({ ...selectedFilters });
    setShowFilters(false);
    setFilteredItems(filterAndSearchProducts(featuredItems, searchQuery, { ...selectedFilters }));
  };

  const clearFilters = () => {
    setSelectedFilters({ category: '', condition: '', brand: '' });
    setAppliedFilters({ category: '', condition: '', brand: '' });
    setFilteredItems(filterAndSearchProducts(featuredItems, searchQuery, { category: '', condition: '', brand: '' }));
  };

  const clearAll = () => {
    setSearchQuery('');
    clearFilters();
  };

  const removeFilter = (filterType: keyof typeof appliedFilters) => {
    const newFilters = { ...appliedFilters, [filterType]: '' };
    setAppliedFilters(newFilters);
    setSelectedFilters(prev => ({ ...prev, [filterType]: '' }));
    setFilteredItems(filterAndSearchProducts(featuredItems, searchQuery, newFilters));
  };

  const hasActiveFilters = () => Object.values(appliedFilters).some(filter => filter !== '');
  const isSearchActive = () => searchQuery.trim() !== '';

  // Search bar submit
  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    // Redirect to search result page with query as URL param
    if (searchQuery.trim()) {
      router.push(`/search_result?query=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleSaveFavourite = async (item: Product) => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return;
    
    try {
      const itemRef = doc(db, "favorites", user.uid, "items", item.id);

      if (favoriteIds.includes(item.id)) {
        // Remove from favourites
        await deleteDoc(itemRef);
        setFavoriteIds(prev => prev.filter(id => id !== item.id));
      } else {
        // Add to favourites
        await setDoc(itemRef, item);
        setFavoriteIds(prev => [...prev, item.id]);
      }
    } catch (error) {
      console.error("Error updating favorites:", error);
    }
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #c9a26d 0%, #8b7355 100%)'
      }}>
        <div style={{ color: 'white', fontSize: '1.2rem' }}>Loading...</div>
      </div>
    );
  }

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
              marginBottom: '2rem',
              opacity: 0.9,
              textShadow: '0 2px 4px rgba(0,0,0,0.3)'
            }}>
              Discover unique secondhand clothing from trusted sellers across Malaysia
            </p>
            {/* Search Bar */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              maxWidth: '700px',
              margin: '0 auto',
              background: '#fff',
              borderRadius: '12px',
              overflow: 'hidden',
              marginBottom: '0.5rem',
              position: 'relative'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                padding: '0 1rem',
                flex: 1
              }}>
                <Search size={20} style={{ color: '#666', marginRight: '0.5rem' }} />
                <input
                  type="text"
                  placeholder="Search auctions by item name..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{
                    border: 'none',
                    outline: 'none',
                    fontSize: '1rem',
                    background: 'transparent',
                    color: '#333',
                    width: '100%',
                    padding: '1rem 0'
                  }}
                />
              </div>
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                style={{
                  background: '#fff',
                  border: 'none',
                  borderLeft: '1px solid #eee',
                  padding: '1rem 2rem',
                  cursor: 'pointer',
                  color: '#333',
                  fontWeight: '500',
                  fontSize: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <Filter size={20} />
                Filter
              </button>
              <button
                type="button"
                onClick={handleSearchSubmit}
                style={{
                  background: '#333',
                  color: '#fff',
                  border: 'none',
                  padding: '1rem 2rem',
                  fontWeight: '600',
                  fontSize: '1rem',
                  borderRadius: '0 12px 12px 0',
                  cursor: 'pointer'
                }}
              >
                Search
              </button>
              {searchQuery.trim() && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{
                    position: 'absolute',
                    right: showFilters ? '8rem' : '15.5rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#666',
                    cursor: 'pointer',
                    padding: '0.25rem',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 2,
                    fontSize: '1.3rem'
                  }}
                  aria-label="Clear search"
                >
                  ×
                </button>
              )}
            </div>
          </div>
        </section>

        {showFilters && (
          <div style={{
            marginTop: '0.5rem',
            background: '#fff',
            borderRadius: '12px',
            padding: '1.5rem',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            textAlign: 'left',
            maxWidth: '700px',
            margin: '0 auto'
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
              marginBottom: '1rem'
            }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                  Category
                </label>
                <select
                  value={selectedFilters.category}
                  onChange={e => handleFilterChange('category', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    borderRadius: '8px',
                    border: '1px solid #ddd',
                    color: '#000'
                  }}
                >
                  <option value="">All Categories</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                  Condition
                </label>
                <select
                  value={selectedFilters.condition}
                  onChange={e => handleFilterChange('condition', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    borderRadius: '8px',
                    border: '1px solid #ddd',
                    color: '#000'
                  }}
                >
                  <option value="">All Conditions</option>
                  {conditions.map(condition => (
                    <option key={condition} value={condition}>{condition}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                  Brand
                </label>
                <select
                  value={selectedFilters.brand}
                  onChange={e => handleFilterChange('brand', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    borderRadius: '8px',
                    border: '1px solid #ddd',
                    color: '#000'
                  }}
                >
                  <option value="">All Brands</option>
                  {brands.map(brand => (
                    <option key={brand} value={brand}>{brand}</option>
                  ))}
                  {!brands.includes('Other') && (
                    <option value="Other">Other</option>
                  )}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button
                onClick={applyFilters}
                style={{
                  background: '#c9a26d',
                  color: '#fff',
                  border: 'none',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                Apply Filters
              </button>
              <button
                onClick={clearFilters}
                style={{
                  background: '#fff',
                  color: '#666',
                  border: '1px solid #ddd',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                Clear Filters
              </button>
            </div>
          </div>
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
            {filteredItems.length === 0 ? (
              <div style={{ gridColumn: "1/-1", textAlign: "center", color: "#888", fontSize: "1.2rem" }}>
                No products found.
              </div>
            ) : (
              filteredItems.map(item => (
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
                      handleSaveFavourite(item);
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
                      fill={favoriteIds.includes(item.id) ? '#ff4757' : 'none'}
                      color={favoriteIds.includes(item.id) ? '#ff4757' : '#666'}
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
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
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
                        <div style={{
                          fontSize: '1.25rem',
                          fontWeight: '700',
                          color: '#c9a26d',
                          marginTop: '0.5rem'
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
                        {/* Seller Info */}
                        {item.seller && typeof item.seller === 'object' && (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            marginTop: '0.5rem'
                          }}>
                            <img
                              src={item.seller.avatar || '/api/placeholder/40/40'}
                              alt={item.seller.username}
                              style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '50%',
                                objectFit: 'cover'
                              }}
                            />
                            <span style={{
                              fontSize: '0.95rem',
                              color: '#333',
                              fontWeight: '500'
                            }}>
                              {item.seller.username}
                            </span>
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
              ))
            )}
          </div>
        </section>

        {/* Bidding System Section */}
        <section style={{ background: "#e9e1d3", padding: "2rem 0", marginTop: "2rem" }}>
          <div style={{ maxWidth: "900px", margin: "0 auto", textAlign: "center" }}>
            <h2 style={{ fontSize: "2rem", fontWeight: "700", marginBottom: "1rem" }}>Bidding System</h2>
            <p style={{ fontSize: "1.1rem", marginBottom: "2rem" }}>
              Place bids on selected items and compete for the best deals! Our bidding system is transparent and easy to use.
            </p>
            <button
              style={{
                background: "#c9a26d",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                padding: "0.75rem 2rem",
                fontWeight: "bold",
                fontSize: "1rem",
                cursor: "pointer",
                marginBottom: "2rem"
              }}
              onClick={() => router.push("/bidding_page")}
            >
              View All Bidding Items
            </button>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "2rem",
              justifyContent: "center",
              marginBottom: "2rem"
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
                    minWidth: "0",
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
                    <button
                      style={{
                        background: "#c9a26d",
                        color: "#fff",
                        border: "none",
                        borderRadius: "8px",
                        padding: "0.5rem 1.5rem",
                        fontWeight: "bold",
                        cursor: "pointer"
                      }}
                      onClick={() => router.push(`/view_item?id=${bid.id}`)}
                    >
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
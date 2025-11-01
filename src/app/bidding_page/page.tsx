'use client';
import React, { useEffect, useState } from 'react';
import { Search, Filter, Gavel, MapPin, X, Users} from 'lucide-react';
import Footer from '../../components/footer';
import Navbar from '../../components/navbar';
import { collection, getDocs, query, orderBy, doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { useRouter } from "next/navigation";
import { getAuth } from 'firebase/auth';

interface BidItem {
  id: string;
  productName?: string;
  name?: string;
  title?: string;
  description?: string;
  price: number;
  startingBid?: number;
  currentBid?: number;
  highestBid?: number;
  minIncrement: number;
  endDate: string | any;
  endTime?: any;
  image?: string;
  images?: string[];
  createdAt?: any;
  bids?: Array<any>;
  status?: string;
  isExpired?: boolean;
  category?: string;
  condition?: string;
  size?: string;
  brand?: string;
  location?: string;
  userId?: string;
  sellerId?: string;
}

interface SellerInfo {
  username: string;
  profilePhoto?: string;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  display: string;
  isEndingSoon: boolean;
  isEnded: boolean;
}

const BiddingPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilters, setSelectedFilters] = useState({
    category: '',
    condition: '',
    brand: '',
    status: '',
    priceRange: '',
    bidActivity: ''
  });
  const [appliedFilters, setAppliedFilters] = useState({
    category: '',
    condition: '',
    brand: '',
    status: '',
    priceRange: '',
    bidActivity: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [allBids, setAllBids] = useState<BidItem[]>([]);
  const [filteredBids, setFilteredBids] = useState<BidItem[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [sellerInfos, setSellerInfos] = useState<{ [key: string]: SellerInfo }>({});
  const [categories, setCategories] = useState<string[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [conditions, setConditions] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('ending-soon');
  const [currentTime, setCurrentTime] = useState(new Date());
  const router = useRouter();

  // Update current time every second for countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Helper function to calculate time remaining
  const calculateTimeRemaining = (endDate: any): TimeRemaining => {
    const end = endDate.toDate ? endDate.toDate() : new Date(endDate);
    const now = currentTime;
    const diff = end.getTime() - now.getTime();

    if (diff <= 0) {
      return {
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        display: 'Ended',
        isEndingSoon: false,
        isEnded: true
      };
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    const isEndingSoon = diff < 24 * 60 * 60 * 1000; // Less than 24 hours
    const isEnded = false;

    let display = '';
    if (days > 0) {
      display = `${days}d ${hours}h`;
    } else if (hours > 0) {
      display = `${hours}h ${minutes}m`;
    } else {
      display = `${minutes}m ${seconds}s`;
    }

    return { days, hours, minutes, seconds, display, isEndingSoon, isEnded };
  };

  // Helper function to get current bid price
  const getCurrentBidPrice = (bid: BidItem) => {
    if (bid.bids && bid.bids.length > 0) {
      return bid.bids.reduce((max, currentBid) => {
        const bidAmount = currentBid.amount || currentBid.bidAmount || 0;
        return bidAmount > max ? bidAmount : max;
      }, 0);
    }
    return bid.startingBid || bid.price || 0;
  };

  // Helper function to get starting price
  const getStartingPrice = (bid: BidItem) => {
    return bid.startingBid || bid.price || 0;
  };

  // Fetch seller info function
  const fetchSellerInfo = async (sellerId: string): Promise<SellerInfo> => {
    try {
      const sellerDoc = await getDoc(doc(db, "users", sellerId));
      if (sellerDoc.exists()) {
        const data = sellerDoc.data();
        return {
          username: data.username || data.displayName || 'Unknown',
          profilePhoto: data.profilePhoto || data.photoURL
        };
      }
    } catch (error) {
      console.error("Error fetching seller info:", error);
    }
    return { username: 'Unknown' };
  };

  // Search function
  const performSearch = (query: string, items: BidItem[]) => {
    if (!query.trim()) {
      return items;
    }

    const searchTerm = query.toLowerCase().trim();
    
    return items.filter(item => {
      const name = (item.productName || item.name || item.title || '').toLowerCase();
      const description = (item.description || '').toLowerCase();
      const category = (item.category || '').toLowerCase();
      const condition = (item.condition || '').toLowerCase();
      const brand = (item.brand || '').toLowerCase();
      const location = (item.location || '').toLowerCase();
      const sellerId = item.userId || item.sellerId;
      const sellerInfo = sellerId ? sellerInfos[sellerId] : null;
      const sellerName = (sellerInfo?.username || '').toLowerCase();

      return (
        name.includes(searchTerm) ||
        description.includes(searchTerm) ||
        category.includes(searchTerm) ||
        condition.includes(searchTerm) ||
        brand.includes(searchTerm) ||
        location.includes(searchTerm) ||
        sellerName.includes(searchTerm)
      );
    });
  };

  // Apply search and filters
  const applySearchAndFilters = (searchTerm: string, filters: typeof appliedFilters, items: BidItem[]) => {
    let result = [...items];

    // Apply search
    if (searchTerm.trim()) {
      result = performSearch(searchTerm, result);
    }

    // Apply filters
    if (filters.category) {
      result = result.filter(item => 
        item.category?.toLowerCase() === filters.category.toLowerCase()
      );
    }

    if (filters.condition) {
      result = result.filter(item =>
        item.condition?.toLowerCase() === filters.condition.toLowerCase()
      );
    }

    if (filters.brand) {
      if (filters.brand === "Other") {
        const allBrands = brands.map(b => b.toLowerCase()).filter(b => b !== "other");
        result = result.filter(item => {
          const name = (item.productName || item.name || item.title || '').toLowerCase();
          return !allBrands.some(brand => name.includes(brand));
        });
      } else {
        result = result.filter(item => {
          const name = (item.productName || item.name || item.title || '').toLowerCase();
          return name.includes(filters.brand.toLowerCase());
        });
      }
    }

    if (filters.status) {
      result = result.filter(item => {
        const timeRemaining = calculateTimeRemaining(item.endDate);
        switch (filters.status) {
          case 'ending-soon':
            return timeRemaining.isEndingSoon && !timeRemaining.isEnded;
          case 'new':
            const daysSinceCreated = item.createdAt ? 
              (Date.now() - item.createdAt.toDate().getTime()) / (1000 * 60 * 60 * 24) : 999;
            return daysSinceCreated <= 3;
          case 'hot':
            return (item.bids?.length || 0) >= 5;
          case 'no-bids':
            return (item.bids?.length || 0) === 0;
          default:
            return true;
        }
      });
    }

    if (filters.priceRange) {
      result = result.filter(item => {
        const currentBid = getCurrentBidPrice(item);
        switch (filters.priceRange) {
          case 'under-50':
            return currentBid < 50;
          case '50-100':
            return currentBid >= 50 && currentBid <= 100;
          case '100-200':
            return currentBid >= 100 && currentBid <= 200;
          case 'above-200':
            return currentBid > 200;
          default:
            return true;
        }
      });
    }

    if (filters.bidActivity) {
      result = result.filter(item => {
        const bidCount = item.bids?.length || 0;
        switch (filters.bidActivity) {
          case 'no-bids':
            return bidCount === 0;
          case '1-5-bids':
            return bidCount >= 1 && bidCount <= 5;
          case '5-plus-bids':
            return bidCount > 5;
          case 'most-active':
            return bidCount >= 10;
          default:
            return true;
        }
      });
    }

    // Apply sorting
    switch (sortBy) {
      case 'ending-soon':
        result.sort((a, b) => {
          const timeA = calculateTimeRemaining(a.endDate);
          const timeB = calculateTimeRemaining(b.endDate);
          if (timeA.isEnded && !timeB.isEnded) return 1;
          if (!timeA.isEnded && timeB.isEnded) return -1;
          const endA = a.endDate.toDate ? a.endDate.toDate() : new Date(a.endDate);
          const endB = b.endDate.toDate ? b.endDate.toDate() : new Date(b.endDate);
          return endA.getTime() - endB.getTime();
        });
        break;
      case 'most-bids':
        result.sort((a, b) => (b.bids?.length || 0) - (a.bids?.length || 0));
        break;
      case 'newest':
        result.sort((a, b) => {
          const timeA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
          const timeB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
          return timeB.getTime() - timeA.getTime();
        });
        break;
      case 'lowest-bid':
        result.sort((a, b) => getCurrentBidPrice(a) - getCurrentBidPrice(b));
        break;
      case 'highest-bid':
        result.sort((a, b) => getCurrentBidPrice(b) - getCurrentBidPrice(a));
        break;
      default:
        break;
    }

    return result;
  };

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    const filtered = applySearchAndFilters(value, appliedFilters, allBids);
    setFilteredBids(filtered);
  };

  // Handle search form submission
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const filtered = applySearchAndFilters(searchQuery, appliedFilters, allBids);
    setFilteredBids(filtered);
  };

  // Handle filter changes
  const handleFilterChange = (filterType: keyof typeof selectedFilters, value: string) => {
    setSelectedFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  // Clear search
  const clearSearch = () => {
    setSearchQuery('');
    const filtered = applySearchAndFilters('', appliedFilters, allBids);
    setFilteredBids(filtered);
  };

  // Remove individual filter
  const removeFilter = (filterType: keyof typeof appliedFilters) => {
    const newFilters = { ...appliedFilters, [filterType]: '' };
    setAppliedFilters(newFilters);
    setSelectedFilters(prev => ({ ...prev, [filterType]: '' }));
    
    const filtered = applySearchAndFilters(searchQuery, newFilters, allBids);
    setFilteredBids(filtered);
  };

  // Check if any filters are active
  const hasActiveFilters = () => {
    return Object.values(appliedFilters).some(filter => filter !== '');
  };

  // Check if search is active
  const isSearchActive = () => {
    return searchQuery.trim() !== '';
  };

  // Apply filters
  const applyFilters = () => {
    setAppliedFilters({ ...selectedFilters });
    setShowFilters(false);
    const filtered = applySearchAndFilters(searchQuery, selectedFilters, allBids);
    setFilteredBids(filtered);
  };

  // Clear filters
  const clearFilters = () => {
    const emptyFilters = { category: '', condition: '', brand: '', status: '', priceRange: '', bidActivity: '' };
    setSelectedFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
    const filtered = applySearchAndFilters(searchQuery, emptyFilters, allBids);
    setFilteredBids(filtered);
  };

  // Clear all
  const clearAll = () => {
    setSearchQuery('');
    const emptyFilters = { category: '', condition: '', brand: '', status: '', priceRange: '', bidActivity: '' };
    setSelectedFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
    setFilteredBids(allBids);
  };

  // Fetch favorites
  const fetchFavorites = async () => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return;

    try {
      const favoritesQuery = query(collection(db, "favorites", user.uid, "items"));
      const snapshot = await getDocs(favoritesQuery);
      const favoriteProductIds = snapshot.docs.map(doc => doc.data().productId);
      setFavoriteIds(favoriteProductIds);
    } catch (error) {
      console.error("Error fetching favorites:", error);
    }
  };

  // Toggle favorite
  const toggleFavorite = async (productId: string) => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) {
      alert("Please log in to add favorites");
      return;
    }

    try {
      const favoriteDocRef = doc(db, "favorites", user.uid, "items", productId);
      
      if (favoriteIds.includes(productId)) {
        await deleteDoc(favoriteDocRef);
        setFavoriteIds(prev => prev.filter(id => id !== productId));
      } else {
        await setDoc(favoriteDocRef, {
          productId: productId,
          addedAt: new Date()
        });
        setFavoriteIds(prev => [...prev, productId]);
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
      alert("Error updating favorites. Please try again.");
    }
  };

  // Fetch data on component mount
  useEffect(() => {
    const fetchBids = async () => {
      try {
        const q = query(collection(db, "bids"), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        const now = new Date();

        const items = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as BidItem))
          .filter(bid => {
            // Only show active bids that haven't ended
            if (bid.status && bid.status !== "active") return false;
            if ((bid as any).sold === true) return false;
            
            if (bid.endDate) {
              const endDate = bid.endDate.toDate ? bid.endDate.toDate() : new Date(bid.endDate);
              if (endDate < now) return false;
            }
            
            return true;
          });

        setAllBids(items);

        // Fetch seller info for all items
        const sellerData: { [key: string]: SellerInfo } = {};
        for (const item of items) {
          const sellerId = item.userId || item.sellerId;
          if (sellerId && !sellerData[sellerId]) {
            sellerData[sellerId] = await fetchSellerInfo(sellerId);
          }
        }
        setSellerInfos(sellerData);
      } catch (error) {
        console.error("Error fetching bids:", error);
      }
    };

    const fetchFilters = async () => {
      try {
        const catSnap = await getDocs(collection(db, 'categories'));
        const brandsSnap = await getDocs(collection(db, 'brands'));
        const condSnap = await getDocs(collection(db, 'conditions'));
        
        setCategories(catSnap.docs.map(doc => doc.data().name));
        setBrands(brandsSnap.docs.map(doc => doc.data().name));
        setConditions(condSnap.docs.map(doc => doc.data().name));
      } catch (error) {
        console.error("Error fetching filters:", error);
      }
    };

    fetchBids();
    fetchFilters();
    fetchFavorites();
  }, []);

  // Apply search and filters when data changes
  useEffect(() => {
    const filtered = applySearchAndFilters(searchQuery, appliedFilters, allBids);
    setFilteredBids(filtered);
  }, [allBids, appliedFilters, searchQuery, sellerInfos, brands, sortBy, currentTime]);

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
              Biddings
              <br />
              <span style={{ color: '#fff3cd' }}>Bid & Win Amazing Deals</span>
            </h2>
            <p style={{
              fontSize: '1.2rem',
              marginBottom: '3rem',
              opacity: 0.9,
              textShadow: '0 2px 4px rgba(0,0,0,0.3)'
            }}>
              Place your bids on unique secondhand fashion items and compete for the best prices
            </p>

            {/* Search Bar */}
            <form onSubmit={handleSearchSubmit} style={{
              display: 'flex',
              maxWidth: '600px',
              margin: '0 auto',
              position: 'relative'
            }}>
              <div style={{
                flex: 1,
                position: 'relative',
                display: 'flex',
                alignItems: 'center'
              }}>
                <Search 
                  size={20} 
                  style={{
                    position: 'absolute',
                    left: '1rem',
                    color: '#666',
                    zIndex: 2
                  }} 
                />
                <input
                  type="text"
                  placeholder="Search auctions by item name..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  style={{
                    width: '100%',
                    padding: '1rem 3rem 1rem 3rem',
                    borderRadius: '12px 0 0 12px',
                    border: 'none',
                    fontSize: '1rem',
                    outline: 'none',
                    color: '#000'
                  }}
                />
                {isSearchActive() && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    style={{
                      position: 'absolute',
                      right: '1rem',
                      background: 'none',
                      border: 'none',
                      color: '#666',
                      cursor: 'pointer',
                      padding: '0.25rem',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 2
                    }}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
              
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                style={{
                  background: '#fff',
                  border: 'none',
                  padding: '1rem',
                  borderLeft: '1px solid #eee',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  color: '#000'
                }}
              >
                <Filter size={20} />
                Filter {hasActiveFilters() && `(${Object.values(appliedFilters).filter(f => f).length})`}
              </button>
              
              <button
                type="submit"
                style={{
                  background: '#333',
                  color: '#fff',
                  border: 'none',
                  padding: '1rem 2rem',
                  borderRadius: '0 12px 12px 0',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                Search
              </button>
            </form>

            {/* Filter Panel */}
            {showFilters && (
              <div style={{
                marginTop: '1rem',
                background: '#fff',
                borderRadius: '12px',
                padding: '1.5rem',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                textAlign: 'left'
              }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '1rem',
                  marginBottom: '1rem'
                }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                      Status
                    </label>
                    <select
                      value={selectedFilters.status}
                      onChange={(e) => handleFilterChange('status', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        borderRadius: '8px',
                        border: '1px solid #ddd',
                        color: '#000'
                      }}
                    >
                      <option value="">All Bids</option>
                      <option value="ending-soon">Ending Soon</option>
                      <option value="new">New (&lt; 3 days)</option>
                      <option value="hot">Hot (5+ bids)</option>
                      <option value="no-bids">No Bids Yet</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                      Category
                    </label>
                    <select
                      value={selectedFilters.category}
                      onChange={(e) => handleFilterChange('category', e.target.value)}
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

                  {/* <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                      Condition
                    </label>
                    <select
                      value={selectedFilters.condition}
                      onChange={(e) => handleFilterChange('condition', e.target.value)}
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
                  </div> */}

                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                      Price Range
                    </label>
                    <select
                      value={selectedFilters.priceRange}
                      onChange={(e) => handleFilterChange('priceRange', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        borderRadius: '8px',
                        border: '1px solid #ddd',
                        color: '#000'
                      }}
                    >
                      <option value="">All Prices</option>
                      <option value="under-50">Under RM 50</option>
                      <option value="50-100">RM 50 - RM 100</option>
                      <option value="100-200">RM 100 - RM 200</option>
                      <option value="above-200">Above RM 200</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                      Bid Activity
                    </label>
                    <select
                      value={selectedFilters.bidActivity}
                      onChange={(e) => handleFilterChange('bidActivity', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        borderRadius: '8px',
                        border: '1px solid #ddd',
                        color: '#000'
                      }}
                    >
                      <option value="">All Activity</option>
                      <option value="no-bids">No Bids Yet</option>
                      <option value="1-5-bids">1-5 Bids</option>
                      <option value="5-plus-bids">5+ Bids</option>
                      <option value="most-active">Most Active (10+)</option>
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
          </div>
        </section>

        {/* Search Results Info & Active Filters */}
        {(isSearchActive() || hasActiveFilters()) && (
          <section style={{ padding: '1rem 2rem 0', background: '#f8f9fa' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem'
              }}>
                <div style={{ color: '#666', fontSize: '0.95rem' }}>
                    <strong>{filteredBids.length}</strong> auction{filteredBids.length !== 1 ? 's' : ''} found
                </div>
                
                {(isSearchActive() || hasActiveFilters()) && (
                  <button
                    onClick={clearAll}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#c9a26d',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      textDecoration: 'underline'
                    }}
                  >
                    Clear all
                  </button>
                )}
              </div>

              {/* Active Filters Tags */}
              {(isSearchActive() || hasActiveFilters()) && (
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                  marginBottom: '1rem'
                }}>
                  {Object.entries(appliedFilters).map(([key, value]) =>
                    value && (
                      <div key={key} style={{
                        background: '#f3e5f5',
                        color: '#7b1fa2',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '20px',
                        fontSize: '0.85rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                        {key.charAt(0).toUpperCase() + key.slice(1)}: {value}
                        <button
                          onClick={() => removeFilter(key as keyof typeof appliedFilters)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#7b1fa2',
                            cursor: 'pointer',
                            padding: '0',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Sort Options */}
        <section style={{ 
          padding: '1rem 2rem',
          background: (isSearchActive() || hasActiveFilters()) ? '#f8f9fa' : '#fff'
        }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{
                fontSize: '2rem',
                fontWeight: '700',
                margin: 0
              }}>
                {(isSearchActive() || hasActiveFilters()) ? 'Search Results' : 'Live Auctions'}
              </h2>
            </div>
          </div>
        </section>

        {/* Auctions Grid */}
        <section style={{ 
          padding: '0 2rem 3rem',
          background: (isSearchActive() || hasActiveFilters()) ? '#f8f9fa' : '#fff'
        }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '1.5rem'
            }}>
              {filteredBids.length === 0 ? (
                <div style={{
                  gridColumn: '1 / -1',
                  textAlign: 'center',
                  padding: '3rem',
                  color: '#666'
                }}>
                  {(isSearchActive() || hasActiveFilters()) ? (
                    <div>
                      <Gavel size={48} style={{ color: '#c9a26d', marginBottom: '1rem' }} />
                      <p style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>
                        No auctions found matching your criteria
                      </p>
                      <p>Try adjusting your search terms or filters</p>
                    </div>
                  ) : (
                    <div>
                      <Gavel size={48} style={{ color: '#c9a26d', marginBottom: '1rem' }} />
                      <p>No active auctions at the moment</p>
                    </div>
                  )}
                </div>
              ) : (
                filteredBids.map(bid => {
                  const timeRemaining = calculateTimeRemaining(bid.endDate);
                  const currentBid = getCurrentBidPrice(bid);
                  const startingPrice = getStartingPrice(bid);
                  const sellerId = bid.userId || bid.sellerId;
                  const sellerInfo = sellerId ? sellerInfos[sellerId] : null;

                  return (
                    <div
                      key={bid.id}
                      style={{
                        background: '#fff',
                        borderRadius: '12px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        transition: 'transform 0.2s ease',
                        border: timeRemaining.isEndingSoon ? '2px solid #ff4757' : '1px solid #f0f0f0',
                        position: 'relative'
                      }}
                      onClick={() => router.push(`/view_item?id=${bid.id}`)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.07)';
                      }}
                    >
                      <div style={{ position: 'relative' }}>
                        <img
                          src={bid.images?.[0] || bid.image || "https://via.placeholder.com/300x300"}
                          alt={bid.productName || bid.name || bid.title || "Auction Item"}
                          style={{
                            width: '100%',
                            height: '250px',
                            objectFit: 'cover'
                          }}
                        />

                        {/* Countdown Timer */}
                        <div style={{
                          position: 'absolute',
                          bottom: '0.75rem',
                          left: '0.75rem',
                          right: '0.75rem',
                          background: 'rgba(0,0,0,0.8)',
                          color: '#fff',
                          padding: '0.5rem',
                          borderRadius: '6px',
                          textAlign: 'center',
                          fontSize: '0.875rem',
                          fontWeight: '600'
                        }}>
                          {timeRemaining.isEnded ? 'Auction Ended' : `Ends in ${timeRemaining.display}`}
                        </div>
                      </div>

                      <div style={{ padding: '1rem' }}>
                        <h3 style={{
                          fontSize: '1.1rem',
                          fontWeight: '600',
                          marginBottom: '0.5rem',
                          color: '#333'
                        }}>
                          {bid.productName || bid.name || bid.title || "Auction Item"}
                        </h3>

                        {/* Bid Information */}
                        <div style={{ marginBottom: '0.75rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                            <span style={{ fontSize: '0.875rem', color: '#666' }}>Current Bid</span>
                            <span style={{
                              fontSize: '1.25rem',
                              fontWeight: '700',
                              color: '#c9a26d'
                            }}>
                              RM {currentBid.toFixed(2)}
                            </span>
                          </div>
                          
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                            <span style={{ fontSize: '0.75rem', color: '#888' }}>Starting Price</span>
                            <span style={{
                                fontSize: '0.875rem',
                                color: '#888',
                                textDecoration: 'line-through'
                            }}>
                                RM {startingPrice.toFixed(2)}
                            </span>
                          </div>
                          
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: '#666' }}>
                              <Users size={12} />
                              {bid.bids?.length || 0} bid{(bid.bids?.length || 0) !== 1 ? 's' : ''}
                            </div>
                            <span style={{ fontSize: '0.75rem', color: '#666' }}>
                              Min +RM {bid.minIncrement.toFixed(2)}
                            </span>
                          </div>
                        </div>

                        {/* Seller Info */}
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '0.5rem',
                          marginBottom: '0.75rem'
                        }}>
                          <div style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            overflow: 'hidden',
                            background: '#f0f0f0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            {sellerInfo?.profilePhoto ? (
                              <img
                                src={sellerInfo.profilePhoto}
                                alt="Seller"
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover'
                                }}
                              />
                            ) : (
                              <span style={{
                                fontSize: '0.7rem',
                                fontWeight: '600',
                                color: '#666'
                              }}>
                                {sellerInfo?.username?.charAt(0).toUpperCase() || 'S'}
                              </span>
                            )}
                          </div>
                          
                          <span style={{ 
                            fontSize: '0.875rem', 
                            color: '#666',
                            fontWeight: '500'
                          }}>
                            {sellerInfo?.username || 'Seller'}
                          </span>
                        </div>

                        {/* Tags */}
                        <div style={{
                          display: 'flex',
                          gap: '0.5rem',
                          marginBottom: '0.75rem',
                          flexWrap: 'wrap'
                        }}>
                          {bid.condition && (
                            <span style={{
                              background: '#f9f7f1',
                              color: '#c9a26d',
                              padding: '0.25rem 0.5rem',
                              borderRadius: '12px',
                              fontSize: '0.75rem',
                              fontWeight: '500'
                            }}>
                              {bid.condition}
                            </span>
                          )}
                          {bid.size && (
                            <span style={{
                              background: '#f9f9f9',
                              color: '#666',
                              padding: '0.25rem 0.5rem',
                              borderRadius: '12px',
                              fontSize: '0.75rem'
                            }}>
                              Size {bid.size}
                            </span>
                          )}
                        </div>

                        {/* Location */}
                        {bid.location && (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            color: '#888',
                            fontSize: '0.875rem'
                          }}>
                            <MapPin size={12} />
                            {bid.location}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>
      </div>
      
      <Footer/>
    </div>
  );
};

export default BiddingPage;
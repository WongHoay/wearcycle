"use client";
import React, { useState, useEffect, useCallback } from "react";
import { Search, Filter, Clock, Eye, Heart, TrendingUp, Users, MapPin, Tag, ChevronDown, RefreshCw, AlertCircle, CheckCircle, Package, DollarSign } from "lucide-react";

// TypeScript interfaces
interface BidItem {
    id: string;
    title: string;
    description: string;
    category: string;
    condition: string;
    brand: string;
    size: string;
    color: string;
    images: string[];
    currentBid: number;
    startingBid: number;
    bidCount: number;
    timeRemaining: number; // in seconds
    endDate: string;
    location: string;
    seller: {
        name: string;
        rating: number;
        verified: boolean;
    };
    urgencyLevel: string;
    isFavorite: boolean;
    isActive: boolean;
    tags: string[];
}

interface FilterState {
    category: string;
    condition: string;
    location: string;
    priceRange: string;
    urgency: string;
    sortBy: string;
}

const OngoingBidsPage: React.FC = () => {
    const [bidItems, setBidItems] = useState<BidItem[]>([]);
    const [filteredItems, setFilteredItems] = useState<BidItem[]>([]);
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [filters, setFilters] = useState<FilterState>({
        category: "",
        condition: "",
        location: "",
        priceRange: "",
        urgency: "",
        sortBy: "timeRemaining"
    });
    const [showFilters, setShowFilters] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(true);
    const [refreshing, setRefreshing] = useState<boolean>(false);

    // Sample data
    const sampleBidItems: BidItem[] = [
        {
            id: "bid-001",
            title: "Vintage Levi's 501 Original Jeans",
            description: "Looking for authentic vintage Levi's 501 jeans in good condition. Preferably from the 80s or 90s.",
            category: "Bottoms",
            condition: "Good",
            brand: "Levi's",
            size: "32",
            color: "Blue",
            images: ["https://images.unsplash.com/photo-1542272604-787c3835535d?w=400&h=400&fit=crop"],
            currentBid: 85,
            startingBid: 50,
            bidCount: 7,
            timeRemaining: 86400, // 1 day
            endDate: "2025-01-16T18:00:00",
            location: "Kuala Lumpur",
            seller: {
                name: "Ahmad Rahman",
                rating: 4.8,
                verified: true
            },
            urgencyLevel: "Medium",
            isFavorite: false,
            isActive: true,
            tags: ["vintage", "authentic", "rare"]
        },
        {
            id: "bid-002",
            title: "Nike Air Jordan 1 Retro High",
            description: "Seeking Nike Air Jordan 1 Retro High in Chicago colorway. Size US 9. Must be authentic with original box.",
            category: "Shoes",
            condition: "Like New",
            brand: "Nike",
            size: "US 9",
            color: "Red",
            images: ["https://images.unsplash.com/photo-1551107696-a4b6c6ebb35a?w=400&h=400&fit=crop"],
            currentBid: 320,
            startingBid: 200,
            bidCount: 12,
            timeRemaining: 3600, // 1 hour
            endDate: "2025-01-15T20:00:00",
            location: "Selangor",
            seller: {
                name: "Sneaker Collector",
                rating: 4.9,
                verified: true
            },
            urgencyLevel: "High",
            isFavorite: true,
            isActive: true,
            tags: ["sneakers", "jordan", "chicago"]
        },
        {
            id: "bid-003",
            title: "Chanel Classic Flap Bag",
            description: "Looking for authentic Chanel Classic Flap Bag in black quilted leather. Medium size preferred.",
            category: "Bags",
            condition: "Good",
            brand: "Chanel",
            size: "Medium",
            color: "Black",
            images: ["https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&h=400&fit=crop"],
            currentBid: 2800,
            startingBid: 2000,
            bidCount: 15,
            timeRemaining: 172800, // 2 days
            endDate: "2025-01-17T15:30:00",
            location: "Penang",
            seller: {
                name: "Luxury Consign",
                rating: 4.7,
                verified: true
            },
            urgencyLevel: "Low",
            isFavorite: false,
            isActive: true,
            tags: ["luxury", "designer", "authentic"]
        },
        {
            id: "bid-004",
            title: "Supreme Box Logo Hoodie",
            description: "Want Supreme Box Logo Hoodie from FW20 collection. Size Large. Any color except white.",
            category: "Tops",
            condition: "Good",
            brand: "Supreme",
            size: "L",
            color: "Multi-color",
            images: ["https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400&h=400&fit=crop"],
            currentBid: 450,
            startingBid: 300,
            bidCount: 8,
            timeRemaining: 43200, // 12 hours
            endDate: "2025-01-16T08:00:00",
            location: "Johor",
            seller: {
                name: "Streetwear Hub",
                rating: 4.6,
                verified: false
            },
            urgencyLevel: "Medium",
            isFavorite: true,
            isActive: true,
            tags: ["streetwear", "supreme", "fw20"]
        },
        {
            id: "bid-005",
            title: "Rolex Submariner Date",
            description: "Looking for Rolex Submariner Date ref. 116610LN. Must have box and papers. Excellent condition only.",
            category: "Watches",
            condition: "Like New",
            brand: "Rolex",
            size: "40mm",
            color: "Black",
            images: ["https://images.unsplash.com/photo-1606868306217-dbf5046868d2?w=400&h=400&fit=crop"],
            currentBid: 8500,
            startingBid: 7000,
            bidCount: 23,
            timeRemaining: 259200, // 3 days
            endDate: "2025-01-18T12:00:00",
            location: "Kuala Lumpur",
            seller: {
                name: "Watch Specialist",
                rating: 4.9,
                verified: true
            },
            urgencyLevel: "Low",
            isFavorite: false,
            isActive: true,
            tags: ["luxury", "watches", "rolex"]
        },
        {
            id: "bid-006",
            title: "Hermès Birkin 30",
            description: "Seeking Hermès Birkin 30 in Togo leather. Preferably in neutral colors like black, brown, or etoupe.",
            category: "Bags",
            condition: "Good",
            brand: "Hermès",
            size: "30cm",
            color: "Brown",
            images: ["https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop"],
            currentBid: 12000,
            startingBid: 8000,
            bidCount: 31,
            timeRemaining: 604800, // 7 days
            endDate: "2025-01-22T16:00:00",
            location: "Selangor",
            seller: {
                name: "Luxury Vault",
                rating: 5.0,
                verified: true
            },
            urgencyLevel: "Low",
            isFavorite: true,
            isActive: true,
            tags: ["hermes", "birkin", "investment"]
        }
    ];

    // Constants
    const categories = ['All', 'Tops', 'Bottoms', 'Dresses', 'Outerwear', 'Shoes', 'Bags', 'Accessories', 'Jewelry', 'Watches', 'Electronics'];
    const conditions = ['All', 'Like New', 'Good', 'Fair', 'Worn'];
    const locations = ['All', 'Kuala Lumpur', 'Selangor', 'Penang', 'Johor', 'Perak', 'Sabah', 'Sarawak'];
    const priceRanges = ['All', 'Under RM 100', 'RM 100-500', 'RM 500-1000', 'RM 1000-5000', 'Over RM 5000'];
    const urgencyLevels = ['All', 'Low', 'Medium', 'High', 'Urgent'];
    const sortOptions = [
        { value: 'timeRemaining', label: 'Time Remaining' },
        { value: 'currentBid', label: 'Current Bid' },
        { value: 'bidCount', label: 'Most Bids' },
        { value: 'newest', label: 'Newest First' }
    ];

    // Time formatting function
    const formatTimeRemaining = (seconds: number): string => {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);

        if (days > 0) return `${days}d ${hours}h`;
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
    };

    // Get urgency color
    const getUrgencyColor = (timeRemaining: number): string => {
        if (timeRemaining < 3600) return '#dc3545'; // Red for < 1 hour
        if (timeRemaining < 86400) return '#fd7e14'; // Orange for < 1 day
        if (timeRemaining < 259200) return '#ffc107'; // Yellow for < 3 days
        return '#28a745'; // Green for > 3 days
    };

    // Load data
    useEffect(() => {
        const loadBidItems = async () => {
            setLoading(true);
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));
            setBidItems(sampleBidItems);
            setFilteredItems(sampleBidItems);
            setLoading(false);
        };

        loadBidItems();
    }, []);

    // Filter and search logic
    useEffect(() => {
        let filtered = [...bidItems];

        // Search filter
        if (searchQuery) {
            filtered = filtered.filter(item =>
                item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
            );
        }

        // Category filter
        if (filters.category && filters.category !== 'All') {
            filtered = filtered.filter(item => item.category === filters.category);
        }

        // Condition filter
        if (filters.condition && filters.condition !== 'All') {
            filtered = filtered.filter(item => item.condition === filters.condition);
        }

        // Location filter
        if (filters.location && filters.location !== 'All') {
            filtered = filtered.filter(item => item.location === filters.location);
        }

        // Price range filter
        if (filters.priceRange && filters.priceRange !== 'All') {
            filtered = filtered.filter(item => {
                const price = item.currentBid;
                switch (filters.priceRange) {
                    case 'Under RM 100': return price < 100;
                    case 'RM 100-500': return price >= 100 && price <= 500;
                    case 'RM 500-1000': return price >= 500 && price <= 1000;
                    case 'RM 1000-5000': return price >= 1000 && price <= 5000;
                    case 'Over RM 5000': return price > 5000;
                    default: return true;
                }
            });
        }

        // Urgency filter
        if (filters.urgency && filters.urgency !== 'All') {
            filtered = filtered.filter(item => item.urgencyLevel === filters.urgency);
        }

        // Sort
        filtered.sort((a, b) => {
            switch (filters.sortBy) {
                case 'timeRemaining':
                    return a.timeRemaining - b.timeRemaining;
                case 'currentBid':
                    return b.currentBid - a.currentBid;
                case 'bidCount':
                    return b.bidCount - a.bidCount;
                case 'newest':
                    return new Date(b.endDate).getTime() - new Date(a.endDate).getTime();
                default:
                    return 0;
            }
        });

        setFilteredItems(filtered);
    }, [bidItems, searchQuery, filters]);

    const handleFilterChange = useCallback((filterType: keyof FilterState, value: string) => {
        setFilters(prev => ({
            ...prev,
            [filterType]: value
        }));
    }, []);

    const toggleFavorite = useCallback((itemId: string) => {
        setBidItems(prev => prev.map(item =>
            item.id === itemId ? { ...item, isFavorite: !item.isFavorite } : item
        ));
    }, []);

    const refreshData = useCallback(async () => {
        setRefreshing(true);
        // Simulate API refresh
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Update time remaining for all items (simulate real-time updates)
        setBidItems(prev => prev.map(item => ({
            ...item,
            timeRemaining: Math.max(0, item.timeRemaining - Math.floor(Math.random() * 300))
        })));
        
        setRefreshing(false);
    }, []);

    // Auto-refresh every 30 seconds
    useEffect(() => {
        const interval = setInterval(refreshData, 30000);
        return () => clearInterval(interval);
    }, [refreshData]);

    const styles: { [key: string]: React.CSSProperties } = {
        container: {
            minHeight: "100vh",
            background: "linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)",
            fontFamily: 'system-ui, -apple-system, sans-serif',
        },
        main: {
            maxWidth: "1400px",
            margin: "0 auto",
            padding: "2rem",
        },
        header: {
            background: "white",
            borderRadius: "20px",
            padding: "2rem",
            marginBottom: "2rem",
            boxShadow: "0 4px 15px rgba(0,0,0,0.08)",
        },
        title: {
            fontSize: "2.5rem",
            fontWeight: "800",
            color: "#2c3e50",
            marginBottom: "0.5rem",
            background: "linear-gradient(135deg, #c9a26d, #8b7355)",
            backgroundClip: "text",
            WebkitBackgroundClip: "text",
            // color: "transparent", // Removed duplicate property
        },
        subtitle: {
            fontSize: "1.1rem",
            color: "#6c757d",
            marginBottom: "2rem",
        },
        searchBar: {
            display: "flex",
            gap: "1rem",
            alignItems: "center",
            marginBottom: "1rem",
        },
        searchInput: {
            flex: 1,
            padding: "1rem",
            border: "2px solid #e9ecef",
            borderRadius: "12px",
            fontSize: "1rem",
            background: "#fff",
        },
        filterButton: {
            padding: "1rem",
            border: "2px solid #c9a26d",
            borderRadius: "12px",
            background: showFilters ? "#c9a26d" : "white",
            color: showFilters ? "white" : "#c9a26d",
            cursor: "pointer",
            fontWeight: "600",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
        },
        refreshButton: {
            padding: "1rem",
            border: "2px solid #28a745",
            borderRadius: "12px",
            background: "white",
            color: "#28a745",
            cursor: "pointer",
            fontWeight: "600",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
        },
        filtersPanel: {
            background: "white",
            borderRadius: "12px",
            padding: "1.5rem",
            marginBottom: "2rem",
            boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
            display: showFilters ? "block" : "none",
        },
        filtersGrid: {
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "1rem",
            marginBottom: "1rem",
        },
        filterGroup: {
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
        },
        filterLabel: {
            fontWeight: "600",
            color: "#2c3e50",
            fontSize: "0.9rem",
        },
        filterSelect: {
            padding: "0.75rem",
            border: "2px solid #e9ecef",
            borderRadius: "8px",
            fontSize: "0.9rem",
            background: "#fff",
            cursor: "pointer",
        },
        statsBar: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "white",
            padding: "1rem 1.5rem",
            borderRadius: "12px",
            marginBottom: "2rem",
            boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
        },
        statsText: {
            color: "#6c757d",
            fontSize: "0.9rem",
        },
        gridContainer: {
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(400px, 1fr))",
            gap: "2rem",
        },
        bidCard: {
            background: "white",
            borderRadius: "16px",
            overflow: "hidden",
            boxShadow: "0 4px 15px rgba(0,0,0,0.08)",
            transition: "all 0.3s ease",
            position: "relative",
            cursor: "pointer",
        },
        cardHeader: {
            position: "relative",
            height: "200px",
        },
        cardImage: {
            width: "100%",
            height: "100%",
            objectFit: "cover",
        },
        favoriteButton: {
            position: "absolute",
            top: "12px",
            right: "12px",
            background: "rgba(255,255,255,0.9)",
            border: "none",
            borderRadius: "50%",
            width: "36px",
            height: "36px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
        },
        urgencyBadge: {
            position: "absolute",
            top: "12px",
            left: "12px",
            padding: "0.25rem 0.75rem",
            borderRadius: "20px",
            fontSize: "0.75rem",
            fontWeight: "600",
            color: "white",
        },
        cardContent: {
            padding: "1.5rem",
        },
        cardTitle: {
            fontSize: "1.25rem",
            fontWeight: "700",
            color: "#2c3e50",
            marginBottom: "0.5rem",
            lineHeight: "1.3",
        },
        cardDescription: {
            color: "#6c757d",
            fontSize: "0.9rem",
            marginBottom: "1rem",
            lineHeight: "1.4",
        },
        cardTags: {
            display: "flex",
            gap: "0.5rem",
            marginBottom: "1rem",
            flexWrap: "wrap",
        },
        tag: {
            background: "#f8f9fa",
            color: "#6c757d",
            padding: "0.25rem 0.5rem",
            borderRadius: "12px",
            fontSize: "0.75rem",
            fontWeight: "500",
        },
        cardMeta: {
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "1rem",
            marginBottom: "1rem",
        },
        metaItem: {
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            fontSize: "0.85rem",
            color: "#6c757d",
        },
        cardFooter: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingTop: "1rem",
            borderTop: "1px solid #e9ecef",
        },
        bidInfo: {
            display: "flex",
            flexDirection: "column",
            gap: "0.25rem",
        },
        currentBid: {
            fontSize: "1.5rem",
            fontWeight: "800",
            color: "#c9a26d",
        },
        bidCount: {
            fontSize: "0.8rem",
            color: "#6c757d",
        },
        timeRemaining: {
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            fontSize: "0.9rem",
            fontWeight: "600",
        },
        loadingContainer: {
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "400px",
            fontSize: "1.1rem",
            color: "#6c757d",
        },
        emptyState: {
            textAlign: "center",
            padding: "4rem 2rem",
            background: "white",
            borderRadius: "16px",
            boxShadow: "0 4px 15px rgba(0,0,0,0.08)",
        },
        emptyIcon: {
            fontSize: "4rem",
            marginBottom: "1rem",
            opacity: 0.3,
        },
    };

    if (loading) {
        return (
            <div style={styles.container}>
                <div style={styles.loadingContainer}>
                    <RefreshCw size={24} style={{ animation: "spin 1s linear infinite", marginRight: "1rem" }} />
                    Loading ongoing bids...
                </div>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <div style={styles.main}>
                {/* Header */}
                <div style={styles.header}>
                    <h1 style={styles.title}>Ongoing Bid Requests</h1>
                    <p style={styles.subtitle}>
                        Browse active bid requests from users looking for specific items. 
                        Place your bid and compete with other sellers to win the deal.
                    </p>
                    
                    {/* Search Bar */}
                    <div style={styles.searchBar}>
                        <div style={{ position: "relative", flex: 1 }}>
                            <Search size={20} style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: "#6c757d" }} />
                            <input
                                type="text"
                                placeholder="Search by item name, brand, or description..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{ ...styles.searchInput, paddingLeft: "3rem" }}
                            />
                        </div>
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            style={styles.filterButton}
                        >
                            <Filter size={18} />
                            Filters
                            <ChevronDown size={16} style={{ transform: showFilters ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
                        </button>
                        <button
                            onClick={refreshData}
                            style={styles.refreshButton}
                            disabled={refreshing}
                        >
                            <RefreshCw size={18} style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }} />
                            Refresh
                        </button>
                    </div>
                </div>

                {/* Filters Panel */}
                <div style={styles.filtersPanel}>
                    <div style={styles.filtersGrid}>
                        <div style={styles.filterGroup}>
                            <label style={styles.filterLabel}>Category</label>
                            <select
                                value={filters.category}
                                onChange={(e) => handleFilterChange('category', e.target.value)}
                                style={styles.filterSelect}
                            >
                                {categories.map(cat => (
                                    <option key={cat} value={cat === 'All' ? '' : cat}>{cat}</option>
                                ))}
                            </select>
                        </div>

                        <div style={styles.filterGroup}>
                            <label style={styles.filterLabel}>Condition</label>
                            <select
                                value={filters.condition}
                                onChange={(e) => handleFilterChange('condition', e.target.value)}
                                style={styles.filterSelect}
                            >
                                {conditions.map(cond => (
                                    <option key={cond} value={cond === 'All' ? '' : cond}>{cond}</option>
                                ))}
                            </select>
                        </div>

                        <div style={styles.filterGroup}>
                            <label style={styles.filterLabel}>Location</label>
                            <select
                                value={filters.location}
                                onChange={(e) => handleFilterChange('location', e.target.value)}
                                style={styles.filterSelect}
                            >
                                {locations.map(loc => (
                                    <option key={loc} value={loc === 'All' ? '' : loc}>{loc}</option>
                                ))}
                            </select>
                        </div>

                        <div style={styles.filterGroup}>
                            <label style={styles.filterLabel}>Price Range</label>
                            <select
                                value={filters.priceRange}
                                onChange={(e) => handleFilterChange('priceRange', e.target.value)}
                                style={styles.filterSelect}
                            >
                                {priceRanges.map(range => (
                                    <option key={range} value={range === 'All' ? '' : range}>{range}</option>
                                ))}
                            </select>
                        </div>

                        <div style={styles.filterGroup}>
                            <label style={styles.filterLabel}>Urgency</label>
                            <select
                                value={filters.urgency}
                                onChange={(e) => handleFilterChange('urgency', e.target.value)}
                                style={styles.filterSelect}
                            >
                                {urgencyLevels.map(level => (
                                    <option key={level} value={level === 'All' ? '' : level}>{level}</option>
                                ))}
                            </select>
                        </div>

                        <div style={styles.filterGroup}>
                            <label style={styles.filterLabel}>Sort By</label>
                            <select
                                value={filters.sortBy}
                                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                                style={styles.filterSelect}
                            >
                                {sortOptions.map(option => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Stats Bar */}
                <div style={styles.statsBar}>
                    <span style={styles.statsText}>
                        Showing {filteredItems.length} of {bidItems.length} active bid requests
                    </span>
                    <span style={styles.statsText}>
                        Last updated: {new Date().toLocaleTimeString()}
                    </span>
                </div>

                {/* Bid Items Grid */}
                {filteredItems.length === 0 ? (
                    <div style={styles.emptyState}>
                        <AlertCircle size={64} style={{ color: "#6c757d", marginBottom: "1rem" }} />
                        <h3 style={{ color: "#2c3e50", marginBottom: "1rem" }}>No bid requests found</h3>
                        <p style={{ color: "#6c757d" }}>
                            Try adjusting your search criteria or filters to find more bid requests.
                        </p>
                    </div>
                ) : (
                    <div style={styles.gridContainer}>
                        {filteredItems.map((item) => (
                            <div
                                key={item.id}
                                style={styles.bidCard}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = "translateY(-4px)";
                                    e.currentTarget.style.boxShadow = "0 8px 25px rgba(0,0,0,0.15)";
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = "translateY(0)";
                                    e.currentTarget.style.boxShadow = "0 4px 15px rgba(0,0,0,0.08)";
                                }}
                            >
                                {/* Card Header with Image */}
                                <div style={styles.cardHeader}>
                                    <img
                                        src={item.images[0]}
                                        alt={item.title}
                                        style={styles.cardImage}
                                    />
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggleFavorite(item.id);
                                        }}
                                        style={styles.favoriteButton}
                                    >
                                        <Heart
                                            size={18}
                                            fill={item.isFavorite ? "#dc3545" : "none"}
                                            color={item.isFavorite ? "#dc3545" : "#6c757d"}
                                        />
                                    </button>
                                    <div
                                        style={{
                                            ...styles.urgencyBadge,
                                            backgroundColor: getUrgencyColor(item.timeRemaining)
                                        }}
                                    >
                                        {item.urgencyLevel}
                                    </div>
                                </div>

                                {/* Card Content */}
                                <div style={styles.cardContent}>
                                    <h3 style={styles.cardTitle}>{item.title}</h3>
                                    <p style={styles.cardDescription}>
                                        {item.description.length > 100 
                                            ? `${item.description.substring(0, 100)}...` 
                                            : item.description
                                        }
                                    </p>

                                    {/* Tags */}
                                    <div style={styles.cardTags}>
                                        {item.tags.map((tag, index) => (
                                            <span key={index} style={styles.tag}>
                                                <Tag size={12} style={{ marginRight: "0.25rem" }} />
                                                {tag}
                                            </span>
                                        ))}
                                    </div>

                                    {/* Meta Information */}
                                    <div style={styles.cardMeta}>
                                        <div style={styles.metaItem}>
                                            <Package size={16} />
                                            {item.condition} • {item.brand}
                                        </div>
                                        <div style={styles.metaItem}>
                                            <MapPin size={16} />
                                            {item.location}
                                        </div>
                                        <div style={styles.metaItem}>
                                            <Users size={16} />
                                            {item.seller.name}
                                            {item.seller.verified && (
                                                <CheckCircle size={14} style={{ color: "#28a745", marginLeft: "0.25rem" }} />
                                            )}
                                        </div>
                                        <div style={styles.metaItem}>
                                            <TrendingUp size={16} />
                                            Rating: {item.seller.rating}/5
                                        </div>
                                    </div>

                                    {/* Card Footer */}
                                    <div style={styles.cardFooter}>
                                        <div style={styles.bidInfo}>
                                            <div style={styles.currentBid}>
                                                RM {item.currentBid.toLocaleString()}
                                            </div>
                                            <div style={styles.bidCount}>
                                                {item.bidCount} bid{item.bidCount !== 1 ? 's' : ''} • Started at RM {item.startingBid}
                                            </div>
                                        </div>
                                        <div style={{
                                            ...styles.timeRemaining,
                                            color: getUrgencyColor(item.timeRemaining)
                                        }}>
                                            <Clock size={16} />
                                            {formatTimeRemaining(item.timeRemaining)}
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div style={{
                                        display: "flex",
                                        gap: "0.75rem",
                                        marginTop: "1rem",
                                        paddingTop: "1rem",
                                        borderTop: "1px solid #e9ecef"
                                    }}>
                                        <button
                                            style={{
                                                flex: 1,
                                                padding: "0.75rem",
                                                background: "linear-gradient(135deg, #c9a26d, #8b7355)",
                                                color: "white",
                                                border: "none",
                                                borderRadius: "8px",
                                                fontWeight: "600",
                                                cursor: "pointer",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                gap: "0.5rem",
                                                transition: "all 0.2s ease"
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.transform = "translateY(-1px)";
                                                e.currentTarget.style.boxShadow = "0 4px 12px rgba(201, 162, 109, 0.3)";
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.transform = "translateY(0)";
                                                e.currentTarget.style.boxShadow = "none";
                                            }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                // Handle place bid action
                                                console.log(`Place bid on ${item.id}`);
                                            }}
                                        >
                                            <DollarSign size={16} />
                                            Place Bid
                                        </button>
                                        <button
                                            style={{
                                                padding: "0.75rem",
                                                background: "white",
                                                color: "#6c757d",
                                                border: "2px solid #e9ecef",
                                                borderRadius: "8px",
                                                cursor: "pointer",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                transition: "all 0.2s ease"
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.borderColor = "#c9a26d";
                                                e.currentTarget.style.color = "#c9a26d";
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.borderColor = "#e9ecef";
                                                e.currentTarget.style.color = "#6c757d";
                                            }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                // Handle view details action
                                                console.log(`View details for ${item.id}`);
                                            }}
                                        >
                                            <Eye size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* CSS for animations */}
            <style jsx>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default OngoingBidsPage;
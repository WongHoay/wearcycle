'use client';
import React, { useState } from 'react';
import { Search, Filter, Heart, Star, MapPin } from 'lucide-react';
import Footer from '../../components/footer';
import Navbar from '../../components/navbar';

const HomePage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilters, setSelectedFilters] = useState({
    category: '',
    condition: '',
    brand: ''
  });
  const [showFilters, setShowFilters] = useState(false);

  // Sample data for featured items
  const featuredItems = [
    {
      id: 1,
      name: "Vintage Levi's Denim Jacket",
      price: "RM 85",
      originalPrice: "RM 250",
      image: "https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=400&h=400&fit=crop",
      seller: "Sarah K.",
      condition: "Good",
      size: "M",
      location: "Kuala Lumpur",
      rating: 4.8,
      isFavorite: false
    },
    {
      id: 2,
      name: "Coach Leather Handbag",
      price: "RM 320",
      originalPrice: "RM 800",
      image: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&h=400&fit=crop",
      seller: "Mei Lin",
      condition: "Like New",
      size: "One Size",
      location: "Penang",
      rating: 5.0,
      isFavorite: true
    },
    {
      id: 3,
      name: "Nike Air Max Sneakers",
      price: "RM 180",
      originalPrice: "RM 450",
      image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop",
      seller: "Ahmad R.",
      condition: "Good",
      size: "US 9",
      location: "Johor",
      rating: 4.5,
      isFavorite: false
    },
    {
      id: 4,
      name: "Zara Floral Summer Dress",
      price: "RM 65",
      originalPrice: "RM 159",
      image: "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=400&h=400&fit=crop",
      seller: "Lisa T.",
      condition: "Like New",
      size: "S",
      location: "Selangor",
      rating: 4.9,
      isFavorite: false
    },
    {
      id: 5,
      name: "H&M Black Blazer",
      price: "RM 45",
      originalPrice: "RM 120",
      image: "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=400&h=400&fit=crop",
      seller: "Jenny W.",
      condition: "Good",
      size: "L",
      location: "Penang",
      rating: 4.3,
      isFavorite: false
    },
    {
      id: 6,
      name: "Adidas Track Pants",
      price: "RM 55",
      originalPrice: "RM 140",
      image: "https://images.unsplash.com/photo-1506629905607-ce91de54c4d8?w=400&h=400&fit=crop",
      seller: "Kevin L.",
      condition: "Good",
      size: "M",
      location: "Kuala Lumpur",
      rating: 4.6,
      isFavorite: true
    }
  ];

  const categories = ['Tops', 'Bottoms', 'Dresses', 'Outerwear', 'Shoes', 'Bags', 'Accessories'];
  const conditions = ['Like New', 'Good', 'Fair', 'Worn'];
  const brands = ['Zara', 'H&M', 'Nike', 'Adidas', 'Coach', "Levi's", 'Uniqlo', 'Other'];

  const handleFilterChange = (filterType: keyof typeof selectedFilters, value: string) => {
    setSelectedFilters(prev => ({
      ...prev,
      [filterType]: prev[filterType] === value ? '' : value
    }));
  };

  const toggleFavorite = (itemId: number) => {
    // In a real app, this would update the backend
    console.log('Toggle favorite for item:', itemId);
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* Add your Navbar component here */}
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
              }}>
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
                  height: '250px',
                  backgroundImage: `url(${item.image})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }} />

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
                      {item.name}
                    </h4>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{
                        fontSize: '1.25rem',
                        fontWeight: '700',
                        color: '#c9a26d'
                      }}>
                        {item.price}
                      </div>
                      <div style={{
                        fontSize: '0.875rem',
                        color: '#999',
                        textDecoration: 'line-through'
                      }}>
                        {item.originalPrice}
                      </div>
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
                      {item.rating} • {item.seller}
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
      </div>
      
      {/* Add your Footer component here */}
      <Footer/>
    </div>
  );
};

export default HomePage;
"use client";
import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Heart, ShoppingBag, User, ExternalLink, Grid, List, Star, BadgePercent, Settings } from 'lucide-react';

const Navbar: React.FC = () => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <nav style={{ backgroundColor: "#c9a26d" }} >
      <div className="max-w-7xl mx-auto flex items-center justify-between border-amber-200 px-4 py-3">
        {/* Logo/Brand */}
        <Link href="/homepage" style={{ display: "flex", alignItems: "center", textDecoration: "none" }}>
          <img
            src="/images/wearcycle_logo.png"
            style={{ height: "80px", marginRight: "8px" }}
          />
        </Link>

        {/* Right side icons */}
        <div className="flex items-center space-x-4" style={{ position: "relative" }}>
          <Link href="/favourite" aria-label="Favorites">
            <button
              className="text-amber-800 hover:text-amber-900 transition-colors p-1"
              style={{ background: "none", border: "none", cursor: "pointer" }}
            >
              <Heart size={20} />
            </button>
          </Link>
          <Link href="/cart" aria-label="Shopping bag">
            <button
              className="text-amber-800 hover:text-amber-900 transition-colors p-1"
              style={{ background: "none", border: "none", cursor: "pointer" }}
            >
              <ShoppingBag size={20} />
            </button>
          </Link>
          {/* User Profile Dropdown */}
          <div style={{ position: "relative" }} ref={dropdownRef}>
            <button
              className="text-amber-800 hover:text-amber-900 transition-colors p-1"
              style={{ background: "none", border: "none", cursor: "pointer" }}
              aria-label="User account"
              onClick={() => setDropdownOpen((open) => !open)}
            >
              <User size={20} />
            </button>
            {dropdownOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "40px",
                  right: 0,
                  background: "#fff",
                  borderRadius: "8px",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.10)",
                  minWidth: "220px",
                  zIndex: 100,
                  padding: "12px 0",
                  border: "1px solid #eee"
                }}
              >
                <Link href="/user_profile" style={{ textDecoration: "none", color: "#222" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 20px", cursor: "pointer" }}>
                    <User size={18} /> Profile
                  </div>
                </Link>
                <div style={{ padding: "4px 20px", fontWeight: "bold", color: "#888", fontSize: "13px" }}>Buying</div>
                <Link href="/purchases" style={{ textDecoration: "none", color: "#222" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 20px", cursor: "pointer" }}>
                    <ShoppingBag size={18} /> My purchases
                  </div>
                </Link>
                <Link href="/favourite" style={{ textDecoration: "none", color: "#222" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 20px", cursor: "pointer" }}>
                    <Heart size={18} /> Likes
                  </div>
                </Link>
                <div style={{ padding: "4px 20px", fontWeight: "bold", color: "#888", fontSize: "13px" }}>Selling</div>
                <Link href="/manage_listings" style={{ textDecoration: "none", color: "#222" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 20px", cursor: "pointer" }}>
                    <Grid size={18} /> Manage listings
                  </div>
                </Link>
                <Link href="/my_sales" style={{ textDecoration: "none", color: "#222" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 20px", cursor: "pointer" }}>
                    <List size={18} /> My sales
                  </div>
                </Link>
                {/* <Link href="/discounts" style={{ textDecoration: "none", color: "#222" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 20px", cursor: "pointer" }}>
                    <Star size={18} /> Discounts and promos
                    <span style={{
                      background: "#222",
                      color: "#fff",
                      borderRadius: "8px",
                      fontSize: "11px",
                      padding: "2px 8px",
                      marginLeft: "8px"
                    }}>New</span>
                  </div>
                </Link>
                <Link href="/selling_preferences" style={{ textDecoration: "none", color: "#222" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 20px", cursor: "pointer" }}>
                    <BadgePercent size={18} /> Selling preferences
                    <span style={{
                      background: "#222",
                      color: "#fff",
                      borderRadius: "8px",
                      fontSize: "11px",
                      padding: "2px 8px",
                      marginLeft: "8px"
                    }}>New</span>
                  </div>
                </Link> */}
                <div style={{ padding: "4px 20px", fontWeight: "bold", color: "#888", fontSize: "13px" }}>Account</div>
                <Link href="/settings" style={{ textDecoration: "none", color: "#222" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 20px", cursor: "pointer" }}>
                    <Settings size={18} /> Settings
                  </div>
                </Link>
                
              </div>
            )}
          </div>
          <Link href="/login" aria-label="Log Out">
                  <button
                    className="text-amber-800 hover:text-amber-900 transition-colors p-1"
                    style={{ background: "none", border: "none", cursor: "pointer" }}
                  >
                    <ExternalLink size={20} />
                  </button>
                </Link>
          <Link href="/sell_form" aria-label="Sell">
            <button
              style={{
                background: "#222",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                padding: "8px 18px",
                fontWeight: "500",
                fontSize: "16px",
                cursor: "pointer"
              }}
            >
              Sell
            </button>
          </Link>
          <Link href="/bid_form" aria-label="Bid">
            <button
              style={{
                background: "#fff",
                color: "#222",
                border: "2px solid #222",
                borderRadius: "6px",
                padding: "8px 18px",
                fontWeight: "500",
                fontSize: "16px",
                cursor: "pointer",
                marginLeft: "8px"
              }}
            >
              Bid
            </button>
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
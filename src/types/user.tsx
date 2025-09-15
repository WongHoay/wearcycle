export interface User {
  id: string;
  username: string;
  displayName: string;
  email: string;
  marketplace: string;
  region: string;
  location: string;
  bio: string;
  profilePhotoUrl: string;
  joinDate: string;
  reviewCount: number;
  rating: number;
  totalEarnings: number;
  isVerified: boolean;
  phoneNumber: string;
  preferences: any;
  createdAt: string;
}

export interface ListingItem {
  id: string;
  title: string;
  price: number;
  condition: string;
  category: string;
  brand?: string;
  size: string;
  description: string;
  images: string[];
  sellerId: string;
  status: 'active' | 'sold' | 'pending';
  createdAt: string;
  views: number;
  isNegotiable: boolean;
}
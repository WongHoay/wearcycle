"use client";
import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'

interface ItemDetail {
    id: string
    name: string
    price: number
    description: string
    images: string[]
    category: string
    condition: string
    seller: {
        name: string
        rating: number
        avatar: string
    }
    specifications: { [key: string]: string }
    reviews: Array<{
        id: string
        user: string
        rating: number
        comment: string
        date: string
    }>
}

export default function ViewItemPage() {
    const searchParams = useSearchParams()
    const itemId = searchParams?.get('id')
    const [item, setItem] = useState<ItemDetail | null>(null)
    const [selectedImageIndex, setSelectedImageIndex] = useState(0)

    useEffect(() => {
        // Mock data - replace with actual API call
        const mockItem: ItemDetail = {
            id: itemId || '1',
            name: 'Vintage Denim Jacket',
            price: 45.99,
            description: 'Classic vintage denim jacket in excellent condition. Perfect for casual wear.',
            images: [
                '/api/placeholder/400/400',
                '/api/placeholder/400/400',
                '/api/placeholder/400/400'
            ],
            category: 'Clothing',
            condition: 'Like New',
            seller: {
                name: 'FashionHub',
                rating: 4.8,
                avatar: '/api/placeholder/50/50'
            },
            specifications: {
                'Size': 'Medium',
                'Material': '100% Cotton',
                'Brand': 'Levi\'s',
                'Color': 'Blue'
            },
            reviews: [
                {
                    id: '1',
                    user: 'John D.',
                    rating: 5,
                    comment: 'Great quality and fast shipping!',
                    date: '2024-01-15'
                }
            ]
        }
        setItem(mockItem)
    }, [itemId])

    if (!item) return <div className="p-4">Loading...</div>

    return (
        <div className="max-w-6xl mx-auto p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Image Gallery */}
                <div>
                    <div className="mb-4">
                        <Image
                            src={item.images[selectedImageIndex]}
                            alt={item.name}
                            width={500}
                            height={500}
                            className="w-full h-96 object-cover rounded-lg"
                        />
                    </div>
                    <div className="flex gap-2 overflow-x-auto">
                        {item.images.map((image, index) => (
                            <button
                                key={index}
                                onClick={() => setSelectedImageIndex(index)}
                                className={`flex-shrink-0 w-20 h-20 rounded border-2 ${
                                    selectedImageIndex === index ? 'border-blue-500' : 'border-gray-200'
                                }`}
                            >
                                <Image
                                    src={image}
                                    alt={`${item.name} ${index + 1}`}
                                    width={80}
                                    height={80}
                                    className="w-full h-full object-cover rounded"
                                />
                            </button>
                        ))}
                    </div>
                </div>

                {/* Item Details */}
                <div>
                    <h1 className="text-2xl font-bold mb-2">{item.name}</h1>
                    <div className="flex items-center gap-2 mb-4">
                        <span className="text-3xl font-bold text-red-600">${item.price}</span>
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">
                            {item.condition}
                        </span>
                    </div>

                    {/* Seller Info */}
                    <div className="flex items-center gap-3 mb-4 p-3 bg-gray-50 rounded">
                        <Image
                            src={item.seller.avatar}
                            alt={item.seller.name}
                            width={40}
                            height={40}
                            className="rounded-full"
                        />
                        <div>
                            <div className="font-semibold">{item.seller.name}</div>
                            <div className="text-sm text-gray-600">
                                ⭐ {item.seller.rating} rating
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 mb-6">
                        <button className="flex-1 bg-blue-600 text-white py-3 rounded hover:bg-blue-700">
                            Add to Cart
                        </button>
                        <button className="flex-1 bg-red-600 text-white py-3 rounded hover:bg-red-700">
                            Buy Now
                        </button>
                    </div>

                    {/* Specifications */}
                    <div className="border-t pt-4">
                        <h3 className="font-semibold mb-3">Specifications</h3>
                        <div className="space-y-2">
                            {Object.entries(item.specifications).map(([key, value]) => (
                                <div key={key} className="flex">
                                    <span className="w-24 text-gray-600">{key}:</span>
                                    <span>{value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Description */}
            <div className="mt-8 border-t pt-6">
                <h3 className="text-xl font-semibold mb-3">Description</h3>
                <p className="text-gray-700 leading-relaxed">{item.description}</p>
            </div>

            {/* Reviews */}
            <div className="mt-8 border-t pt-6">
                <h3 className="text-xl font-semibold mb-4">Reviews</h3>
                <div className="space-y-4">
                    {item.reviews.map((review) => (
                        <div key={review.id} className="border rounded p-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="font-semibold">{review.user}</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-yellow-500">
                                        {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                                    </span>
                                    <span className="text-sm text-gray-500">{review.date}</span>
                                </div>
                            </div>
                            <p className="text-gray-700">{review.comment}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
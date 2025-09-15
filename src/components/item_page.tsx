"use client";
import Image from "next/image";

export default function ItemPage() {
  // Example data, replace with your actual item data
  const item = {
    title: "Set Dress + Kemeja S-M",
    price: 30,
    image: "/images/sample_item.jpg", // Replace with your image path
    condition: "Like New",
    brand: "DAZY",
    seller: {
      name: "hakakstella_",
      avatar: "/images/sample_avatar.jpg", // Replace with your avatar path
      rating: "No ratings yet",
    },
    details: "Dress S, kemeja crop S-M, rm30",
  };

  return (
    <div className="bg-gray-50 min-h-screen py-10">
      <div className="max-w-5xl mx-auto bg-white rounded-lg shadow-lg flex flex-col md:flex-row p-8 gap-8">
        {/* Left: Product Image */}
        <div className="flex-1 flex justify-center items-center">
          <div className="border rounded-lg bg-gray-100 p-4 flex justify-center items-center w-full h-[400px]">
            <img
              src={item.image}
              alt={item.title}
              className="object-contain h-full max-w-full rounded"
            />
          </div>
        </div>
        {/* Right: Product Info */}
        <div className="flex-1 flex flex-col justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">{item.title}</h2>
            <div className="text-3xl font-semibold text-amber-900 mb-4">
              RM{item.price}
            </div>
            <div className="mb-4">
              <span className="font-semibold">Condition:</span>{" "}
              <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-sm">{item.condition}</span>
            </div>
            <div className="mb-4">
              <span className="font-semibold">Brand:</span> {item.brand}
            </div>
            <div className="flex items-center gap-3 mb-6">
              <img
                src={item.seller.avatar}
                alt={item.seller.name}
                className="w-10 h-10 rounded-full border"
              />
              <div>
                <div className="font-semibold">{item.seller.name}</div>
                <div className="text-xs text-gray-500">{item.seller.rating}</div>
              </div>
            </div>
            <div className="flex gap-4 mb-6">
              <button className="bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-2 rounded transition">
                Buy Now
              </button>
              <button className="bg-amber-900 hover:bg-black text-white font-semibold px-6 py-2 rounded transition">
                Add to Cart
              </button>
            </div>
          </div>
          <div className="mt-8">
            <h3 className="font-bold mb-2 text-lg">Details</h3>
            <div className="text-gray-700">{item.details}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
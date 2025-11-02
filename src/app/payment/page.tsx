// app/payment/[orderId]/page.tsx
// This is the page users see after clicking "Proceed to Payment"

"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getAuth } from "firebase/auth";
import {
  addDoc,
  collection,
  serverTimestamp,
  doc,
  getDoc,
  updateDoc,
  arrayRemove,
  setDoc
} from "firebase/firestore";
import { db } from "../../firebaseConfig";

const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/dez1qts8e/upload";
const CLOUDINARY_UPLOAD_PRESET = "unsigned_preset2";

async function uploadToCloudinary(file: File): Promise<string> {
  if (!CLOUDINARY_URL || !CLOUDINARY_UPLOAD_PRESET) {
    throw new Error("Cloudinary env vars not set");
  }
  const url = `https://api.cloudinary.com/v1_1/dez1qts8e/auto/upload`;
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  const res = await fetch(url, { method: "POST", body: formData });
  if (!res.ok) {
    const text = await res.text();
    throw new Error("Cloudinary upload failed: " + text);
  }
  const data = await res.json();
  return data.secure_url;
}

export default function PaymentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [paymentProgress, setPaymentProgress] = useState("scanning");

  const [buyerInfo, setBuyerInfo] = useState({
    name: '',
    phone: '',
    email: ''
  });
  const [shippingAddress, setShippingAddress] = useState({
    fullName: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'Malaysia',
    phone: ''
  });

  const paramAmount = searchParams?.get("amount");
  const paramItems = searchParams?.get("items");
  const paramId = searchParams?.get("id");
  const paramType = searchParams?.get("type");
  
  const [amount, setAmount] = useState<number>(paramAmount ? Number(paramAmount) : 0);
  const [items, setItems] = useState<string[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<"qr" | "bank">("qr");

  useEffect(() => {
    // Handle single product/bid purchase
    if (paramId && paramType) {
      setItems([paramId]);
    } else if (paramItems) {
      // Handle cart purchase
      setItems(paramItems.split(",").filter(Boolean));
    } else {
      // Fallback to localStorage
      if (typeof window !== "undefined") {
        try {
          const stored = localStorage.getItem("checkoutItems");
          if (stored) setItems(JSON.parse(stored));
        } catch (e) {}
      }
    }

    if ((!amount || amount === 0) && typeof window !== "undefined") {
      const storedAmount = localStorage.getItem("checkoutAmount");
      if (storedAmount) setAmount(Number(storedAmount));
    }
  }, [paramId, paramType, paramItems]);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    // Simulate payment processing steps
    const timer1 = setTimeout(() => setPaymentProgress("processing"), 3000);
    const timer2 = setTimeout(() => setPaymentProgress("manual_verification"), 6000);
    
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    
    // Get existing parameters
    const amount = searchParams.get('amount');
    const itemId = searchParams.get('id');
    const itemType = searchParams.get('type');
    
    // Get buyer and shipping information
    const buyerName = searchParams.get('buyerName');
    const buyerPhone = searchParams.get('buyerPhone');
    const shippingAddressStr = searchParams.get('shippingAddress');
    
    if (amount) setAmount(parseFloat(amount));
    
    // Set buyer info
    const auth = getAuth();
    const user = auth.currentUser;
    setBuyerInfo({
      name: buyerName || '',
      phone: buyerPhone || '',
      email: user?.email || ''
    });
    
    // Set shipping address
    if (shippingAddressStr) {
      try {
        const addressData = JSON.parse(shippingAddressStr);
        setShippingAddress(addressData);
      } catch (error) {
        console.error('Error parsing shipping address:', error);
      }
    }
    
    // Handle items...
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setError(null);
  };

  const handleSubmit = async () => {
    setError(null);
    if (!file) {
      setError("Please upload payment proof to complete payment.");
      return;
    }

    if (!buyerInfo.name || !shippingAddress.addressLine1) {
      setError("Missing buyer or shipping information");
      return;
    }

    setLoading(true);
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) throw new Error("Please sign in before submitting payment.");

      // Create order with complete information
      const orderData = {
        userId: user.uid,
        
        // Buyer Information
        buyerName: buyerInfo.name,
        buyerEmail: buyerInfo.email,
        buyerPhone: buyerInfo.phone,
        
        // Shipping Address (for shipping label generation)
        shippingAddress: {
          fullName: shippingAddress.fullName,
          addressLine1: shippingAddress.addressLine1,
          addressLine2: shippingAddress.addressLine2 || '',
          city: shippingAddress.city || '',
          state: shippingAddress.state,
          postalCode: shippingAddress.postalCode,
          country: shippingAddress.country,
          phone: shippingAddress.phone
        },
        
        // Order Details
        items: items,
        amount: amount,
        paymentProof: null as string | null,
        status: "awaiting_verification",
        paymentStatus: "pending_verification",
        createdAt: serverTimestamp(),
        
        // Additional info for shipping
        shippingMethod: "Standard Shipping",
        estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        
        // Notes
        notes: note || '',
        
        // For tracking
        trackingNumber: '', // Will be added when shipped
        shippedDate: null,
        completedDate: null
      };

      let paymentProofUrl: string | null = null;
      paymentProofUrl = await uploadToCloudinary(file);
      orderData.paymentProof = paymentProofUrl;

      // Create the order
      const orderRef = doc(collection(db, "orders"));
      await setDoc(orderRef, orderData);
      console.log("✅ Order created:", orderRef.id);

      // Fetch seller info for each item
      const sellers: { email: string; name: string }[] = [];
      for (const itemId of items) {
        const productRef = doc(db, "products", itemId);
        const productSnap = await getDoc(productRef);
        if (productSnap.exists()) {
          const productData = productSnap.data();
          if (productData.sellerId) {
            const sellerRef = doc(db, "users", productData.sellerId);
            const sellerSnap = await getDoc(sellerRef);
            if (sellerSnap.exists()) {
              const sellerData = sellerSnap.data();
              sellers.push({
                email: sellerData.email,
                name: sellerData.username || sellerData.displayName || "Seller"
              });
            }
          }
        }
      }

      // Send email to each seller
      for (const seller of sellers) {
        await fetch("/api/send-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "new_order",
            data: {
              sellerEmail: seller.email,
              sellerName: seller.name,
              orderId: orderRef.id,
              buyerName: buyerInfo.name,
              buyerEmail: buyerInfo.email,
              shippingAddress,
              items: items.map(itemId => ({ itemName: itemId })), // You can expand with more item info if needed
              totalAmount: amount,
              orderDate: new Date().toLocaleString()
            }
          })
        });
      }

      // ✅ Mark all products as sold
      if (items && items.length > 0) {
        console.log("Marking products as sold:", items);
        
        const markAsSoldPromises = items.map(async (itemId) => {
          try {
            // Check if it's a product or bid
            const productRef = doc(db, "products", itemId);
            const productSnap = await getDoc(productRef);
            
            if (productSnap.exists()) {
              // It's a product - mark as sold
              await updateDoc(productRef, {
                sold: true,
                soldAt: serverTimestamp(),
                buyerId: user.uid,
                orderId: orderRef.id
              });
              console.log(`✅ Product ${itemId} marked as sold`);
            } else {
              // Check if it's a bid
              const bidRef = doc(db, "bids", itemId);
              const bidSnap = await getDoc(bidRef);
              
              if (bidSnap.exists()) {
                await updateDoc(bidRef, {
                  status: "sold",
                  soldAt: serverTimestamp(),
                  winnerId: user.uid,
                  orderId: orderRef.id
                });
                console.log(`✅ Bid ${itemId} marked as sold`);
              }
            }
          } catch (error) {
            console.error(`Failed to mark item ${itemId} as sold:`, error);
          }
        });

        await Promise.all(markAsSoldPromises);
      }

      // Remove purchased items from user's cart
      if (items && items.length > 0) {
        const cartRef = doc(db, "carts", user.uid);
        const cartSnap = await getDoc(cartRef);
        if (cartSnap.exists()) {
          for (const itemId of items) {
            try {
              await updateDoc(cartRef, { items: arrayRemove(itemId) });
            } catch (e) {
              console.error("Failed to remove from cart:", e);
            }
          }
        }
      }

      // Cleanup localStorage
      try {
        localStorage.removeItem("checkoutItems");
        localStorage.removeItem("checkoutAmount");
      } catch (e) {}

      setLoading(false);
      router.push("/my_purchases?tab=inProgress");
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Payment failed");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition mb-4"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Cart
          </button>
          <h1 className="text-3xl font-bold text-gray-800">Complete Your Payment</h1>
          <p className="text-gray-600 mt-2">Review your order and upload payment proof</p>
        </div>

        {/* Payment Method Selector */}
        <div className="mb-6 flex gap-4">
          <button
            type="button"
            className={`px-6 py-2 rounded-lg font-bold border ${
              paymentMethod === "qr"
                ? "bg-teal-600 text-white border-teal-600"
                : "bg-white text-teal-600 border-teal-300"
            }`}
            onClick={() => setPaymentMethod("qr")}
          >
            QR Code
          </button>
          <button
            type="button"
            className={`px-6 py-2 rounded-lg font-bold border ${
              paymentMethod === "bank"
                ? "bg-teal-600 text-white border-teal-600"
                : "bg-white text-teal-600 border-teal-300"
            }`}
            onClick={() => setPaymentMethod("bank")}
          >
            Bank Transfer
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Payment Section */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* QR or Bank Section */}
            {paymentMethod === "qr" ? (
              <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
                <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                  Scan to Pay
                </h2>
                
                <div className="flex justify-center mb-4">
                  <div className="p-6 bg-gradient-to-br from-teal-50 to-blue-50 rounded-xl border-4 border-teal-500 shadow-lg">
                    <div className="w-85 h-85 bg-white rounded-lg flex items-center justify-center">
                      <img 
                        src="/images/company_qr.JPG" 
                        alt="Payment QR Code" 
                        className="w-full h-full object-contain"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-teal-50 to-blue-50 rounded-lg p-4 border border-teal-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Amount to Pay</p>
                      <p className="text-3xl font-bold text-teal-600">RM {Number(amount || 0).toFixed(2)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600 mb-1">Items</p>
                      <p className="text-2xl font-bold text-gray-700">{items.length}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm font-semibold text-blue-800 mb-2">📱 Payment Instructions:</p>
                  <ol className="text-sm text-blue-700 space-y-1">
                    <li>1. Open your e-wallet app (DuitNow/TnG/Boost)</li>
                    <li>2. Scan the QR code above</li>
                    <li>3. Complete the payment</li>
                    <li>4. Upload payment proof below</li>
                  </ol>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
                <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                  Bank Transfer
                </h2>
                <div className="bg-gradient-to-r from-teal-50 to-blue-50 rounded-lg p-4 border border-teal-200 mb-4">
                  <p className="text-lg font-bold text-gray-800 mb-2">Bank Details</p>
                  <div className="text-gray-700 mb-2">
                    <div><span className="font-semibold">Bank Name:</span> Maybank</div>
                    <div><span className="font-semibold">Account Name:</span> WearCycle Sdn Bhd</div>
                    <div><span className="font-semibold">Account Number:</span> 1579 3808 2179</div>
                  </div>
                  <p className="text-sm text-red-600">Please transfer the exact amount and upload your payment receipt below.</p>
                </div>
                <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm font-semibold text-blue-800 mb-2">🏦 Bank Transfer Instructions:</p>
                  <ol className="text-sm text-blue-700 space-y-1">
                    <li>1. Login to your online banking app</li>
                    <li>2. Transfer the total amount to the bank account above</li>
                    <li>3. Upload your payment receipt below</li>
                  </ol>
                </div>
              </div>
            )}

            {/* Upload Payment Proof */}
            <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Upload Payment Proof
              </h2>

              <div className={`border-2 border-dashed rounded-xl p-8 text-center transition ${
                preview ? 'border-teal-400 bg-teal-50' : 'border-gray-300 hover:border-teal-400 hover:bg-gray-50'
              }`}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                />
                
                {preview ? (
                  <div>
                    <img 
                      src={preview} 
                      alt="Payment proof preview" 
                      className="max-h-64 mx-auto rounded-lg border-2 border-teal-400 shadow-lg mb-4"
                    />
                    <p className="text-teal-600 font-semibold mb-2">✓ {file?.name}</p>
                    <label 
                      htmlFor="file-upload"
                      className="inline-block px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer transition text-sm font-medium"
                    >
                      Change Image
                    </label>
                  </div>
                ) : (
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="text-gray-700 font-medium mb-2">
                      <span className="text-teal-600 font-semibold">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-sm text-gray-500">PNG, JPG (Max 5MB)</p>
                  </label>
                )}
              </div>

              <p className="text-xs text-gray-500 mt-3 text-center">
                💡 Upload a clear screenshot showing transaction details for faster verification
              </p>
            </div>

            {/* Note Section */}
            <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
                Add Note (Optional)
              </h2>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add any special instructions or notes for the seller..."
                className="w-full min-h-[100px] p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
              />
            </div>
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 sticky top-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Order Summary</h2>
              
              <div className="space-y-3 mb-6">
                <div className="flex justify-between items-center py-3 border-b border-gray-200">
                  <span className="text-gray-600">Total Items</span>
                  <span className="font-semibold text-gray-800">{items.length}</span>
                </div>
                
                <div className="flex justify-between items-center py-3 border-b border-gray-200">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-semibold text-gray-800">RM {Number(amount || 0).toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between items-center py-3">
                  <span className="text-lg font-bold text-gray-800">Total Amount</span>
                  <span className="text-2xl font-bold text-teal-600">RM {Number(amount || 0).toFixed(2)}</span>
                </div>
              </div>

              {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <p className="text-sm font-semibold text-red-800">Payment Error</p>
                      <p className="text-sm text-red-600">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={loading || !file}
                className={`w-full py-4 rounded-lg font-bold text-white text-lg transition shadow-lg ${
                  loading 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : !file
                      ? 'bg-gray-300 cursor-not-allowed'
                      : 'bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 transform hover:scale-105'
                }`}
                title={!file ? "Upload payment proof to enable" : undefined}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </span>
                ) : (
                  `Complete Payment - RM ${Number(amount || 0).toFixed(2)}`
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Info Banner */}
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-yellow-800 mb-1">Important Information</p>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• Products are automatically marked as sold after payment submission</li>
                <li>• Payment will be verified within 24 hours</li>
                <li>• Keep your transaction receipt for reference</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
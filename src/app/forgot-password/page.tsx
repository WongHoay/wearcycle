"use client";
import { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../../firebaseConfig"; // Adjust path if needed

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await sendPasswordResetEmail(auth, email);
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div
      className="flex justify-center items-center h-screen bg-cover bg-opacity-0 bg-center"
      style={{
        backgroundImage: "url('/images/image3.jpg')",
      }}
    >
      <div className="bg-white bg-opacity-80 backdrop-blur-md p-10 rounded-xl shadow-2xl w-300">
        <div className="flex flex-col items-center mb-6">
          <div className="w-24 h-24 flex items-center justify-center bg-gray-100 rounded-full">
            <img
              src="/images/wearcycle_logo.png"
              alt="WearCycle Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mt-4">WearCycle</h1>
          &nbsp;
          <p className="text-gray-500 text-sm">Reset your password</p>
        </div>

        {submitted ? (
          <p className="text-green-600 text-center">
            If an account exists for{" "}
            <span className="font-semibold">{email}</span>, a reset link has been
            sent.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            {error && <div className="text-red-600 text-sm">{error}</div>}
            <button
              type="submit"
              className="w-full bg-amber-900 hover:bg-black text-white font-semibold py-3 rounded transition"
            >
              Send Reset Link
            </button>
          </form>
        )}

        <div className="mt-4 text-center">
          <a href="/login" className="text-blue-600 hover:underline text-sm">
            Back to Login
          </a>
        </div>
      </div>
    </div>
  );
}
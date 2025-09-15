"use client";
import { useState } from "react";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    // Here, you would call your API to reset the password
    setSuccess(true);
    setError("");
  };

  return (
    <div className="relative flex justify-center items-center h-screen">
      {/* Flipped background image */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          backgroundImage: "url('/images/image3.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          transform: "scaleX(-1)",
          zIndex: 0,
        }}
      />
      {/* Form content */}
      <div className="relative z-10 bg-white bg-opacity-80 backdrop-blur-md p-10 rounded-xl shadow-2xl w-300">
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
        {success ? (
          <p className="text-green-600 text-center">
            Your password has been reset.{" "}
            <a href="/login" className="text-blue-600 underline">
              Login
            </a>
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="password"
              placeholder="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <input
              type="password"
              placeholder="Confirm new password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            {error && <div className="text-red-600 text-sm">{error}</div>}
            <button
              type="submit"
              className="w-full bg-amber-900 hover:bg-black text-white font-semibold py-3 rounded transition"
            >
              Reset Password
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
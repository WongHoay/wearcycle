"use client";
import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../../firebaseConfig"; // Adjust path if needed
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [isSuspended, setIsSuspended] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSuspended(false);
    if (attempts >= 3) {
      setError("You have reached the maximum number of login attempts. Please reset your password.");
      return;
    }
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      await user.reload(); // Ensure latest info
      if (!user.emailVerified) {
        setError("Please verify your email before logging in. Check your inbox for the verification email.");
        return;
      }
      // Check if user is banned or suspended
      const userDocRef = doc(db, "users", user.uid);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        if (userData.banned === true) {
          setError("Your account is banned. Please email wearcycle001@gmail.com to enquire about it.");
          return;
        }
        if (userData.suspended === true) {
          setIsSuspended(true);
        }
      }
      setAttempts(0); // Reset on successful login
      router.push("/homepage"); 
    } catch (err: any) {
      setAttempts(prev => prev + 1);
      if (attempts + 1 >= 3) {
        setError("You have reached the maximum number of login attempts. Please reset your password.");
      } else {
        setError("Login failed. Please check your email or password.");
      }
    }
  };

  return (
    <div
      className="flex justify-center items-center h-screen bg-cover bg-opacity-0 bg-center"
      style={{
        backgroundImage: "url('/images/image.png')",
      }}
    >
      <div className="w-full max-w-2xl bg-white p-10 rounded-xl shadow-2xl backdrop-blur-md bg-opacity-80">
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
          <p className="text-gray-500 text-sm">Login to your thrif club</p>
        </div>

        <form className="space-y-4" onSubmit={handleLogin}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              id="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded px-3 py-2"
              required
            />
          </div>
          <div className="relative">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
            <input
              type={showPassword ? "text" : "password"}
              id="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded px-3 py-2"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-9 text-gray-500 text-sm"
              tabIndex={-1}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
          {error && <div className="text-red-600 text-sm">{error}</div>}
          <button
            type="submit"
            className="w-full bg-amber-900 hover:bg-black text-white font-semibold py-3 rounded transition"
            disabled={attempts >= 3}
          >
            Login
          </button>
          {attempts >= 3 && (
            <div className="text-center mt-2">
              <a href="/forgot-password" className="text-blue-600 hover:underline text-sm">
                Reset your password
              </a>
            </div>
          )}
          <div className="text-right">
            <a href="/forgot-password" className="text-blue-600 hover:underline text-sm">
              Forgot password?
            </a>
          </div>
        </form>

        <p className="text-center text-sm text-gray-600 mt-6">
          Don't have an account? <a href="/register" className="text-amber-800 hover:underline">Register</a>
        </p>
      </div>
    </div>
  );
}


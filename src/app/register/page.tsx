'use client';

import { useState, useEffect, useRef } from 'react';
import { createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { auth, db } from "../../firebaseConfig"; // Adjust path if needed
import { useRouter } from "next/navigation";
import { doc, setDoc, getDocs, collection, query, where } from "firebase/firestore";

interface FormData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface FieldErrors {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export default function RegisterPage() {
  const [formData, setFormData] = useState<FormData>({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState({
    username: false,
    email: false
  });
  const router = useRouter();
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

  const MAX_ATTEMPTS = 5;

  // Cleanup debounce timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, []);

  // Enhanced validation helpers
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateUsername = (username: string) => {
    // Username should be 3-20 chars, alphanumeric + underscore/hyphen
    return /^[a-zA-Z0-9_-]{3,20}$/.test(username);
  };

  const validatePassword = (password: string) => {
    // At least 8 chars, 1 uppercase, 1 number, 1 special char
    return /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/.test(password);
  };

  const getPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) strength++;
    
    if (strength <= 2) return { level: 'weak', color: 'bg-red-500' };
    if (strength <= 3) return { level: 'medium', color: 'bg-yellow-500' };
    return { level: 'strong', color: 'bg-green-500' };
  };

  // Individual field checking functions
  const checkUsernameExists = async (username: string) => {
    try {
      const usernameQuery = query(collection(db, "users"), where("username", "==", username));
      const usernameSnap = await getDocs(usernameQuery);
      return !usernameSnap.empty;
    } catch (error) {
      console.error("Error checking username:", error);
      return false;
    }
  };

  const checkEmailExists = async (email: string) => {
    try {
      const emailQuery = query(collection(db, "users"), where("email", "==", email));
      const emailSnap = await getDocs(emailQuery);
      return !emailSnap.empty;
    } catch (error) {
      console.error("Error checking email:", error);
      return false;
    }
  };

  // Debounced availability checking
  const checkAvailabilityWithDebounce = (field: 'username' | 'email', value: string, delay = 800) => {
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    const timeout = setTimeout(async () => {
      if (!value || (field === 'username' && !validateUsername(value)) || (field === 'email' && !validateEmail(value))) {
        return;
      }

      setIsCheckingAvailability(prev => ({ ...prev, [field]: true }));
      
      try {
        let exists = false;
        if (field === 'username') {
          exists = await checkUsernameExists(value);
        } else if (field === 'email') {
          exists = await checkEmailExists(value);
        }

        if (exists) {
          setFieldErrors(prev => ({
            ...prev,
            [field]: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists.`
          }));
        } else {
          setFieldErrors(prev => ({
            ...prev,
            [field]: ''
          }));
        }
      } catch (error) {
        console.error(`Error checking ${field}:`, error);
      } finally {
        setIsCheckingAvailability(prev => ({ ...prev, [field]: false }));
      }
    }, delay);

    debounceTimeout.current = timeout;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    // Clear field-specific error when user starts typing
    if (fieldErrors[name as keyof FieldErrors]) {
      setFieldErrors(prev => ({ ...prev, [name]: '' }));
    }
    
    // Clear general error
    if (error) setError("");

    // Real-time availability checking for username and email
    if (name === 'username' && value.trim()) {
      if (validateUsername(value)) {
        checkAvailabilityWithDebounce('username', value);
      }
    } else if (name === 'email' && value.trim()) {
      if (validateEmail(value)) {
        checkAvailabilityWithDebounce('email', value);
      }
    }
  };

  // Real-time field validation
  const handleBlur = async (field: string, value: string) => {
    let errorMessage = '';

    switch (field) {
      case 'username':
        if (!value) {
          errorMessage = 'Username is required';
        } else if (!validateUsername(value)) {
          errorMessage = 'Username must be 3-20 characters (letters, numbers, _, -)';
        }
        break;
        
      case 'email':
        if (!value) {
          errorMessage = 'Email is required';
        } else if (!validateEmail(value)) {
          errorMessage = 'Please enter a valid email address';
        }
        break;
        
      case 'password':
        if (!value) {
          errorMessage = 'Password is required';
        } else if (!validatePassword(value)) {
          errorMessage = 'Password must be at least 8 characters with 1 uppercase, 1 number, and 1 special character';
        }
        break;
        
      case 'confirmPassword':
        if (!value) {
          errorMessage = 'Please confirm your password';
        } else if (value !== formData.password) {
          errorMessage = 'Passwords do not match';
        }
        break;
    }

    setFieldErrors(prev => ({ ...prev, [field]: errorMessage }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Rate limiting check
    if (attemptCount >= MAX_ATTEMPTS) {
      setError("Too many registration attempts. Please try again later.");
      return;
    }

    setIsLoading(true);

    try {
      // Client-side validation first
      const errors: Partial<FieldErrors> = {};
      
      if (!validateUsername(formData.username)) {
        errors.username = 'Username must be 3-20 characters (letters, numbers, _, -)';
      }
      
      if (!validateEmail(formData.email)) {
        errors.email = 'Please enter a valid email address';
      }
      
      if (!validatePassword(formData.password)) {
        errors.password = 'Password must meet all requirements';
      }
      
      if (formData.password !== formData.confirmPassword) {
        errors.confirmPassword = 'Passwords do not match';
      }

      // If there are validation errors, show them and stop
      if (Object.keys(errors).length > 0) {
        setFieldErrors(prev => ({ ...prev, ...errors }));
        setIsLoading(false);
        return;
      }

      // Check if there are any existing field errors (like username/email already exists)
      const hasExistingErrors = Object.values(fieldErrors).some(error => error !== '');
      if (hasExistingErrors) {
        setError("Please fix the errors above before submitting.");
        setIsLoading(false);
        return;
      }

      // Create user account
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;
      
      // Send email verification
      await sendEmailVerification(user);

      // Save user info to Firestore
      await setDoc(doc(db, "users", user.uid), {
        username: formData.username,
        email: formData.email,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString()
      });
      
      // Redirect to user profile
      router.push("/login");
      
    } catch (err: any) {
      console.error("Registration error:", err);
      setAttemptCount(prev => prev + 1);
      
      // Handle specific Firebase errors
      if (err.code === 'auth/email-already-in-use') {
        setError('Email address is already registered.');
        setFieldErrors(prev => ({ ...prev, email: 'Email already in use' }));
      } else if (err.code === 'auth/weak-password') {
        setError('Password is too weak.');
        setFieldErrors(prev => ({ ...prev, password: 'Password is too weak' }));
      } else if (err.code === 'auth/invalid-email') {
        setError('Invalid email address.');
        setFieldErrors(prev => ({ ...prev, email: 'Invalid email format' }));
      } else {
        setError(err.message || 'Registration failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = () => {
    return (
      formData.username &&
      formData.email &&
      formData.password &&
      formData.confirmPassword &&
      !Object.values(fieldErrors).some(error => error !== '') &&
      validateUsername(formData.username) &&
      validateEmail(formData.email) &&
      validatePassword(formData.password) &&
      formData.password === formData.confirmPassword
    );
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-cover bg-center p-4"
      style={{
        backgroundImage: "url('/images/register_image.jpg')",
      }}>
      <div className="w-full max-w-2xl bg-white p-8 md:p-10 rounded-xl shadow-2xl backdrop-blur-md bg-opacity-90">
        <img
          src="/images/wearcycle_logo.png"
          alt="WearCycle Logo"
          className="w-32 h-32 md:w-36 md:h-36 object-contain mx-auto mb-4"
        />
        <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">Create Your Account</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* Username Field */}
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
              Username
            </label>
            <div className="relative">
              <input
                type="text"
                name="username"
                id="username"
                value={formData.username}
                onChange={handleChange}
                onBlur={(e) => handleBlur('username', e.target.value)}
                className={`mt-1 block w-full border rounded-lg px-3 py-2 pr-10 transition-colors ${
                  fieldErrors.username ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'
                }`}
                aria-describedby={fieldErrors.username ? "username-error" : undefined}
                aria-invalid={fieldErrors.username ? "true" : "false"}
                required
              />
              {isCheckingAvailability.username && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-amber-600"></div>
                </div>
              )}
            </div>
            {fieldErrors.username && (
              <div id="username-error" role="alert" className="text-red-600 text-sm mt-1">
                {fieldErrors.username}
              </div>
            )}
            {!fieldErrors.username && formData.username && validateUsername(formData.username) && !isCheckingAvailability.username && (
              <div className="text-green-600 text-sm mt-1">
                ✓ Username is available
              </div>
            )}
          </div>

          {/* Email Field */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <div className="relative">
              <input
                type="email"
                name="email"
                id="email"
                value={formData.email}
                onChange={handleChange}
                onBlur={(e) => handleBlur('email', e.target.value)}
                className={`mt-1 block w-full border rounded-lg px-3 py-2 pr-10 transition-colors  ${
                  fieldErrors.email ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'
                }`}
                aria-describedby={fieldErrors.email ? "email-error" : undefined}
                aria-invalid={fieldErrors.email ? "true" : "false"}
                required
              />
              {isCheckingAvailability.email && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-amber-600"></div>
                </div>
              )}
            </div>
            {fieldErrors.email && (
              <div id="email-error" role="alert" className="text-red-600 text-sm mt-1">
                {fieldErrors.email}
              </div>
            )}
            {/* Only show green message if email is valid, not checking, and no error */}
            {!fieldErrors.email &&
              formData.email &&
              validateEmail(formData.email) &&
              !isCheckingAvailability.email && // Only show when not checking
              (
                <div className="text-green-600 text-sm mt-1">
                  ✓ Email is available
                </div>
              )
            }
          </div>

          {/* Password Field */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                id="password"
                value={formData.password}
                onChange={handleChange}
                onBlur={(e) => handleBlur('password', e.target.value)}
                className={`mt-1 block w-full border rounded-lg px-3 py-2 pr-10 transition-colors ${
                  fieldErrors.password ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'
                }`}
                aria-describedby={fieldErrors.password ? "password-error" : "password-help"}
                aria-invalid={fieldErrors.password ? "true" : "false"}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(prev => !prev)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 text-sm"
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            
            {/* Password Strength Indicator */}
            {formData.password && (
              <div className="mt-2">
                <div className="flex space-x-1">
                  {[1, 2, 3, 4, 5].map((level) => {
                    const strength = getPasswordStrength(formData.password);
                    const strengthLevel = strength.level === 'weak' ? 1 : strength.level === 'medium' ? 3 : 5;
                    return (
                      <div
                        key={level}
                        className={`h-1 w-full rounded ${
                          level <= strengthLevel ? strength.color : 'bg-gray-200'
                        }`}
                      />
                    );
                  })}
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  Password strength: {getPasswordStrength(formData.password).level}
                </p>
              </div>
            )}
            
            {fieldErrors.password && (
              <div id="password-error" role="alert" className="text-red-600 text-sm mt-1">
                {fieldErrors.password}
              </div>
            )}
            {!fieldErrors.password && (
              <div id="password-help" className="text-gray-600 text-xs mt-1">
                Must contain: 8+ characters, uppercase letter, number, special character
              </div>
            )}
          </div>

          {/* Confirm Password Field */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                id="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                onBlur={(e) => handleBlur('confirmPassword', e.target.value)}
                className={`mt-1 block w-full border rounded-lg px-3 py-2 pr-10 transition-colors ${
                  fieldErrors.confirmPassword ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'
                }`}
                aria-describedby={fieldErrors.confirmPassword ? "confirm-password-error" : undefined}
                aria-invalid={fieldErrors.confirmPassword ? "true" : "false"}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(prev => !prev)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 text-sm"
                tabIndex={-1}
                aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
              >
                {showConfirmPassword ? "Hide" : "Show"}
              </button>
            </div>
            {fieldErrors.confirmPassword && (
              <div id="confirm-password-error" role="alert" className="text-red-600 text-sm mt-1">
                {fieldErrors.confirmPassword}
              </div>
            )}
          </div>

          {/* General Error Message */}
          {error && (
            <div role="alert" className="text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-200">
              {error}
            </div>
          )}

          {/* Rate Limit Warning */}
          {attemptCount >= 3 && attemptCount < MAX_ATTEMPTS && (
            <div role="alert" className="text-orange-600 text-sm bg-orange-50 p-3 rounded-lg border border-orange-200">
              Warning: {MAX_ATTEMPTS - attemptCount} attempts remaining before temporary lockout.
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!isFormValid() || isLoading || attemptCount >= MAX_ATTEMPTS}
            className={`w-full font-semibold py-3 rounded-lg transition-all duration-200 ${
              !isFormValid() || isLoading || attemptCount >= MAX_ATTEMPTS
                ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                : 'bg-amber-900 hover:bg-amber-800 text-white hover:shadow-lg transform hover:-translate-y-0.5'
            }`}
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Creating Account...
              </div>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        {/* Login Link */}
        <p className="mt-6 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <a 
            href="/login" 
            className="text-amber-800 hover:underline"
          >
            Sign in here
          </a>
        </p>
      </div>
    </div>
  );
}
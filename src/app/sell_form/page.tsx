"use client";
import React, { useState, useEffect } from "react";
import axios from "axios";
import Navbar from "../../components/navbar";
import Footer from "../../components/footer";
import { db } from "../../firebaseConfig";
import { collection, addDoc, getDocs, doc, getDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/dez1qts8e/upload";
const CLOUDINARY_UPLOAD_PRESET = "unsigned_preset";

const sizeOptions = [
    "XXS / EU44 / UK34 / US34",
    "XS / EU46 / UK36 / US36",
    "S / EU48 / UK38 / US38",
    "M / EU50 / UK40 / US40",
    "L / EU52 / UK42 / US42",
    "XL / EU54 / UK44 / US44",
    "XXL / EU56 / UK46 / US46",
    "Free Size"
];

const defectConditions = ["Lightly Used", "Well Used", "Heavily Used"];

const SellFormPage: React.FC = () => {
    const [form, setForm] = useState({
        title: "",
        description: "",
        price: "",
        category: "",
        size: "",
        brand: "",
        condition: "",
    });
    const [dragActive, setDragActive] = useState(false);
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [images, setImages] = useState<File[]>([]);
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);
    const [audience, setAudience] = useState<"Women" | "Men" | "Kids" | "">("");
    const [defectImage, setDefectImage] = useState<File | null>(null);
    const [defectPreview, setDefectPreview] = useState<string>("");
    const [successMessage, setSuccessMessage] = useState("");
    const [showPopup, setShowPopup] = useState(false);
    const [categories, setCategories] = useState<string[]>([]);
    const [conditions, setConditions] = useState<string[]>([]);
    const [brands, setBrands] = useState<string[]>([]);
    const [isSuspended, setIsSuspended] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    // Fetch categories, conditions, brands from Firestore
    useEffect(() => {
        const fetchOptions = async () => {
            try {
                // Categories
                const catSnap = await getDocs(collection(db, "categories"));
                const catList: string[] = [];
                catSnap.forEach(doc => {
                    const data = doc.data();
                    catList.push(data.name || doc.id);
                });
                setCategories(catList.sort());

                // Conditions
                const condSnap = await getDocs(collection(db, "conditions"));
                const condList: string[] = [];
                condSnap.forEach(doc => {
                    const data = doc.data();
                    condList.push(data.name || doc.id);
                });
                setConditions(condList.sort());

                // Brands
                const brandSnap = await getDocs(collection(db, "brands"));
                const brandList: string[] = [];
                brandSnap.forEach(doc => {
                    const data = doc.data();
                    brandList.push(data.name || doc.id);
                });
                setBrands(brandList.sort());
            } catch (error) {
                setCategories([]);
                setConditions([]);
                setBrands([]);
            }
        };
        fetchOptions();
    }, []);

    useEffect(() => {
        const auth = getAuth();
        const unsubscribe = auth.onAuthStateChanged((user) => {
            if (user) {
                setIsLoggedIn(true);
                const checkSuspended = async () => {
                    const userRef = doc(db, "users", user.uid);
                    const userSnap = await getDoc(userRef);
                    if (userSnap.exists()) {
                        const userData = userSnap.data();
                        if (userData.suspended === true) {
                            setIsSuspended(true);
                        }
                    }
                };
                checkSuspended();
            } else {
                setIsLoggedIn(false);
            }
        });
        return () => unsubscribe();
    }, []);

    const updatePreviews = (files: File[]) => {
        const readers = files.map((file) => {
            return new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    resolve(reader.result as string);
                };
                reader.readAsDataURL(file);
            });
        });
        Promise.all(readers).then(setImagePreviews);
    };

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => {
        const { name, value } = e.target;
        setForm((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files ? Array.from(e.target.files) : [];
        const newImages = [...images, ...files].slice(0, 5);
        setImages(newImages);
        updatePreviews(newImages);
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        const files = Array.from(e.dataTransfer.files);
        handleImageUpload(files);
    };

    const handleImageUpload = (files: File[]) => {
        const validFiles = files.filter((file) => {
            const validTypes = ["image/jpeg", "image/png", "image/webp"];
            return validTypes.includes(file.type) && file.size <= 5 * 1024 * 1024;
        });
        const newImages = [...images, ...validFiles].slice(0, 5);
        setImages(newImages);
        updatePreviews(newImages);
    };

    const removeImage = (index: number) => {
        const newImages = images.filter((_, i) => i !== index);
        setImages(newImages);
        updatePreviews(newImages);
    };

    const handleDefectImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setDefectImage(file);
            const reader = new FileReader();
            reader.onloadend = () => setDefectPreview(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const removeDefectImage = () => {
        setDefectImage(null);
        setDefectPreview("");
    };

    const validateForm = () => {
        const newErrors: { [key: string]: string } = {};
        if (!form.title.trim()) newErrors.title = "Title is required.";
        if (!form.description.trim()) newErrors.description = "Description is required.";
        if (!form.price.trim() || isNaN(Number(form.price)) || Number(form.price) <= 0) newErrors.price = "Valid price is required.";
        if (!audience) newErrors.audience = "Audience is required.";
        if (!form.category) newErrors.category = "Category is required.";
        if (!form.size) newErrors.size = "Size is required.";
        if (!form.brand.trim()) newErrors.brand = "Brand is required.";
        if (!form.condition) newErrors.condition = "Condition is required.";
        if (images.length === 0) newErrors.images = "At least one image is required.";
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Cloudinary upload function
    const handleCloudinaryUpload = async (files: File[]) => {
        const urls: string[] = [];
        for (const file of files) {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

            const res = await axios.post(CLOUDINARY_URL, formData);
            urls.push(res.data.secure_url);
        }
        return urls;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (validateForm()) {
            try {
                const auth = getAuth();
                const user = auth.currentUser;
                if (!user) {
                    setIsLoggedIn(false);
                    return;
                }

                // Upload images to Cloudinary
                const imageUrls = await handleCloudinaryUpload(images);

                // Upload defect image if present
                let defectImageUrl = "";
                if (defectImage) {
                    const defectFormData = new FormData();
                    defectFormData.append("file", defectImage);
                    defectFormData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
                    const defectRes = await axios.post(CLOUDINARY_URL, defectFormData);
                    defectImageUrl = defectRes.data.secure_url;
                }

                // Prepare listing data
                const formData = {
                    ...form,
                    audience,
                    images: imageUrls,
                    defectImage: defectImageUrl,
                    sellerId: user.uid, 
                    createdAt: new Date(),
                };

                // Save to Firestore
                await addDoc(collection(db, "products"), formData);

                setSuccessMessage("Your item has been successfully submitted!");
                setShowPopup(true);
                handleReset();
            } catch (error) {
                console.error("Error submitting form: ", error);
                alert("Failed to submit item. Please try again.");
            }
        }
    };

    const handleReset = () => {
        setForm({
            title: "",
            description: "",
            price: "",
            category: "",
            size: "",
            brand: "",
            condition: "",
        });
        setImagePreviews([]);
        setImages([]);
        setAudience("");
        setErrors({});
        setDefectImage(null);
        setDefectPreview("");
    };

    if (!isLoggedIn) {
        return (
            <div style={{
                minHeight: "100vh",
                display: "flex",
                flexDirection: "column",
                background: "#f5f5f5",
            }}>
                <div style={{ width: "100vw", position: "relative", left: "50%", right: "50%", marginLeft: "-50vw", marginRight: "-50vw" }}>
                    <Navbar />
                </div>
                <div style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                }}>
                    <div style={{
                        background: "#fff",
                        padding: "32px",
                        borderRadius: "12px",
                        boxShadow: "0 2px 16px #aaa",
                        textAlign: "center",
                        minWidth: "320px"
                    }}>
                        <h2 style={{ color: "#c9a26d", marginBottom: "16px" }}>Login Required</h2>
                        <p style={{ color: "#222", fontWeight: "bold", marginBottom: "24px" }}>
                            Please login or create an account to sell items.
                        </p>
                        <button
                            onClick={() => window.location.href = '/login'}
                            style={{
                                padding: "12px 24px",
                                background: "#c9a26d",
                                color: "#fff",
                                border: "none",
                                borderRadius: "8px",
                                fontWeight: "bold",
                                fontSize: "16px",
                                cursor: "pointer",
                            }}
                        >
                            Go to Login
                        </button>
                    </div>
                </div>
                <div style={{ width: "100vw", position: "relative", left: "50%", right: "50%", marginLeft: "-50vw", marginRight: "-50vw" }}>
                    <Footer />
                </div>
            </div>
        );
    }

    if (isSuspended) {
        return (
            <div style={{
                minHeight: "100vh",
                display: "flex",
                flexDirection: "column",
                background: "#f5f5f5",
                alignItems: "center",
                justifyContent: "center"
            }}>
                <Navbar />
                <div style={{
                    background: "#fff",
                    padding: "32px",
                    borderRadius: "12px",
                    boxShadow: "0 2px 16px #aaa",
                    textAlign: "center",
                    minWidth: "320px",
                    marginTop: "48px"
                }}>
                    <h2 style={{ color: "#dc3545", marginBottom: "16px" }}>Account Suspended</h2>
                    <p style={{ color: "#222", fontWeight: "bold", marginBottom: "24px" }}>
                        Your account is suspended. You are not allowed to sell items.<br />
                        Please email <a href="mailto:wearcycle001@gmail.com" style={{ color: "#c9a26d", textDecoration: "underline" }}>wearcycle001@gmail.com</a> to enquire about it.
                    </p>
                </div>
                <Footer />
            </div>
        );
    }

    return (
        <div
            style={{
                minHeight: "100vh",
                display: "flex",
                flexDirection: "column",
                background: "#f5f5f5",
            }}
        >
            {/* Make Navbar full width */}
            <div style={{ width: "100vw", position: "relative", left: "50%", right: "50%", marginLeft: "-50vw", marginRight: "-50vw" }}>
                <Navbar />
            </div>
            {showPopup && (
                <div
                    style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        width: "100vw",
                        height: "100vh",
                        background: "rgba(0,0,0,0.3)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 9999,
                    }}
                    onClick={() => setShowPopup(false)}
                >
                    <div
                        style={{
                            background: "#fff",
                            padding: "32px",
                            borderRadius: "12px",
                            boxShadow: "0 2px 16px #aaa",
                            textAlign: "center",
                            minWidth: "320px",
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <h2 style={{ color: "#155724", marginBottom: "16px" }}>Success!</h2>
                        <p style={{ color: "#155724", fontWeight: "bold", marginBottom: "24px" }}>
                            {successMessage}
                        </p>
                        <button
                            style={{
                                padding: "10px 32px",
                                background: "#c9a26d",
                                color: "#fff",
                                border: "none",
                                borderRadius: "8px",
                                fontWeight: "bold",
                                fontSize: "16px",
                                cursor: "pointer",
                            }}
                            onClick={() => setShowPopup(false)}
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
            <main
                style={{
                    flex: 1,
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "flex-start",
                    padding: "32px",
                }}
            >
                {/* Left Section */}
                <section
                    style={{
                        flex: 1,
                        maxWidth: "400px",
                        marginRight: "32px",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                    }}
                >
                    <h1
                        style={{
                            fontSize: "32px",
                            fontWeight: "bold",
                            marginBottom: "16px",
                        }}
                    >
                        Sell an Item
                    </h1>
                    <p
                        style={{
                            marginBottom: "32px",
                            color: "#222",
                        }}
                    >
                        Upload your picture and provide details for your item.
                    </p>
                    <div
                        style={{
                            display: "flex",
                            gap: "16px",
                        }}
                    >
                        <button
                            type="button"
                            style={{
                                flex: 1,
                                padding: "12px",
                                border: "2px solid #222",
                                borderRadius: "6px",
                                background: "#fff",
                                color: "#222",
                                fontWeight: "500",
                                fontSize: "16px",
                                cursor: "pointer",
                            }}
                            onClick={handleReset}
                        >
                            Cancel
                        </button>
                        <label
                            htmlFor="image-upload"
                            style={{
                                flex: 1,
                                padding: "12px",
                                border: "2px solid #222",
                                borderRadius: "6px",
                                background: "#222",
                                color: "#fff",
                                fontWeight: "500",
                                fontSize: "16px",
                                cursor: "pointer",
                                textAlign: "center",
                            }}
                        >
                            Upload Picture
                            <input
                                id="image-upload"
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={handleFileChange}
                                style={{ display: "none" }}
                            />
                        </label>
                    </div>
                    <div style={{ marginTop: "32px" }}>
                        <div
                            style={{
                                border: "2px dashed #e9ecef",
                                borderRadius: "0.5rem",
                                padding: "2rem",
                                textAlign: "center",
                                cursor: "pointer",
                                transition: "border-color 0.3s ease",
                                borderColor: dragActive
                                    ? "#c9a26d"
                                    : errors.images
                                    ? "#dc3545"
                                    : "#e9ecef",
                            }}
                            onClick={() =>
                                document.getElementById("image-upload")?.click()
                            }
                            onDragEnter={handleDrag}
                            onDragLeave={handleDrag}
                            onDragOver={handleDrag}
                            onDrop={handleDrop}
                        >
                            <span
                                style={{
                                    fontSize: "2rem",
                                    color: "#c9a26d",
                                    marginBottom: "1rem",
                                    display: "block",
                                }}
                            >
                                📷
                            </span>
                            <h4
                                style={{
                                    margin: "0 0 0.5rem 0",
                                    color: "#2c3e50",
                                }}
                            >
                                Upload Reference Images
                            </h4>
                            <p
                                style={{
                                    margin: "0 0 0.5rem 0",
                                    color: "#6c757d",
                                }}
                            >
                                Click to upload or drag and drop images here
                            </p>
                            <p
                                style={{
                                    fontSize: "0.875rem",
                                    color: "#6c757d",
                                    margin: 0,
                                }}
                            >
                                Maximum 5 images, each up to 5MB (JPG, PNG, WebP)
                            </p>
                        </div>
                        {errors.images && (
                            <div style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.5rem",
                                color: "#dc3545",
                                marginTop: "0.5rem",
                                fontSize: "0.875rem",
                            }}>
                                {errors.images}
                            </div>
                        )}
                        {imagePreviews.length > 0 && (
                            <div
                                style={{
                                    marginTop: "16px",
                                    textAlign: "center",
                                    display: "flex",
                                    flexWrap: "wrap",
                                    gap: "16px",
                                    justifyContent: "center",
                                }}
                            >
                                {imagePreviews.map((src, idx) => (
                                    <div key={idx}>
                                        <img
                                            src={src}
                                            alt={`Preview ${idx + 1}`}
                                            style={{
                                                maxWidth: "120px",
                                                maxHeight: "120px",
                                                borderRadius: "8px",
                                                boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
                                            }}
                                        />
                                        <div
                                            style={{
                                                marginTop: "8px",
                                                color: "#555",
                                                fontSize: "14px",
                                            }}
                                        >
                                            {images[idx]?.name}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeImage(idx)}
                                            style={{
                                                marginTop: "4px",
                                                background: "#fff",
                                                border: "none",
                                                color: "#dc3545",
                                                cursor: "pointer",
                                            }}
                                            title="Remove image"
                                        >
                                            ✖
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </section>
                {/* Right Section */}
                <section
                    style={{
                        flex: 1,
                        maxWidth: "500px",
                        background: "#c9a26d",
                        borderRadius: "12px",
                        padding: "32px",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
                    }}
                >
                    {successMessage && (
                        <div style={{
                            background: "#d4edda",
                            color: "#155724",
                            padding: "16px",
                            borderRadius: "8px",
                            marginBottom: "16px",
                            textAlign: "center",
                            fontWeight: "bold"
                        }}>
                            {successMessage}
                        </div>
                    )}
                    <form onSubmit={handleSubmit} noValidate>
                        <div style={{ marginBottom: "24px" }}>
                            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>
                                Title
                                <input
                                    type="text"
                                    name="title"
                                    value={form.title}
                                    onChange={handleChange}
                                    required
                                    style={{
                                        width: "100%",
                                        marginTop: "8px",
                                        padding: "8px",
                                        borderRadius: "4px",
                                        border: "1px solid #ccc",
                                        background: "#fff",
                                    }}
                                    placeholder="Item title"
                                />
                                {errors.title && (
                                    <div style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "0.5rem",
                                        color: "#dc3545",
                                        marginTop: "0.5rem",
                                        fontSize: "0.875rem",
                                    }}>{errors.title}</div>
                                )}
                            </label>
                        </div>
                        <div style={{ marginBottom: "24px" }}>
                            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>
                                Description
                                <textarea
                                    name="description"
                                    value={form.description}
                                    onChange={handleChange}
                                    required
                                    style={{
                                        width: "100%",
                                        marginTop: "8px",
                                        padding: "8px",
                                        borderRadius: "4px",
                                        border: "1px solid #ccc",
                                        background: "#fff",
                                        minHeight: "80px",
                                        whiteSpace: "pre-line" // Ensures new lines display in textarea
                                    }}
                                    placeholder="Describe your item"
                                />
                                {errors.description && (
                                    <div style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "0.5rem",
                                        color: "#dc3545",
                                        marginTop: "0.5rem",
                                        fontSize: "0.875rem",
                                    }}>{errors.description}</div>
                                )}
                            </label>
                        </div>
                        <div style={{ marginBottom: "24px" }}>
                            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>
                                Price (RM)
                                <input
                                    type="number"
                                    name="price"
                                    value={form.price}
                                    onChange={handleChange}
                                    required
                                    min="0"
                                    style={{
                                        width: "100%",
                                        marginTop: "8px",
                                        padding: "8px",
                                        borderRadius: "4px",
                                        border: "1px solid #ccc",
                                        background: "#fff",
                                    }}
                                    placeholder="Price"
                                />
                                {errors.price && (
                                    <div style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "0.5rem",
                                        color: "#dc3545",
                                        marginTop: "0.5rem",
                                        fontSize: "0.875rem",
                                    }}>{errors.price}</div>
                                )}
                            </label>
                        </div>
                        <div style={{ marginBottom: "24px" }}>
                            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>
                                Audience
                                <select
                                    name="audience"
                                    value={audience}
                                    onChange={e => setAudience(e.target.value as "" | "Women" | "Men" | "Kids")}
                                    required
                                    style={{
                                        width: "100%",
                                        marginTop: "8px",
                                        padding: "8px",
                                        borderRadius: "4px",
                                        border: "1px solid #ccc",
                                        background: "#fff",
                                    }}
                                >
                                    <option value="">Select audience</option>
                                    <option value="Women">Women</option>
                                    <option value="Men">Men</option>
                                    <option value="Kids">Kids</option>
                                </select>
                                {errors.audience && (
                                    <div style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "0.5rem",
                                        color: "#dc3545",
                                        marginTop: "0.5rem",
                                        fontSize: "0.875rem",
                                    }}>{errors.audience}</div>
                                )}
                            </label>
                        </div>
                        <div style={{ marginBottom: "24px" }}>
                            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>
                                Category
                                <select
                                    name="category"
                                    value={form.category}
                                    onChange={handleChange}
                                    required
                                    style={{
                                        width: "100%",
                                        marginTop: "8px",
                                        padding: "8px",
                                        borderRadius: "4px",
                                        border: "1px solid #ccc",
                                        background: "#fff",
                                    }}
                                >
                                    <option value="">Select category</option>
                                    {categories.map((cat) => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                                {errors.category && (
                                    <div style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "0.5rem",
                                        color: "#dc3545",
                                        marginTop: "0.5rem",
                                        fontSize: "0.875rem",
                                    }}>{errors.category}</div>
                                )}
                            </label>
                        </div>
                        <div style={{ marginBottom: "24px" }}>
                            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>
                                Condition
                                <select
                                    name="condition"
                                    value={form.condition}
                                    onChange={handleChange}
                                    required
                                    style={{
                                        width: "100%",
                                        marginTop: "8px",
                                        padding: "8px",
                                        borderRadius: "4px",
                                        border: "1px solid #ccc",
                                        background: "#fff",
                                    }}
                                >
                                    <option value="">Select condition</option>
                                    {conditions.map((cond) => (
                                        <option key={cond} value={cond}>{cond}</option>
                                    ))}
                                </select>
                                {errors.condition && (
                                    <div style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "0.5rem",
                                        color: "#dc3545",
                                        marginTop: "0.5rem",
                                        fontSize: "0.875rem",
                                    }}>{errors.condition}</div>
                                )}
                            </label>
                        </div>
                        <div style={{ marginBottom: "24px" }}>
                            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>
                                Brand
                                <select
                                    name="brand"
                                    value={form.brand}
                                    onChange={handleChange}
                                    required
                                    style={{
                                        width: "100%",
                                        marginTop: "8px",
                                        padding: "8px",
                                        borderRadius: "4px",
                                        border: "1px solid #ccc",
                                        background: "#fff",
                                    }}
                                >
                                    <option value="">Select brand</option>
                                    {brands.map((brand) => (
                                        <option key={brand} value={brand}>{brand}</option>
                                    ))}
                                </select>
                                {errors.brand && (
                                    <div style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "0.5rem",
                                        color: "#dc3545",
                                        marginTop: "0.5rem",
                                        fontSize: "0.875rem",
                                    }}>{errors.brand}</div>
                                )}
                            </label>
                        </div>
                       
                        <div style={{ display: "flex", gap: "16px" }}>
                            <button
                                type="button"
                                onClick={handleReset}
                                style={{
                                    flex: 1,
                                    padding: "12px",
                                    border: "2px solid #222",
                                    borderRadius: "6px",
                                    background: "#fff",
                                    color: "#222",
                                    fontWeight: "500",
                                    fontSize: "16px",
                                    cursor: "pointer",
                                }}
                            >
                                Reset Form
                            </button>
                            <button
                                type="submit"
                                style={{
                                    flex: 1,
                                    padding: "12px",
                                    border: "2px solid #222",
                                    borderRadius: "6px",
                                    background: "#222",
                                    color: "#fff",
                                    fontWeight: "500",
                                    fontSize: "16px",
                                    cursor: "pointer",
                                }}
                            >
                                Submit
                            </button>
                        </div>
                    </form>
                </section>
            </main>
            {/* Make Footer full width */}
            <div style={{ width: "100vw", position: "relative", left: "50%", right: "50%", marginLeft: "-50vw", marginRight: "-50vw" }}>
                <Footer />
            </div>
        </div>
    );
};

export default SellFormPage;
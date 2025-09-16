"use client";
import React, { useState } from "react";
import { Camera, AlertCircle } from "lucide-react";
import Navbar from "../../components/navbar";
import Footer from "../../components/footer";
import axios from "axios";
import { db } from "../../firebaseConfig";
import { collection, addDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/dez1qts8e/upload";
const CLOUDINARY_UPLOAD_PRESET = "unsigned_preset";

const styles = {
    formGroup: {
        marginBottom: "1.5rem",
    },
    label: {
        display: "block",
        marginBottom: "0.5rem",
        fontWeight: 500,
    },
    requiredLabel: {
        color: "#dc3545",
    },
    imageUpload: {
        border: "2px dashed #e9ecef",
        borderRadius: "0.5rem",
        padding: "2rem",
        textAlign: "center" as const,
        cursor: "pointer",
        transition: "border-color 0.3s ease",
    },
    errorMessage: {
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        color: "#dc3545",
        marginTop: "0.5rem",
        fontSize: "0.875rem",
    },
};

function BidForm() {
    const [form, setForm] = useState({
        productName: "",
        description: "",
        endDate: "",
        price: "",
        minIncrement: "", // <-- Add this field
        size: "",
        brand: "",
    });
    const [dragActive, setDragActive] = useState(false);
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [images, setImages] = useState<File[]>([]);
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);
    const [successMessage, setSuccessMessage] = useState("");
    const [showPopup, setShowPopup] = useState(false);

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
        const newImages = [...images, ...files].slice(0, 5); // max 5 images
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
        const newImages = [...images, ...validFiles].slice(0, 5); // max 5 images
        setImages(newImages);
        updatePreviews(newImages);
    };

    // Remove image
    const removeImage = (index: number) => {
        const newImages = images.filter((_, i) => i !== index);
        setImages(newImages);
        updatePreviews(newImages);
    };

    const validateForm = () => {
        const newErrors: { [key: string]: string } = {};
        if (!form.productName.trim()) newErrors.productName = "Product name is required.";
        if (!form.description.trim()) newErrors.description = "Description is required.";
        if (!form.endDate.trim()) newErrors.endDate = "End date is required.";
        if (!form.price.trim() || isNaN(Number(form.price)) || Number(form.price) <= 0) newErrors.price = "Valid price is required.";
        if (!form.minIncrement.trim() || isNaN(Number(form.minIncrement)) || Number(form.minIncrement) <= 0) newErrors.minIncrement = "Minimum increment is required.";
        if (!form.size) newErrors.size = "Size is required.";
        if (!form.brand.trim()) newErrors.brand = "Brand is required.";
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
                if (!user) throw new Error("User not authenticated");

                // Upload images to Cloudinary
                const imageUrls = await handleCloudinaryUpload(images);

                // Prepare bid data
                const bidData = {
                    ...form,
                    price: Number(form.price),
                    minIncrement: Number(form.minIncrement), // Save as number
                    images: imageUrls,
                    userId: user.uid,
                    createdAt: new Date(),
                };

                // Save to Firestore (bids collection)
                await addDoc(collection(db, "bids"), bidData);

                setSuccessMessage("Your bid has been successfully submitted!");
                setShowPopup(true);
                handleReset();
            } catch (error: any) {
                console.error("Error submitting bid: ", error);

                let userMessage = "Failed to submit bid. Please try again.";
                if (error?.response?.status === 401) {
                    userMessage = "Image upload failed: Unauthorized. Please check your Cloudinary upload preset settings or make sure you are not using a signed preset.";
                } else if (error?.message?.includes("User not authenticated")) {
                    userMessage = "You must be logged in to submit a bid.";
                } else if (error?.response?.status === 400) {
                    userMessage = "Image upload failed: Bad request. Please check your image file type and size.";
                }

                alert(userMessage);
            }
        }
    };

    const handleReset = () => {
        setForm({
            productName: "",
            description: "",
            endDate: "",
            price: "",
            minIncrement: "",
            size: "",
            brand: "",
        });
        setImagePreviews([]);
        setImages([]);
        setErrors({});
    };

    // Add options for size
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

    return (
        <div
            style={{
                minHeight: "100vh",
                display: "flex",
                flexDirection: "column",
                background: "#f5f5f5",
            }}
        >
            <Navbar />
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
                        Submit Your Bid
                    </h1>
                    <p
                        style={{
                            marginBottom: "32px",
                            color: "#222",
                        }}
                    >
                        Upload your picture and provide details for your bidding offer.
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
                                ...styles.imageUpload,
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
                            <Camera
                                size={48}
                                style={{ color: "#c9a26d", marginBottom: "1rem" }}
                            />
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
                            <div style={styles.errorMessage}>
                                <AlertCircle size={14} />
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
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                padding: 0,
                                                width: "24px",
                                                height: "24px",
                                            }}
                                            title="Remove image"
                                        >
                                            <span style={{ fontSize: 16, lineHeight: "24px" }}>×</span>
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
                    <form onSubmit={handleSubmit}>
                        <div style={{ marginBottom: "24px" }}>
                            <label
                                style={{
                                    fontWeight: "500",
                                    display: "block",
                                    marginBottom: "8px",
                                }}
                            >
                                Product Name
                                <input
                                    type="text"
                                    name="productName"
                                    value={form.productName}
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
                                    placeholder="Enter Product Name"
                                />
                            </label>
                        </div>
                        <div style={{ marginBottom: "24px" }}>
                            <label
                                style={{
                                    fontWeight: "500",
                                    display: "block",
                                    marginBottom: "8px",
                                }}
                            >
                                Description
                                <input
                                    type="text"
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
                                    }}
                                    placeholder="Provide a short description of the item"
                                />
                            </label>
                        </div>
                        <div style={{ marginBottom: "24px" }}>
                            <label
                                style={{
                                    fontWeight: "500",
                                    display: "block",
                                    marginBottom: "8px",
                                }}
                            >
                                End Date
                                <input
                                    type="date"
                                    name="endDate"
                                    value={form.endDate}
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
                                    placeholder="Select end date"
                                />
                            </label>
                        </div>
                        <div style={{ marginBottom: "24px" }}>
                            <label
                                style={{
                                    fontWeight: "500",
                                    display: "block",
                                    marginBottom: "8px",
                                }}
                            >
                                Price
                                <input
                                    type="number"
                                    name="price"
                                    value={form.price}
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
                                    placeholder="Enter your minimum bid price"
                                    min="0"
                                    step="any"
                                />
                            </label>
                        </div>
                        <div style={{ marginBottom: "24px" }}>
                            <label
                                style={{
                                    fontWeight: "500",
                                    display: "block",
                                    marginBottom: "8px",
                                }}
                            >
                                Minimum Bid Increment
                                <input
                                    type="number"
                                    name="minIncrement"
                                    value={form.minIncrement}
                                    onChange={handleChange}
                                    required
                                    min="1"
                                    style={{
                                        width: "100%",
                                        marginTop: "8px",
                                        padding: "8px",
                                        borderRadius: "4px",
                                        border: "1px solid #ccc",
                                        background: "#fff",
                                    }}
                                    placeholder="Enter minimum increment (e.g. 5)"
                                />
                                {errors.minIncrement && (
                                    <div style={{
                                        color: "#dc3545",
                                        marginTop: "0.5rem",
                                        fontSize: "0.875rem",
                                    }}>{errors.minIncrement}</div>
                                )}
                            </label>
                        </div>
                        <div style={{ marginBottom: "24px" }}>
                            <label
                                style={{
                                    fontWeight: "500",
                                    display: "block",
                                    marginBottom: "8px",
                                }}
                            >
                                Clothing Size
                                <select
                                    name="size"
                                    value={form.size}
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
                                    <option value="">Select size</option>
                                    {sizeOptions.map((size) => (
                                        <option key={size} value={size}>{size}</option>
                                    ))}
                                </select>
                            </label>
                        </div>
                        <div style={{ marginBottom: "24px" }}>
                            <label
                                style={{
                                    fontWeight: "500",
                                    display: "block",
                                    marginBottom: "8px",
                                }}
                            >
                                Brand
                                <input
                                    type="text"
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
                                    placeholder="Type the brand name"
                                />
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
                                Submit Bid
                            </button>
                        </div>
                    </form>
                </section>
            </main>
            <Footer />
        </div>
    );
}

export default BidForm;
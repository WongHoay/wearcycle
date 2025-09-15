"use client";
import React, { useState } from "react";
import { Camera, AlertCircle, X } from "lucide-react";
import Navbar from "../../components/navbar";
import Footer from "../../components/footer";

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
        images: [] as File[],
        size: "",
        brand: "",
    });
    const [dragActive, setDragActive] = useState(false);
    const [errors, setErrors] = useState<{ images?: string }>({});
    const [images, setImages] = useState<File[]>([]);
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);

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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        alert("Bidding information submitted!");
    };

    const handleReset = () => {
        setForm({
            productName: "",
            description: "",
            endDate: "",
            price: "",
            images: [],
            size: "",
            brand: "",
        });
        setImagePreviews([]);
        setImages([]);
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
                    {/* Move image previews and upload area here */}
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
                        {/* 
                        // Original upload code commented out:
                        <div style={styles.formGroup}>
                            <label style={styles.label}>
                                Reference Images{" "}
                                <span style={styles.requiredLabel}>*</span>
                            </label>
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
                                <input
                                    id="image-upload"
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    multiple
                                    onChange={handleFileChange}
                                    style={{ display: "none" }}
                                />
                            </div>
                            {errors.images && (
                                <div style={styles.errorMessage}>
                                    <AlertCircle size={14} />
                                    {errors.images}
                                </div>
                            )}

                            {imagePreviews.length > 0 && (
                                <div style={styles.imagePreview}>
                                    {imagePreviews.map((src, idx) => (
                                        <div key={idx} style={styles.imageItem}>
                                            <img
                                                src={src}
                                                alt={`Preview ${idx + 1}`}
                                                style={styles.image}
                                            />
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    removeImage(idx);
                                                }}
                                                style={styles.removeButton}
                                                title="Remove image"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        */}
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
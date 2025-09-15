"use client";
import React, { useState } from "react";
import Navbar from "../../components/navbar";
import Footer from "../../components/footer";
import { db } from "../../firebaseConfig"; // Adjust path if needed
import { collection, addDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../../firebaseConfig"; // Make sure you export storage from your config

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

const conditionOptions = [
    "Brand New",
    "Like New",
    "Lightly Used",
    "Well Used",
    "Heavily Used"
];

const categoryMap = {
    Women: ["Tops", "Bottoms", "Dresses", "Outerwear", "Shoes", "Accessories"],
    Men: ["Shirts", "Pants", "Outerwear", "Shoes", "Accessories"],
    Kids: ["Tops", "Bottoms", "Dresses", "Outerwear", "Shoes"]
};

const defectConditions = ["Lightly Used", "Well Used", "Heavily Used"];

const SellFormPage: React.FC = () => {
    const [form, setForm] = useState({
        title: "",
        description: "",
        price: "",
        category: "",
        size: "",
        brand: "",
        condition: "", // Add condition to state
        images: [] as File[],
    });
    const [dragActive, setDragActive] = useState(false);
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [images, setImages] = useState<File[]>([]);
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);
    const [audience, setAudience] = useState<keyof typeof categoryMap | "">(""); // Added audience state
    const [defectImage, setDefectImage] = useState<File | null>(null);
    const [defectPreview, setDefectPreview] = useState<string>("");
    const [successMessage, setSuccessMessage] = useState(""); // Success message state

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
        if (!form.condition) newErrors.condition = "Condition is required."; // Add condition validation
        if (images.length === 0) newErrors.images = "At least one image is required.";
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (validateForm()) {
            try {
                const auth = getAuth();
                const user = auth.currentUser;
                if (!user) throw new Error("User not authenticated");

                // Upload images to Firebase Storage
                const imageUrls: string[] = [];
                for (let i = 0; i < images.length; i++) {
                    const image = images[i];
                    const storageRef = ref(storage, `products/${user.uid}/${Date.now()}_${image.name}`);
                    await uploadBytes(storageRef, image);
                    const url = await getDownloadURL(storageRef);
                    imageUrls.push(url);
                }

                // Upload defect image if present
                let defectImageUrl = "";
                if (defectImage) {
                    const defectRef = ref(storage, `products/${user.uid}/defect_${Date.now()}_${defectImage.name}`);
                    await uploadBytes(defectRef, defectImage);
                    defectImageUrl = await getDownloadURL(defectRef);
                }

                // Prepare listing data
                const formData = {
                    ...form,
                    audience,
                    images: imageUrls,
                    defectImage: defectImageUrl,
                    userId: user.uid,
                    createdAt: new Date(),
                };

                // Save to Firestore
                await addDoc(collection(db, "products"), formData);

                setSuccessMessage("Your item has been successfully submitted!");
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
            condition: "", // Reset condition
            images: [],
        });
        setImagePreviews([]);
        setImages([]);
        setAudience("");
        setErrors({});
    };

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
                            <div style={styles.errorMessage}>
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
                            <label style={styles.label}>
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
                                    <div style={styles.errorMessage}>{errors.title}</div>
                                )}
                            </label>
                        </div>
                        <div style={{ marginBottom: "24px" }}>
                            <label style={styles.label}>
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
                                    }}
                                    placeholder="Describe your item"
                                />
                                {errors.description && (
                                    <div style={styles.errorMessage}>{errors.description}</div>
                                )}
                            </label>
                        </div>
                        <div style={{ marginBottom: "24px" }}>
                            <label style={styles.label}>
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
                                    <div style={styles.errorMessage}>{errors.price}</div>
                                )}
                            </label>
                        </div>
                        <div style={{ marginBottom: "24px" }}>
                            <label style={styles.label}>
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
                                    <div style={styles.errorMessage}>{errors.audience}</div>
                                )}
                            </label>
                        </div>
                        <div style={{ marginBottom: "24px" }}>
                            <label style={styles.label}>
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
                                    disabled={!audience}
                                >
                                    <option value="">Select category</option>
                                    {audience &&
                                        categoryMap[audience as keyof typeof categoryMap].map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                </select>
                                {errors.category && (
                                    <div style={styles.errorMessage}>{errors.category}</div>
                                )}
                            </label>
                        </div>
                        <div style={{ marginBottom: "24px" }}>
                            <label style={styles.label}>
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
                                {errors.size && (
                                    <div style={styles.errorMessage}>{errors.size}</div>
                                )}
                            </label>
                        </div>
                        <div style={{ marginBottom: "24px" }}>
                            <label style={styles.label}>
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
                                {errors.brand && (
                                    <div style={styles.errorMessage}>{errors.brand}</div>
                                )}
                            </label>
                        </div>
                        <div style={{ marginBottom: "24px" }}>
                            <label style={styles.label}>
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
                                    {conditionOptions.map((cond) => (
                                        <option key={cond} value={cond}>{cond}</option>
                                    ))}
                                </select>
                                {errors.condition && (
                                    <div style={styles.errorMessage}>{errors.condition}</div>
                                )}
                                <div style={{ color: "#555", fontSize: "0.95rem", marginTop: "8px" }}>
                                    Please be honest about the item's condition. If there are any defects, mention them and upload a close-up photo.
                                </div>
                            </label>
                        </div>
                        {defectConditions.includes(form.condition) && (
                            <div style={{ marginBottom: "24px" }}>
                                <label style={styles.label}>
                                    Close-up Defect Image (if any)
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleDefectImageChange}
                                        style={{
                                            width: "100%",
                                            marginTop: "8px",
                                            padding: "8px",
                                            borderRadius: "4px",
                                            border: "1px solid #ccc",
                                            background: "#fff",
                                        }}
                                    />
                                </label>
                                {defectPreview && (
                                    <div style={{ marginTop: "12px", textAlign: "center" }}>
                                        <img
                                            src={defectPreview}
                                            alt="Defect Preview"
                                            style={{
                                                maxWidth: "120px",
                                                maxHeight: "120px",
                                                borderRadius: "8px",
                                                boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
                                            }}
                                        />
                                        <div>
                                            <button
                                                type="button"
                                                onClick={removeDefectImage}
                                                style={{
                                                    marginTop: "4px",
                                                    background: "#fff",
                                                    border: "none",
                                                    color: "#dc3545",
                                                    cursor: "pointer",
                                                }}
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
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
            <Footer />
        </div>
    );
};

export default SellFormPage;


// "use client"
// import React, { useState } from 'react';
// import { Upload, X, Plus } from 'lucide-react';

// interface FormData {
//   title: string;
//   brand: string;
//   category: string;
//   subcategory: string;
//   size: string;
//   condition: string;
//   color: string;
//   material: string;
//   price: string;
//   originalPrice: string;
//   description: string;
//   measurements: {
//     chest: string;
//     waist: string;
//     length: string;
//     sleeves: string;
//   };
//   images: File[];
//   tags: string[];
//   shippingMethod: string;
//   returnPolicy: string;
// }

// const SellingForm: React.FC = () => {
//   const [formData, setFormData] = useState<FormData>({
//     title: '',
//     brand: '',
//     category: '',
//     subcategory: '',
//     size: '',
//     condition: '',
//     color: '',
//     material: '',
//     price: '',
//     originalPrice: '',
//     description: '',
//     measurements: {
//       chest: '',
//       waist: '',
//       length: '',
//       sleeves: ''
//     },
//     images: [],
//     tags: [],
//     shippingMethod: '',
//     returnPolicy: ''
//   });

//   const [newTag, setNewTag] = useState('');
//   const [dragActive, setDragActive] = useState(false);

//   const categories = {
//     'Women': ['Tops', 'Bottoms', 'Dresses', 'Outerwear', 'Shoes', 'Accessories'],
//     'Men': ['Shirts', 'Pants', 'Outerwear', 'Shoes', 'Accessories'],
//     'Kids': ['Tops', 'Bottoms', 'Dresses', 'Outerwear', 'Shoes']
//   };

//   const sizes = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
//   const conditions = ['New with tags', 'Like new', 'Good', 'Fair', 'Poor'];
//   const colors = ['Black', 'White', 'Gray', 'Brown', 'Beige', 'Red', 'Pink', 'Orange', 'Yellow', 'Green', 'Blue', 'Purple', 'Multi-color'];

//   const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
//     const { name, value } = e.target;
    
//     if (name.includes('.')) {
//       const [parent, child] = name.split('.');
//       setFormData(prev => ({
//         ...prev,
//         [parent]: {
//           ...((prev[parent as keyof FormData] as object) || {}),
//           [child]: value
//         }
//       }));
//     } else {
//       setFormData(prev => ({ ...prev, [name]: value }));
//     }
//   };

//   const handleImageUpload = (files: FileList | null) => {
//     if (files) {
//       const newFiles = Array.from(files).slice(0, 8 - formData.images.length);
//       setFormData(prev => ({
//         ...prev,
//         images: [...prev.images, ...newFiles]
//       }));
//     }
//   };

//   const removeImage = (index: number) => {
//     setFormData(prev => ({
//       ...prev,
//       images: prev.images.filter((_, i) => i !== index)
//     }));
//   };

//   const addTag = () => {
//     if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
//       setFormData(prev => ({
//         ...prev,
//         tags: [...prev.tags, newTag.trim()]
//       }));
//       setNewTag('');
//     }
//   };

//   const removeTag = (tagToRemove: string) => {
//     setFormData(prev => ({
//       ...prev,
//       tags: prev.tags.filter(tag => tag !== tagToRemove)
//     }));
//   };

//   const handleSubmit = (e: React.FormEvent) => {
//     e.preventDefault();
//     console.log('Form submitted:', formData);
//     // Handle form submission here
//   };

//   const handleDrag = (e: React.DragEvent) => {
//     e.preventDefault();
//     e.stopPropagation();
//     if (e.type === "dragenter" || e.type === "dragover") {
//       setDragActive(true);
//     } else if (e.type === "dragleave") {
//       setDragActive(false);
//     }
//   };

//   const handleDrop = (e: React.DragEvent) => {
//     e.preventDefault();
//     e.stopPropagation();
//     setDragActive(false);
//     handleImageUpload(e.dataTransfer.files);
//   };

//   return (
//     <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem', backgroundColor: '#fff' }}>
//       <h1 style={{ color: '#c9a26d', marginBottom: '2rem', fontSize: '2rem', fontWeight: 'bold' }}>
//         List Your Item
//       </h1>
      
//       <form onSubmit={handleSubmit}>
//         {/* Basic Information */}
//         <section style={{ marginBottom: '2rem' }}>
//           <h2 style={{ color: '#5d4e37', marginBottom: '1rem', fontSize: '1.5rem' }}>Basic Information</h2>
          
//           <div style={{ marginBottom: '1rem' }}>
//             <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Item Title *</label>
//             <input
//               type="text"
//               name="title"
//               value={formData.title}
//               onChange={handleInputChange}
//               placeholder="e.g., Vintage Levi's Denim Jacket"
//               style={{
//                 width: '100%',
//                 padding: '0.75rem',
//                 border: '2px solid #e5e5e5',
//                 borderRadius: '8px',
//                 fontSize: '1rem'
//               }}
//               required
//             />
//           </div>

//           <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
//             <div>
//               <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Brand *</label>
//               <input
//                 type="text"
//                 name="brand"
//                 value={formData.brand}
//                 onChange={handleInputChange}
//                 placeholder="e.g., Levi's"
//                 style={{
//                   width: '100%',
//                   padding: '0.75rem',
//                   border: '2px solid #e5e5e5',
//                   borderRadius: '8px',
//                   fontSize: '1rem'
//                 }}
//                 required
//               />
//             </div>
            
//             <div>
//               <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Category *</label>
//               <select
//                 name="category"
//                 value={formData.category}
//                 onChange={handleInputChange}
//                 style={{
//                   width: '100%',
//                   padding: '0.75rem',
//                   border: '2px solid #e5e5e5',
//                   borderRadius: '8px',
//                   fontSize: '1rem'
//                 }}
//                 required
//               >
//                 <option value="">Select category</option>
//                 {Object.keys(categories).map(cat => (
//                   <option key={cat} value={cat}>{cat}</option>
//                 ))}
//               </select>
//             </div>
//           </div>

//           {formData.category && (
//             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
//               <div>
//                 <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Subcategory *</label>
//                 <select
//                   name="subcategory"
//                   value={formData.subcategory}
//                   onChange={handleInputChange}
//                   style={{
//                     width: '100%',
//                     padding: '0.75rem',
//                     border: '2px solid #e5e5e5',
//                     borderRadius: '8px',
//                     fontSize: '1rem'
//                   }}
//                   required
//                 >
//                   <option value="">Select subcategory</option>
//                   {categories[formData.category as keyof typeof categories].map(subcat => (
//                     <option key={subcat} value={subcat}>{subcat}</option>
//                   ))}
//                 </select>
//               </div>
              
//               <div>
//                 <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Size *</label>
//                 <select
//                   name="size"
//                   value={formData.size}
//                   onChange={handleInputChange}
//                   style={{
//                     width: '100%',
//                     padding: '0.75rem',
//                     border: '2px solid #e5e5e5',
//                     borderRadius: '8px',
//                     fontSize: '1rem'
//                   }}
//                   required
//                 >
//                   <option value="">Select size</option>
//                   {sizes.map(size => (
//                     <option key={size} value={size}>{size}</option>
//                   ))}
//                 </select>
//               </div>
              
//               <div>
//                 <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Condition *</label>
//                 <select
//                   name="condition"
//                   value={formData.condition}
//                   onChange={handleInputChange}
//                   style={{
//                     width: '100%',
//                     padding: '0.75rem',
//                     border: '2px solid #e5e5e5',
//                     borderRadius: '8px',
//                     fontSize: '1rem'
//                   }}
//                   required
//                 >
//                   <option value="">Select condition</option>
//                   {conditions.map(condition => (
//                     <option key={condition} value={condition}>{condition}</option>
//                   ))}
//                 </select>
//               </div>
//             </div>
//           )}

//           <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
//             <div>
//               <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Color</label>
//               <select
//                 name="color"
//                 value={formData.color}
//                 onChange={handleInputChange}
//                 style={{
//                   width: '100%',
//                   padding: '0.75rem',
//                   border: '2px solid #e5e5e5',
//                   borderRadius: '8px',
//                   fontSize: '1rem'
//                 }}
//               >
//                 <option value="">Select color</option>
//                 {colors.map(color => (
//                   <option key={color} value={color}>{color}</option>
//                 ))}
//               </select>
//             </div>
            
//             <div>
//               <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Material</label>
//               <input
//                 type="text"
//                 name="material"
//                 value={formData.material}
//                 onChange={handleInputChange}
//                 placeholder="e.g., 100% Cotton"
//                 style={{
//                   width: '100%',
//                   padding: '0.75rem',
//                   border: '2px solid #e5e5e5',
//                   borderRadius: '8px',
//                   fontSize: '1rem'
//                 }}
//               />
//             </div>
//           </div>
//         </section>

//         {/* Pricing */}
//         <section style={{ marginBottom: '2rem' }}>
//           <h2 style={{ color: '#5d4e37', marginBottom: '1rem', fontSize: '1.5rem' }}>Pricing</h2>
          
//           <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
//             <div>
//               <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Your Price ($) *</label>
//               <input
//                 type="number"
//                 name="price"
//                 value={formData.price}
//                 onChange={handleInputChange}
//                 placeholder="0.00"
//                 min="0"
//                 step="0.01"
//                 style={{
//                   width: '100%',
//                   padding: '0.75rem',
//                   border: '2px solid #e5e5e5',
//                   borderRadius: '8px',
//                   fontSize: '1rem'
//                 }}
//                 required
//               />
//             </div>
            
//             <div>
//               <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Original Price ($)</label>
//               <input
//                 type="number"
//                 name="originalPrice"
//                 value={formData.originalPrice}
//                 onChange={handleInputChange}
//                 placeholder="0.00"
//                 min="0"
//                 step="0.01"
//                 style={{
//                   width: '100%',
//                   padding: '0.75rem',
//                   border: '2px solid #e5e5e5',
//                   borderRadius: '8px',
//                   fontSize: '1rem'
//                 }}
//               />
//             </div>
//           </div>
//         </section>

//         {/* Photos */}
//         <section style={{ marginBottom: '2rem' }}>
//           <h2 style={{ color: '#5d4e37', marginBottom: '1rem', fontSize: '1.5rem' }}>Photos (Max 8) *</h2>
          
//           <div
//             onDragEnter={handleDrag}
//             onDragLeave={handleDrag}
//             onDragOver={handleDrag}
//             onDrop={handleDrop}
//             style={{
//               border: dragActive ? '3px dashed #c9a26d' : '3px dashed #e5e5e5',
//               borderRadius: '12px',
//               padding: '2rem',
//               textAlign: 'center',
//               backgroundColor: dragActive ? '#f9f7f4' : '#fafafa',
//               marginBottom: '1rem',
//               cursor: 'pointer'
//             }}
//           >
//             <Upload size={48} color="#c9a26d" style={{ margin: '0 auto 1rem' }} />
//             <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>
//               Drag and drop photos here, or click to select
//             </p>
//             <p style={{ color: '#666', fontSize: '0.9rem' }}>
//               Upload up to 8 high-quality photos. First photo will be the main image.
//             </p>
//             <input
//               type="file"
//               multiple
//               accept="image/*"
//               onChange={(e) => handleImageUpload(e.target.files)}
//               style={{
//                 position: 'absolute',
//                 opacity: 0,
//                 width: '100%',
//                 height: '100%',
//                 cursor: 'pointer'
//               }}
//           />
//         </div>

//         {formData.images.length > 0 && (
//           <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '1rem' }}>
//             {formData.images.map((file, index) => (
//               <div key={index} style={{ position: 'relative' }}>
//                 <img
//                   src={URL.createObjectURL(file)}
//                   alt={`Preview ${index + 1}`}
//                   style={{
//                     width: '100%',
//                     height: '120px',
//                     objectFit: 'cover',
//                     borderRadius: '8px',
//                     border: '2px solid #e5e5e5'
//                   }}
//                 />
//                 <button
//                   type="button"
//                   onClick={() => removeImage(index)}
//                   style={{
//                     position: 'absolute',
//                     top: '5px',
//                     right: '5px',
//                     background: '#ff4444',
//                     color: 'white',
//                     border: 'none',
//                     borderRadius: '50%',
//                     width: '24px',
//                     height: '24px',
//                     cursor: 'pointer',
//                     display: 'flex',
//                     alignItems: 'center',
//                     justifyContent: 'center'
//                   }}
//                 >
//                   <X size={14} />
//                 </button>
//                 {index === 0 && (
//                   <span style={{
//                     position: 'absolute',
//                     bottom: '5px',
//                     left: '5px',
//                     background: '#c9a26d',
//                     color: 'white',
//                     padding: '2px 6px',
//                     borderRadius: '4px',
//                     fontSize: '0.8rem'
//                   }}>
//                     Main
//                   </span>
//                 )}
//               </div>
//             ))}
//           </div>
//         )}
//       </section>

//       {/* Description */}
//       <section style={{ marginBottom: '2rem' }}>
//         <h2 style={{ color: '#5d4e37', marginBottom: '1rem', fontSize: '1.5rem' }}>Description</h2>
          
//         <textarea
//           name="description"
//           value={formData.description}
//           onChange={handleInputChange}
//           placeholder="Describe the item's condition, fit, styling tips, or any other relevant details..."
//           rows={6}
//           style={{
//             width: '100%',
//             padding: '0.75rem',
//             border: '2px solid #e5e5e5',
//             borderRadius: '8px',
//             fontSize: '1rem',
//             resize: 'vertical'
//           }}
//         />
//       </section>

//       {/* Measurements */}
//       <section style={{ marginBottom: '2rem' }}>
//         <h2 style={{ color: '#5d4e37', marginBottom: '1rem', fontSize: '1.5rem' }}>Measurements (inches)</h2>
          
//         <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
//           <div>
//             <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Chest/Bust</label>
//             <input
//               type="number"
//               name="measurements.chest"
//               value={formData.measurements.chest}
//               onChange={handleInputChange}
//               placeholder="0"
//               min="0"
//               step="0.25"
//               style={{
//                 width: '100%',
//                 padding: '0.75rem',
//                 border: '2px solid #e5e5e5',
//                 borderRadius: '8px',
//                 fontSize: '1rem'
//               }}
//             />
//           </div>
            
//           <div>
//             <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Waist</label>
//             <input
//               type="number"
//               name="measurements.waist"
//               value={formData.measurements.waist}
//               onChange={handleInputChange}
//               placeholder="0"
//               min="0"
//               step="0.25"
//               style={{
//                 width: '100%',
//                 padding: '0.75rem',
//                 border: '2px solid #e5e5e5',
//                 borderRadius: '8px',
//                 fontSize: '1rem'
//               }}
//             />
//           </div>
            
//           <div>
//             <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Length</label>
//             <input
//               type="number"
//               name="measurements.length"
//               value={formData.measurements.length}
//               onChange={handleInputChange}
//               placeholder="0"
//               min="0"
//               step="0.25"
//               style={{
//                 width: '100%',
//                 padding: '0.75rem',
//                 border: '2px solid #e5e5e5',
//                 borderRadius: '8px',
//                 fontSize: '1rem'
//               }}
//             />
//           </div>
            
//           <div>
//             <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Sleeve Length</label>
//             <input
//               type="number"
//               name="measurements.sleeves"
//               value={formData.measurements.sleeves}
//               onChange={handleInputChange}
//               placeholder="0"
//               min="0"
//               step="0.25"
//               style={{
//                 width: '100%',
//                 padding: '0.75rem',
//                 border: '2px solid #e5e5e5',
//                 borderRadius: '8px',
//                 fontSize: '1rem'
//               }}
//             />
//           </div>
//         </div>
//       </section>

//       {/* Tags */}
//       <section style={{ marginBottom: '2rem' }}>
//         <h2 style={{ color: '#5d4e37', marginBottom: '1rem', fontSize: '1.5rem' }}>Tags</h2>
          
//         <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', alignItems: 'center' }}>
//           <input
//             type="text"
//             value={newTag}
//             onChange={(e) => setNewTag(e.target.value)}
//             placeholder="Add tags (e.g., vintage, casual, summer)"
//             onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
//             style={{
//               flex: 1,
//               padding: '0.75rem',
//               border: '2px solid #e5e5e5',
//               borderRadius: '8px',
//               fontSize: '1rem'
//             }}
//           />
//           <button
//             type="button"
//             onClick={addTag}
//             style={{
//               background: '#c9a26d',
//               color: 'white',
//               border: 'none',
//               padding: '0.75rem',
//               borderRadius: '8px',
//               cursor: 'pointer',
//               display: 'flex',
//               alignItems: 'center',
//               gap: '0.5rem'
//             }}
//           >
//             <Plus size={16} /> Add
//           </button>
//         </div>
          
//         {formData.tags.length > 0 && (
//           <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
//             {formData.tags.map((tag) => (
//               <span
//                 key={tag}
//                 style={{
//                   background: '#f0f0f0',
//                   padding: '0.5rem 1rem',
//                   borderRadius: '20px',
//                   display: 'flex',
//                   alignItems: 'center',
//                   gap: '0.5rem',
//                   fontSize: '0.9rem'
//                 }}
//               >
//                 {tag}
//                 <button
//                   type="button"
//                   onClick={() => removeTag(tag)}
//                   style={{
//                     background: 'none',
//                     border: 'none',
//                     cursor: 'pointer',
//                     color: '#999',
//                     padding: '0'
//                   }}
//                 >
//                   <X size={14} />
//                 </button>
//               </span>
//             ))}
//           </div>
//         )}
//       </section>

//       {/* Shipping & Policies */}
//       <section style={{ marginBottom: '2rem' }}>
//         <h2 style={{ color: '#5d4e37', marginBottom: '1rem', fontSize: '1.5rem' }}>Shipping & Policies</h2>
          
//         <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
//           <div>
//             <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Shipping Method *</label>
//             <select
//               name="shippingMethod"
//               value={formData.shippingMethod}
//               onChange={handleInputChange}
//               style={{
//                 width: '100%',
//                 padding: '0.75rem',
//                 border: '2px solid #e5e5e5',
//                 borderRadius: '8px',
//                 fontSize: '1rem'
//               }}
//               required
//             >
//               <option value="">Select shipping method</option>
//               <option value="standard">Standard Shipping (5-7 days)</option>
//               <option value="expedited">Expedited Shipping (2-3 days)</option>
//               <option value="overnight">Overnight Shipping</option>
//             </select>
//           </div>
            
//           <div>
//             <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Return Policy *</label>
//             <select
//               name="returnPolicy"
//               value={formData.returnPolicy}
//               onChange={handleInputChange}
//               style={{
//                 width: '100%',
//                 padding: '0.75rem',
//                 border: '2px solid #e5e5e5',
//                 borderRadius: '8px',
//                 fontSize: '1rem'
//               }}
//               required
//             >
//               <option value="">Select return policy</option>
//               <option value="no-returns">No Returns</option>
//               <option value="7-day">7-Day Return Window</option>
//               <option value="14-day">14-Day Return Window</option>
//               <option value="30-day">30-Day Return Window</option>
//             </select>
//           </div>
//         </div>
//       </section>

//       {/* Submit Button */}
//       <div style={{ textAlign: 'center', paddingTop: '2rem', borderTop: '1px solid #e5e5e5' }}>
//         <button
//           type="submit"
//           style={{
//             background: '#c9a26d',
//             color: 'white',
//             border: 'none',
//             padding: '1rem 3rem',
//             fontSize: '1.1rem',
//             fontWeight: 'bold',
//             borderRadius: '8px',
//             cursor: 'pointer',
//             transition: 'background-color 0.2s ease'
//           }}
//           onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#b8935a'}
//           onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#c9a26d'}
//         >
//           List Your Item
//         </button>
//       </div>
//     </div>
//   );
// };

// export default SellingForm;
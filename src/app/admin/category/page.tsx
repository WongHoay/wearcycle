"use client";
import React, { useEffect, useState } from 'react';
import { collection, getDocs, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';

interface Category {
  id: string;
  name: string;
  productCount?: number;
  createdAt?: any;
}

interface Product {
  id: string;
  category?: string;
  brand?: string;
  condition?: string;
  [key: string]: any;
}

interface BrandWithCount {
  name: string;
  productCount: number;
}

interface ConditionWithCount {
  name: string;
  productCount: number;
}

const AdminCategoriesPage = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddBrandModal, setShowAddBrandModal] = useState(false);
  const [showAddConditionModal, setShowAddConditionModal] = useState(false);
  const [showEditBrandModal, setShowEditBrandModal] = useState(false);
  const [showEditConditionModal, setShowEditConditionModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [selectedCondition, setSelectedCondition] = useState<string | null>(null);
  // Remove filter state variables since we're not using filters anymore
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editCategoryName, setEditCategoryName] = useState('');
  const [newBrandName, setNewBrandName] = useState('');
  const [editBrandName, setEditBrandName] = useState('');
  const [newConditionName, setNewConditionName] = useState(''); // Fixed: Added missing state
  const [editConditionName, setEditConditionName] = useState('');
  const [allBrands, setAllBrands] = useState<BrandWithCount[]>([]);
  const [allConditions, setAllConditions] = useState<ConditionWithCount[]>([]);

  useEffect(() => {
    fetchCategories();
    fetchBrandsAndConditions();
  }, []);

  const fetchCategories = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'categories'));
      const categoriesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Category));

      // Fetch products and count them
      const productsSnapshot = await getDocs(collection(db, 'products'));
      const productsData = productsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Product));
      
      setProducts(productsData); // Store products for filtering

      const productCounts: { [key: string]: number } = {};
      productsData.forEach(product => {
        const category = product.category?.toLowerCase();
        if (category) {
          productCounts[category] = (productCounts[category] || 0) + 1;
        }
      });

      const categoriesWithCounts = categoriesData.map(cat => ({
        ...cat,
        productCount: productCounts[cat.name.toLowerCase()] || 0
      }));

      setCategories(categoriesWithCounts);
    } catch (error) {
      console.error('Error fetching categories:', error);
      alert('Error fetching categories. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchBrandsAndConditions = async () => {
    try {
      // Fetch all brands from the brands collection
      const brandsSnapshot = await getDocs(collection(db, 'brands'));
      const brandsWithCounts = brandsSnapshot.docs.map(doc => {
        const name = doc.data().name;
        const productCount = products.filter(p => p.brand === name).length;
        return { name, productCount };
      });

      // Fetch all conditions from the conditions collection
      const conditionsSnapshot = await getDocs(collection(db, 'conditions'));
      const conditionsWithCounts = conditionsSnapshot.docs.map(doc => {
        const name = doc.data().name;
        const productCount = products.filter(p => p.condition === name).length;
        return { name, productCount };
      });

      setAllBrands(brandsWithCounts);
      setAllConditions(conditionsWithCounts);
    } catch (error) {
      console.error('Error fetching brands and conditions:', error);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      alert('Please enter a category name');
      return;
    }

    // Check if category already exists
    const exists = categories.some(
      cat => cat.name.toLowerCase() === newCategoryName.trim().toLowerCase()
    );

    if (exists) {
      alert('This category already exists');
      return;
    }

    try {
      const categoryId = newCategoryName.toLowerCase().replace(/\s+/g, '-');
      await setDoc(doc(db, 'categories', categoryId), {
        name: newCategoryName.trim(),
        createdAt: new Date()
      });

      alert('Category added successfully!');
      setNewCategoryName('');
      setShowAddModal(false);
      fetchCategories();
    } catch (error) {
      console.error('Error adding category:', error);
      alert('Error adding category. Please try again.');
    }
  };

  const handleEditCategory = async () => {
    if (!selectedCategory || !editCategoryName.trim()) {
      alert('Please enter a category name');
      return;
    }

    try {
      await updateDoc(doc(db, 'categories', selectedCategory.id), {
        name: editCategoryName.trim()
      });

      alert('Category updated successfully!');
      setShowEditModal(false);
      setSelectedCategory(null);
      setEditCategoryName('');
      fetchCategories();
    } catch (error) {
      console.error('Error updating category:', error);
      alert('Error updating category. Please try again.');
    }
  };

  const handleDeleteCategory = async (category: Category) => {
    if (category.productCount && category.productCount > 0) {
      if (!confirm(`This category has ${category.productCount} product(s). Are you sure you want to delete it?`)) {
        return;
      }
    } else {
      if (!confirm(`Delete category "${category.name}"?`)) {
        return;
      }
    }

    try {
      await deleteDoc(doc(db, 'categories', category.id));
      alert('Category deleted successfully!');
      fetchCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('Error deleting category. Please try again.');
    }
  };

  const handleAddBrand = async () => {
    if (!newBrandName.trim()) {
      alert('Please enter a brand name');
      return;
    }

    // Check if brand already exists
    if (allBrands.some(brand => brand.name && brand.name.toLowerCase() === newBrandName.trim().toLowerCase())) {
      alert('This brand already exists');
      return;
    }

    try {
      await setDoc(doc(db, 'brands', newBrandName.toLowerCase().replace(/\s+/g, '-')), {
        name: newBrandName.trim(),
        createdAt: new Date()
      });
      
      alert('Brand added successfully!');
      setShowAddBrandModal(false);
      setNewBrandName('');
      fetchBrandsAndConditions();
    } catch (error) {
      console.error('Error adding brand:', error);
      alert('Error adding brand. Please try again.');
    }
  };

  // Fixed: Added missing handleAddCondition function
  const handleAddCondition = async () => {
    if (!newConditionName.trim()) {
      alert('Please enter a condition name');
      return;
    }

    // Check if condition already exists
    if (allConditions.some(condition => condition.name.toLowerCase() === newConditionName.trim().toLowerCase())) {
      alert('This condition already exists');
      return;
    }

    try {
      await setDoc(doc(db, 'conditions', newConditionName.toLowerCase().replace(/\s+/g, '-')), {
        name: newConditionName.trim(),
        createdAt: new Date()
      });
      
      alert('Condition added successfully!');
      setShowAddConditionModal(false);
      setNewConditionName('');
      fetchBrandsAndConditions();
    } catch (error) {
      console.error('Error adding condition:', error);
      alert('Error adding condition. Please try again.');
    }
  };

  const handleDeleteBrand = async (brand: BrandWithCount) => {
    // Check if brand is being used in products
    if (brand.productCount > 0) {
      if (!confirm(`This brand is used in ${brand.productCount} product(s). Are you sure you want to delete it? This action cannot be undone.`)) {
        return;
      }
    } else {
      if (!confirm(`Delete brand "${brand.name}"?`)) {
        return;
      }
    }

    try {
      const brandId = brand.name.toLowerCase().replace(/\s+/g, '-');
      await deleteDoc(doc(db, 'brands', brandId));
      alert('Brand deleted successfully!');
      fetchBrandsAndConditions();
    } catch (error) {
      console.error('Error deleting brand:', error);
      alert('Error deleting brand. Please try again.');
    }
  };

  const handleDeleteCondition = async (condition: ConditionWithCount) => {
    // Check if condition is being used in products
    if (condition.productCount > 0) {
      if (!confirm(`This condition is used in ${condition.productCount} product(s). Are you sure you want to delete it? This action cannot be undone.`)) {
        return;
      }
    } else {
      if (!confirm(`Delete condition "${condition.name}"?`)) {
        return;
      }
    }

    try {
      const conditionId = condition.name.toLowerCase().replace(/\s+/g, '-');
      await deleteDoc(doc(db, 'conditions', conditionId));
      alert('Condition deleted successfully!');
      fetchBrandsAndConditions();
    } catch (error) {
      console.error('Error deleting condition:', error);
      alert('Error deleting condition. Please try again.');
    }
  };

  const handleEditBrand = async () => {
    if (!selectedBrand || !editBrandName.trim()) {
      alert('Please enter a brand name');
      return;
    }

    // Check if new brand name already exists (and it's different from current)
    if (editBrandName.trim() !== selectedBrand && 
        allBrands.some(brand => brand.name.toLowerCase() === editBrandName.trim().toLowerCase())) {
      alert('This brand name already exists');
      return;
    }

    try {
      const oldBrandId = selectedBrand.toLowerCase().replace(/\s+/g, '-');
      const newBrandId = editBrandName.toLowerCase().replace(/\s+/g, '-');
      
      // If the ID changes, we need to create a new document and delete the old one
      if (oldBrandId !== newBrandId) {
        // Create new brand document
        await setDoc(doc(db, 'brands', newBrandId), {
          name: editBrandName.trim(),
          createdAt: new Date()
        });
        
        // Delete old brand document
        await deleteDoc(doc(db, 'brands', oldBrandId));
      } else {
        // Update existing document
        await updateDoc(doc(db, 'brands', oldBrandId), {
          name: editBrandName.trim()
        });
      }

      alert('Brand updated successfully!');
      setShowEditBrandModal(false);
      setSelectedBrand(null);
      setEditBrandName('');
      fetchBrandsAndConditions();
    } catch (error) {
      console.error('Error updating brand:', error);
      alert('Error updating brand. Please try again.');
    }
  };

  const handleEditCondition = async () => {
    if (!selectedCondition || !editConditionName.trim()) {
      alert('Please enter a condition name');
      return;
    }

    // Check if new condition name already exists (and it's different from current)
    if (editConditionName.trim() !== selectedCondition && 
        allConditions.some(condition => condition.name.toLowerCase() === editConditionName.trim().toLowerCase())) {
      alert('This condition name already exists');
      return;
    }

    try {
      const oldConditionId = selectedCondition.toLowerCase().replace(/\s+/g, '-');
      const newConditionId = editConditionName.toLowerCase().replace(/\s+/g, '-');
      
      // If the ID changes, we need to create a new document and delete the old one
      if (oldConditionId !== newConditionId) {
        // Create new condition document
        await setDoc(doc(db, 'conditions', newConditionId), {
          name: editConditionName.trim(),
          createdAt: new Date()
        });
        
        // Delete old condition document
        await deleteDoc(doc(db, 'conditions', oldConditionId));
      } else {
        // Update existing document
        await updateDoc(doc(db, 'conditions', oldConditionId), {
          name: editConditionName.trim()
        });
      }

      alert('Condition updated successfully!');
      setShowEditConditionModal(false);
      setSelectedCondition(null);
      setEditConditionName('');
      fetchBrandsAndConditions();
    } catch (error) {
      console.error('Error updating condition:', error);
      alert('Error updating condition. Please try again.');
    }
  };

  // Show all categories - no filtering applied
  const filteredCategories = categories;

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Loading categories...</div>;
  }

  return (
    <div style={{ padding: 30 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: 10, color: '#1f2937' }}>
            Category Management
          </h1>
          <p style={{ color: '#6b7280' }}>
            Total Categories: {categories.length}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              padding: '12px 24px',
              background: '#c9a26d',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: '0.95rem',
              fontWeight: 600
            }}
          >
            <span style={{ fontSize: '1.2rem' }}>+</span>
            Add New Category
          </button>
          <button
            onClick={() => setShowAddBrandModal(true)}
            style={{
              padding: '12px 24px',
              background: '#c9a26d',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: '0.95rem',
              fontWeight: 600
            }}
          >
            + Add New Brand
          </button>
          <button
            onClick={() => setShowAddConditionModal(true)}
            style={{
              padding: '12px 24px',
              background: '#c9a26d',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: '0.95rem',
              fontWeight: 600
            }}
          >
            + Add New Condition
          </button>
        </div>
      </div>

      {/* -Brands Table- */}
      <div style={{ background: 'white', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: 30 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>
                All Brands ({allBrands.length})
              </th>
              <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Product Count</th>
              <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {allBrands.length === 0 ? (
              <tr>
                <td colSpan={3} style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
                  No brands available.
                </td>
              </tr>
            ) : (
              allBrands.map(brand => (
                <tr key={brand.name} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '16px', color: '#1f2937', fontWeight: 600, fontSize: '1rem' }}>
                    {brand.name}
                  </td>
                  <td style={{ padding: '16px', color: '#6b7280' }}>
                    <span style={{
                      padding: '4px 12px',
                      background: '#f3f4f6',
                      borderRadius: 12,
                      fontSize: '0.9rem',
                      fontWeight: 500
                    }}>
                      {brand.productCount} products
                    </span>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => {
                          setSelectedBrand(brand.name);
                          setEditBrandName(brand.name);
                          setShowEditBrandModal(true);
                        }}
                        style={{
                          padding: '8px 16px',
                          background: '#3b82f6',
                          color: 'white',
                          border: 'none',
                          borderRadius: 6,
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          fontWeight: 500
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteBrand(brand)}
                        style={{
                          padding: '8px 16px',
                          background: '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: 6,
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          fontWeight: 500
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Conditions Table */}
      <div style={{ background: 'white', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: 30 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>
                All Conditions ({allConditions.length})
              </th>
              <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Product Count</th>
              <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {allConditions.length === 0 ? (
              <tr>
                <td colSpan={3} style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
                  No conditions available.
                </td>
              </tr>
            ) : (
              allConditions.map(condition => (
                <tr key={condition.name} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '16px', color: '#1f2937', fontWeight: 600, fontSize: '1rem' }}>
                    {condition.name}
                  </td>
                  <td style={{ padding: '16px', color: '#6b7280' }}>
                    <span style={{
                      padding: '4px 12px',
                      background: '#f3f4f6',
                      borderRadius: 12,
                      fontSize: '0.9rem',
                      fontWeight: 500
                    }}>
                      {condition.productCount} products
                    </span>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => {
                          setSelectedCondition(condition.name);
                          setEditConditionName(condition.name);
                          setShowEditConditionModal(true);
                        }}
                        style={{
                          padding: '8px 16px',
                          background: '#3b82f6',
                          color: 'white',
                          border: 'none',
                          borderRadius: 6,
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          fontWeight: 500
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteCondition(condition)}
                        style={{
                          padding: '8px 16px',
                          background: '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: 6,
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          fontWeight: 500
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Categories Table */}
      <div style={{ background: 'white', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Category Name</th>
              <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Product Count</th>
              <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredCategories.length === 0 ? (
              <tr>
                <td colSpan={3} style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
                  No categories available.
                </td>
              </tr>
            ) : (
              filteredCategories.map(category => (
                <tr key={category.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '16px', color: '#1f2937', fontWeight: 600, fontSize: '1rem' }}>
                    {category.name}
                  </td>
                  <td style={{ padding: '16px', color: '#6b7280' }}>
                    <span style={{
                      padding: '4px 12px',
                      background: '#f3f4f6',
                      borderRadius: 12,
                      fontSize: '0.9rem',
                      fontWeight: 500
                    }}>
                      {category.productCount || 0} products
                    </span>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => {
                          setSelectedCategory(category);
                          setEditCategoryName(category.name);
                          setShowEditModal(true);
                        }}
                        style={{
                          padding: '8px 16px',
                          background: '#3b82f6',
                          color: 'white',
                          border: 'none',
                          borderRadius: 6,
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          fontWeight: 500
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(category)}
                        style={{
                          padding: '8px 16px',
                          background: '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: 6,
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          fontWeight: 500
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Category Modal */}
      {showAddModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => setShowAddModal(false)}
        >
          <div
            style={{
              background: 'white',
              padding: 30,
              borderRadius: 12,
              maxWidth: 500,
              width: '90%'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 20, color: '#1f2937' }}>
              Add New Category
            </h2>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', marginBottom: 8, color: '#374151', fontWeight: 500 }}>
                Category Name
              </label>
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="e.g., Shoes, Bags, Accessories"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: 8,
                  fontSize: '0.95rem'
                }}
                onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
              />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewCategoryName('');
                }}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleAddCategory}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: '#c9a26d',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                Add Category
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Category Modal */}
      {showEditModal && selectedCategory && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => setShowEditModal(false)}
        >
          <div
            style={{
              background: 'white',
              padding: 30,
              borderRadius: 12,
              maxWidth: 500,
              width: '90%'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 20, color: '#1f2937' }}>
              Edit Category
            </h2>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', marginBottom: 8, color: '#374151', fontWeight: 500 }}>
                Category Name
              </label>
              <input
                type="text"
                value={editCategoryName}
                onChange={(e) => setEditCategoryName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: 8,
                  fontSize: '0.95rem'
                }}
                onKeyPress={(e) => e.key === 'Enter' && handleEditCategory()}
              />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedCategory(null);
                  setEditCategoryName('');
                }}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleEditCategory}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: '#c9a26d',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Brand Modal */}
      {showAddBrandModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => setShowAddBrandModal(false)}
        >
          <div
            style={{
              background: 'white',
              padding: 30,
              borderRadius: 12,
              maxWidth: 500,
              width: '90%'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 20, color: '#1f2937' }}>
              Add New Brand
            </h2>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', marginBottom: 8, color: '#374151', fontWeight: 500 }}>
                Brand Name
              </label>
              <input
                type="text"
                value={newBrandName}
                onChange={e => setNewBrandName(e.target.value)}
                placeholder="Brand name"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: 8,
                  fontSize: '0.95rem'
                }}
                onKeyPress={(e) => e.key === 'Enter' && handleAddBrand()}
              />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => {
                  setShowAddBrandModal(false);
                  setNewBrandName('');
                }}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleAddBrand}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: '#c9a26d',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                Add Brand
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Condition Modal */}
      {showAddConditionModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => setShowAddConditionModal(false)}
        >
          <div
            style={{
              background: 'white',
              padding: 30,
              borderRadius: 12,
              maxWidth: 500,
              width: '90%'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 20, color: '#1f2937' }}>
              Add New Condition
            </h2>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', marginBottom: 8, color: '#374151', fontWeight: 500 }}>
                Condition Name
              </label>
              <input
                type="text"
                value={newConditionName}
                onChange={e => setNewConditionName(e.target.value)}
                placeholder="Condition name"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: 8,
                  fontSize: '0.95rem'
                }}
                onKeyPress={(e) => e.key === 'Enter' && handleAddCondition()}
              />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => {
                  setShowAddConditionModal(false);
                  setNewConditionName('');
                }}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleAddCondition}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: '#c9a26d',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                Add Condition
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Edit Brand Modal */}
      {showEditBrandModal && selectedBrand && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => setShowEditBrandModal(false)}
        >
          <div
            style={{
              background: 'white',
              padding: 30,
              borderRadius: 12,
              maxWidth: 500,
              width: '90%'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 20, color: '#1f2937' }}>
              Edit Brand
            </h2>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', marginBottom: 8, color: '#374151', fontWeight: 500 }}>
                Brand Name
              </label>
              <input
                type="text"
                value={editBrandName}
                onChange={(e) => setEditBrandName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: 8,
                  fontSize: '0.95rem'
                }}
                onKeyPress={(e) => e.key === 'Enter' && handleEditBrand()}
              />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => {
                  setShowEditBrandModal(false);
                  setSelectedBrand(null);
                  setEditBrandName('');
                }}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleEditBrand}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: '#c9a26d',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Condition Modal */}
      {showEditConditionModal && selectedCondition && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => setShowEditConditionModal(false)}
        >
          <div
            style={{
              background: 'white',
              padding: 30,
              borderRadius: 12,
              maxWidth: 500,
              width: '90%'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 20, color: '#1f2937' }}>
              Edit Condition
            </h2>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', marginBottom: 8, color: '#374151', fontWeight: 500 }}>
                Condition Name
              </label>
              <input
                type="text"
                value={editConditionName}
                onChange={(e) => setEditConditionName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: 8,
                  fontSize: '0.95rem'
                }}
                onKeyPress={(e) => e.key === 'Enter' && handleEditCondition()}
              />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => {
                  setShowEditConditionModal(false);
                  setSelectedCondition(null);
                  setEditConditionName('');
                }}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleEditCondition}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: '#c9a26d',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCategoriesPage;
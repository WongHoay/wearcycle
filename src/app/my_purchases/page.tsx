"use client";
import { useState } from "react";
import Navbar from "../../components/navbar";

const TABS = [
  { key: "toPay", label: "To Pay" },
  { key: "inProgress", label: "In progress" },
  { key: "completed", label: "Completed" },
  { key: "returns", label: "Returns" },
  { key: "cancelled", label: "Cancelled" },
];

const MY_BG_GRADIENT = "linear-gradient(135deg, #c9a26d 0%, #8b7355 100%)";
const TAB_ACTIVE_COLOR = "#c9a26d";
const TAB_BORDER_COLOR = "#8b7355";
const TEXT_COLOR = "#333";

const MyPurchasesPage = () => {
  const [activeTab, setActiveTab] = useState("inProgress");

  return (
    
    <div style={{ minHeight: "100vh", color: TEXT_COLOR, fontFamily: "system-ui, sans-serif" }}>
        <Navbar />
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>
        <h1 style={{ fontSize: "2.2rem", fontWeight: 700, marginBottom: 32, color: "#fff" }}>My purchases</h1>
        <div style={{ display: "flex", gap: 32, borderBottom: `1px solid ${TAB_BORDER_COLOR}`, marginBottom: 32 }}>
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                background: "none",
                border: "none",
                color: "#333", // <-- Changed tab text color to black
                fontWeight: activeTab === tab.key ? 700 : 500,
                fontSize: "1.1rem",
                padding: "12px 0",
                borderBottom: activeTab === tab.key ? `3px solid ${TAB_ACTIVE_COLOR}` : "3px solid transparent",
                cursor: "pointer",
                transition: "color 0.2s"
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {/* Empty State */}
        <div style={{ textAlign: "center", marginTop: 80 }}>
          <div style={{ fontWeight: "bold", fontSize: "1.3rem", marginBottom: 8, color: "#8b7355" }}>
            No active orders
          </div>
          <div style={{ color: "#fff", fontSize: "1rem" }}>
            Any active orders will be shown here
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyPurchasesPage;
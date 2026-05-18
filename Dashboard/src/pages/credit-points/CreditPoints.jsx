import React from "react";
import CustomerPoints from "./CustomerPoints";
import CreditPointsSettings from "./CreditPointsSettings";
import RewardRules from "./RewardRules";
import TransactionsHistory from "./TransactionsHistory";
import ReferralSystem from "./ReferralSystem";
import ExpirySystem from "./ExpirySystem";
import WalletSummary from "./WalletSummary";
import { fetchCreditSettings } from "../../api/adminApi";

const DEFAULT_SETTINGS = {
  pointsPerRupee: 10,
  minRedeemPoints: 100,
  maxRedeemPercent: 20,
  expiryDays: 365,
  expiryWarningDays: 30
};

const TABS = [
  {
    id: "overview",
    label: "Overview",
    description: "Live summary of all credit point activity — totals issued, redeemed, expired, top customers, and referral performance."
  },
  {
    id: "reward-rules",
    label: "Reward Rules",
    description: "Define how customers earn credit points — signup bonus, purchases, reviews, and milestones."
  },
  {
    id: "customer-points",
    label: "Customer Points",
    description: "View and manage individual customer point balances, adjustments, and history."
  },
  {
    id: "transactions",
    label: "Transactions History",
    description: "Full log of all credit point earn and redemption transactions across customers."
  },
  {
    id: "referral",
    label: "Referral System",
    description: "Configure referral bonuses, referral link settings, and track referral performance."
  },
  {
    id: "expiry",
    label: "Expiry System",
    description: "Configure points expiry duration, auto expiry cron schedule, and view upcoming and past expiry events."
  },
  {
    id: "settings",
    label: "Settings",
    description: "Set the points-to-rupee conversion rate, expiry rules, and redemption limits."
  }
];

export default function CreditPoints() {
  const [activeTab, setActiveTab] = React.useState("overview");
  const [cpSettings, setCpSettings] = React.useState(DEFAULT_SETTINGS);

  React.useEffect(() => {
    fetchCreditSettings()
      .then((res) => setCpSettings((current) => ({ ...current, ...(res.data?.data || {}) })))
      .catch(() => {});
  }, []);

  const currentTab = TABS.find((tab) => tab.id === activeTab) || TABS[0];

  return (
    <section className="dashboard-page-shell" style={pageStyle}>

      <div style={heroStyle}>
        <div>
          <span style={eyebrowStyle}>Repeated Customer Rewards</span>
          <h2 style={titleStyle}>Credit Points</h2>
          <p style={copyStyle}>
            Manage the complete credit points and rewards system. Configure earning rules, track customer balances,
            monitor transactions, manage referrals, and control redemption settings — all from one place.
          </p>
        </div>
        <div style={heroBadgeStyle}>
          <span style={conversionLabelStyle}>Conversion Rate</span>
          <strong style={conversionValueStyle}>{cpSettings.pointsPerRupee} pts = ₹1</strong>
          <span style={conversionSubStyle}>Expiry: {cpSettings.expiryDays} days</span>
        </div>
      </div>

      <div style={tabBarStyle} role="tablist" aria-label="Credit Points sections">
        {TABS.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab.id)}
              style={isActive ? { ...tabButtonStyle, ...activeTabStyle } : tabButtonStyle}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div style={tabContentStyle} role="tabpanel">
        <div style={tabHeroStyle}>
          <span style={eyebrowStyle}>Credit Points Module</span>
          <h3 style={tabTitleStyle}>{currentTab.label}</h3>
          <p style={tabCopyStyle}>{currentTab.description}</p>
        </div>

        {activeTab === "overview"        && <WalletSummary />}
        {activeTab === "reward-rules"    && <RewardRules />}
        {activeTab === "customer-points" && <CustomerPoints />}
        {activeTab === "transactions"    && <TransactionsHistory />}
        {activeTab === "referral"        && <ReferralSystem />}
        {activeTab === "expiry"          && <ExpirySystem />}
        {activeTab === "settings"        && <CreditPointsSettings settings={cpSettings} onSave={setCpSettings} />}
      </div>

    </section>
  );
}

const pageStyle = {
  display: "grid",
  gap: "20px"
};

const heroStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "20px",
  flexWrap: "wrap",
  padding: "28px",
  border: "1px solid rgba(203, 213, 225, 0.72)",
  borderRadius: "24px",
  background: "linear-gradient(135deg, #ffffff 0%, #f3fbf5 58%, #e9f7ec 100%)",
  boxShadow: "0 18px 42px rgba(148, 163, 184, 0.14)"
};

const eyebrowStyle = {
  display: "block",
  color: "#4a9d54",
  fontSize: "12px",
  fontWeight: 800,
  letterSpacing: "0.12em",
  textTransform: "uppercase"
};

const titleStyle = {
  margin: "10px 0 10px",
  color: "#0f172a",
  fontSize: "42px",
  lineHeight: 1.05
};

const copyStyle = {
  margin: 0,
  maxWidth: "760px",
  color: "#526377",
  lineHeight: 1.65
};

const heroBadgeStyle = {
  display: "grid",
  gap: "6px",
  padding: "18px 24px",
  border: "1px solid #bfe8c9",
  borderRadius: "18px",
  background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
  textAlign: "center",
  flexShrink: 0
};

const conversionLabelStyle = {
  color: "#4a9d54",
  fontSize: "11px",
  fontWeight: 800,
  letterSpacing: "0.1em",
  textTransform: "uppercase"
};

const conversionValueStyle = {
  color: "#0f172a",
  fontSize: "22px",
  letterSpacing: "-0.01em"
};

const conversionSubStyle = {
  color: "#4a9d54",
  fontSize: "11px",
  fontWeight: 700
};

const tabBarStyle = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
  padding: "6px",
  border: "1px solid rgba(203, 213, 225, 0.72)",
  borderRadius: "18px",
  background: "#f8fafc"
};

const tabButtonStyle = {
  flex: "1 1 auto",
  minHeight: "42px",
  padding: "0 20px",
  border: "1px solid transparent",
  borderRadius: "12px",
  background: "transparent",
  color: "#475569",
  fontSize: "14px",
  fontWeight: 700,
  cursor: "pointer",
  whiteSpace: "nowrap",
  transition: "all 0.15s ease"
};

const activeTabStyle = {
  background: "linear-gradient(135deg, #0f172a 0%, #1f4336 100%)",
  color: "#ffffff",
  border: "1px solid rgba(15, 23, 42, 0.12)",
  boxShadow: "0 8px 20px rgba(15, 23, 42, 0.18)"
};

const tabContentStyle = {
  display: "grid",
  gap: "20px"
};

const tabHeroStyle = {
  padding: "22px",
  border: "1px solid rgba(203, 213, 225, 0.7)",
  borderRadius: "20px",
  background: "linear-gradient(135deg, #ffffff 0%, #f4fbf6 55%, #edf7ff 100%)",
  boxShadow: "0 14px 34px rgba(174, 203, 190, 0.18)",
  display: "grid",
  gap: "8px"
};

const tabTitleStyle = {
  margin: 0,
  color: "#0f172a",
  fontSize: "28px",
  lineHeight: 1.15
};

const tabCopyStyle = {
  margin: 0,
  color: "#526377",
  lineHeight: 1.6,
  maxWidth: "680px"
};

const placeholderStyle = {
  display: "grid",
  justifyItems: "center",
  gap: "12px",
  padding: "60px 24px",
  border: "1.5px dashed #c8d8cf",
  borderRadius: "18px",
  background: "#f8faf9",
  textAlign: "center"
};

const placeholderIconStyle = {
  fontSize: "36px",
  opacity: 0.4
};

const placeholderHeadingStyle = {
  color: "#0f172a",
  fontSize: "20px"
};

const placeholderTextStyle = {
  margin: 0,
  color: "#64748b",
  maxWidth: "480px",
  lineHeight: 1.6
};

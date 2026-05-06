import React from "react";
import { fetchAdminSettings, updateAdminSettings } from "../../api/adminApi";
import {
  cloneSettings,
  DEFAULT_APP_SETTINGS,
  getSettingValue,
  mergeSettings,
  SETTINGS_SECTIONS,
  setSettingValue
} from "../../../../shared/appSettings";
import { ManageAccessPanel } from "./ManageAccess";

const MANAGE_ACCESS_SECTION = {
  id: "manage-access",
  label: "Manage Access",
  description: "Manage dashboard users, roles, permissions, activity logs, and security rules."
};

const SETTINGS_NAV_SECTIONS = [...SETTINGS_SECTIONS, MANAGE_ACCESS_SECTION];

function formatFieldValue(field, value) {
  if (field.type === "boolean") {
    return value ? "Enabled" : "Disabled";
  }

  if (field.type === "select") {
    return field.options.find((option) => option.value === value)?.label || String(value || "");
  }

  return String(value || "");
}

function renderFieldControl(field, value, onChange) {
  if (field.type === "boolean") {
    return (
      <label style={toggleFieldStyle}>
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span>{Boolean(value) ? "Enabled" : "Disabled"}</span>
      </label>
    );
  }

  if (field.type === "textarea") {
    return (
      <textarea
        value={String(value || "")}
        onChange={(event) => onChange(event.target.value)}
        rows={3}
        style={textareaStyle}
      />
    );
  }

  if (field.type === "select") {
    return (
      <select value={String(value || "")} onChange={(event) => onChange(event.target.value)} style={inputStyle}>
        {field.options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    );
  }

  return (
    <input
      type={field.type || "text"}
      value={String(value || "")}
      onChange={(event) => onChange(event.target.value)}
      style={inputStyle}
    />
  );
}

export default function Settings() {
  const [activeSection, setActiveSection] = React.useState(SETTINGS_SECTIONS[0].id);
  const [settings, setSettings] = React.useState(() => cloneSettings(DEFAULT_APP_SETTINGS));
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [statusMessage, setStatusMessage] = React.useState("");
  const [usingFallback, setUsingFallback] = React.useState(false);

  const currentSection = React.useMemo(
    () => SETTINGS_NAV_SECTIONS.find((section) => section.id === activeSection) || SETTINGS_SECTIONS[0],
    [activeSection]
  );
  const isManageAccessSection = activeSection === MANAGE_ACCESS_SECTION.id;

  const currentStatusMessage = statusMessage
    ? {
        text: statusMessage,
        style: usingFallback ? feedbackWarningStyle : feedbackSuccessStyle
      }
    : null;

  React.useEffect(() => {
    let isMounted = true;

    async function loadSettings() {
      setIsLoading(true);

      try {
        const response = await fetchAdminSettings();
        if (!isMounted) return;
        setSettings(mergeSettings(DEFAULT_APP_SETTINGS, response.data?.data || {}));
        setUsingFallback(false);
        setStatusMessage("Settings loaded from backend.");
      } catch (error) {
        if (!isMounted) return;
        setSettings(cloneSettings(DEFAULT_APP_SETTINGS));
        setUsingFallback(true);
        setStatusMessage("Showing local settings preview because backend settings require admin authorization.");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleFieldChange = (fieldKey, nextValue) => {
    setSettings((current) => setSettingValue(current, fieldKey, nextValue));
  };

  const handleSave = async () => {
    setIsSaving(true);

    try {
      const response = await updateAdminSettings({ settings });
      setSettings(mergeSettings(DEFAULT_APP_SETTINGS, response.data?.data || settings));
      setUsingFallback(false);
      setStatusMessage("Settings saved to backend successfully.");
    } catch (error) {
      setUsingFallback(true);
      setStatusMessage("Settings updated locally for preview. Sign in as admin to persist them to backend.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ display: "grid", gap: "20px" }}>
      <div style={headerStyle}>
        <div>
          <h2 style={{ margin: 0 }}>Settings</h2>
          <p style={{ margin: "8px 0 0", color: "#698096" }}>
            Centralized settings now follow one flow: dashboard update, backend save, frontend fetch, dynamic storefront behavior.
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
          <span style={summaryPillStyle}>{`Modules: ${SETTINGS_NAV_SECTIONS.length}`}</span>
          <span style={summaryPillStyle}>{usingFallback ? "Local Preview Mode" : "Backend Connected"}</span>
        </div>
      </div>

      <section style={settingsShellStyle}>
        <aside style={settingsTabsStyle} aria-label="Settings modules">
          <div style={sidebarHeaderStyle}>
            <span style={eyebrowStyle}>Sidebar</span>
            <strong style={{ color: "#0f172a", fontSize: "18px" }}>Settings</strong>
          </div>
          {SETTINGS_NAV_SECTIONS.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => setActiveSection(section.id)}
              style={{
                ...tabButtonStyle,
                ...(activeSection === section.id ? activeTabButtonStyle : null)
              }}
            >
              <strong>{getTabLabel(section.id, section.label)}</strong>
              <span>{section.description}</span>
            </button>
          ))}
        </aside>

        <div style={settingsContentStyle}>
          {isManageAccessSection ? (
            <ManageAccessPanel />
          ) : (
            <>
              <section style={heroCardStyle}>
                <span style={eyebrowStyle}>Admin Settings Module</span>
                <h3 style={{ margin: 0, fontSize: "32px", color: "#0f172a" }}>{currentSection.label}</h3>
                <p style={{ margin: 0, color: "#526377", maxWidth: "760px" }}>{currentSection.description}</p>
              </section>

              <section style={sectionActionBarStyle}>
                <div style={{ display: "grid", gap: "4px" }}>
                  <span style={eyebrowStyle}>Active Tab</span>
                  <strong style={{ color: "#0f172a", fontSize: "18px" }}>{getTabLabel(currentSection.id, currentSection.label)}</strong>
                </div>
                <button type="button" onClick={handleSave} disabled={isSaving || isLoading} style={saveButtonStyle}>
                  {isSaving ? `Saving ${getTabLabel(currentSection.id, currentSection.label)}...` : `Save ${getTabLabel(currentSection.id, currentSection.label)}`}
                </button>
              </section>

              {currentStatusMessage ? (
                <section style={{ ...feedbackStyle, ...currentStatusMessage.style }}>
                  {currentStatusMessage.text}
                </section>
              ) : null}

              <section style={impactCardStyle}>
                <div style={{ display: "grid", gap: "8px" }}>
                  <span style={eyebrowStyle}>{currentSection.impact.eyebrow}</span>
                  <h4 style={{ margin: 0, fontSize: "22px", color: "#0f172a" }}>{currentSection.impact.title}</h4>
                  <p style={{ margin: 0, color: "#526377", maxWidth: "760px" }}>{currentSection.impact.description}</p>
                </div>

                <div style={impactGridStyle}>
                  {currentSection.impact.items.map((item) => (
                    <div key={item} style={impactItemStyle}>
                      <span style={impactDotStyle} />
                      <strong style={{ color: "#0f172a" }}>{item}</strong>
                    </div>
                  ))}
                </div>
              </section>

              <div style={contentGridStyle}>
                {currentSection.groups.map((group) => (
                  <article key={group.title} style={panelStyle}>
                    <div>
                      <h4 style={{ margin: 0, color: "#0f172a", fontSize: "20px" }}>{group.title}</h4>
                    </div>
                    <div style={{ display: "grid", gap: "14px" }}>
                      {group.fields.map((field) => {
                        const value = getSettingValue(settings, field.key);

                        return (
                          <label key={field.key} style={settingRowStyle}>
                            <span style={settingLabelStyle}>{field.label}</span>
                            {renderFieldControl(field, value, (nextValue) => handleFieldChange(field.key, nextValue))}
                            <small style={settingValueStyle}>{formatFieldValue(field, value)}</small>
                          </label>
                        );
                      })}
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

function getTabLabel(sectionId, fallbackLabel) {
  if (sectionId === "general") return "General";
  if (sectionId === "store") return "Store";
  if (sectionId === "payment") return "Payments";
  if (sectionId === "shipping") return "Shipping";
  if (sectionId === "tracking") return "Orders & Tracking";
  if (sectionId === "notifications") return "Notifications";
  if (sectionId === "security") return "Security";
  return fallbackLabel;
}

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "16px",
  flexWrap: "wrap"
};

const feedbackStyle = {
  borderRadius: "16px",
  padding: "14px 16px",
  border: "1px solid transparent",
  fontWeight: 600
};

const feedbackSuccessStyle = {
  background: "#f0fdf4",
  color: "#166534",
  borderColor: "#bbf7d0"
};

const feedbackWarningStyle = {
  background: "#fff7ed",
  color: "#c2410c",
  borderColor: "#fdba74"
};

const settingsShellStyle = {
  display: "grid",
  gridTemplateColumns: "300px minmax(0, 1fr)",
  gap: "20px",
  alignItems: "start"
};

const settingsTabsStyle = {
  display: "grid",
  gap: "12px"
};

const sidebarHeaderStyle = {
  display: "grid",
  gap: "4px",
  padding: "8px 4px 2px"
};

const settingsContentStyle = {
  display: "grid",
  gap: "20px"
};

const sectionActionBarStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "16px",
  flexWrap: "nowrap",
  padding: "16px 18px",
  borderRadius: "18px",
  background: "#ffffff",
  border: "1px solid rgba(203, 213, 225, 0.75)",
  boxShadow: "0 10px 24px rgba(15, 23, 42, 0.04)"
};

const heroCardStyle = {
  background: "linear-gradient(135deg, #ffffff 0%, #f4fbf6 55%, #edf7ff 100%)",
  borderRadius: "20px",
  border: "1px solid rgba(203, 213, 225, 0.7)",
  boxShadow: "0 14px 34px rgba(174, 203, 190, 0.18)",
  padding: "22px",
  display: "grid",
  gap: "10px"
};

const impactCardStyle = {
  background: "linear-gradient(135deg, #f8fffb 0%, #f8fafc 100%)",
  borderRadius: "18px",
  border: "1px solid rgba(203, 213, 225, 0.8)",
  boxShadow: "0 14px 34px rgba(174, 203, 190, 0.12)",
  padding: "20px",
  display: "grid",
  gap: "18px"
};

const impactGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: "12px"
};

const impactItemStyle = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  padding: "14px",
  borderRadius: "14px",
  background: "#ffffff",
  border: "1px solid #e5edf5"
};

const impactDotStyle = {
  width: "10px",
  height: "10px",
  borderRadius: "999px",
  background: "#16a34a",
  boxShadow: "0 0 0 6px rgba(34, 197, 94, 0.12)"
};

const contentGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "20px"
};

const panelStyle = {
  background: "#fff",
  borderRadius: "18px",
  border: "1px solid rgba(203, 213, 225, 0.7)",
  boxShadow: "0 14px 34px rgba(174, 203, 190, 0.18)",
  padding: "18px",
  display: "grid",
  gap: "16px"
};

const tabButtonStyle = {
  width: "100%",
  textAlign: "left",
  border: "1px solid rgba(203, 213, 225, 0.75)",
  borderRadius: "18px",
  background: "#ffffff",
  padding: "16px",
  display: "grid",
  gap: "6px",
  color: "#334155",
  cursor: "pointer",
  boxShadow: "0 10px 24px rgba(15, 23, 42, 0.04)"
};

const activeTabButtonStyle = {
  background: "linear-gradient(135deg, #0f172a 0%, #1f4336 100%)",
  color: "#ffffff",
  border: "1px solid rgba(15, 23, 42, 0.12)",
  boxShadow: "0 18px 32px rgba(15, 23, 42, 0.18)"
};

const settingRowStyle = {
  padding: "14px",
  borderRadius: "14px",
  border: "1px solid #e5edf5",
  background: "#f8fafc",
  display: "grid",
  gap: "8px"
};

const inputStyle = {
  width: "100%",
  minHeight: "44px",
  borderRadius: "12px",
  border: "1px solid #cbd5e1",
  padding: "0 14px",
  background: "#ffffff",
  color: "#0f172a",
  fontSize: "14px"
};

const textareaStyle = {
  ...inputStyle,
  padding: "12px 14px",
  minHeight: "88px",
  resize: "vertical"
};

const toggleFieldStyle = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  color: "#0f172a",
  fontWeight: 600
};

const settingLabelStyle = {
  color: "#64748b",
  fontSize: "13px",
  fontWeight: 600
};

const settingValueStyle = {
  color: "#0f172a",
  fontSize: "13px"
};

const summaryPillStyle = {
  display: "inline-flex",
  alignItems: "center",
  minHeight: "34px",
  padding: "0 12px",
  borderRadius: "999px",
  background: "#ffffff",
  border: "1px solid #edf2f7",
  color: "#475569",
  fontWeight: 700,
  fontSize: "12px",
  boxShadow: "0 6px 16px rgba(15, 23, 42, 0.04)"
};

const saveButtonStyle = {
  minHeight: "40px",
  padding: "0 16px",
  borderRadius: "999px",
  border: "1px solid rgba(15, 23, 42, 0.1)",
  background: "linear-gradient(135deg, #0f172a 0%, #1f4336 100%)",
  color: "#ffffff",
  fontWeight: 700,
  cursor: "pointer"
};

const eyebrowStyle = {
  color: "#0f766e",
  fontSize: "12px",
  fontWeight: 800,
  letterSpacing: "0.12em",
  textTransform: "uppercase"
};

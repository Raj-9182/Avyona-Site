import React from "react";
import {
  FaClipboardList,
  FaKey,
  FaLock,
  FaShieldAlt,
  FaUserShield,
  FaUsers
} from "react-icons/fa";

const accessTabs = [
  {
    id: "roles",
    label: "Roles",
    icon: FaUserShield,
    title: "Access Roles",
    description: "Group permissions into reusable roles for admin, manager, support, and operations teams.",
    stats: ["Role groups", "Assigned users", "System roles"]
  },
  {
    id: "users",
    label: "Users",
    icon: FaUsers,
    title: "Dashboard Users",
    description: "Create, review, and manage people who can access the admin dashboard.",
    stats: ["Active users", "Invitations", "Locked accounts"]
  },
  {
    id: "permissions",
    label: "Permissions",
    icon: FaKey,
    title: "Permission Matrix",
    description: "Control what each role can view, create, update, approve, publish, or delete.",
    stats: ["Modules", "Permission rules", "Restricted actions"]
  },
  {
    id: "activity-logs",
    label: "Activity Logs",
    icon: FaClipboardList,
    title: "Admin Activity Logs",
    description: "Track important dashboard actions such as logins, updates, deletes, and security changes.",
    stats: ["Recent events", "High risk actions", "Exportable logs"]
  },
  {
    id: "security-rules",
    label: "Security Rules",
    icon: FaLock,
    title: "Security Rules",
    description: "Configure access protections such as password policy, session timeout, and login limits.",
    stats: ["Enabled rules", "Review needed", "Blocked attempts"]
  }
];

const defaultRoles = [
  {
    name: "Super Admin",
    scope: "Full system owner",
    description: "Complete dashboard access, including users, roles, permissions, security rules, settings, and destructive actions.",
    usersCount: 1,
    status: "Active"
  },
  {
    name: "Admin",
    scope: "Operations administrator",
    description: "Broad dashboard management access for everyday administration, excluding highest-risk security ownership controls.",
    usersCount: 0,
    status: "Active"
  },
  {
    name: "Product Manager",
    scope: "Catalog management",
    description: "Manages products, categories, variations, images, pricing, inventory, and homepage product placement.",
    usersCount: 1,
    status: "Active"
  },
  {
    name: "Order Manager",
    scope: "Order operations",
    description: "Reviews orders, updates fulfillment status, manages order workflow, and supports delivery visibility.",
    usersCount: 1,
    status: "Active"
  },
  {
    name: "Marketing Manager",
    scope: "Promotions and content",
    description: "Manages coupons, homepage promotions, featured sections, marketing content, and campaign visibility.",
    usersCount: 1,
    status: "Active"
  },
  {
    name: "Support Staff",
    scope: "Customer support",
    description: "Views customers and orders needed for support, with limited update access for customer service workflows.",
    usersCount: 1,
    status: "Active"
  },
  {
    name: "Viewer",
    scope: "Read-only access",
    description: "Can view dashboard records and reports without creating, editing, deleting, or publishing changes.",
    usersCount: 0,
    status: "Active"
  }
];

const permissionActions = ["View", "Create", "Edit", "Delete", "Export"];

const modulePermissions = [
  {
    module: "Dashboard",
    description: "Main dashboard metrics, summaries, and admin overview.",
    actions: ["View"]
  },
  {
    module: "Products",
    description: "Product catalog, pricing, inventory, media, and product visibility.",
    actions: ["View", "Create", "Edit", "Delete", "Export"]
  },
  {
    module: "Categories",
    description: "Category hierarchy, menu placement, featured state, and sort order.",
    actions: ["View", "Create", "Edit", "Delete", "Export"]
  },
  {
    module: "Brands",
    description: "Brand records, storefront brand visibility, and brand metadata.",
    actions: ["View", "Create", "Edit", "Delete", "Export"]
  },
  {
    module: "Variations",
    description: "Variant groups, options, stock behavior, and product variant rules.",
    actions: ["View", "Create", "Edit", "Delete", "Export"]
  },
  {
    module: "Orders",
    description: "Order records, status updates, fulfillment handling, and order exports.",
    actions: ["View", "Create", "Edit", "Export"]
  },
  {
    module: "Customers",
    description: "Customer records, profile details, order history, and support visibility.",
    actions: ["View", "Edit", "Export"]
  },
  {
    module: "Coupons",
    description: "Coupon rules, active promotional campaigns, and usage controls.",
    actions: ["View", "Create", "Edit", "Delete", "Export"]
  },
  {
    module: "Homepage",
    description: "Homepage sections, banners, featured products, and storefront placement.",
    actions: ["View", "Create", "Edit", "Delete"]
  },
  {
    module: "Reviews",
    description: "Product reviews, moderation workflow, visibility, and review exports.",
    actions: ["View", "Edit", "Delete", "Export"]
  },
  {
    module: "Settings",
    description: "Store settings, access settings, security controls, and configuration.",
    actions: ["View", "Edit"]
  }
];

const sensitivePermissions = [
  {
    permission: "Manage admin users",
    area: "Access Control",
    risk: "Can invite, edit, suspend, or remove dashboard users."
  },
  {
    permission: "Manage roles",
    area: "Access Control",
    risk: "Can change role structure and role-level access boundaries."
  },
  {
    permission: "Manage payment settings",
    area: "Payments",
    risk: "Can modify payment methods, payment gateway behavior, and checkout payment rules."
  },
  {
    permission: "Process refunds",
    area: "Orders",
    risk: "Can trigger or approve refund-related order actions."
  },
  {
    permission: "Export customer data",
    area: "Customers",
    risk: "Can download customer records and personally identifiable customer data."
  },
  {
    permission: "View customer phone/email",
    area: "Customers",
    risk: "Can view sensitive customer contact details."
  },
  {
    permission: "Delete products",
    area: "Products",
    risk: "Can permanently remove product records from the catalog."
  },
  {
    permission: "Delete orders",
    area: "Orders",
    risk: "Can remove order records and disrupt audit history."
  },
  {
    permission: "Change payment status",
    area: "Orders",
    risk: "Can alter paid, unpaid, failed, or refunded payment states."
  },
  {
    permission: "Publish homepage changes",
    area: "Homepage",
    risk: "Can push storefront homepage changes live."
  },
  {
    permission: "Manage API keys",
    area: "Security",
    risk: "Can create, rotate, or revoke keys used by integrations."
  },
  {
    permission: "View revenue reports",
    area: "Dashboard",
    risk: "Can access financial reporting and revenue summaries."
  }
];

const dashboardUsers = [
  {
    id: "usr-001",
    name: "Admin User",
    email: "admin@avyona.com",
    phone: "+91 98765 43210",
    role: "Super Admin",
    status: "Active",
    lastLogin: "30 Apr 2026, 10:42 AM",
    createdDate: "20 Apr 2026"
  },
  {
    id: "usr-002",
    name: "Priya Sharma",
    email: "priya.operations@avyona.com",
    phone: "+91 91234 56780",
    role: "Order Manager",
    status: "Active",
    lastLogin: "29 Apr 2026, 06:10 PM",
    createdDate: "22 Apr 2026"
  },
  {
    id: "usr-003",
    name: "Rahul Mehta",
    email: "rahul.catalog@avyona.com",
    phone: "+91 98765 43211",
    role: "Product Manager",
    status: "Inactive",
    lastLogin: "27 Apr 2026, 03:24 PM",
    createdDate: "23 Apr 2026"
  },
  {
    id: "usr-004",
    name: "Neha Kapoor",
    email: "neha.marketing@avyona.com",
    phone: "+91 99887 76655",
    role: "Marketing Manager",
    status: "Invite Pending",
    lastLogin: "Not logged in",
    createdDate: "29 Apr 2026"
  },
  {
    id: "usr-005",
    name: "Support Desk",
    email: "support.staff@avyona.com",
    phone: "+91 90000 11122",
    role: "Support Staff",
    status: "Suspended",
    lastLogin: "25 Apr 2026, 11:08 AM",
    createdDate: "24 Apr 2026"
  }
];

const activityLogs = [
  {
    id: "log-001",
    userName: "Admin User",
    role: "Admin",
    action: "Edited product price",
    module: "Products",
    record: "Avyona Aura 10 Frame / B0000AURA10",
    dateTime: "30 Apr 2026, 10:58 AM",
    device: "Chrome on Windows / 192.168.1.24",
    status: "success"
  },
  {
    id: "log-002",
    userName: "Rahul Mehta",
    role: "Product Manager",
    action: "Added new product",
    module: "Products",
    record: "Kodak ZoomLite Camera / B0000KODAK1",
    dateTime: "30 Apr 2026, 10:34 AM",
    device: "Chrome on Windows / 192.168.1.31",
    status: "success"
  },
  {
    id: "log-003",
    userName: "Priya Sharma",
    role: "Order Manager",
    action: "Changed order status",
    module: "Orders",
    record: "AVY-1002",
    dateTime: "30 Apr 2026, 09:52 AM",
    device: "Edge on Windows / 192.168.1.42",
    status: "success"
  },
  {
    id: "log-004",
    userName: "Neha Kapoor",
    role: "Marketing Manager",
    action: "Updated homepage banner",
    module: "Homepage",
    record: "Hero banner / Spring Campaign",
    dateTime: "29 Apr 2026, 06:18 PM",
    device: "Chrome on Windows / 192.168.1.52",
    status: "success"
  },
  {
    id: "log-005",
    userName: "Admin User",
    role: "Admin",
    action: "Exported customer list",
    module: "Customers",
    record: "Customer export / CSV",
    dateTime: "29 Apr 2026, 05:47 PM",
    device: "Chrome on Windows / 192.168.1.24",
    status: "success"
  },
  {
    id: "log-006",
    userName: "Support Desk",
    role: "Support Staff",
    action: "Attempted customer export",
    module: "Customers",
    record: "Customer export / CSV",
    dateTime: "29 Apr 2026, 04:12 PM",
    device: "Firefox on Windows / 192.168.1.63",
    status: "failed"
  }
];

const userStatuses = ["Active", "Inactive", "Suspended", "Invite Pending"];
const roleNames = defaultRoles.map((role) => role.name);
const customPermissionOptions = [
  "Export customer data",
  "View revenue reports",
  "Publish homepage changes",
  "Process refunds",
  "Manage payment settings"
];

const securityRules = [
  {
    id: "twoFactorEnabled",
    label: "Enable two-factor authentication later",
    description: "Future-ready control for requiring a second verification step during dashboard login.",
    type: "toggle",
    value: false
  },
  {
    id: "sessionTimeout",
    label: "Session timeout",
    description: "Automatically sign out inactive dashboard users after this duration.",
    type: "select",
    value: "30 minutes",
    options: ["15 minutes", "30 minutes", "60 minutes", "120 minutes"]
  },
  {
    id: "passwordMinLength",
    label: "Password minimum length",
    description: "Minimum password length required for new or reset dashboard passwords.",
    type: "number",
    value: 10,
    suffix: "characters"
  },
  {
    id: "loginAttemptLimit",
    label: "Login attempt limit",
    description: "Maximum failed login attempts before a safety action is applied.",
    type: "number",
    value: 5,
    suffix: "attempts"
  },
  {
    id: "autoLockFailedAttempts",
    label: "Auto lock after failed attempts",
    description: "Lock the account automatically after repeated failed login attempts.",
    type: "toggle",
    value: true
  },
  {
    id: "superAdminUsersOnly",
    label: "Only Super Admin can manage users",
    description: "Restrict user creation, disabling, password reset, and role assignment to Super Admin.",
    type: "toggle",
    value: true
  },
  {
    id: "superAdminPaymentOnly",
    label: "Only Super Admin can manage payment settings",
    description: "Protect payment configuration and gateway changes from normal admin roles.",
    type: "toggle",
    value: true
  },
  {
    id: "confirmBeforeDelete",
    label: "Require confirmation before delete",
    description: "Ask for explicit confirmation before destructive delete actions are completed.",
    type: "toggle",
    value: true
  },
  {
    id: "reasonForRefundCancel",
    label: "Require reason for refund/order cancellation",
    description: "Force admins to enter a reason before refunding or cancelling orders.",
    type: "toggle",
    value: true
  }
];

function createPermissionDraft(roleName) {
  return modulePermissions.reduce((draft, item) => {
    draft[item.module] = permissionActions.reduce((actions, action) => {
      const isAvailable = item.actions.includes(action);
      const isViewer = roleName === "Viewer";
      const isSupport = roleName === "Support Staff";
      const isOrderManager = roleName === "Order Manager";
      const isProductManager = roleName === "Product Manager";
      const isMarketingManager = roleName === "Marketing Manager";

      let isEnabled = isAvailable;
      if (isViewer) isEnabled = action === "View" && isAvailable;
      if (isSupport) isEnabled = ["Dashboard", "Orders", "Customers"].includes(item.module) && ["View", "Edit"].includes(action) && isAvailable;
      if (isOrderManager) isEnabled = ["Dashboard", "Orders", "Customers"].includes(item.module) && isAvailable;
      if (isProductManager) isEnabled = ["Dashboard", "Products", "Categories", "Brands", "Variations"].includes(item.module) && isAvailable;
      if (isMarketingManager) isEnabled = ["Dashboard", "Coupons", "Homepage", "Reviews"].includes(item.module) && isAvailable;

      actions[action] = Boolean(isEnabled);
      return actions;
    }, {});
    return draft;
  }, {});
}

function getUserStatusStyle(status) {
  if (status === "Active") return { background: "#dcfce7", color: "#166534" };
  if (status === "Inactive") return { background: "#f1f5f9", color: "#475569" };
  if (status === "Suspended") return { background: "#fee2e2", color: "#b91c1c" };
  return { background: "#dbeafe", color: "#1d4ed8" };
}

export function ManageAccessPanel() {
  const [activeTab, setActiveTab] = React.useState("roles");
  const [isInviteFormOpen, setIsInviteFormOpen] = React.useState(false);
  const [inviteMode, setInviteMode] = React.useState("email");
  const [selectedPermissionRole, setSelectedPermissionRole] = React.useState("Admin");
  const [permissionDraft, setPermissionDraft] = React.useState(() => createPermissionDraft("Admin"));
  const currentTab = accessTabs.find((tab) => tab.id === activeTab) || accessTabs[0];
  const CurrentIcon = currentTab.icon;
  const tabStats = activeTab === "roles"
    ? [`${defaultRoles.length} fixed roles`, "Custom roles later", "System protected"]
    : activeTab === "users"
      ? [`${dashboardUsers.length} users`, `${userStatuses.length} statuses`, "Role assigned"]
    : activeTab === "activity-logs"
      ? [`${activityLogs.length} events`, "Success/failed", "Audit trail"]
    : activeTab === "security-rules"
      ? [`${securityRules.length} rules`, "Safety controls", "Super Admin guarded"]
    : activeTab === "permissions"
      ? [`${modulePermissions.length} modules`, `${sensitivePermissions.length} sensitive`, "Super Admin controls"]
    : currentTab.stats;

  const handlePermissionRoleChange = (roleName) => {
    setSelectedPermissionRole(roleName);
    setPermissionDraft(createPermissionDraft(roleName));
  };

  const togglePermission = (moduleName, action) => {
    setPermissionDraft((current) => ({
      ...current,
      [moduleName]: {
        ...current[moduleName],
        [action]: !current[moduleName]?.[action]
      }
    }));
  };

  return (
    <div style={contentStyle}>
      <section style={introCardStyle}>
        <div>
          <span style={eyebrowStyle}>Admin Settings Module</span>
          <h3 style={titleStyle}>Manage Access</h3>
          <p style={mutedTextStyle}>
            Central place for dashboard access control. Use the tabs below to manage users, roles, permissions, activity history, and security rules.
          </p>
        </div>
        <div style={securityBadgeStyle}>
          <FaShieldAlt aria-hidden="true" />
          <span>Access Control</span>
        </div>
      </section>

      <section style={shellStyle}>
      <aside style={tabsStyle} aria-label="Manage access sections">
        {accessTabs.map((tab) => {
          const TabIcon = tab.icon;
          const isActive = tab.id === activeTab;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{ ...tabButtonStyle, ...(isActive ? activeTabButtonStyle : null) }}
            >
              <TabIcon style={tabIconStyle} aria-hidden="true" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </aside>

      <div style={contentStyle}>
        <section style={panelHeaderStyle}>
          <div style={panelTitleRowStyle}>
            <span style={panelIconStyle}><CurrentIcon aria-hidden="true" /></span>
            <div>
              <span style={eyebrowStyle}>Access Module</span>
              <h3 style={panelTitleStyle}>{currentTab.title}</h3>
            </div>
          </div>
          <p style={panelDescriptionStyle}>{currentTab.description}</p>
        </section>

        <section style={statsGridStyle}>
          {tabStats.map((item) => (
            <article key={item} style={statCardStyle}>
              <span style={statLabelStyle}>{item}</span>
              <strong style={statValueStyle}>Ready</strong>
            </article>
          ))}
        </section>

        {activeTab === "roles" ? (
          <section style={rolesPanelStyle}>
            <div style={rolesHeaderStyle}>
              <div>
                <span style={eyebrowStyle}>Default Role Set</span>
                <h4 style={emptyTitleStyle}>Fixed roles created first</h4>
                <p style={mutedTextStyle}>
                  These roles are the starting access model. Custom roles can be added later after the default permission structure is stable.
                </p>
              </div>
              <span style={systemPillStyle}>System roles</span>
            </div>

            <div style={rolesGridStyle}>
              {defaultRoles.map((role) => (
                <article key={role.name} style={roleCardStyle}>
                  <div style={roleTitleRowStyle}>
                    <strong style={roleNameStyle}>{role.name}</strong>
                    <span style={fixedPillStyle}>Fixed</span>
                  </div>
                  <span style={roleScopeStyle}>{role.scope}</span>
                  <p style={roleDescriptionStyle}>{role.description}</p>
                </article>
              ))}
            </div>

            <div style={usersTableWrapStyle}>
              <table style={usersTableStyle}>
                <thead>
                  <tr>
                    <th style={roleThStyle}>Role Name</th>
                    <th style={roleThStyle}>Description</th>
                    <th style={roleThStyle}>Users Count</th>
                    <th style={roleThStyle}>Status</th>
                    <th style={roleThStyle}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {defaultRoles.map((role) => (
                    <tr key={`${role.name}-row`}>
                      <td style={userTdStyle}>
                        <strong style={userNameStyle}>{role.name}</strong>
                        <span style={roleScopeInlineStyle}>{role.scope}</span>
                      </td>
                      <td style={userTdStyle}>{role.description}</td>
                      <td style={userTdStyle}><strong>{role.usersCount}</strong></td>
                      <td style={userTdStyle}><span style={{ ...userStatusPillStyle, ...getUserStatusStyle(role.status) }}>{role.status}</span></td>
                      <td style={userTdStyle}>
                        <div style={userActionRowStyle}>
                          <button type="button" style={tableActionButtonStyle}>View permissions</button>
                          <button type="button" style={tableActionButtonStyle}>Edit permissions</button>
                          <button type="button" style={tableActionButtonStyle}>Duplicate role</button>
                          <button type="button" style={warningActionButtonStyle}>Disable role</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : activeTab === "users" ? (
          <section style={rolesPanelStyle}>
            <div style={rolesHeaderStyle}>
              <div>
                <span style={eyebrowStyle}>Dashboard Users</span>
                <h4 style={emptyTitleStyle}>All dashboard users</h4>
                <p style={mutedTextStyle}>
                  Users are assigned to fixed roles first. Status controls determine whether each person can access the dashboard.
                </p>
              </div>
              <div style={usersHeaderActionsStyle}>
                <button type="button" style={inviteButtonStyle} onClick={() => setIsInviteFormOpen((current) => !current)}>
                  {isInviteFormOpen ? "Close Invite" : "+ Invite User"}
                </button>
                <div style={statusLegendStyle}>
                  {userStatuses.map((status) => (
                    <span key={status} style={{ ...userStatusPillStyle, ...getUserStatusStyle(status) }}>{status}</span>
                  ))}
                </div>
              </div>
            </div>

            {isInviteFormOpen ? (
              <form style={inviteFormStyle}>
                <div style={inviteFormHeaderStyle}>
                  <div>
                    <span style={eyebrowStyle}>Invite Flow</span>
                    <h5 style={formTitleStyle}>Add dashboard user</h5>
                    <p style={mutedTextStyle}>
                      Email invite is safer. Manual ID/password is available when you need to create access directly.
                    </p>
                  </div>
                  <div style={modeSwitchStyle} aria-label="User onboarding method">
                    <button
                      type="button"
                      style={{ ...modeButtonStyle, ...(inviteMode === "email" ? activeModeButtonStyle : null) }}
                      onClick={() => setInviteMode("email")}
                    >
                      Email Invite
                    </button>
                    <button
                      type="button"
                      style={{ ...modeButtonStyle, ...(inviteMode === "manual" ? activeModeButtonStyle : null) }}
                      onClick={() => setInviteMode("manual")}
                    >
                      Manual ID/Password
                    </button>
                  </div>
                </div>

                <div style={inviteGridStyle}>
                  <label style={formFieldStyle}>
                    <span>Full Name</span>
                    <input type="text" placeholder="Enter full name" style={formInputStyle} />
                  </label>
                  <label style={formFieldStyle}>
                    <span>Email</span>
                    <input type="email" placeholder="name@avyona.com" style={formInputStyle} />
                  </label>
                  <label style={formFieldStyle}>
                    <span>Phone</span>
                    <input type="tel" placeholder="+91 98765 43210" style={formInputStyle} />
                  </label>
                  <label style={formFieldStyle}>
                    <span>Role</span>
                    <select defaultValue="Viewer" style={formInputStyle}>
                      {roleNames.map((role) => <option key={role} value={role}>{role}</option>)}
                    </select>
                  </label>
                  <label style={formFieldStyle}>
                    <span>Status</span>
                    <select defaultValue={inviteMode === "email" ? "Invite Pending" : "Active"} style={formInputStyle}>
                      {userStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                    </select>
                  </label>
                  {inviteMode === "manual" ? (
                    <>
                      <label style={formFieldStyle}>
                        <span>Login ID</span>
                        <input type="text" placeholder="Manual login ID" style={formInputStyle} />
                      </label>
                      <label style={formFieldStyle}>
                        <span>Temporary Password</span>
                        <input type="password" placeholder="Create temporary password" style={formInputStyle} />
                      </label>
                    </>
                  ) : null}
                </div>

                <section style={customPermissionsStyle}>
                  <div>
                    <strong style={formSectionTitleStyle}>Custom Permissions</strong>
                    <p style={mutedTextStyle}>Optional. Use only when a fixed role needs a narrow exception.</p>
                  </div>
                  <div style={customPermissionsGridStyle}>
                    {customPermissionOptions.map((permission) => (
                      <label key={permission} style={checkboxOptionStyle}>
                        <input type="checkbox" />
                        <span>{permission}</span>
                      </label>
                    ))}
                  </div>
                </section>

                <section style={flowBoxStyle}>
                  <strong>{inviteMode === "email" ? "Email invite flow" : "Manual credential flow"}</strong>
                  <span>
                    {inviteMode === "email"
                      ? "Super Admin enters details, selects role, system sends invite, user sets password, account becomes active."
                      : "Super Admin creates login ID and temporary password, shares it privately, and user should reset password after first login."}
                  </span>
                </section>

                <div style={inviteActionsStyle}>
                  <button type="button" style={tableActionButtonStyle}>Cancel</button>
                  <button type="button" style={inviteButtonStyle}>
                    {inviteMode === "email" ? "Send Invite" : "Create User"}
                  </button>
                </div>
              </form>
            ) : null}

            <div style={usersTableWrapStyle}>
              <table style={usersTableStyle}>
                <thead>
                  <tr>
                    <th style={userThStyle}>Name</th>
                    <th style={userThStyle}>Email</th>
                    <th style={userThStyle}>Phone</th>
                    <th style={userThStyle}>Role</th>
                    <th style={userThStyle}>Status</th>
                    <th style={userThStyle}>Last Login</th>
                    <th style={userThStyle}>Created Date</th>
                    <th style={userThStyle}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboardUsers.map((user) => {
                    const canDelete = user.role !== "Super Admin";

                    return (
                      <tr key={user.id}>
                        <td style={userTdStyle}>
                          <strong style={userNameStyle}>{user.name}</strong>
                        </td>
                        <td style={userTdStyle}>{user.email}</td>
                        <td style={userTdStyle}>{user.phone}</td>
                        <td style={userTdStyle}><span style={rolePillStyle}>{user.role}</span></td>
                        <td style={userTdStyle}><span style={{ ...userStatusPillStyle, ...getUserStatusStyle(user.status) }}>{user.status}</span></td>
                        <td style={userTdStyle}>{user.lastLogin}</td>
                        <td style={userTdStyle}>{user.createdDate}</td>
                        <td style={userTdStyle}>
                          <div style={userActionRowStyle}>
                            <button type="button" style={tableActionButtonStyle}>View</button>
                            <button type="button" style={tableActionButtonStyle}>Edit</button>
                            <button type="button" style={warningActionButtonStyle}>Disable</button>
                            <button type="button" style={tableActionButtonStyle}>Reset Password</button>
                            <button
                              type="button"
                              style={{ ...dangerActionButtonStyle, opacity: canDelete ? 1 : 0.46, cursor: canDelete ? "pointer" : "not-allowed" }}
                              disabled={!canDelete}
                              title={canDelete ? "Delete user" : "Super Admin cannot be deleted here"}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        ) : activeTab === "permissions" ? (
          <div style={contentStyle}>
            <section style={rolesPanelStyle}>
              <div style={rolesHeaderStyle}>
                <div>
                  <span style={eyebrowStyle}>Permission Matrix</span>
                  <h4 style={emptyTitleStyle}>Module-wise permissions</h4>
                  <p style={mutedTextStyle}>
                    Each module has only the actions it actually needs. Disabled cells are intentionally unavailable for that module.
                  </p>
                </div>
                <div style={permissionControlBarStyle}>
                  <label style={permissionRoleSelectStyle}>
                    <span>Select Role</span>
                    <select
                      value={selectedPermissionRole}
                      onChange={(event) => handlePermissionRoleChange(event.target.value)}
                      style={formInputStyle}
                    >
                      {roleNames.map((role) => <option key={role} value={role}>{role}</option>)}
                    </select>
                  </label>
                  <button type="button" style={inviteButtonStyle}>Save Changes</button>
                </div>
              </div>

              <div style={permissionMatrixStyle}>
                <div style={permissionHeaderStyle}>
                  <strong style={permissionHeaderCellStyle}>Module</strong>
                  {permissionActions.map((action) => <strong key={action} style={permissionHeaderCellStyle}>{action}</strong>)}
                </div>

                {modulePermissions.map((item) => (
                  <div key={item.module} style={permissionRowStyle}>
                    <div style={permissionModuleCellStyle}>
                      <strong style={roleNameStyle}>{item.module}</strong>
                      <span style={permissionDescriptionStyle}>{item.description}</span>
                    </div>
                    {permissionActions.map((action) => {
                      const isAllowed = item.actions.includes(action);
                      const isChecked = Boolean(permissionDraft[item.module]?.[action]);
                      return (
                        <label
                          key={`${item.module}-${action}`}
                          style={isAllowed ? permissionCheckboxCellStyle : permissionUnavailableStyle}
                          aria-label={`${item.module} ${action} ${isAllowed ? "available" : "not needed"}`}
                        >
                          {isAllowed ? (
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => togglePermission(item.module, action)}
                              style={permissionCheckboxStyle}
                            />
                          ) : "-"}
                        </label>
                      );
                    })}
                  </div>
                ))}
              </div>
              <div style={flowBoxStyle}>
                <strong>{`Editing permissions for ${selectedPermissionRole}`}</strong>
                <span>Changes in this matrix are role-level permissions. Sensitive Access stays separate and should be controlled only by Super Admin.</span>
              </div>
            </section>

            <section style={sensitivePanelStyle}>
              <div style={rolesHeaderStyle}>
                <div>
                  <span style={dangerEyebrowStyle}>Sensitive Access</span>
                  <h4 style={emptyTitleStyle}>Super Admin controlled permissions</h4>
                  <p style={mutedTextStyle}>
                    These are high-risk permissions and should not be granted through normal role setup. Only Super Admin should control them.
                  </p>
                </div>
                <span style={superAdminPillStyle}>Super Admin only</span>
              </div>

              <div style={sensitiveGridStyle}>
                {sensitivePermissions.map((item) => (
                  <article key={item.permission} style={sensitiveCardStyle}>
                    <div style={roleTitleRowStyle}>
                      <strong style={sensitiveNameStyle}>{item.permission}</strong>
                      <span style={sensitiveAreaPillStyle}>{item.area}</span>
                    </div>
                    <p style={roleDescriptionStyle}>{item.risk}</p>
                  </article>
                ))}
              </div>
            </section>
          </div>
        ) : activeTab === "activity-logs" ? (
          <section style={rolesPanelStyle}>
            <div style={rolesHeaderStyle}>
              <div>
                <span style={eyebrowStyle}>Audit Trail</span>
                <h4 style={emptyTitleStyle}>Activity Logs</h4>
                <p style={mutedTextStyle}>
                  Track important dashboard actions across products, orders, customers, homepage updates, exports, and access-sensitive events.
                </p>
              </div>
              <span style={systemPillStyle}>Tracked actions</span>
            </div>

            <div style={logSummaryGridStyle}>
              <article style={statCardStyle}>
                <span style={statLabelStyle}>Total logs</span>
                <strong style={statValueStyle}>{activityLogs.length}</strong>
              </article>
              <article style={statCardStyle}>
                <span style={statLabelStyle}>Successful</span>
                <strong style={statValueStyle}>{activityLogs.filter((log) => log.status === "success").length}</strong>
              </article>
              <article style={statCardStyle}>
                <span style={statLabelStyle}>Failed</span>
                <strong style={statValueStyle}>{activityLogs.filter((log) => log.status === "failed").length}</strong>
              </article>
            </div>

            <div style={usersTableWrapStyle}>
              <table style={activityTableStyle}>
                <thead>
                  <tr>
                    <th style={activityThStyle}>User name</th>
                    <th style={activityThStyle}>Role</th>
                    <th style={activityThStyle}>Action</th>
                    <th style={activityThStyle}>Module</th>
                    <th style={activityThStyle}>Record name/id</th>
                    <th style={activityThStyle}>Date and time</th>
                    <th style={activityThStyle}>IP/device</th>
                    <th style={activityThStyle}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {activityLogs.map((log) => (
                    <tr key={log.id}>
                      <td style={userTdStyle}><strong style={userNameStyle}>{log.userName}</strong></td>
                      <td style={userTdStyle}><span style={rolePillStyle}>{log.role}</span></td>
                      <td style={userTdStyle}>{log.action}</td>
                      <td style={userTdStyle}>{log.module}</td>
                      <td style={userTdStyle}>{log.record}</td>
                      <td style={userTdStyle}>{log.dateTime}</td>
                      <td style={userTdStyle}>{log.device}</td>
                      <td style={userTdStyle}>
                        <span style={log.status === "success" ? successLogPillStyle : failedLogPillStyle}>
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : activeTab === "security-rules" ? (
          <section style={rolesPanelStyle}>
            <div style={rolesHeaderStyle}>
              <div>
                <span style={eyebrowStyle}>Dashboard Safety</span>
                <h4 style={emptyTitleStyle}>Security Rules</h4>
                <p style={mutedTextStyle}>
                  Control login safety, session limits, destructive-action confirmation, and Super Admin-only access boundaries.
                </p>
              </div>
              <button type="button" style={inviteButtonStyle}>Save Security Rules</button>
            </div>

            <div style={securityRulesGridStyle}>
              {securityRules.map((rule) => (
                <article key={rule.id} style={securityRuleCardStyle}>
                  <div>
                    <strong style={securityRuleTitleStyle}>{rule.label}</strong>
                    <p style={roleDescriptionStyle}>{rule.description}</p>
                  </div>
                  <div style={securityRuleControlStyle}>
                    {rule.type === "toggle" ? (
                      <label style={securityToggleStyle}>
                        <input type="checkbox" defaultChecked={rule.value} />
                        <span>{rule.value ? "Enabled" : "Disabled"}</span>
                      </label>
                    ) : null}
                    {rule.type === "select" ? (
                      <select defaultValue={rule.value} style={formInputStyle}>
                        {rule.options.map((option) => <option key={option} value={option}>{option}</option>)}
                      </select>
                    ) : null}
                    {rule.type === "number" ? (
                      <div style={numberInputWrapStyle}>
                        <input type="number" min="1" defaultValue={rule.value} style={formInputStyle} />
                        <span>{rule.suffix}</span>
                      </div>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>

            <section style={flowBoxStyle}>
              <strong>Super Admin control recommended</strong>
              <span>Security rules should be editable only by Super Admin because they affect access, payments, deletion, refunds, and account protection.</span>
            </section>
          </section>
        ) : (
          <section style={emptyStateStyle}>
            <CurrentIcon style={emptyIconStyle} aria-hidden="true" />
            <div>
              <h4 style={emptyTitleStyle}>{currentTab.label} setup area</h4>
              <p style={mutedTextStyle}>
                This page shell is ready. The default roles are created first, so this tab can now be connected to real forms, tables, filters, and backend APIs.
              </p>
            </div>
          </section>
        )}
      </div>
    </section>
  </div>
  );
}

export default function ManageAccess() {
  return <ManageAccessPanel />;
}

const introCardStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "18px",
  flexWrap: "wrap",
  padding: "22px",
  borderRadius: "18px",
  border: "1px solid rgba(203, 213, 225, 0.75)",
  background: "linear-gradient(135deg, #ffffff 0%, #f8fbff 100%)",
  boxShadow: "0 12px 28px rgba(15, 23, 42, 0.06)"
};

const eyebrowStyle = {
  color: "#0f766e",
  fontSize: "12px",
  fontWeight: 800,
  letterSpacing: "0.12em",
  textTransform: "uppercase"
};

const titleStyle = {
  margin: "8px 0 0",
  color: "#0f172a",
  fontSize: "32px",
  lineHeight: 1.05
};

const mutedTextStyle = {
  margin: "8px 0 0",
  color: "#64748b",
  lineHeight: 1.55,
  maxWidth: "760px"
};

const securityBadgeStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: "10px",
  minHeight: "44px",
  padding: "0 14px",
  borderRadius: "999px",
  background: "#ecfdf5",
  border: "1px solid #bbf7d0",
  color: "#166534",
  fontWeight: 800
};

const shellStyle = {
  display: "grid",
  gridTemplateColumns: "260px minmax(0, 1fr)",
  gap: "18px",
  alignItems: "start"
};

const tabsStyle = {
  display: "grid",
  gap: "10px",
  padding: "12px",
  borderRadius: "18px",
  border: "1px solid rgba(203, 213, 225, 0.75)",
  background: "rgba(255, 255, 255, 0.88)",
  boxShadow: "0 12px 28px rgba(15, 23, 42, 0.05)"
};

const tabButtonStyle = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  minHeight: "46px",
  padding: "0 12px",
  borderRadius: "12px",
  border: "1px solid transparent",
  background: "transparent",
  color: "#334155",
  fontWeight: 800,
  textAlign: "left",
  cursor: "pointer"
};

const activeTabButtonStyle = {
  background: "linear-gradient(135deg, #0f172a 0%, #1f4336 100%)",
  borderColor: "rgba(15, 23, 42, 0.12)",
  color: "#ffffff",
  boxShadow: "0 12px 22px rgba(15, 23, 42, 0.14)"
};

const tabIconStyle = {
  flex: "0 0 auto"
};

const contentStyle = {
  display: "grid",
  gap: "16px",
  minWidth: 0
};

const panelHeaderStyle = {
  display: "grid",
  gap: "12px",
  padding: "22px",
  borderRadius: "18px",
  border: "1px solid rgba(203, 213, 225, 0.75)",
  background: "#ffffff",
  boxShadow: "0 12px 28px rgba(15, 23, 42, 0.05)"
};

const panelTitleRowStyle = {
  display: "flex",
  alignItems: "center",
  gap: "14px"
};

const panelIconStyle = {
  display: "inline-grid",
  placeItems: "center",
  width: "48px",
  height: "48px",
  borderRadius: "14px",
  background: "#ecfdf5",
  color: "#166534"
};

const panelTitleStyle = {
  margin: "4px 0 0",
  color: "#0f172a",
  fontSize: "28px",
  lineHeight: 1.1
};

const panelDescriptionStyle = {
  margin: 0,
  color: "#526377",
  lineHeight: 1.55,
  maxWidth: "820px"
};

const statsGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: "12px"
};

const statCardStyle = {
  padding: "16px",
  borderRadius: "16px",
  border: "1px solid rgba(203, 213, 225, 0.75)",
  background: "#ffffff",
  boxShadow: "0 10px 22px rgba(15, 23, 42, 0.04)"
};

const statLabelStyle = {
  display: "block",
  color: "#64748b",
  fontSize: "13px",
  fontWeight: 700
};

const statValueStyle = {
  display: "block",
  marginTop: "8px",
  color: "#0f172a",
  fontSize: "20px"
};

const emptyStateStyle = {
  display: "flex",
  alignItems: "center",
  gap: "16px",
  padding: "22px",
  borderRadius: "18px",
  border: "1px dashed #cbd5e1",
  background: "#f8fafc"
};

const emptyIconStyle = {
  flex: "0 0 auto",
  color: "#0f766e",
  fontSize: "28px"
};

const emptyTitleStyle = {
  margin: 0,
  color: "#0f172a",
  fontSize: "20px"
};

const rolesPanelStyle = {
  display: "grid",
  gap: "16px",
  padding: "18px",
  borderRadius: "18px",
  border: "1px solid rgba(203, 213, 225, 0.75)",
  background: "#ffffff",
  boxShadow: "0 12px 28px rgba(15, 23, 42, 0.05)"
};

const rolesHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "16px",
  flexWrap: "wrap"
};

const systemPillStyle = {
  display: "inline-flex",
  alignItems: "center",
  minHeight: "34px",
  padding: "0 12px",
  borderRadius: "999px",
  background: "#ecfdf5",
  border: "1px solid #bbf7d0",
  color: "#166534",
  fontSize: "12px",
  fontWeight: 900
};

const rolesGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))",
  gap: "12px"
};

const roleCardStyle = {
  display: "grid",
  gap: "10px",
  minWidth: 0,
  padding: "16px",
  borderRadius: "16px",
  border: "1px solid #e2e8f0",
  background: "#f8fafc"
};

const roleTitleRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "10px"
};

const roleNameStyle = {
  color: "#0f172a",
  fontSize: "17px",
  lineHeight: 1.2
};

const fixedPillStyle = {
  flex: "0 0 auto",
  padding: "4px 8px",
  borderRadius: "999px",
  background: "#dbeafe",
  color: "#1d4ed8",
  fontSize: "11px",
  fontWeight: 900
};

const roleScopeStyle = {
  color: "#0f766e",
  fontSize: "12px",
  fontWeight: 900,
  textTransform: "uppercase",
  letterSpacing: "0.08em"
};

const roleScopeInlineStyle = {
  display: "block",
  marginTop: "5px",
  color: "#0f766e",
  fontSize: "11px",
  fontWeight: 900,
  textTransform: "uppercase",
  letterSpacing: "0.06em"
};

const roleDescriptionStyle = {
  margin: 0,
  color: "#526377",
  fontSize: "13px",
  lineHeight: 1.55
};

const permissionMatrixStyle = {
  display: "grid",
  border: "1px solid #e2e8f0",
  borderRadius: "16px",
  overflow: "hidden",
  background: "#ffffff"
};

const permissionControlBarStyle = {
  display: "flex",
  alignItems: "end",
  justifyContent: "flex-end",
  gap: "10px",
  flexWrap: "wrap"
};

const permissionRoleSelectStyle = {
  display: "grid",
  gap: "6px",
  minWidth: "220px",
  color: "#475569",
  fontSize: "12px",
  fontWeight: 900
};

const permissionHeaderStyle = {
  display: "grid",
  gridTemplateColumns: "minmax(240px, 1.35fr) repeat(5, minmax(74px, 0.45fr))",
  gap: "1px",
  alignItems: "stretch",
  background: "#e2e8f0",
  color: "#334155",
  fontSize: "12px",
  textTransform: "uppercase",
  letterSpacing: "0.06em"
};

const permissionHeaderCellStyle = {
  display: "grid",
  alignItems: "center",
  minHeight: "46px",
  padding: "12px 14px",
  background: "#f8fafc"
};

const permissionRowStyle = {
  display: "grid",
  gridTemplateColumns: "minmax(240px, 1.35fr) repeat(5, minmax(74px, 0.45fr))",
  gap: "1px",
  alignItems: "stretch",
  background: "#e2e8f0"
};

const permissionModuleCellStyle = {
  display: "grid",
  gap: "5px",
  minWidth: 0,
  padding: "14px",
  background: "#ffffff"
};

const permissionDescriptionStyle = {
  color: "#64748b",
  fontSize: "12px",
  lineHeight: 1.45
};

const permissionCellBaseStyle = {
  display: "grid",
  placeItems: "center",
  minHeight: "58px",
  padding: "8px",
  background: "#ffffff",
  fontSize: "12px",
  fontWeight: 900
};

const permissionAllowedStyle = {
  ...permissionCellBaseStyle,
  color: "#166534",
  background: "#f0fdf4"
};

const permissionCheckboxCellStyle = {
  ...permissionCellBaseStyle,
  color: "#166534",
  background: "#ffffff",
  cursor: "pointer"
};

const permissionCheckboxStyle = {
  width: "18px",
  height: "18px",
  accentColor: "#16a34a",
  cursor: "pointer"
};

const permissionUnavailableStyle = {
  ...permissionCellBaseStyle,
  color: "#94a3b8",
  background: "#f8fafc"
};

const sensitivePanelStyle = {
  display: "grid",
  gap: "16px",
  padding: "18px",
  borderRadius: "18px",
  border: "1px solid #fecaca",
  background: "linear-gradient(135deg, #fff7f7 0%, #ffffff 58%, #fff7ed 100%)",
  boxShadow: "0 12px 28px rgba(127, 29, 29, 0.08)"
};

const dangerEyebrowStyle = {
  ...eyebrowStyle,
  color: "#b91c1c"
};

const superAdminPillStyle = {
  display: "inline-flex",
  alignItems: "center",
  minHeight: "34px",
  padding: "0 12px",
  borderRadius: "999px",
  background: "#fef2f2",
  border: "1px solid #fecaca",
  color: "#b91c1c",
  fontSize: "12px",
  fontWeight: 900
};

const sensitiveGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
  gap: "12px"
};

const sensitiveCardStyle = {
  display: "grid",
  gap: "10px",
  minWidth: 0,
  padding: "15px",
  borderRadius: "15px",
  border: "1px solid #fee2e2",
  background: "rgba(255, 255, 255, 0.86)"
};

const sensitiveNameStyle = {
  color: "#0f172a",
  fontSize: "15px",
  lineHeight: 1.25
};

const sensitiveAreaPillStyle = {
  flex: "0 0 auto",
  padding: "4px 8px",
  borderRadius: "999px",
  background: "#fff7ed",
  color: "#c2410c",
  fontSize: "11px",
  fontWeight: 900
};

const statusLegendStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: "8px",
  flexWrap: "wrap"
};

const usersHeaderActionsStyle = {
  display: "grid",
  justifyItems: "end",
  gap: "10px"
};

const inviteButtonStyle = {
  minHeight: "38px",
  padding: "0 14px",
  borderRadius: "10px",
  border: "1px solid #16a34a",
  background: "#16a34a",
  color: "#ffffff",
  fontSize: "13px",
  fontWeight: 900,
  cursor: "pointer",
  whiteSpace: "nowrap"
};

const inviteFormStyle = {
  display: "grid",
  gap: "16px",
  padding: "16px",
  borderRadius: "16px",
  border: "1px solid #bbf7d0",
  background: "linear-gradient(135deg, #f7fff9 0%, #ffffff 100%)"
};

const inviteFormHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "16px",
  flexWrap: "wrap"
};

const formTitleStyle = {
  margin: "5px 0 0",
  color: "#0f172a",
  fontSize: "20px"
};

const modeSwitchStyle = {
  display: "inline-flex",
  gap: "6px",
  padding: "5px",
  borderRadius: "12px",
  background: "#eef2f7",
  border: "1px solid #dbe5ef"
};

const modeButtonStyle = {
  minHeight: "34px",
  padding: "0 11px",
  borderRadius: "9px",
  border: "1px solid transparent",
  background: "transparent",
  color: "#475569",
  fontSize: "12px",
  fontWeight: 900,
  cursor: "pointer"
};

const activeModeButtonStyle = {
  background: "#ffffff",
  borderColor: "#cbd5e1",
  color: "#0f172a",
  boxShadow: "0 6px 14px rgba(15, 23, 42, 0.08)"
};

const inviteGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: "12px"
};

const formFieldStyle = {
  display: "grid",
  gap: "7px",
  color: "#475569",
  fontSize: "13px",
  fontWeight: 800
};

const formInputStyle = {
  width: "100%",
  minHeight: "42px",
  padding: "0 12px",
  borderRadius: "10px",
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  color: "#0f172a",
  fontSize: "14px"
};

const customPermissionsStyle = {
  display: "grid",
  gap: "12px",
  padding: "13px",
  borderRadius: "14px",
  background: "#f8fafc",
  border: "1px solid #e2e8f0"
};

const formSectionTitleStyle = {
  color: "#0f172a",
  fontSize: "15px"
};

const customPermissionsGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
  gap: "10px"
};

const checkboxOptionStyle = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  minHeight: "38px",
  padding: "0 10px",
  borderRadius: "10px",
  border: "1px solid #dbe5ef",
  background: "#ffffff",
  color: "#334155",
  fontSize: "13px",
  fontWeight: 800
};

const flowBoxStyle = {
  display: "grid",
  gap: "5px",
  padding: "13px",
  borderRadius: "14px",
  background: "#eff6ff",
  border: "1px solid #bfdbfe",
  color: "#1e3a8a",
  lineHeight: 1.45
};

const inviteActionsStyle = {
  display: "flex",
  justifyContent: "flex-end",
  gap: "10px",
  flexWrap: "nowrap"
};

const usersTableWrapStyle = {
  width: "100%",
  overflow: "hidden",
  border: "1px solid #e2e8f0",
  borderRadius: "16px",
  background: "#ffffff"
};

const usersTableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  tableLayout: "fixed"
};

const activityTableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  tableLayout: "fixed"
};

const activityThStyle = {
  padding: "13px 10px",
  background: "#f8fafc",
  color: "#334155",
  fontSize: "11px",
  fontWeight: 900,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  textAlign: "left",
  borderBottom: "1px solid #e2e8f0"
};

const roleThStyle = {
  padding: "13px 10px",
  background: "#f8fafc",
  color: "#334155",
  fontSize: "11px",
  fontWeight: 900,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  textAlign: "left",
  borderBottom: "1px solid #e2e8f0"
};

const userThStyle = {
  padding: "13px 10px",
  background: "#f8fafc",
  color: "#334155",
  fontSize: "11px",
  fontWeight: 900,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  textAlign: "left",
  borderBottom: "1px solid #e2e8f0"
};

const userTdStyle = {
  padding: "14px 10px",
  color: "#0f172a",
  fontSize: "13px",
  verticalAlign: "top",
  borderBottom: "1px solid #eef2f7",
  overflowWrap: "anywhere"
};

const userNameStyle = {
  display: "block",
  color: "#0f172a",
  lineHeight: 1.3
};

const rolePillStyle = {
  display: "inline-flex",
  alignItems: "center",
  minHeight: "28px",
  padding: "0 9px",
  borderRadius: "999px",
  background: "#eef2ff",
  color: "#3730a3",
  fontSize: "12px",
  fontWeight: 900
};

const userStatusPillStyle = {
  display: "inline-flex",
  alignItems: "center",
  minHeight: "28px",
  padding: "0 9px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: 900,
  whiteSpace: "nowrap"
};

const userActionRowStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-start",
  gap: "7px",
  flexWrap: "nowrap"
};

const tableActionButtonStyle = {
  minHeight: "30px",
  padding: "0 9px",
  borderRadius: "8px",
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  color: "#334155",
  fontSize: "12px",
  fontWeight: 900,
  cursor: "pointer",
  whiteSpace: "nowrap"
};

const warningActionButtonStyle = {
  ...tableActionButtonStyle,
  borderColor: "#fed7aa",
  background: "#fff7ed",
  color: "#c2410c"
};

const dangerActionButtonStyle = {
  ...tableActionButtonStyle,
  borderColor: "#fecaca",
  background: "#fef2f2",
  color: "#b91c1c"
};

const logSummaryGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: "12px"
};

const successLogPillStyle = {
  display: "inline-flex",
  alignItems: "center",
  minHeight: "28px",
  padding: "0 9px",
  borderRadius: "999px",
  background: "#dcfce7",
  color: "#166534",
  fontSize: "12px",
  fontWeight: 900,
  textTransform: "capitalize"
};

const failedLogPillStyle = {
  ...successLogPillStyle,
  background: "#fee2e2",
  color: "#b91c1c"
};

const securityRulesGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))",
  gap: "12px"
};

const securityRuleCardStyle = {
  display: "grid",
  gap: "14px",
  alignContent: "space-between",
  minWidth: 0,
  padding: "16px",
  borderRadius: "16px",
  border: "1px solid #e2e8f0",
  background: "#f8fafc"
};

const securityRuleTitleStyle = {
  display: "block",
  color: "#0f172a",
  fontSize: "16px",
  lineHeight: 1.25
};

const securityRuleControlStyle = {
  display: "grid",
  gap: "8px"
};

const securityToggleStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: "9px",
  minHeight: "40px",
  padding: "0 12px",
  borderRadius: "999px",
  background: "#ffffff",
  border: "1px solid #cbd5e1",
  color: "#334155",
  fontSize: "13px",
  fontWeight: 900
};

const numberInputWrapStyle = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  alignItems: "center",
  gap: "10px",
  color: "#64748b",
  fontSize: "12px",
  fontWeight: 900
};

import React from "react";
import {
  deleteWebsiteImage,
  fetchWebsiteImages,
  updateWebsiteImage,
  uploadAdminImage
} from "../../api/adminApi";

function getPreviewUrl(url) {
  if (!url) return "";
  if (/^(data:|blob:|https?:)/i.test(url)) return url;
  if (url.startsWith("/uploads/")) return `http://localhost:4000${url}`;
  return url;
}

function formatSource(source) {
  if (source === "uploaded") return "Uploaded";
  if (source === "frontend") return "Website Asset";
  return "Image";
}

function getUsedInText(image) {
  if (image.sectionPath) return image.sectionPath;
  if (image.linkedPaths?.length) return image.linkedPaths.join(", ");
  return "Not assigned";
}

export default function WebsiteImages() {
  const [images, setImages] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [savingUrl, setSavingUrl] = React.useState("");
  const [editingUrl, setEditingUrl] = React.useState("");
  const [uploading, setUploading] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const [searchTerm, setSearchTerm] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");

  const loadImages = React.useCallback(async () => {
    setLoading(true);
    setMessage("");

    try {
      const response = await fetchWebsiteImages();
      setImages(Array.isArray(response.data?.data) ? response.data.data : []);
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to load website images.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadImages();
  }, [loadImages]);

  const updateLocalImage = (url, patch) => {
    setImages((current) => current.map((image) => image.url === url ? { ...image, ...patch } : image));
  };

  const handleSave = async (image) => {
    setSavingUrl(image.url);
    setMessage("");

    try {
      await updateWebsiteImage({
        url: image.url,
        altText: image.altText || "",
        sectionPath: image.sectionPath || "",
        status: image.status || "active"
      });
      setMessage("Image details updated.");
      setEditingUrl("");
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to update image details.");
    } finally {
      setSavingUrl("");
    }
  };

  const handleDelete = async (image) => {
    const confirmed = window.confirm(`Delete this image from Website Images?\n\n${image.url}`);
    if (!confirmed) return;

    setSavingUrl(image.url);
    setMessage("");

    try {
      await deleteWebsiteImage(image.url);
      setImages((current) => current.filter((item) => item.url !== image.url));
      setMessage(image.protectedFile ? "Image hidden from manager. Existing website file was not removed." : "Uploaded image deleted.");
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to delete image.");
    } finally {
      setSavingUrl("");
    }
  };

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setMessage("");

    try {
      await uploadAdminImage(file);
      await loadImages();
      setMessage("Image uploaded. Add alt text and section path, then save.");
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to upload image.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const filteredImages = images.filter((image) => {
    const query = searchTerm.trim().toLowerCase();
    const matchesStatus = statusFilter === "all" || image.status === statusFilter;
    const matchesSearch = !query || [
      image.url,
      image.altText,
      image.sectionPath,
      image.filename,
      image.originalName,
      ...(image.linkedPaths || [])
    ].some((value) => String(value || "").toLowerCase().includes(query));

    return matchesStatus && matchesSearch;
  });

  return (
    <div style={pageStyle}>
      <section style={heroStyle}>
        <div>
          <p style={eyebrowStyle}>Website Control</p>
          <h1 style={titleStyle}>Website Images</h1>
          <p style={subtextStyle}>Manage image alt text, section paths, active status, uploads, edits, and deleted visibility for overall Avyona website images.</p>
        </div>
        <label style={uploadButtonStyle}>
          {uploading ? "Uploading..." : "Add New Image"}
          <input type="file" accept="image/*" onChange={handleUpload} disabled={uploading} style={{ display: "none" }} />
        </label>
      </section>

      <section style={toolbarStyle}>
        <input
          type="search"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search by image path, alt text, filename, or linked section"
          style={inputStyle}
        />
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} style={selectStyle}>
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <button type="button" onClick={loadImages} style={secondaryButtonStyle}>Refresh</button>
      </section>

      {message ? <div style={messageStyle}>{message}</div> : null}

      <section style={summaryStyle}>
        <span style={pillStyle}>{`Total Images: ${images.length}`}</span>
        <span style={pillStyle}>{`Showing: ${filteredImages.length}`}</span>
        <span style={pillStyle}>Existing page controls are unchanged</span>
      </section>

      {loading ? (
        <section style={emptyStyle}>Loading website images...</section>
      ) : (
        <section style={gridStyle}>
          {filteredImages.map((image) => {
            const isEditing = editingUrl === image.url;
            const usedInText = getUsedInText(image);

            return (
              <article key={image.url} style={cardStyle}>
                <div style={previewStyle}>
                  <img src={getPreviewUrl(image.url)} alt={image.altText || image.originalName || "Website image"} style={imageStyle} />
                  <span style={{ ...badgeStyle, ...(image.status === "active" ? activeBadgeStyle : inactiveBadgeStyle) }}>
                    {image.status === "active" ? "Active" : "Inactive"}
                  </span>
                </div>

                <div style={contentStyle}>
                  <div style={cardHeaderStyle}>
                    <div>
                      <p style={eyebrowStyle}>{formatSource(image.source)}</p>
                      <h2 style={cardTitleStyle}>{image.originalName || image.filename || "Website image"}</h2>
                    </div>
                  </div>

                  <div style={infoStackStyle}>
                    <div style={infoBlockStyle}>
                      <span style={labelStyle}>Image Path</span>
                      <p style={pathStyle}>{image.url}</p>
                    </div>
                    <div style={infoBlockStyle}>
                      <span style={labelStyle}>Used In Section</span>
                      <p style={usedInStyle}>{usedInText}</p>
                    </div>
                    <div style={infoBlockStyle}>
                      <span style={labelStyle}>Alt Text</span>
                      <p style={usedInStyle}>{image.altText || "Alt text not added"}</p>
                    </div>
                  </div>

                  {isEditing ? (
                    <div style={editorPanelStyle}>
                      <label style={fieldStyle}>
                        <span style={labelStyle}>Alt Text</span>
                        <input
                          value={image.altText || ""}
                          onChange={(event) => updateLocalImage(image.url, { altText: event.target.value })}
                          placeholder="Describe the image for SEO and accessibility"
                          style={inputStyle}
                        />
                      </label>

                      <label style={fieldStyle}>
                        <span style={labelStyle}>Used In Section / Path</span>
                        <textarea
                          value={image.sectionPath || ""}
                          onChange={(event) => updateLocalImage(image.url, { sectionPath: event.target.value })}
                          placeholder="Example: Homepage hero banner, Product page gallery, Category card, Footer logo"
                          style={textareaStyle}
                        />
                      </label>

                      {image.linkedPaths?.length ? (
                        <div style={linkedBoxStyle}>
                          <strong>Detected Source</strong>
                          <p>{image.linkedPaths.join(", ")}</p>
                        </div>
                      ) : null}

                      <select
                        value={image.status || "active"}
                        onChange={(event) => updateLocalImage(image.url, { status: event.target.value })}
                        style={inputStyle}
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                  ) : null}

                  <div style={actionRowStyle}>
                    {isEditing ? (
                      <>
                        <button type="button" onClick={() => handleSave(image)} disabled={savingUrl === image.url} style={primaryButtonStyle}>
                          {savingUrl === image.url ? "Saving..." : "Save"}
                        </button>
                        <button type="button" onClick={() => setEditingUrl("")} disabled={savingUrl === image.url} style={secondaryButtonStyle}>
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button type="button" onClick={() => setEditingUrl(image.url)} style={primaryButtonStyle}>
                        Edit
                      </button>
                    )}
                    <button type="button" onClick={() => handleDelete(image)} disabled={savingUrl === image.url} style={dangerButtonStyle}>
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            );
          })}

          {!filteredImages.length ? <div style={emptyStyle}>No images found for the selected filters.</div> : null}
        </section>
      )}
    </div>
  );
}

const pageStyle = {
  display: "grid",
  gap: "16px"
};

const heroStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "16px",
  flexWrap: "wrap",
  padding: "24px",
  border: "1px solid #dbe7df",
  borderRadius: "14px",
  background: "linear-gradient(135deg, #ffffff 0%, #eef8f0 100%)"
};

const eyebrowStyle = {
  margin: 0,
  color: "#15803d",
  fontSize: "12px",
  fontWeight: 800,
  letterSpacing: "0.08em",
  textTransform: "uppercase"
};

const titleStyle = {
  margin: "8px 0 0",
  fontSize: "34px",
  lineHeight: 1.1
};

const subtextStyle = {
  margin: "12px 0 0",
  color: "#64748b",
  maxWidth: "760px"
};

const toolbarStyle = {
  display: "grid",
  gridTemplateColumns: "minmax(260px, 1fr) 180px 120px",
  gap: "12px",
  padding: "16px",
  border: "1px solid #e2e8f0",
  borderRadius: "12px",
  background: "#fff"
};

const summaryStyle = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap"
};

const gridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: "15px",
  alignItems: "stretch"
};

const cardStyle = {
  display: "grid",
  gridTemplateRows: "190px 1fr",
  gap: "12px",
  padding: "14px",
  border: "1px solid #e2e8f0",
  borderRadius: "12px",
  background: "#fff",
  boxShadow: "0 8px 24px rgba(15, 23, 42, 0.04)",
  minHeight: "560px"
};

const previewStyle = {
  position: "relative",
  height: "190px",
  borderRadius: "10px",
  overflow: "hidden",
  background: "#f1f5f9",
  border: "1px solid #e2e8f0"
};

const imageStyle = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  display: "block"
};

const badgeStyle = {
  position: "absolute",
  top: "10px",
  left: "10px",
  padding: "5px 9px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: 800
};

const activeBadgeStyle = {
  color: "#166534",
  background: "#dcfce7"
};

const inactiveBadgeStyle = {
  color: "#92400e",
  background: "#fef3c7"
};

const contentStyle = {
  display: "grid",
  gridTemplateRows: "auto auto 1fr auto",
  gap: "10px",
  minWidth: 0,
  height: "100%"
};

const cardHeaderStyle = {
  minHeight: "50px",
  display: "flex",
  justifyContent: "space-between",
  gap: "10px"
};

const cardTitleStyle = {
  margin: "4px 0 0",
  fontSize: "16px",
  lineHeight: 1.25,
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden"
};

const pathStyle = {
  margin: "4px 0 0",
  color: "#64748b",
  fontSize: "12px",
  lineHeight: 1.35,
  wordBreak: "break-all",
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden"
};

const infoStackStyle = {
  display: "grid",
  gap: "8px"
};

const infoBlockStyle = {
  minHeight: "54px",
  padding: "9px",
  border: "1px solid #edf2f7",
  borderRadius: "8px",
  background: "#fbfdff"
};

const usedInStyle = {
  margin: "4px 0 0",
  color: "#475569",
  fontSize: "12px",
  lineHeight: 1.4,
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden"
};

const fieldStyle = {
  display: "grid",
  gap: "6px"
};

const labelStyle = {
  color: "#334155",
  fontSize: "13px",
  fontWeight: 800
};

const inputStyle = {
  width: "100%",
  minHeight: "42px",
  padding: "0 12px",
  border: "1px solid #cbd5e1",
  borderRadius: "8px",
  background: "#fff",
  boxSizing: "border-box"
};

const selectStyle = {
  ...inputStyle
};

const smallSelectStyle = {
  ...inputStyle,
  width: "150px"
};

const textareaStyle = {
  ...inputStyle,
  minHeight: "68px",
  padding: "10px 12px",
  resize: "vertical"
};

const editorPanelStyle = {
  display: "grid",
  gap: "8px",
  padding: "10px",
  border: "1px solid #dbeafe",
  borderRadius: "10px",
  background: "#f8fbff"
};

const linkedBoxStyle = {
  padding: "10px",
  borderRadius: "8px",
  background: "#f8fafc",
  color: "#475569",
  fontSize: "12px"
};

const actionRowStyle = {
  display: "flex",
  gap: "8px",
  alignItems: "center",
  flexWrap: "wrap",
  alignSelf: "end"
};

const uploadButtonStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "42px",
  padding: "0 16px",
  borderRadius: "9px",
  background: "#16a34a",
  color: "#fff",
  fontWeight: 800,
  cursor: "pointer"
};

const primaryButtonStyle = {
  minHeight: "42px",
  padding: "0 14px",
  border: 0,
  borderRadius: "8px",
  background: "#16a34a",
  color: "#fff",
  fontWeight: 800,
  cursor: "pointer"
};

const secondaryButtonStyle = {
  minHeight: "42px",
  padding: "0 14px",
  border: "1px solid #cbd5e1",
  borderRadius: "8px",
  background: "#fff",
  color: "#334155",
  fontWeight: 800,
  cursor: "pointer"
};

const dangerButtonStyle = {
  minHeight: "42px",
  padding: "0 14px",
  border: "1px solid #fecaca",
  borderRadius: "8px",
  background: "#fef2f2",
  color: "#b91c1c",
  fontWeight: 800,
  cursor: "pointer"
};

const pillStyle = {
  display: "inline-flex",
  alignItems: "center",
  minHeight: "32px",
  padding: "0 11px",
  borderRadius: "999px",
  background: "#f1f5f9",
  color: "#334155",
  fontSize: "13px",
  fontWeight: 800
};

const messageStyle = {
  padding: "12px 14px",
  borderRadius: "10px",
  border: "1px solid #bbf7d0",
  background: "#f0fdf4",
  color: "#166534",
  fontWeight: 800
};

const emptyStyle = {
  padding: "28px",
  border: "1px solid #e2e8f0",
  borderRadius: "12px",
  background: "#fff",
  color: "#64748b",
  fontWeight: 800
};

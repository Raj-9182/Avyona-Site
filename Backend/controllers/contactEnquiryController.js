import { query } from "../config/db.js";
import { ApiError } from "../utils/apiError.js";

const VALID_ENQUIRY_TYPES = new Set(["B2C", "B2B"]);
const VALID_STATUSES = new Set(["New", "In Progress", "Resolved", "Closed"]);

function cleanText(value) {
  return String(value || "").trim();
}

function normalizeEnquiryType(value) {
  const normalized = cleanText(value).toUpperCase();
  if (normalized === "CUSTOMER" || normalized === "B2C") return "B2C";
  if (normalized === "BUSINESS" || normalized === "B2B") return "B2B";
  return normalized;
}

function mapContactEnquiry(row) {
  return {
    id: row.id,
    enquiryType: row.enquiry_type,
    name: row.name,
    companyName: row.company_name || "",
    email: row.email,
    phone: row.phone,
    orderId: row.order_id || "",
    message: row.message,
    status: row.status,
    createdAt: row.created_at
  };
}

export async function createContactEnquiry(request, response) {
  const enquiryType = normalizeEnquiryType(request.body.enquiryType || request.body.enquiry_type);
  const name = cleanText(request.body.name);
  const companyName = cleanText(request.body.companyName || request.body.company_name);
  const email = cleanText(request.body.email).toLowerCase();
  const phone = cleanText(request.body.phone);
  const orderId = cleanText(request.body.orderId || request.body.order_id);
  const message = cleanText(request.body.message);

  if (!VALID_ENQUIRY_TYPES.has(enquiryType)) {
    throw new ApiError(400, "enquiryType must be B2C or B2B");
  }

  if (!name || !email || !phone || !message) {
    throw new ApiError(400, "name, email, phone, and message are required");
  }

  if (enquiryType === "B2B" && !companyName) {
    throw new ApiError(400, "companyName is required for business enquiries");
  }

  const result = await query(
    `INSERT INTO contact_enquiries
      (enquiry_type, name, company_name, email, phone, order_id, message, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'New')`,
    [
      enquiryType,
      name,
      companyName || null,
      email,
      phone,
      orderId || null,
      message
    ]
  );

  const rows = await query("SELECT * FROM contact_enquiries WHERE id = ? LIMIT 1", [result.insertId]);

  response.status(201).json({
    success: true,
    message: "Contact enquiry submitted",
    data: mapContactEnquiry(rows[0])
  });
}

export async function listContactEnquiries(request, response) {
  const status = cleanText(request.query.status);
  const enquiryType = normalizeEnquiryType(request.query.enquiryType || request.query.enquiry_type);
  const search = cleanText(request.query.search);
  const clauses = [];
  const values = [];

  if (status && VALID_STATUSES.has(status)) {
    clauses.push("status = ?");
    values.push(status);
  }

  if (enquiryType && VALID_ENQUIRY_TYPES.has(enquiryType)) {
    clauses.push("enquiry_type = ?");
    values.push(enquiryType);
  }

  if (search) {
    clauses.push("(name LIKE ? OR company_name LIKE ? OR email LIKE ? OR phone LIKE ? OR order_id LIKE ?)");
    const likeSearch = `%${search}%`;
    values.push(likeSearch, likeSearch, likeSearch, likeSearch, likeSearch);
  }

  const whereSql = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const rows = await query(
    `SELECT *
     FROM contact_enquiries
     ${whereSql}
     ORDER BY created_at DESC, id DESC`,
    values
  );

  response.json({
    success: true,
    count: rows.length,
    data: rows.map(mapContactEnquiry)
  });
}

export async function getContactEnquiry(request, response) {
  const enquiryId = Number(request.params.id);

  if (!Number.isInteger(enquiryId) || enquiryId <= 0) {
    throw new ApiError(400, "Invalid contact enquiry id");
  }

  const rows = await query("SELECT * FROM contact_enquiries WHERE id = ? LIMIT 1", [enquiryId]);

  if (!rows.length) {
    throw new ApiError(404, "Contact enquiry not found");
  }

  response.json({
    success: true,
    data: mapContactEnquiry(rows[0])
  });
}

export async function updateContactEnquiryStatus(request, response) {
  const enquiryId = Number(request.params.id);
  const status = cleanText(request.body.status);

  if (!Number.isInteger(enquiryId) || enquiryId <= 0) {
    throw new ApiError(400, "Invalid contact enquiry id");
  }

  if (!VALID_STATUSES.has(status)) {
    throw new ApiError(400, "status must be New, In Progress, Resolved, or Closed");
  }

  const result = await query("UPDATE contact_enquiries SET status = ? WHERE id = ? LIMIT 1", [status, enquiryId]);

  if (!result.affectedRows) {
    throw new ApiError(404, "Contact enquiry not found");
  }

  const rows = await query("SELECT * FROM contact_enquiries WHERE id = ? LIMIT 1", [enquiryId]);

  response.json({
    success: true,
    message: "Contact enquiry status updated",
    data: mapContactEnquiry(rows[0])
  });
}

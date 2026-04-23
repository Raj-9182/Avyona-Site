import { adminApi } from "./adminApi";

export function fetchCustomers() {
  return adminApi.get("/customers");
}

export function fetchCustomerById(customerId) {
  return adminApi.get(`/customers/${customerId}`);
}

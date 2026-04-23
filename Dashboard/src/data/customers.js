const customers = [
  {
    id: "CUST-1001",
    name: "Rahul Mehta",
    email: "rahul@example.com",
    phone: "9876543210",
    totalOrders: 2,
    totalSpend: 16498,
    createdAt: "2026-02-05T10:30:00",
    lastOrderDate: "2026-04-18T11:20:00",
    status: "active",
    emailVerified: true,
    phoneVerified: true,
    savedAddresses: [
      {
        id: "addr-rahul-home",
        addressType: "Home",
        fullAddress: "12 Lake View Road, Banjara Hills",
        city: "Hyderabad",
        state: "Telangana",
        pincode: "500034",
        country: "India",
        phone: "9876543210",
        isDefault: true
      }
    ],
    orderHistory: [
      {
        id: 101,
        orderNumber: "ORD-2026-1001",
        createdAt: "2026-04-18T11:20:00",
        totalAmount: 9499,
        paymentStatus: "paid",
        status: "delivered"
      },
      {
        id: 87,
        orderNumber: "ORD-2026-0941",
        createdAt: "2026-03-29T16:10:00",
        totalAmount: 6999,
        paymentStatus: "paid",
        status: "shipped"
      }
    ],
    notes: [
      {
        title: "Frequent buyer",
        body: "Responds quickly and prefers WhatsApp updates before delivery.",
        createdAt: "2026-04-19T09:15:00"
      }
    ]
  },
  {
    id: "CUST-1002",
    name: "Priya Sharma",
    email: "priya@example.com",
    phone: "9123456780",
    totalOrders: 1,
    totalSpend: 8999,
    createdAt: "2026-03-10T14:00:00",
    lastOrderDate: "2026-04-12T16:45:00",
    status: "inactive",
    emailVerified: true,
    phoneVerified: false,
    savedAddresses: [
      {
        id: "addr-priya-office",
        addressType: "Office",
        fullAddress: "88 Residency Tech Park, Whitefield Main Road",
        city: "Bengaluru",
        state: "Karnataka",
        pincode: "560066",
        country: "India",
        phone: "9123456780",
        isDefault: true
      }
    ],
    orderHistory: [
      {
        id: 95,
        orderNumber: "ORD-2026-0977",
        createdAt: "2026-04-12T16:45:00",
        totalAmount: 8999,
        paymentStatus: "pending",
        status: "confirmed"
      }
    ],
    notes: [
      {
        title: "Verification pending",
        body: "Phone verification is still pending. Follow up if high-value order is placed.",
        createdAt: "2026-04-13T12:40:00"
      }
    ]
  }
];

export default customers;

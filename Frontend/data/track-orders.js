const trackOrders = [
  {
    orderId: "AVY-1001",
    email: "rahul.mehta@example.com",
    phone: "+91 9876543210",
    status: "shipped",
    paymentStatus: "paid",
    courierName: "Blue Dart",
    expectedDeliveryDate: "2026-04-24T18:00:00+05:30",
    deliveryAddress: {
      fullName: "Rahul Mehta",
      line1: "Flat 402, Lakeview Residency",
      line2: "Madhapur",
      city: "Hyderabad",
      state: "Telangana",
      pincode: "500081",
      country: "India",
      phone: "+91 9876543210"
    },
    orderedItems: [
      {
        id: "oi-1001-1",
        name: "Avyona Aura 10 Frame",
        quantity: 1,
        price: 8999,
        image: "/images/optimized/frame-2.webp"
      }
    ],
    summary: {
      totalAmount: 8999,
      placedAt: "2026-04-18T10:25:00+05:30"
    },
    statusTimeline: [
      {
        id: "1001-confirmed",
        title: "Order Placed",
        status: "confirmed",
        dateTime: "2026-04-18T10:25:00+05:30",
        note: "Customer completed checkout successfully."
      },
      {
        id: "1001-paid",
        title: "Payment Captured",
        status: "paid",
        dateTime: "2026-04-18T10:27:00+05:30",
        note: "PhonePe payment confirmed."
      },
      {
        id: "1001-packed",
        title: "Order Packed",
        status: "packed",
        dateTime: "2026-04-19T09:40:00+05:30",
        note: "Warehouse packed the order."
      },
      {
        id: "1001-shipped",
        title: "Order Shipped",
        status: "shipped",
        dateTime: "2026-04-20T14:15:00+05:30",
        note: "Shipment handed over to courier partner."
      }
    ]
  },
  {
    orderId: "AVY-1002",
    email: "priya.sharma@example.com",
    phone: "+91 9988776655",
    status: "out_for_delivery",
    paymentStatus: "cod-pending",
    courierName: "Delhivery",
    expectedDeliveryDate: "2026-04-27T20:00:00+05:30",
    deliveryAddress: {
      fullName: "Priya Sharma",
      line1: "22, Green Park Avenue",
      line2: "Whitefield Main Road",
      city: "Bengaluru",
      state: "Karnataka",
      pincode: "560066",
      country: "India",
      phone: "+91 9988776655"
    },
    orderedItems: [
      {
        id: "oi-1002-1",
        name: "JBL FlexSound Neckband",
        quantity: 1,
        price: 4499,
        image: "/images/optimized/headphone-2.webp"
      },
      {
        id: "oi-1002-2",
        name: "Glocusent Focus Reading Light",
        quantity: 2,
        price: 1999,
        image: "/images/optimized/reading-light-1.webp"
      }
    ],
    summary: {
      totalAmount: 8346,
      placedAt: "2026-04-19T16:40:00+05:30"
    },
    statusTimeline: [
      {
        id: "1002-confirmed",
        title: "Order Placed",
        status: "confirmed",
        dateTime: "2026-04-19T16:40:00+05:30",
        note: "COD order placed from website."
      },
      {
        id: "1002-packed",
        title: "Order Packed",
        status: "packed",
        dateTime: "2026-04-21T11:00:00+05:30",
        note: "Items moved to the warehouse packing queue."
      },
      {
        id: "1002-shipped",
        title: "Order Shipped",
        status: "shipped",
        dateTime: "2026-04-23T08:20:00+05:30",
        note: "Shipment handed to Delhivery hub."
      },
      {
        id: "1002-out-for-delivery",
        title: "Out for Delivery",
        status: "out_for_delivery",
        dateTime: "2026-04-24T09:10:00+05:30",
        note: "Delivery partner is on the route today."
      }
    ]
  }
];

export default trackOrders;

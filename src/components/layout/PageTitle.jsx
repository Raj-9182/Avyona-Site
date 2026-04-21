import React, { useEffect } from "react";

const titleMap = {
  "/": "Avyona | Premium Electronics for Everyday Life",
  "/collections": "Avyona | All Collections",
  "/search": "Avyona | Search",
  "/offers": "Avyona | Offers",
  "/account": "Avyona Account",
  "/profile": "Avyona Profile",
  "/checkout": "Avyona | Checkout"
};

export default function PageTitle({ pathname }) {
  useEffect(() => {
    document.title = titleMap[pathname] || "Avyona";
  }, [pathname]);

  return null;
}

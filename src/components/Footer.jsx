import React from "react";

export default function Footer() {
  return (
    <footer className="bg-blue-800 text-center py-4 text-sm text-white">
      © {new Date().getFullYear()} Supreme Student Council
    </footer>
  );
}
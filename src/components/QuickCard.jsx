import React from "react";
import { useNavigate } from "react-router-dom";

const QuickCard = ({ title, desc, color = "bg-blue-500", to }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (to) {
      navigate(to); // NANAVIGATE NE ING ROUTE
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`${color} p-6 rounded-xl shadow cursor-pointer transition transform hover:scale-105 hover:shadow-lg hover:brightness-110`}
    >
      <h3 className="text-xl font-bold mb-2 text-white">{title}</h3>
      <p className="text-white">{desc}</p>
    </div>
  );
};

export default QuickCard;
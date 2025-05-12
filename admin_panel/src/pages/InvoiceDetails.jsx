import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useParams, useNavigate } from "react-router-dom";
import "../styles/InvoiceDetails.css";
import {
  FaPrint,
  FaEdit,
  FaArrowLeft,
  FaChevronDown,
  FaChevronUp,
} from "react-icons/fa";
import Flower from "../assets/design/flower.png";

function InvoiceDetails() {
  const url = "http://localhost:4000";
  const { id } = useParams();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedHistory, setExpandedHistory] = useState(false);
  const navigate = useNavigate();

  const fetchInvoiceDetails = async () => {
    try {
      const response = await axios.get(`${url}/api/invoices/details/${id}`, {
        params: { populate: "createdBy updatedBy changesHistory.changedBy" },
      });
      if (response.data.success) {
        setInvoice(response.data.data);
      } else {
        toast.error("Не вдалося завантажити дані накладної");
      }
    } catch (error) {
      toast.error("Помилка при отриманні даних");
      console.error("Error fetching invoice details:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoiceDetails();
  }, [id]);

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("uk-UA", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case "активна":
        return "bg-blue-100 text-blue-800";
      case "виконана":
        return "bg-green-100 text-green-800";
      case "скасована":
        return "bg-red-100 text-[#7a0e0a]";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const renderChanges = (changes) => {
    // Якщо це запис про створення накладної
    if (changes.action === "created") {
      return (
        <div className="text-green-600">
          <p>{changes.message}</p>
        </div>
      );
    }

    return Object.entries(changes).map(([field, values]) => (
      <div key={field} className="mb-2">
        {field === "products" ? (
          <div className="mt-1">
            <p className="font-medium mb-1">Зміни у списку товарів:</p>
            <div className="pl-4 border-l-2 border-gray-200">
              <p className="font-medium text-sm">Було:</p>
              {values.from.map((item, index) => (
                <div key={`from-${index}`} className="text-sm mb-1 pl-2">
                  {item.productName || item.product?.name} - {item.size}
                  (Кількість: {item.quantity}, Ціна:{" "}
                  {item.pricePerUnit?.toFixed(2)} грн)
                </div>
              ))}
              <p className="font-medium text-sm mt-2">Стало:</p>
              {values.to.map((item, index) => (
                <div key={`to-${index}`} className="text-sm mb-1 pl-2">
                  {item.productName || item.product?.name} - {item.size}
                  (Кількість: {item.quantity}, Ціна:{" "}
                  {item.pricePerUnit?.toFixed(2)} грн)
                </div>
              ))}
            </div>
          </div>
        ) : field === "status" ? (
          <>
            <p>
              Було:{" "}
              <span
                className={`px-2 py-1 rounded-full text-xs ${getStatusStyle(
                  values.from
                )}`}
              >
                {values.from}
              </span>
            </p>
            <p>
              Стало:{" "}
              <span
                className={`px-2 py-1 rounded-full text-xs ${getStatusStyle(
                  values.to
                )}`}
              >
                {values.to}
              </span>
            </p>
          </>
        ) : (
          <>
            <p>Було: {values.from?.toString() || "не вказано"}</p>
            <p>Стало: {values.to?.toString() || "не вказано"}</p>
          </>
        )}
      </div>
    ));
  };

  if (loading) {
    return (
      <div className="p-10 w-full bg-gray-100 flex justify-center">
        Завантаження...
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="p-10 w-full bg-gray-100 flex justify-center">
        Дані накладної не знайдено.
      </div>
    );
  }

  return (
    <section className="p-10 w-full bg-gray-100 flex justify-center min-h-screen print:p-0 print:bg-white print:print-content">
      <div className="w-full max-w-4xl bg-white shadow-lg rounded-lg p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2
              style={{ fontFamily: "Montserrat Alternates", fontWeight: 600 }}
              className="
            text-xl
            sm:text-2xl
            md:text-3xl
            text-center
          text-black
          mb-2
            "
            >
              Деталі накладної
            </h2>
            {/* <h4 className="text-2xl font-bold text-black uppercase">Деталі накладної</h4> */}
            <p className="text-gray-600 mt-1">№ {invoice.invoiceNumber}</p>

            {/* Інформація про автора та останнє оновлення */}
            <div className="mt-2 text-sm text-gray-500">
              {invoice.createdBy && (
                <p>
                  Створено: {invoice.createdBy.firstName}{" "}
                  {invoice.createdBy.secondName} (
                  {formatDate(invoice.invoiceDate)})
                </p>
              )}
              {invoice.updatedBy && (
                <p>
                  Останнє оновлення: {invoice.updatedBy.firstName}{" "}
                  {invoice.updatedBy.secondName} (
                  {formatDate(invoice.updatedAt)})
                </p>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-black">
              Дата: {formatDate(invoice.invoiceDate)}
            </p>
            <div
              className={`mt-1 px-3 py-1 rounded-full text-sm font-medium ${getStatusStyle(
                invoice.status
              )}`}
            >
              {invoice.status}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div>
            <h5 className="text-lg font-semibold text-black mb-2">
              Постачальник
            </h5>
            <div className="p-4 rounded-md border border-gray-200">
              <p className="font-medium">{invoice.supplier.companyName}</p>
              {invoice.supplier.contactPerson && (
                <p className="text-black mt-1">
                  Контактна особа: {invoice.supplier.contactPerson}
                </p>
              )}
              {invoice.supplier.phone && (
                <p className="text-black mt-1">
                  Телефон: {invoice.supplier.phone}
                </p>
              )}
            </div>
          </div>

          <div>
            <h5 className="text-lg font-semibold text-black mb-2">
              Загальна інформація
            </h5>
            <div className="p-4 rounded-md border border-gray-200">
              <div className="flex justify-between mb-2">
                <span className="text-black">Загальна сума:</span>
                <span className="font-medium">
                  {invoice.totalAmount.toFixed(2)} грн
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-black">Дата створення:</span>
                <span>{formatDate(invoice.invoiceDate)}</span>
              </div>
            </div>
          </div>
        </div>

        {invoice.notes && (
          <div className="mb-8">
            <h5 className="text-lg font-semibold text-gray-700 mb-2">
              Нотатки
            </h5>
            <div className="p-4 rounded-md border border-gray-200 whitespace-pre-wrap">
              {invoice.notes}
            </div>
          </div>
        )}

        <div className="mb-8">
          <h5 className="text-xl font-bold text-black border-b pb-3 mb-4">
            Товари
          </h5>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-200">
                  <th className="p-3 border text-center">№</th>
                  <th className="p-3 border text-center">Назва</th>
                  <th className="p-3 border text-center">Розмір</th>
                  <th className="p-3 border text-center">Кількість</th>
                  <th className="p-3 border text-center">Ціна за одиницю</th>
                  <th className="p-3 border text-center">Загальна вартість</th>
                </tr>
              </thead>
              <tbody>
                {invoice.products.map((item, index) => {
                  const productTotal = item.quantity * item.pricePerUnit;
                  return (
                    <tr key={index} className="border-b">
                      <td className="p-3">{index + 1}</td>
                      <td className="p-3">{item.product.name}</td>
                      <td className="p-3">{item.size}</td>
                      <td className="p-3">{item.quantity}</td>
                      <td className="p-3">
                        {item.pricePerUnit.toFixed(2)} грн
                      </td>
                      <td className="p-3">{productTotal.toFixed(2)} грн</td>
                    </tr>
                  );
                })}
                <tr className="bg-gray-100 font-bold">
                  <td colSpan="5" className="p-3 text-right">
                    Разом:
                  </td>
                  <td className="p-3">{invoice.totalAmount.toFixed(2)} грн</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Історія змін */}
        {invoice.changesHistory && invoice.changesHistory.length > 0 && (
          <div className="mt-6 p-4 rounded-md border print:hidden">
            <div
              className="flex justify-between items-center cursor-pointer hover:bg-gray-100 p-2 -m-2 rounded"
              onClick={() => setExpandedHistory(!expandedHistory)}
            >
              <h5 className="text-base font-semibold text-black">
                Історія змін ({invoice.changesHistory.length})
              </h5>
              {expandedHistory ? <FaChevronUp /> : <FaChevronDown />}
            </div>

            {expandedHistory && (
              <div className="space-y-3 mt-4 border-t pt-3">
                {[...invoice.changesHistory].reverse().map((change, index) => (
                  <div
                    key={index}
                    className="text-xs border-b pb-3 last:border-0"
                  >
                    <p className="font-medium text-gray-600">
                      {formatDate(change.changedAt)}
                    </p>
                    <p className="text-gray-500">
                      Користувач:{" "}
                      <span className="font-medium">
                        {change.changedBy?.name}
                      </span>
                    </p>
                    {renderChanges(change.changes)}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-between mt-6">
          <button
            onClick={() => navigate(-1)}
            className="px-5 py-2 btn-dark text-white font-medium rounded-lg transition no-print flex items-center gap-2"
          >
            <FaArrowLeft /> Назад
          </button>
          <div className="flex gap-2">
            {invoice.status === "активна" && (
              <button
                onClick={() =>
                  navigate(`/admin_panel/edit-invoice/${invoice._id}`)
                }
                className="px-5 py-2 font-medium bg-yellow-500 text-black rounded-lg hover:bg-yellow-600 transition no-print flex items-center gap-2"
              >
                <FaEdit /> Редагувати
              </button>
            )}
            <button
              onClick={() => window.print()}
              className="px-5 py-2 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition flex items-center gap-2"
            >
              <FaPrint /> Друк
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default InvoiceDetails;

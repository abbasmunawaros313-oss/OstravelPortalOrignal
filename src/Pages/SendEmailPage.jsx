import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { useParams, useNavigate } from "react-router-dom";
import { FaArrowLeft, FaFileCsv } from "react-icons/fa";
import toast from "react-hot-toast";

export default function SendEmailPage() {
  const { country } = useParams();
  const navigate = useNavigate();

  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("Dear {{name}},\n\n");
  const [recipients, setRecipients] = useState([]);
  const [fileData, setFileData] = useState(null); // ✅ New: File upload

  // For filtering/batching
  const [startIndex, setStartIndex] = useState(0);
  const [endIndex, setEndIndex] = useState(10);
  const [sendAll, setSendAll] = useState(false);

  // Load customers
  useEffect(() => {
    const collections = ["bookings", "ticketBookings", "ummrahBookings"];
    const unsubscribers = [];

    collections.forEach((colName) => {
      const q = collection(db, colName);
      const unsub = onSnapshot(q, (snap) => {
        const records = snap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        const filtered = records.filter((r) => {
          const c = r.country || r.passportCountry || r.nationality || "";
          return c.toLowerCase() === country.toLowerCase();
        });

        const normalized = filtered.map((r) => ({
          id: r.id,
          name: r.fullName || r.passenger?.fullName || "Unnamed",
          email: (r.email || "").trim(),
          phone: r.phone || r.contact || "",
        }));

        setRecipients((prev) => {
          const all = [...prev, ...normalized];
          const map = {};
          all.forEach((x) => {
            if (x.email) map[x.id + "_" + x.email] = x;
          });
          return Object.values(map);
        });
      });
      unsubscribers.push(unsub);
    });

    return () => unsubscribers.forEach((u) => u());
  }, [country]);

  // Filter recipients by range or all
  const filteredRecipients = sendAll
    ? recipients
    : recipients.slice(startIndex, endIndex);

  // Send Emails via backend
  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) {
      toast.error("Subject and body are required");
      return;
    }

    if (!filteredRecipients.length) {
      toast.error("No recipients selected");
      return;
    }

    try {
     const res = await fetch(
  "https://email-backend-production-2e52.up.railway.app/send-email",
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      subject,
      body,
      recipients: filteredRecipients,
      file: fileData,
    }),
  }
);



      const data = await res.json();

      if (data.success) {
        toast.success(
          `✅ Sent ${data.sent} emails successfully ${
            sendAll
              ? "(All)"
              : `(from ${startIndex + 1} to ${Math.min(
                  endIndex,
                  recipients.length
                )})`
          }`
        );
      } else {
        toast.error("❌ Failed to send emails");
      }
    } catch (err) {
      console.error(err);
      toast.error("⚠️ Error connecting to email server");
    }
  };

  const handleExportCSV = () => {
    if (!filteredRecipients.length) return;
    const rows = [
      ["Name", "Email", "Phone"],
      ...filteredRecipients.map((r) => [r.name, r.email, r.phone]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${country}_customers.csv`;
    link.click();
  };

  return (
    <div className="p-6 bg-gray-900 min-h-screen text-white">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center space-x-2 px-3 py-2 rounded bg-gray-700 hover:bg-gray-600"
        >
          <FaArrowLeft /> <span>Back</span>
        </button>
        <h1 className="text-2xl font-bold">
          Send Email to Customers in{" "}
          <span className="text-blue-400">{country}</span>
        </h1>
        <button
          onClick={handleExportCSV}
          className="flex items-center space-x-2 px-3 py-2 rounded bg-blue-600 hover:bg-blue-500"
        >
          <FaFileCsv /> <span>Export CSV</span>
        </button>
      </div>

      {/* Email Form */}
      <div className="bg-gray-800 p-6 rounded-lg shadow mb-6">
        <div className="mb-4">
          <label className="block text-gray-300 mb-1">Subject</label>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full p-2 rounded bg-gray-900 border border-gray-600 focus:outline-none focus:ring focus:ring-blue-500"
            placeholder="Subject"
          />
        </div>

        <div className="mb-4">
          <label className="block text-gray-300 mb-1">
            Body (use &#123;&#123;name&#125;&#125; to personalize)
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={6}
            className="w-full p-2 rounded bg-gray-900 border border-gray-600 focus:outline-none focus:ring focus:ring-blue-500"
          />
        </div>

        {/* ✅ File Upload */}
        <div className="mb-4">
          <label className="block text-gray-300 mb-1">
            Attach File (Image/PDF)
          </label>
     <input
  type="file"
  onChange={(e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result.split(",")[1]; // strip data URL header
      setFileData({
        name: file.name,
        type: file.type || "", // optional, backend has fallback
        content: base64,
      });
      console.log("File ready:", file.name, file.type, base64.length, "chars");
    };
    reader.readAsDataURL(file);
  }}
/>

        </div>

        <div className="flex space-x-3 mb-6">
          <button
            onClick={handleSend}
            className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded"
          >
            Send Emails
          </button>
          <button
            onClick={() => {
              setSubject("");
              setBody("Dear {{name}},\n\n");
              setFileData(null); // ✅ Clear uploaded file
            }}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded"
          >
            Clear
          </button>
        </div>

        {/* Filter Section */}
        <div className="bg-gray-700 p-4 rounded-lg flex items-center space-x-3">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={sendAll}
              onChange={() => setSendAll(!sendAll)}
            />
            <span>Send to All</span>
          </label>

          {!sendAll && (
            <>
              <label>From:</label>
              <input
                type="number"
                min={1}
                max={recipients.length}
                value={startIndex + 1}
                onChange={(e) => setStartIndex(Number(e.target.value) - 1)}
                className="w-20 p-2 rounded bg-gray-900 border border-gray-600"
              />
              <label>To:</label>
              <input
                type="number"
                min={1}
                max={recipients.length}
                value={endIndex}
                onChange={(e) => setEndIndex(Number(e.target.value))}
                className="w-20 p-2 rounded bg-gray-900 border border-gray-600"
              />
            </>
          )}

          <span className="text-gray-300">
            Showing{" "}
            {sendAll
              ? `All (${recipients.length})`
              : `${startIndex + 1} - ${Math.min(
                  endIndex,
                  recipients.length
                )} of ${recipients.length}`}
          </span>
        </div>
      </div>

      {/* Recipients Table */}
      <div className="bg-gray-800 p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">
          Customers ({filteredRecipients.length} of {recipients.length})
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border border-gray-700">
            <thead className="bg-gray-700">
              <tr>
                <th className="p-2 border border-gray-600">#</th>
                <th className="p-2 border border-gray-600">Name</th>
                <th className="p-2 border border-gray-600">Email</th>
                <th className="p-2 border border-gray-600">Phone</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecipients.map((r, i) => (
                <tr key={r.id} className="hover:bg-gray-700">
                  <td className="p-2 border border-gray-600">
                    {sendAll ? i + 1 : startIndex + i + 1}
                  </td>
                  <td className="p-2 border border-gray-600">{r.name}</td>
                  <td className="p-2 border border-gray-600">{r.email}</td>
                  <td className="p-2 border border-gray-600">{r.phone}</td>
                </tr>
              ))}
              {!filteredRecipients.length && (
                <tr>
                  <td colSpan="4" className="text-center p-4 text-gray-400">
                    No customers in this range
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

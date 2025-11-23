import React, { useState } from "react";
import { Head, router, usePage } from "@inertiajs/react";
import AppLayout from "@/layouts/app-layout";
import { type BreadcrumbItem } from "@/types";
import { FilePen, Search } from "lucide-react";

const breadcrumbs: BreadcrumbItem[] = [
  { title: "Whatsapp API", href: "/Whatsapp" },
];

type Whatsapp = {
  id: number;
  message: string;
  token: string;
  number_id: string;
};

type PageProps = {
  whatsapps: Whatsapp[];
};

export default function Index() {
  const { whatsapps } = usePage<PageProps>().props;
  const [selected, setSelected] = useState<Whatsapp | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ message: "", token: "", number_id: "" });

  const openModal = (whatsapp: Whatsapp) => {
    setSelected(whatsapp);
    setForm({ message: whatsapp.message, token: whatsapp.token, number_id: whatsapp.number_id });
    setShowModal(true);
  };

  const handleUpdate = () => {
    if (!selected) return;
    router.put(
      route("whatsapp.update", selected.id),
      form,
      {
        onSuccess: () => setShowModal(false),
      }
    );
  };

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Whatsapp API" />
      <div className="p-2 m-4">
        <h1 className="text-2xl font-bold mb-4">Setup Whatsapp API</h1>

        {/* ✅ Desktop Table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="min-w-full bg-white dark:bg-gray-800 rounded shadow text-sm">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-700 text-left">
                <th className="p-2">ID</th>
                <th className="p-2">Message</th>
                <th className="p-2">Token</th>
                <th className="p-2">Number ID</th>
                <th className="p-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {whatsapps.map((w) => (
                <tr key={w.id} className="border-b dark:hover:bg-gray-700 hover:bg-gray-50 transition">
                  <td className="p-2">{w.id}</td>
                  <td className="p-2 truncate max-w-xs">{w.message}</td>
                  <td className="p-2 truncate max-w-xs">{w.token}</td>
                  <td className="p-2">{w.number_id}</td>
                  <td className="p-2">
                    <button
                      onClick={() => openModal(w)}
                      className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center gap-1"
                    >
                      <FilePen size={16} /> Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ✅ Mobile Card Layout */}
        <div className="block lg:hidden space-y-4">
          {whatsapps.map((w) => (
            <div
              key={w.id}
              className="bg-white dark:bg-gray-900 rounded shadow p-4 border space-y-2"
            >
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">ID: {w.id}</span>
                <button
                  onClick={() => openModal(w)}
                  className="p-1 px-3 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 flex items-center gap-1"
                >
                  <FilePen size={14} /> Edit
                </button>
              </div>
              <p className="text-sm">
                <span className="font-semibold">Message:</span>{" "}
                <span className="text-gray-700">{w.message}</span>
              </p>
              <p className="text-sm truncate">
                <span className="font-semibold">Token:</span>{" "}
                <span className="text-gray-700">{w.token}</span>
              </p>
              <p className="text-sm">
                <span className="font-semibold">Number ID:</span>{" "}
                <span className="text-gray-700">{w.number_id}</span>
              </p>
            </div>
          ))}
        </div>

        {/* ✅ Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 flex items-center justify-center bg-gray-700/40 p-4 z-50">
            <div className="bg-white dark:bg-gray-800 p-6 rounded shadow w-full max-w-xl">
              <h2 className="text-xl font-bold mb-4">Edit Whatsapp API</h2>

              <div className="mb-4">
                <label className="block text-sm font-medium">Message</label>
                <textarea
                  value={form.message}
                  onChange={(e) =>
                    setForm({ ...form, message: e.target.value })
                  }
                  className="w-full border p-2 rounded dark:border-gray-100"
                ></textarea>
                <p className="text-gray-500/50 dark:text-gray-100 text-xs mt-1">
                  <i>
                    Write the message as usual, just replace the name with
                    <code>{` {$name} `}</code> and time with
                    <code>{` {$time} `}</code>.
                  </i>
                </p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium">Token</label>
                <textarea
                  value={form.token}
                  onChange={(e) =>
                    setForm({ ...form, token: e.target.value })
                  }
                  className="w-full border dark:border-gray-100 p-2 rounded"
                ></textarea>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium">Number ID</label>
                <input
                  type="text"
                  value={form.number_id}
                  onChange={(e) =>
                    setForm({ ...form, number_id: e.target.value })
                  }
                  className="w-full border p-2 dark:border-gray-100 rounded"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-gray-300 rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdate}
                  className="px-4 py-2 bg-blue-500 text-white rounded"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>

  );
}

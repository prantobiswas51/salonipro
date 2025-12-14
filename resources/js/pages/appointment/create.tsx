import React, { useEffect, useState } from "react";
import { Head, useForm, usePage, router } from "@inertiajs/react";
import AppLayout from "@/layouts/app-layout";
import { type BreadcrumbItem } from "@/types";
import axios from "axios";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { Dialog } from "@headlessui/react";
import { RefreshCcw } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: "New Appointment", href: "/appointment" },
];

export default function CreateAppointment() {
    const [events, setEvents] = useState<any[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<"existing" | "new">("new");
    
    const handleSync = () => {
        router.get(route("sync")); // or router.get(route("sync")) depending on your backend route
    };

    const page = usePage();
    const flash = page.props?.flash || {};

    // ---- FORM STATE ----
    const { data, setData, post, processing, errors, reset } = useForm({
        client_number: "",
        email: "",
        new_client_name: "",
        new_client_phone: "",
        service: "",
        start_time: "",
        duration: "",
        status: "Scheduled",
        notes: "",
    });

    const formatDateForInput = (date: Date) => {
        // "sv-SE" gives a sortable YYYY-MM-DD HH:mm:ss
        return date
            .toLocaleString("sv-SE", { timeZone: import.meta.env.VITE_TIMEZONE || "UTC" })
            .replace(" ", "T") // datetime-local expects T between date & time
            .slice(0, 16);     // trim seconds
    };

    // ---- When Slot is Selected ----
    const handleSelect = (info: any) => {
        setData("start_time", formatDateForInput(info.start));
        setIsOpen(true);
    };

    // ---- Submit Form ----
    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post("/appointment/store", {
            onSuccess: () => {
                alert("Appointment saved!");
                setIsOpen(false);
                reset();
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="New Appointment" />

            {/* Calendar Section */}
            <div className="p-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold mb-4">Calendar</h2>
                    <button
                        onClick={handleSync}
                        className="px-3 py-1 bg-blue-500 flex items-center text-white rounded hover:bg-blue-600"
                    >
                        <RefreshCcw className="mr-2 w-4" /> Sync
                    </button>
                </div>
                <FullCalendar
                    plugins={[timeGridPlugin, interactionPlugin]}
                    initialView="timeGridWeek"
                    selectable={true}
                    events={events}
                    select={handleSelect}
                    dateClick={(info) => {
                        // treat tap like a slot selection
                        setData("start_time", formatDateForInput(info.date));
                        setIsOpen(true);
                    }}
                    slotMinTime="09:00:00"
                    slotMaxTime="23:00:00"
                    height="auto"
                    slotLabelFormat={{
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false, // 👈 disable AM/PM
                    }}
                    eventTimeFormat={{
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false, // 👈 disable AM/PM
                    }}
                />
            </div>

            {/* Popup Modal with Form + Tabs */}
            <Dialog open={isOpen} onClose={() => setIsOpen(false)} className="relative z-50 ">
                <div className="fixed inset-0 flex items-center justify-center bg-black/50 ">
                    <div className="dark:bg-gray-900 p-6 rounded shadow w-full max-w-lg bg-gray-300">
                        <h3 className="text-lg font-bold mb-4">Book Appointment</h3>

                        {/* Tabs */}
                        <div className="flex space-x-4 mb-6">
                            <button
                                type="button"
                                onClick={() => {
                                    setActiveTab("new");
                                    setData({
                                        client_number: "",
                                        email: "",
                                        new_client_name: "",
                                        new_client_phone: "",
                                        service: "",
                                        duration: "",
                                        start_time: data.start_time,
                                        status: "Scheduled",
                                        notes: "",
                                    });
                                }}
                                className={`px-4 py-2 rounded ${activeTab === "new"
                                    ? "bg-pink-600 text-white"
                                    : "bg-gray-200 text-gray-700"
                                    }`}
                            >
                                New Client
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setActiveTab("existing");
                                    setData({
                                        client_number: "",
                                        email: "",
                                        new_client_name: "",
                                        new_client_phone: "",
                                        service: "",
                                        duration: "",
                                        start_time: data.start_time,
                                        status: "Scheduled",
                                        notes: "",
                                    });
                                }}
                                className={`px-4 py-2 rounded ${activeTab === "existing"
                                    ? "bg-pink-600 text-white"
                                    : "bg-gray-200 text-gray-700"
                                    }`}
                            >
                                Existing Client
                            </button>
                        </div>

                        {/* FORM */}
                        <form onSubmit={submit} className="space-y-4 ">
                            {activeTab === "existing" ? (
                                <div>
                                    <label className="block mb-1">Client Number</label>
                                    <input
                                        type="text" required
                                        placeholder="e.g. +1 848 648 8448"
                                        className="w-full border p-2 rounded"
                                        value={data.client_number}
                                        onChange={(e) => setData("client_number", e.target.value)}
                                    />
                                    {errors.client_number && (
                                        <p className="text-red-500">{errors.client_number}</p>
                                    )}
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block mb-1">Client Name</label>
                                        <input
                                            type="text" required
                                            className="w-full border p-2 rounded"
                                            placeholder="e.g. John"
                                            value={data.new_client_name}
                                            onChange={(e) => setData("new_client_name", e.target.value)}
                                        />
                                        {errors.new_client_name && (
                                            <p className="text-red-500">{errors.new_client_name}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block mb-1">Client Phone</label>
                                        <input
                                            type="tel" required
                                            className="w-full border p-2 rounded"
                                            placeholder="e.g. +2 485 485 744"
                                            value={data.new_client_phone}
                                            onChange={(e) => setData("new_client_phone", e.target.value)}
                                        />
                                        {errors.new_client_phone && (
                                            <p className="text-red-500">{errors.new_client_phone}</p>
                                        )}
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block mb-1">Email</label>
                                        <input
                                            type="email"
                                            className="w-full border p-2 rounded"
                                            placeholder="clientmail@domain.com"
                                            value={data.email}
                                            onChange={(e) => setData("email", e.target.value)}
                                        />
                                        {errors.email && <p className="text-red-500">{errors.email}</p>}
                                    </div>
                                </div>
                            )}

                            {/* Service */}
                            <div>
                                <label className="block mb-1">Service</label>
                                <select
                                    value={data.service}
                                    onChange={(e) => setData("service", e.target.value)}
                                    className="w-full border p-2 rounded dark:bg-gray-900"
                                >
                                    <option value="">Select</option>
                                    <option value="Hair Cut">Hair Cut</option>
                                    <option value="Beard Shaping">Beard Shaping</option>
                                    <option value="Other Services">Other Services</option>
                                </select>
                                {errors.service && <p className="text-red-500">{errors.service}</p>}
                            </div>

                            {/* Appointment Time */}
                            <div>
                                <label className="block mb-1">Appointment Time</label>
                                <input
                                    type="datetime-local"
                                    className="w-full border p-2 rounded"
                                    value={data.start_time}
                                    onChange={(e) => setData("start_time", e.target.value)}
                                />

                                {errors.start_time && (
                                    <p className="text-red-500">{errors.start_time}</p>
                                )}
                            </div>

                            {/* Duration */}
                            <div>
                                <label className="block mb-1">Duration</label>
                                <input
                                    type="number"
                                    className="w-full border p-2 rounded" placeholder="30"
                                    value={data.duration}
                                    onChange={(e) => setData("duration", e.target.value)}
                                />
                                {errors.duration && <p className="text-red-500">{errors.duration}</p>}
                            </div>

                            {/* Status */}
                            <div>
                                <label className="block mb-1">Status</label>
                                <select
                                    value={data.status}
                                    onChange={(e) => setData("status", e.target.value)}
                                    className="w-full border p-2 rounded dark:bg-gray-900"
                                >
                                    <option value="Scheduled">Scheduled</option>
                                    <option value="Confirmed">Confirmed</option>
                                    <option value="Canceled">Canceled</option>
                                </select>
                                {errors.status && <p className="text-red-500">{errors.status}</p>}
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="block mb-1">Notes</label>
                                <textarea
                                    className="w-full border p-2 rounded"
                                    value={data.notes}
                                    onChange={(e) => setData("notes", e.target.value)}
                                />
                            </div>

                            {/* Buttons */}
                            <div className="flex justify-end gap-2">
                                <button
                                    type="button"
                                    className="px-4 py-2 bg-gray-300 rounded hover:cursor-pointer dark:text-gray-900"
                                    onClick={() => setIsOpen(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="px-4 py-2 bg-pink-600 text-white rounded"
                                >
                                    Save Appointment
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </Dialog>
        </AppLayout>
    );
}

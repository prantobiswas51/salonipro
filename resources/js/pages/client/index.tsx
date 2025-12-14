import React, { useState } from 'react';
import { Head, usePage, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Search } from 'lucide-react';
import { type BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Appointments',
        href: '/appointments',
    },
];

type Appointment = {
    id: number;
    service: string;
    status: string;
    start_time: string;
    client_name: string;
    client_phone: string;
};

type Paginated<T> = {
    data: T[];
    links: {
        url: string | null;
        label: string;
        active: boolean;
    }[];
};

export default function Index() {
    const { appointments, filters = {} } = usePage<{
        appointments: Paginated<Appointment>;
        filters?: any;
    }>().props;

    const [search, setSearch] = useState(filters?.q ?? '');


    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            '/appointments',
            { q: search },
            { preserveState: true, replace: true }
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Appointments" />

            <div className="p-4">
                {/* Search Bar */}
                <form
                    onSubmit={handleSearch}
                    className="flex items-center gap-2 mb-4"
                >
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search appointments..."
                        className="border border-gray-300 rounded-lg p-2 w-full focus:outline-none focus:ring focus:ring-indigo-200"
                    />
                    <button
                        type="submit"
                        className="bg-indigo-600 text-white p-2 rounded-lg flex items-center gap-1 hover:bg-indigo-700"
                    >
                        <Search size={16} />
                        Search
                    </button>
                </form>

                {/* Table */}
                <div className="overflow-x-auto border rounded-lg">
                    <table className="min-w-full text-sm text-left">
                        <thead className="bg-gray-100 text-gray-600 uppercase">
                            <tr>
                                <th className="px-4 py-2">Service</th>
                                <th className="px-4 py-2">Client Name</th>
                                <th className="px-4 py-2">Client Phone</th>
                                <th className="px-4 py-2">Status</th>
                                <th className="px-4 py-2">Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {appointments.data.length ? (
                                appointments.data.map((a) => (
                                    <tr
                                        key={a.id}
                                        className="border-t dark:hover:bg-gray-700 hover:bg-gray-50 transition"
                                    >
                                        <td className="px-4 py-2">{a.service}</td>
                                        <td className="px-4 py-2">{a.client_name}</td>
                                        <td className="px-4 py-2">{a.client_phone}</td>
                                        <td className="px-4 py-2">{a.status}</td>
                                        <td className="px-4 py-2">
                                            {new Date(a.start_time).toLocaleString("sv-SE", { timeZone: import.meta.env.VITE_TIMEZONE || "UTC" })}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="text-center py-4 text-gray-500">
                                        No appointments found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </AppLayout>
    );
}

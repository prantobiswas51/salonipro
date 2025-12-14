import React, { useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { FilePen, Search, Trash, TimerReset, X, Filter } from 'lucide-react';


const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Appointment', href: '/appointment' },
];



type Appointment = {
  id: number;
  client_name: string;
  client_phone: string;
  service: string;
  duration: string;
  event_id: string;
  attendence_status: string;
  start_time: string;
  status: string;
  notes: string;
  reminder_sent: string;
};

type FlashProps = {
  success?: string;
  error?: string;
};

type Filters = {
  q?: string;
  date_from?: string;
  date_to?: string;
  status?: string;
  service?: string;
  attendance_status?: string;
};

type PageProps = {
  flash: FlashProps;
  appointments: any; // adjust type as needed
  filters: Filters;
};

type Paginated<T> = {
  data: T[];
  links: { url: string | null; label: string; active: boolean }[];
};

export default function Index() {
  const { appointments, filters, flash } = usePage<{
    appointments: Paginated<Appointment>;
    filters: Filters;
    flash: FlashProps;
  }>().props;

  // edit modal state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editing, setEditing] = useState<Appointment | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [reminderId, setReminderId] = useState<number | null>(null);

  // Filter state
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [searchFilters, setSearchFilters] = useState<Filters>({
    q: filters.q || '',
    date_from: filters.date_from || '',
    date_to: filters.date_to || '',
    status: filters.status || '',
    service: filters.service || '',
    attendance_status: filters.attendance_status || '',
  });


  // Search functionality
  const handleSearch = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    router.get('/appointments', searchFilters, {
      preserveState: true,
      preserveScroll: true,
    });
  };

  const clearFilters = (): void => {
    const clearedFilters = {
      q: '',
      date_from: '',
      date_to: '',
      status: '',
      service: '',
      attendance_status: '',
    };
    setSearchFilters(clearedFilters);
    router.get('/appointments', {}, {
      preserveState: true,
      preserveScroll: true,
    });
  };

  const updateFilter = (key: keyof Filters, value: string): void => {
    setSearchFilters(prev => ({ ...prev, [key]: value }));
  };

  const openEdit = (appt: Appointment): void => {
    // shallow copy so we can edit fields
    setEditing({ ...appt });
    setIsModalOpen(true);
  };

  const sendReminder = (id: number): void => {
    if (!window.confirm('Send Reminder?')) return;

    setReminderId(id);

    router.post(
      `/whatsapp/manual/${id}`,
      { id }, // no form data to send, so just an empty object
      {
        preserveScroll: true,
        onFinish: () => setReminderId(null),
        onError: (errors) => {
          console.error(errors);
          window.alert('Failed to send reminder.');
        },
        onSuccess: (page) => {
        },
      }
    );
  };


  const closeEdit = (): void => {
    setIsModalOpen(false);
    setEditing(null);
  };

  // ✅ Use Inertia for deletion and refresh only the `appointments` prop
  const deleteAppointment = (id: number): void => {
    if (!window.confirm('Are you sure you want to delete this appointment?')) return;

    setDeletingId(id);

    // If you have Ziggy: route('appointments.destroy', id)
    router.delete(`/appointment/delete/${id}`, {
      preserveScroll: true,
      onFinish: () => setDeletingId(null),
      onError: (errors) => {
        // eslint-disable-next-line no-console
        console.error(errors);
        window.alert('Failed to delete appointment.');
      },
      onSuccess: () => {
        // Reload just the appointments prop (works across Inertia versions)
        router.visit(window.location.href, { only: ['appointments'], preserveScroll: true });
      },
    });
  };

  const handleUpdate = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    if (!editing) return;

    setSubmitting(true);

    // if you have Ziggy's route() available, swap the url to: route('appointment.update', editing.id)
    const url = `/appointments/${editing.id}`;

    router.put(
      url,
      {
        service: editing.service,
        client_name: editing.client_name,
        client_phone: editing.client_phone,
        duration: editing.duration,
        status: editing.status,
        start_time: editing.start_time,
        event_id: editing.event_id,
        notes: editing.notes,
      },
      {
        preserveScroll: true,
        preserveState: true,
        onFinish: () => setSubmitting(false),
        onSuccess: closeEdit,
        onError: (errors) => {
          // eslint-disable-next-line no-console
          console.error(errors);
        },
      }
    );
  };

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Appointment" />

      <div>
        {flash.success && (
          <div className="mb-4 rounded bg-green-100 text-green-700 p-3">
            {flash.success}
          </div>
        )}
        {flash.error && (
          <div className="mb-4 rounded bg-red-100 text-red-700 p-3">
            {flash.error}
          </div>
        )}

        {/* your appointments table */}
      </div>

      <div className="p-2 m-4">
        <h1 className="text-2xl font-bold mb-4">Scheduled Appointments</h1>

        {/* Search and Filter Section */}
        <div className="mb-6 space-y-4">
          {/* Main Search Form */}
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              placeholder="Search by name, phone, email, service..."
              className="border p-3 px-4 flex-1 rounded-lg"
              value={searchFilters.q}
              onChange={(e) => updateFilter('q', e.target.value)}
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className="border flex justify-center items-center rounded-lg p-3 bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 transition-colors"
              >
                <Filter className="mr-1" size={16} />
                <span>Filters</span>
              </button>
              <button
                type="submit"
                className="border flex justify-center items-center rounded-lg p-3 bg-pink-600 text-white hover:bg-pink-700 transition-colors"
              >
                <Search className="mr-1" size={16} />
                <span>Search</span>
              </button>
            </div>
          </form>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Date From
                  </label>
                  <input
                    type="date"
                    className="w-full border p-2 rounded-lg"
                    value={searchFilters.date_from}
                    onChange={(e) => updateFilter('date_from', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Date To
                  </label>
                  <input
                    type="date"
                    className="w-full border p-2 rounded-lg"
                    value={searchFilters.date_to}
                    onChange={(e) => updateFilter('date_to', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Status
                  </label>
                  <select
                    className="w-full border p-2 rounded-lg"
                    value={searchFilters.status}
                    onChange={(e) => updateFilter('status', e.target.value)}
                  >
                    <option value="">All Statuses</option>
                    <option value="Scheduled">Scheduled</option>
                    <option value="Confirmed">Confirmed</option>
                    <option value="Canceled">Canceled</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Service
                  </label>
                  <select
                    className="w-full border p-2 rounded-lg"
                    value={searchFilters.service}
                    onChange={(e) => updateFilter('service', e.target.value)}
                  >
                    <option value="">All Services</option>
                    <option value="Hair Cut">Hair Cut</option>
                    <option value="Beard Shaping">Beard Shaping</option>
                    <option value="Other Services">Other Services</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Attendance
                  </label>
                  <select
                    className="w-full border p-2 rounded-lg"
                    value={searchFilters.attendance_status}
                    onChange={(e) => updateFilter('attendance_status', e.target.value)}
                  >
                    <option value="">All Attendance</option>
                    <option value="attended">Attended</option>
                    <option value="canceled">Canceled</option>
                    <option value="no_show">No Show</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="w-full flex justify-center items-center rounded-lg p-2 bg-red-100 hover:bg-red-200 text-red-700 transition-colors"
                  >
                    <X className="mr-1" size={16} />
                    <span>Clear Filters</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Active Filters Display */}
          {(filters.q || filters.date_from || filters.date_to || filters.status || filters.service || filters.attendance_status) && (
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Active filters:</span>
              {filters.q && (
                <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                  Search: "{filters.q}"
                  <button
                    type="button"
                    onClick={() => updateFilter('q', '')}
                    className="ml-1 text-blue-600 hover:text-blue-800"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}
              {filters.date_from && (
                <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                  From: {filters.date_from}
                  <button
                    type="button"
                    onClick={() => updateFilter('date_from', '')}
                    className="ml-1 text-green-600 hover:text-green-800"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}
              {filters.date_to && (
                <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                  To: {filters.date_to}
                  <button
                    type="button"
                    onClick={() => updateFilter('date_to', '')}
                    className="ml-1 text-green-600 hover:text-green-800"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}
              {filters.status && (
                <span className="inline-flex items-center px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                  Status: {filters.status}
                  <button
                    type="button"
                    onClick={() => updateFilter('status', '')}
                    className="ml-1 text-purple-600 hover:text-purple-800"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}
              {filters.service && (
                <span className="inline-flex items-center px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                  Service: {filters.service}
                  <button
                    type="button"
                    onClick={() => updateFilter('service', '')}
                    className="ml-1 text-yellow-600 hover:text-yellow-800"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}
              {filters.attendance_status && (
                <span className="inline-flex items-center px-2 py-1 bg-indigo-100 text-indigo-800 text-xs rounded-full">
                  Attendance: {filters.attendance_status}
                  <button
                    type="button"
                    onClick={() => updateFilter('attendance_status', '')}
                    className="ml-1 text-indigo-600 hover:text-indigo-800"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}
            </div>
          )}
        </div>

        {/* responsive table */}
        <div className="overflow-x-auto">
          <table className="hidden lg:table min-w-full border-gray-300 rounded-lg shadow-lg text-sm text-left">
            <thead className="text-gray-900 uppercase bg-pink-300">
              <tr>
                <th className="px-3 lg:px-6 py-3 border-b">Id</th>
                <th className="px-3 lg:px-6 py-3 border-b">Name</th>
                <th className="px-3 lg:px-6 py-3 border-b">Phone</th>
                <th className="px-3 lg:px-6 py-3 border-b">Service</th>
                <th className="px-3 lg:px-6 py-3 border-b">Time</th>
                <th className="px-3 lg:px-6 py-3 border-b">Duration</th>
                <th className="px-3 lg:px-6 py-3 border-b">Status</th>
                <th className="px-3 lg:px-6 py-3 border-b">Reminder</th>
                <th className="px-3 lg:px-6 py-3 border-b">Actions</th>
              </tr>
            </thead>
            <tbody>
              {appointments.data.map((appointment) => (
                <tr key={appointment.id} className="hover:dark:bg-gray-900 hover:bg-gray-200 transition">
                  <td className="px-3 lg:px-6 py-4 border-b">{appointment.id}</td>
                  <td className="px-3 lg:px-6 py-4 border-b">{appointment.client_name}</td>
                  <td className="px-3 lg:px-6 py-4 border-b">{appointment.client_phone}</td>
                  <td className="px-3 lg:px-6 py-4 border-b">{appointment.service}</td>
                  <td className="px-3 lg:px-6 py-4 border-b">{new Date(appointment.start_time).toLocaleString("sv-SE", { timeZone: import.meta.env.VITE_TIMEZONE || "UTC" })}</td>
                  <td className="px-3 lg:px-6 py-4 border-b">{appointment.duration} Minutes</td>
                  <td className="px-3 lg:px-6 py-4 border-b">{appointment.status}</td>
                  <td className="px-3 lg:px-6 py-4 border-b">{appointment.reminder_sent}</td>
                  <td className="px-3 lg:px-6 py-4 border-b flex items-center">

                    <button
                      type="button"
                      className={`ml-3 ${reminderId === appointment.id
                        ? 'opacity-50 cursor-not-allowed'
                        : 'hover:cursor-pointer'
                        }`}
                      onClick={() => sendReminder(appointment.id)}
                      disabled={reminderId === appointment.id}
                    >
                      <TimerReset
                        className="text-amber-500 hover:text-amber-600 hover:cursor-pointer"
                      />
                    </button>

                    <FilePen
                      className="text-amber-500 hover:text-amber-600 ml-2 hover:cursor-pointer"
                      onClick={() => openEdit(appointment)}
                    />

                    <button
                      type="button"
                      className={`ml-3 ${deletingId === appointment.id
                        ? 'opacity-50 cursor-not-allowed'
                        : 'hover:cursor-pointer'
                        }`}
                      onClick={() => deleteAppointment(appointment.id)}
                      disabled={deletingId === appointment.id}
                    >
                      <Trash className="text-red-500 hover:text-red-600" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Mobile Card View */}
          <div className="space-y-4 lg:hidden">
            {appointments.data.map((appointment) => (
              <div
                key={appointment.id}
                className="bg-white dark:bg-gray-800 border rounded-lg p-4 shadow-sm"
              >
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600 text-sm">ID</span>
                  <span className="font-medium">{appointment.id}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600 text-sm">Name</span>
                  <span>{appointment.client_name}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600 text-sm">Phone</span>
                  <span>{appointment.client_phone}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600 text-sm">Service</span>
                  <span>{appointment.service}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600 text-sm">Time</span>
                  <span>{appointment.start_time}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600 text-sm">Status</span>
                  <span>{appointment.status}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600 text-sm">Reminder</span>
                  <span>{appointment.reminder_sent}</span>
                </div>

                <div className="flex justify-end mt-3">

                  <button
                    type="button"
                    className={`ml-3 ${reminderId === appointment.id
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:cursor-pointer'
                      }`}
                    onClick={() => sendReminder(appointment.id)}
                    disabled={reminderId === appointment.id}
                  >
                    <TimerReset
                      className="text-amber-500 hover:text-amber-600 hover:cursor-pointer"
                    />
                  </button>
                  <FilePen
                    className="text-amber-500 hover:text-amber-600 ml-2 hover:cursor-pointer mr-3"
                    onClick={() => openEdit(appointment)}
                  />
                  <button
                    type="button"
                    className={`${deletingId === appointment.id
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:cursor-pointer'
                      }`}
                    onClick={() => deleteAppointment(appointment.id)}
                    disabled={deletingId === appointment.id}
                  >
                    <Trash className="text-red-500 hover:text-red-600" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* pagination */}
        <div className="flex flex-wrap justify-center mt-6 space-x-2">
          {appointments.links.map((link, index) => (
            <button
              key={index}
              disabled={!link.url}
              dangerouslySetInnerHTML={{ __html: link.label }}
              onClick={() => link.url && router.visit(link.url)}
              className={`px-3 py-1 border rounded mb-2
            ${link.active ? "bg-pink-600 text-white" : "bg-white text-pink-600"}
            ${!link.url
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:cursor-pointer"
                }`}
            />
          ))}
        </div>

        {/* edit modal */}
        {isModalOpen && editing && (
          <div className="fixed inset-0 z-[9999] bg-gray-700/20 flex justify-center items-center p-4">
            <div className="bg-sky-100 dark:bg-gray-800 dark:border-gray-100 w-full max-w-[95%] sm:max-w-[30rem] rounded-lg shadow-lg 
                  max-h-[90vh] overflow-y-auto p-6">
              <h2 className="text-xl font-bold mb-4">Edit Appointment</h2>

              <form onSubmit={handleUpdate}>

                <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="font-medium">Client Name</div>

                    <div className="mt-1">
                      <input
                        type="text" // should be text, not number
                        className="border p-2 rounded-lg w-full dark:border-gray-300"
                        required
                        value={editing.client_name || ""}
                        onChange={(e) =>
                          setEditing({ ...editing, client_name: e.target.value })
                        }
                      />
                    </div>

                  </div>
                  <div>
                    <div className="font-medium">Phone</div>
                    <div className="mt-1">
                      <input
                        type="text" // should be text, not number
                        required
                        className="border p-2 rounded-lg w-full dark:border-gray-300"
                        value={editing.client_phone || ""}
                        onChange={(e) =>
                          setEditing({ ...editing, client_phone: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div className="mb-4">
                    <label className="block mb-2">Service</label>
                    <input
                      type="text"
                      className="border p-2 rounded-lg w-full dark:border-gray-300"
                      value={editing.service}
                      onChange={(e) =>
                        setEditing({ ...editing, service: e.target.value })
                      }
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block mb-2">Duration</label>
                    <input
                      type="number"
                      className="border p-2 rounded-lg w-full dark:border-gray-300"
                      value={editing.duration}
                      onChange={(e) =>
                        setEditing({ ...editing, duration: e.target.value })
                      }
                    />
                  </div>
                </div>

                {/* hidden event id */}
                <input
                  type="hidden"
                  className="border p-2 rounded-lg w-full dark:border-gray-300"
                  value={editing.event_id}
                  onChange={(e) =>
                    setEditing({ ...editing, event_id: e.target.value })
                  }
                />


                {/* editing */}
                <div className="mb-4">
                  <label className="block mb-2">Appointment Start Time</label>
                  <input
                    type="datetime-local"
                    className="border p-2 rounded-lg w-full dark:border-gray-300"
                    value={
                      editing.start_time
                        ? new Date(editing.start_time)
                          .toLocaleString("sv-SE", { timeZone: import.meta.env.VITE_TIMEZONE || "UTC" })
                          .slice(0, 16) // "YYYY-MM-DDTHH:mm"
                        : ""
                    }
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        start_time: e.target.value,
                      })
                    }
                  />

                </div>

                <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div className="mb-4">
                    <label className="block mb-2">Status</label>
                    <select
                      className="border p-2 rounded-lg w-full dark:border-gray-300"
                      value={editing.status}
                      onChange={(e) =>
                        setEditing({ ...editing, status: e.target.value })
                      }
                    >
                      <option value="Confirmed">Confirmed</option>
                      <option value="Canceled">Canceled</option>
                      <option value="Scheduled">Scheduled</option>
                    </select>
                  </div>

                  <div className="mb-4">
                    <label className="block mb-2">Attendance Status</label>
                    <select
                      className="border p-2 rounded-lg w-full dark:border-gray-300"
                      value={editing.attendence_status}
                      onChange={(e) =>
                        setEditing({ ...editing, attendence_status: e.target.value })
                      }
                    >
                      <option value="Green">Green</option>
                      <option value="Red">Red</option>
                      <option value="Yellow">Yellow</option>
                    </select>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block mb-2">Notes</label>
                  <textarea
                    className="border p-2 rounded-lg w-full dark:border-gray-300"
                    value={editing.notes ?? ""}
                    onChange={(e) =>
                      setEditing({ ...editing, notes: e.target.value })
                    }
                  />
                </div>

                <div className="flex justify-end flex-wrap">
                  <button
                    type="button"
                    className="mr-2 mb-2 border px-4 py-2 rounded-lg text-gray-600 hover:cursor-pointer"
                    onClick={closeEdit}
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg disabled:opacity-60 hover:cursor-pointer"
                    disabled={submitting}
                  >
                    {submitting ? "Saving…" : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppLayout>

  );
}

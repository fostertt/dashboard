"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import Header from "@/components/Header";

interface SubItem {
  id?: number;
  name: string;
  dueDate?: string;
  isCompleted?: boolean;
  completions?: Array<{ completionDate: string }>;
}

interface Item {
  id: number;
  itemType: "habit" | "task" | "reminder";
  name: string;
  description?: string;
  scheduleType?: string;
  scheduleDays?: string;
  scheduledTime?: string;
  dueDate?: string;
  dueTime?: string;
  isCompleted?: boolean;
  completedAt?: string;
  isParent: boolean;
  parentItemId?: number;
  priority?: string;
  effort?: string;
  duration?: string;
  focus?: string;
  subItems?: SubItem[];
  completions?: Array<{ completionDate: string }>;
}

interface Toast {
  id: number;
  message: string;
  type: "success" | "error" | "info";
}

type ItemType = "habit" | "task" | "reminder";

export default function Home() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Parse date from URL or use today
  const getSelectedDate = () => {
    const dateParam = searchParams.get("date");
    if (dateParam) {
      const [year, month, day] = dateParam.split("-").map(Number);
      return new Date(year, month - 1, day);
    }
    return new Date();
  };

  const [selectedDate, setSelectedDate] = useState<Date>(getSelectedDate);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completedToday, setCompletedToday] = useState<Set<number>>(new Set());
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [selectedItemType, setSelectedItemType] = useState<ItemType>("habit");
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [savingItem, setSavingItem] = useState(false);
  const [deletingItem, setDeletingItem] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [filterTypes, setFilterTypes] = useState<Set<ItemType>>(
    new Set(["habit", "task", "reminder"])
  );
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  // Form fields
  const [formName, setFormName] = useState("");
  const [formTime, setFormTime] = useState("");
  const [formDay, setFormDay] = useState("");
  const [formRecurring, setFormRecurring] = useState(false);
  const [formPriority, setFormPriority] = useState("");
  const [formEffort, setFormEffort] = useState("");
  const [formDuration, setFormDuration] = useState("");
  const [formFocus, setFormFocus] = useState("");
  const [formSubItems, setFormSubItems] = useState<SubItem[]>([]);

  // Track expanded items for sub-item display
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

  // Date navigation functions
  const navigateToDate = (date: Date) => {
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    router.push(`/?date=${dateStr}`);
    setSelectedDate(date);
  };

  const goToPreviousDay = () => {
    const prevDay = new Date(selectedDate);
    prevDay.setDate(prevDay.getDate() - 1);
    navigateToDate(prevDay);
  };

  const goToNextDay = () => {
    const nextDay = new Date(selectedDate);
    nextDay.setDate(nextDay.getDate() + 1);
    navigateToDate(nextDay);
  };

  const goToToday = () => {
    const today = new Date();
    navigateToDate(today);
  };

  const isToday = () => {
    const today = new Date();
    return selectedDate.toDateString() === today.toDateString();
  };

  const formatSelectedDate = () => {
    return selectedDate.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const showToast = (message: string, type: Toast["type"] = "success") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 3000);
  };

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  // Update selectedDate when URL changes
  useEffect(() => {
    const newDate = getSelectedDate();
    if (newDate.toDateString() !== selectedDate.toDateString()) {
      setSelectedDate(newDate);
    }
  }, [searchParams]);

  const loadData = async () => {
    try {
      setError(null);

      // Fetch all items
      const itemsRes = await fetch("/api/items");
      if (!itemsRes.ok) {
        throw new Error("Failed to load items");
      }
      const itemsData = await itemsRes.json();
      setItems(Array.isArray(itemsData) ? itemsData : []);

      // Fetch completions for selected date
      const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`;
      const completionsRes = await fetch(`/api/completions?date=${dateStr}`);
      if (!completionsRes.ok) {
        throw new Error("Failed to load completions");
      }
      const completionsData = await completionsRes.json();

      if (completionsData.completedHabitIds) {
        setCompletedToday(new Set(completionsData.completedHabitIds));
      }

      setLoading(false);
    } catch (err) {
      console.error("Error loading data:", err);
      setError(err instanceof Error ? err.message : "Failed to load data");
      setLoading(false);
    }
  };

  const toggleItem = async (itemId: number) => {
    try {
      const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`;
      const response = await fetch(`/api/items/${itemId}/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: dateStr }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.error && errorData.incompleteCount) {
          showToast(
            `Complete all ${errorData.incompleteCount} sub-items first`,
            "error"
          );
          return;
        }
        throw new Error("Failed to toggle item");
      }

      const data = await response.json();

      // Update local state for recurring items (habits)
      if (data.completed) {
        setCompletedToday((prev) => new Set(prev).add(itemId));
      } else {
        setCompletedToday((prev) => {
          const newSet = new Set(prev);
          newSet.delete(itemId);
          return newSet;
        });
      }

      // Reload items to get updated isCompleted field for non-recurring items
      await loadData();
    } catch (error) {
      console.error("Error toggling item:", error);
      showToast("Failed to toggle item", "error");
    }
  };

  const openCreateModal = (type: ItemType) => {
    setSelectedItemType(type);
    setModalMode("create");
    setFormName("");
    setFormTime("");
    setFormDay("");
    setFormRecurring(false);
    setFormPriority("");
    setFormEffort("");
    setFormDuration("");
    setFormFocus("");
    setFormSubItems([]);
    setShowAddMenu(false);
    setShowModal(true);
  };

  const openEditModal = (item: Item) => {
    setEditingItem(item);
    setModalMode("edit");
    setSelectedItemType(item.itemType);
    setFormName(item.name);

    // Set time based on item type
    if (item.itemType === "habit") {
      setFormTime(item.scheduledTime ? item.scheduledTime.substring(0, 5) : "");
    } else {
      setFormTime(item.dueTime ? item.dueTime.substring(0, 5) : "");
    }

    // Set day for tasks
    setFormDay(item.dueDate ? item.dueDate.split("T")[0] : "");

    // Set recurring if scheduleType is daily
    setFormRecurring(item.scheduleType === "daily");

    // Set metadata fields
    setFormPriority(item.priority || "");
    setFormEffort(item.effort || "");
    setFormDuration(item.duration || "");
    setFormFocus(item.focus || "");

    // Load sub-items
    setFormSubItems(
      item.subItems?.map((si) => ({
        id: si.id,
        name: si.name,
        dueDate: si.dueDate ? si.dueDate.split("T")[0] : undefined,
      })) || []
    );

    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingItem(null);
    setShowDeleteConfirm(false);
  };

  const createItem = async () => {
    if (!formName.trim()) return;

    setSavingItem(true);
    setError(null);

    try {
      const itemData: any = {
        itemType: selectedItemType,
        name: formName,
        priority: formPriority || null,
        effort: formEffort || null,
        duration: formDuration || null,
        focus: formFocus || null,
        subItems: formSubItems.filter((si) => si.name.trim()),
      };

      // Set time and date based on item type
      if (selectedItemType === "habit") {
        if (formTime) itemData.scheduledTime = formTime;
        // Habits are always daily recurring by default
        itemData.scheduleType = "daily";
      } else if (selectedItemType === "task") {
        if (formTime) itemData.dueTime = formTime;
        if (formDay) itemData.dueDate = formDay;
        if (formRecurring) itemData.scheduleType = "daily";
      } else if (selectedItemType === "reminder") {
        if (formTime) itemData.dueTime = formTime;
        if (formDay) itemData.dueDate = formDay;
        if (formRecurring) itemData.scheduleType = "daily";
      }

      const response = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(itemData),
      });

      if (!response.ok) {
        throw new Error("Failed to create item");
      }

      await loadData();
      closeModal();
      showToast(`${selectedItemType.charAt(0).toUpperCase() + selectedItemType.slice(1)} created successfully!`, "success");
    } catch (error) {
      console.error("Error creating item:", error);
      const message = error instanceof Error ? error.message : "Failed to create item";
      setError(message);
      showToast(message, "error");
    } finally {
      setSavingItem(false);
    }
  };

  const updateItem = async () => {
    if (!editingItem || !formName.trim()) return;

    setSavingItem(true);
    setError(null);

    try {
      const itemData: any = {
        name: formName,
        priority: formPriority || null,
        effort: formEffort || null,
        duration: formDuration || null,
        focus: formFocus || null,
        subItems: formSubItems.filter((si) => si.name.trim()),
      };

      // Set time and date based on item type
      if (editingItem.itemType === "habit") {
        if (formTime) itemData.scheduledTime = formTime;
        itemData.scheduleType = formRecurring ? "daily" : null;
      } else if (editingItem.itemType === "task") {
        if (formTime) itemData.dueTime = formTime;
        if (formDay) itemData.dueDate = formDay;
        itemData.scheduleType = formRecurring ? "daily" : null;
      } else if (editingItem.itemType === "reminder") {
        if (formTime) itemData.dueTime = formTime;
        if (formDay) itemData.dueDate = formDay;
        itemData.scheduleType = formRecurring ? "daily" : null;
      }

      const response = await fetch(`/api/items/${editingItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(itemData),
      });

      if (!response.ok) {
        throw new Error("Failed to update item");
      }

      await loadData();
      closeModal();
      showToast("Item updated successfully!", "success");
    } catch (error) {
      console.error("Error updating item:", error);
      const message = error instanceof Error ? error.message : "Failed to update item";
      setError(message);
      showToast(message, "error");
    } finally {
      setSavingItem(false);
    }
  };

  const deleteItem = async () => {
    if (!editingItem) return;

    setDeletingItem(true);
    setError(null);

    try {
      const response = await fetch(`/api/items/${editingItem.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete item");
      }

      await loadData();
      closeModal();
      showToast("Item deleted successfully!", "success");
    } catch (error) {
      console.error("Error deleting item:", error);
      const message = error instanceof Error ? error.message : "Failed to delete item";
      setError(message);
      showToast(message, "error");
    } finally {
      setDeletingItem(false);
    }
  };

  const isScheduledForDate = (item: Item) => {
    const dayOfWeek = selectedDate.getDay();
    const dayForSchedule = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

    if (item.itemType === "habit") {
      if (item.scheduleType === "daily") return true;
      if (item.scheduleType === "weekly" && item.scheduleDays) {
        const scheduledDays = item.scheduleDays.split(",").map((d) => parseInt(d.trim()));
        return scheduledDays.includes(dayForSchedule);
      }
    }

    // Tasks and reminders without a due date appear on today only
    if (item.itemType === "task" || item.itemType === "reminder") {
      if (!item.dueDate) {
        // Show only on actual today
        const today = new Date();
        return selectedDate.toDateString() === today.toDateString();
      }
      // Parse the date string without timezone conversion to avoid off-by-one errors
      // The dueDate comes as ISO string like "2025-11-16T00:00:00.000Z" or date string "2025-11-16"
      const dueDateStr = typeof item.dueDate === 'string' ? item.dueDate : item.dueDate.toISOString();
      const datePart = dueDateStr.split('T')[0]; // Extract "2025-11-16"
      const [year, month, day] = datePart.split('-').map(Number);
      const dueDate = new Date(year, month - 1, day); // Create local date without timezone shift
      return dueDate.toDateString() === selectedDate.toDateString();
    }

    return false;
  };

  const getItemTime = (item: Item): string | null => {
    if (item.itemType === "habit") {
      return item.scheduledTime || null;
    }
    return item.dueTime || null;
  };

  const sortItemsChronologically = (items: Item[]) => {
    return items.sort((a, b) => {
      const timeA = getItemTime(a);
      const timeB = getItemTime(b);

      // Items without time come first
      if (!timeA && !timeB) return 0;
      if (!timeA) return -1;
      if (!timeB) return 1;

      // Compare times
      return timeA.localeCompare(timeB);
    });
  };

  const toggleFilter = (type: ItemType) => {
    setFilterTypes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(type)) {
        newSet.delete(type);
      } else {
        newSet.add(type);
      }
      return newSet;
    });
  };

  const todayItems = items.filter(isScheduledForDate);
  const filteredItems = todayItems.filter((item) => filterTypes.has(item.itemType));
  const sortedItems = sortItemsChronologically(filteredItems);

  const getItemTypeLabel = (type: ItemType) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  const getItemTypeIcon = (type: ItemType) => {
    switch (type) {
      case "habit":
        return "🎯";
      case "task":
        return "✅";
      case "reminder":
        return "🔔";
    }
  };

  const getItemTypeColor = (type: ItemType) => {
    switch (type) {
      case "habit":
        return "bg-purple-100 text-purple-700";
      case "task":
        return "bg-blue-100 text-blue-700";
      case "reminder":
        return "bg-yellow-100 text-yellow-700";
    }
  };

  const toggleExpanded = (itemId: number) => {
    setExpandedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const isSubItemCompletedForDate = (subItem: SubItem, date: Date) => {
    if (!subItem.completions) return false;
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    return subItem.completions.some((c) => c.completionDate.startsWith(dateStr));
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
        <div className="max-w-5xl mx-auto p-8">
          <Header />

          {error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-6 flex items-start gap-3">
              <svg
                className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div className="flex-1">
                <h3 className="font-semibold text-red-900">Error</h3>
                <p className="text-red-700 text-sm">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-red-600 hover:text-red-800"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          )}

          {/* Date Navigation */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <button
                onClick={goToPreviousDay}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Previous Day
              </button>

              <div className="text-center">
                <h2 className="text-xl font-bold text-gray-800">{formatSelectedDate()}</h2>
                {!isToday() && (
                  <button
                    onClick={goToToday}
                    className="mt-2 px-3 py-1 bg-purple-600 text-white rounded-full text-sm font-medium hover:bg-purple-700 transition-colors"
                  >
                    Back to Today
                  </button>
                )}
              </div>

              <button
                onClick={goToNextDay}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium flex items-center gap-2"
              >
                Next Day
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Items Section */}
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
            <div className="flex items-center gap-3 mb-6 flex-wrap">
              <span className="text-3xl">📋</span>
              <h2 className="text-2xl font-bold text-gray-800">{isToday() ? "Today" : "Items"}</h2>
              <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-semibold">
                {sortedItems.length} items
              </span>
              <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-semibold">
                {completedToday.size} completed
              </span>

              {/* Filter Dropdown */}
              <div className="ml-auto relative">
                <button
                  onClick={() => setShowFilterMenu(!showFilterMenu)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors font-semibold flex items-center gap-2"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                    />
                  </svg>
                  Filter
                </button>

                {showFilterMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-10">
                    {(["habit", "task", "reminder"] as ItemType[]).map((type) => (
                      <button
                        key={type}
                        onClick={() => toggleFilter(type)}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-3"
                      >
                        <input
                          type="checkbox"
                          checked={filterTypes.has(type)}
                          onChange={() => {}}
                          className="w-4 h-4 text-purple-600 rounded"
                        />
                        <span className="text-xl">{getItemTypeIcon(type)}</span>
                        <span className="text-sm font-medium text-gray-700">
                          {getItemTypeLabel(type)}s
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
              </div>
            ) : sortedItems.length === 0 ? (
              <div className="text-center py-16">
                <div className="flex justify-center mb-4">
                  <div className="w-24 h-24 bg-gradient-to-br from-purple-100 to-blue-100 rounded-full flex items-center justify-center">
                    <svg
                      className="w-12 h-12 text-purple-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                      />
                    </svg>
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No items for today
                </h3>
                <p className="text-gray-600 mb-6">
                  Start by adding a habit, task, or reminder.
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {sortedItems.map((item) => {
                  // Check completion status based on item type:
                  // - Recurring items (with scheduleType): check completedToday set
                  // - Non-recurring items: check isCompleted field
                  const isRecurring = item.scheduleType && item.scheduleType !== "";
                  const isCompleted = isRecurring
                    ? completedToday.has(item.id)
                    : item.isCompleted || false;
                  const itemTime = getItemTime(item);

                  return (
                    <div
                      key={item.id}
                      className={`border-2 rounded-xl p-5 hover:shadow-md transition-all duration-200 ${
                        isCompleted
                          ? "border-green-300 bg-gradient-to-r from-green-50 to-emerald-50"
                          : "border-gray-100 bg-gradient-to-r from-white to-gray-50 hover:border-purple-300"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xl">{getItemTypeIcon(item.itemType)}</span>
                            {item.priority && (
                              <span
                                className={`w-3 h-3 rounded-full flex-shrink-0 ${
                                  item.priority === "high"
                                    ? "bg-red-500"
                                    : item.priority === "medium"
                                    ? "bg-yellow-500"
                                    : "bg-green-500"
                                }`}
                                title={`${item.priority} priority`}
                              />
                            )}
                            <h3
                              className={`text-lg font-semibold ${
                                isCompleted ? "text-gray-500 line-through" : "text-gray-900"
                              }`}
                            >
                              {item.name}
                            </h3>
                            {(item.effort || item.duration || item.focus) && (
                              <span className="text-xs text-gray-500">
                                (
                                {[
                                  item.effort && item.effort.charAt(0).toUpperCase() + item.effort.slice(1),
                                  item.duration && item.duration.charAt(0).toUpperCase() + item.duration.slice(1),
                                  item.focus && item.focus.charAt(0).toUpperCase() + item.focus.slice(1),
                                ]
                                  .filter(Boolean)
                                  .join(", ")}
                                )
                              </span>
                            )}
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${getItemTypeColor(item.itemType)}`}>
                              {getItemTypeLabel(item.itemType)}
                            </span>
                            {item.isParent && item.subItems && item.subItems.length > 0 && (
                              <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full font-medium">
                                {item.subItems.length} sub-{item.itemType === "habit" ? "habits" : item.itemType === "task" ? "tasks" : "items"}
                              </span>
                            )}
                          </div>

                          {item.description && (
                            <p className="text-gray-600 text-sm mb-3">{item.description}</p>
                          )}

                          <div className="flex items-center gap-4 text-sm">
                            {itemTime && (
                              <span className="flex items-center gap-2 text-gray-700">
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                  />
                                </svg>
                                <span>{itemTime.substring(0, 5)}</span>
                              </span>
                            )}

                            {item.scheduleType === "daily" && (
                              <span className="flex items-center gap-2 text-gray-700">
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                  />
                                </svg>
                                <span className="font-medium">Recurring</span>
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {item.isParent && item.subItems && item.subItems.length > 0 && (
                            <button
                              onClick={() => toggleExpanded(item.id)}
                              className="w-8 h-8 rounded-lg border border-gray-300 hover:border-purple-500 hover:bg-purple-50 transition-colors flex items-center justify-center"
                              title={expandedItems.has(item.id) ? "Collapse" : "Expand"}
                            >
                              <svg
                                className={`w-4 h-4 text-gray-600 transition-transform ${
                                  expandedItems.has(item.id) ? "rotate-180" : ""
                                }`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 9l-7 7-7-7"
                                />
                              </svg>
                            </button>
                          )}
                          <button
                            onClick={() => openEditModal(item)}
                            className="w-8 h-8 rounded-lg border border-gray-300 hover:border-blue-500 hover:bg-blue-50 transition-colors flex items-center justify-center"
                            title="Edit item"
                          >
                            <svg
                              className="w-4 h-4 text-gray-600"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                              />
                            </svg>
                          </button>
                          <button
                            onClick={() => toggleItem(item.id)}
                            className={`w-10 h-10 rounded-full border-2 transition-all flex items-center justify-center ${
                              isCompleted
                                ? "border-green-500 bg-green-500 hover:bg-green-600"
                                : "border-gray-300 hover:border-green-500 hover:bg-green-50"
                            }`}
                          >
                            <svg
                              className={`w-5 h-5 ${isCompleted ? "text-white" : "text-gray-400"}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          </button>
                        </div>
                      </div>

                      {/* Sub-items display */}
                      {item.isParent &&
                        item.subItems &&
                        item.subItems.length > 0 &&
                        expandedItems.has(item.id) && (
                          <div className="mt-4 ml-8 space-y-2 border-l-2 border-purple-200 pl-4">
                            {item.subItems.map((subItem) => {
                              const subItemCompleted =
                                isRecurring
                                  ? subItem.id
                                    ? completedToday.has(subItem.id)
                                    : false
                                  : subItem.isCompleted || false;

                              return (
                                <div
                                  key={subItem.id}
                                  className={`flex items-center justify-between p-3 rounded-lg ${
                                    subItemCompleted
                                      ? "bg-green-50 border border-green-200"
                                      : "bg-gray-50 border border-gray-200"
                                  }`}
                                >
                                  <div className="flex items-center gap-3">
                                    <span
                                      className={`text-sm font-medium ${
                                        subItemCompleted ? "text-gray-500 line-through" : "text-gray-900"
                                      }`}
                                    >
                                      {subItem.name}
                                    </span>
                                    {subItem.dueDate && (
                                      <span className="text-xs text-gray-500">
                                        Due: {new Date(subItem.dueDate).toLocaleDateString()}
                                      </span>
                                    )}
                                  </div>
                                  {subItem.id && (
                                    <button
                                      onClick={() => toggleItem(subItem.id!)}
                                      className={`w-7 h-7 rounded-full border-2 transition-all flex items-center justify-center ${
                                        subItemCompleted
                                          ? "border-green-500 bg-green-500 hover:bg-green-600"
                                          : "border-gray-300 hover:border-green-500 hover:bg-green-50"
                                      }`}
                                    >
                                      <svg
                                        className={`w-4 h-4 ${
                                          subItemCompleted ? "text-white" : "text-gray-400"
                                        }`}
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M5 13l4 4L19 7"
                                        />
                                      </svg>
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Universal Add Button */}
        <div className="fixed bottom-8 right-8 z-50">
          {showAddMenu && (
            <div className="absolute bottom-16 right-0 bg-white rounded-xl shadow-xl border border-gray-200 py-2 w-48 mb-2">
              <button
                onClick={() => openCreateModal("habit")}
                className="w-full px-4 py-3 text-left hover:bg-purple-50 flex items-center gap-3 transition-colors"
              >
                <span className="text-2xl">🎯</span>
                <span className="font-semibold text-gray-900">Add Habit</span>
              </button>
              <button
                onClick={() => openCreateModal("task")}
                className="w-full px-4 py-3 text-left hover:bg-blue-50 flex items-center gap-3 transition-colors"
              >
                <span className="text-2xl">✅</span>
                <span className="font-semibold text-gray-900">Add Task</span>
              </button>
              <button
                onClick={() => openCreateModal("reminder")}
                className="w-full px-4 py-3 text-left hover:bg-yellow-50 flex items-center gap-3 transition-colors"
              >
                <span className="text-2xl">🔔</span>
                <span className="font-semibold text-gray-900">Add Reminder</span>
              </button>
            </div>
          )}
          <button
            onClick={() => setShowAddMenu(!showAddMenu)}
            className={`w-14 h-14 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110 flex items-center justify-center text-2xl font-bold ${
              showAddMenu ? "rotate-45" : ""
            }`}
          >
            +
          </button>
        </div>

        {/* Add/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {modalMode === "create"
                  ? `Create New ${getItemTypeLabel(selectedItemType)}`
                  : `Edit ${getItemTypeLabel(selectedItemType)}`}
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder={`e.g., ${selectedItemType === "habit" ? "Morning Exercise" : selectedItemType === "task" ? "Finish report" : "Doctor's appointment"}`}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-400"
                    autoFocus
                    maxLength={100}
                  />
                  <p className="text-xs text-gray-500 mt-1">{formName.length}/100 characters</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Time (optional)
                  </label>
                  <input
                    type="time"
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white text-gray-900"
                  />
                </div>

                {(selectedItemType === "task" || selectedItemType === "reminder") && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Day (optional)
                    </label>
                    <input
                      type="date"
                      value={formDay}
                      onChange={(e) => setFormDay(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white text-gray-900"
                    />
                  </div>
                )}

                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formRecurring}
                      onChange={(e) => setFormRecurring(e.target.checked)}
                      className="w-4 h-4 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Recurring (daily)</span>
                  </label>
                </div>

                {/* Metadata Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Priority
                    </label>
                    <select
                      value={formPriority}
                      onChange={(e) => setFormPriority(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white text-gray-900"
                    >
                      <option value="">None</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Effort
                    </label>
                    <select
                      value={formEffort}
                      onChange={(e) => setFormEffort(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white text-gray-900"
                    >
                      <option value="">None</option>
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Duration
                    </label>
                    <select
                      value={formDuration}
                      onChange={(e) => setFormDuration(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white text-gray-900"
                    >
                      <option value="">None</option>
                      <option value="quick">Quick (&lt;15min)</option>
                      <option value="medium">Medium (15-60min)</option>
                      <option value="long">Long (&gt;1hr)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Focus Required
                    </label>
                    <select
                      value={formFocus}
                      onChange={(e) => setFormFocus(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white text-gray-900"
                    >
                      <option value="">None</option>
                      <option value="deep">Deep focus</option>
                      <option value="light">Light focus</option>
                      <option value="background">Background</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      Deep = full attention, Light = can multitask, Background = set and forget
                    </p>
                  </div>
                </div>

                {/* Sub-Items Section */}
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Sub-{selectedItemType === "habit" ? "Habits" : selectedItemType === "task" ? "Tasks" : "Items"}
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setFormSubItems([...formSubItems, { name: "", dueDate: undefined }])
                      }
                      className="text-sm text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add Sub-{selectedItemType === "habit" ? "Habit" : selectedItemType === "task" ? "Task" : "Item"}
                    </button>
                  </div>

                  {formSubItems.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">No sub-items added yet</p>
                  ) : (
                    <div className="space-y-3 max-h-48 overflow-y-auto">
                      {formSubItems.map((subItem, index) => {
                        // Date validation
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const parentDueDate = formDay ? new Date(formDay) : null;
                        const subItemDate = subItem.dueDate ? new Date(subItem.dueDate) : null;
                        const isPastDate = subItemDate && subItemDate < today;
                        const isAfterParent = parentDueDate && subItemDate && subItemDate > parentDueDate;

                        return (
                          <div key={index} className="flex items-start gap-2">
                            <div className="flex-1">
                              <input
                                type="text"
                                value={subItem.name}
                                onChange={(e) => {
                                  const updated = [...formSubItems];
                                  updated[index] = { ...updated[index], name: e.target.value };
                                  setFormSubItems(updated);
                                }}
                                placeholder={`Sub-${selectedItemType} name`}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white text-gray-900 text-sm"
                              />
                            </div>
                            {(selectedItemType === "task" || selectedItemType === "reminder") && (
                              <div className="w-36">
                                <input
                                  type="date"
                                  value={subItem.dueDate || ""}
                                  onChange={(e) => {
                                    const updated = [...formSubItems];
                                    updated[index] = { ...updated[index], dueDate: e.target.value || undefined };
                                    setFormSubItems(updated);
                                  }}
                                  className="w-full px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white text-gray-900 text-sm"
                                />
                                {isPastDate && (
                                  <p className="text-xs text-red-600 mt-1">Past date</p>
                                )}
                                {isAfterParent && (
                                  <p className="text-xs text-red-600 mt-1">After parent due date</p>
                                )}
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                const updated = formSubItems.filter((_, i) => i !== index);
                                setFormSubItems(updated);
                              }}
                              className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                              title="Remove sub-item"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                {modalMode === "edit" && (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={deletingItem || savingItem}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Delete
                  </button>
                )}
                <button
                  onClick={closeModal}
                  disabled={savingItem || deletingItem}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={modalMode === "create" ? createItem : updateItem}
                  disabled={!formName.trim() || savingItem || deletingItem}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {savingItem && (
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                  )}
                  {savingItem
                    ? modalMode === "create"
                      ? "Creating..."
                      : "Saving..."
                    : modalMode === "create"
                    ? "Create"
                    : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
            <div className="bg-white rounded-2xl p-8 max-w-sm w-full mx-4">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Delete Item?</h2>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete this item? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deletingItem}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={deleteItem}
                  disabled={deletingItem}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {deletingItem && (
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                  )}
                  {deletingItem ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Toast Notifications */}
        <div className="fixed bottom-8 left-8 space-y-2 z-50">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 min-w-[300px] animate-in slide-in-from-bottom-5 ${
                toast.type === "success"
                  ? "bg-green-600 text-white"
                  : toast.type === "error"
                  ? "bg-red-600 text-white"
                  : "bg-blue-600 text-white"
              }`}
            >
              {toast.type === "success" && (
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
              {toast.type === "error" && (
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              <span className="flex-1 font-medium">{toast.message}</span>
            </div>
          ))}
        </div>
      </div>
    </ProtectedRoute>
  );
}

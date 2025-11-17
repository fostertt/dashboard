"use client";

import React from "react";
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

export default function WeekView() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Parse date from URL or use today to determine week
  const getSelectedWeekStart = () => {
    const dateParam = searchParams.get("date");
    let targetDate: Date;
    if (dateParam) {
      const [year, month, day] = dateParam.split("-").map(Number);
      targetDate = new Date(year, month - 1, day);
    } else {
      targetDate = new Date();
    }
    // Get Sunday of the week containing targetDate
    const dayOfWeek = targetDate.getDay(); // 0 = Sunday
    const sunday = new Date(targetDate);
    sunday.setDate(targetDate.getDate() - dayOfWeek);
    return sunday;
  };

  const [weekStart, setWeekStart] = useState<Date>(getSelectedWeekStart);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [completions, setCompletions] = useState<Map<string, Set<number>>>(new Map());
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
  const [error, setError] = useState<string | null>(null);

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

  // Week navigation functions
  const navigateToWeek = (date: Date) => {
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    router.push(`/week?date=${dateStr}`);
    // Get Sunday of that week
    const dayOfWeek = date.getDay();
    const sunday = new Date(date);
    sunday.setDate(date.getDate() - dayOfWeek);
    setWeekStart(sunday);
  };

  const goToPreviousWeek = () => {
    const prevWeek = new Date(weekStart);
    prevWeek.setDate(prevWeek.getDate() - 7);
    navigateToWeek(prevWeek);
  };

  const goToNextWeek = () => {
    const nextWeek = new Date(weekStart);
    nextWeek.setDate(nextWeek.getDate() + 7);
    navigateToWeek(nextWeek);
  };

  const goToCurrentWeek = () => {
    navigateToWeek(new Date());
  };

  const isCurrentWeek = () => {
    const today = new Date();
    const todayDayOfWeek = today.getDay();
    const currentWeekSunday = new Date(today);
    currentWeekSunday.setDate(today.getDate() - todayDayOfWeek);
    return weekStart.toDateString() === currentWeekSunday.toDateString();
  };

  const formatWeekRange = () => {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    const startMonth = weekStart.toLocaleDateString("en-US", { month: "short" });
    const endMonth = weekEnd.toLocaleDateString("en-US", { month: "short" });
    const year = weekEnd.getFullYear();

    if (startMonth === endMonth) {
      return `${startMonth} ${weekStart.getDate()}-${weekEnd.getDate()}, ${year}`;
    } else {
      return `${startMonth} ${weekStart.getDate()} - ${endMonth} ${weekEnd.getDate()}, ${year}`;
    }
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
  }, [weekStart]);

  // Update weekStart when URL changes
  useEffect(() => {
    const newWeekStart = getSelectedWeekStart();
    if (newWeekStart.toDateString() !== weekStart.toDateString()) {
      setWeekStart(newWeekStart);
    }
  }, [searchParams]);

  const loadData = async () => {
    try {
      // Fetch all items
      const itemsRes = await fetch("/api/items");
      const itemsData = await itemsRes.json();
      setItems(Array.isArray(itemsData) ? itemsData : []);

      // Fetch completions for all 7 days of the week
      const weekDays = getWeekDays();
      const completionsMap = new Map<string, Set<number>>();

      await Promise.all(
        weekDays.map(async (day) => {
          const dateStr = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
          const res = await fetch(`/api/completions?date=${dateStr}`);
          const data = await res.json();

          if (data.completedHabitIds) {
            completionsMap.set(dateStr, new Set(data.completedHabitIds));
          } else {
            completionsMap.set(dateStr, new Set());
          }
        })
      );

      setCompletions(completionsMap);
      setLoading(false);
    } catch (err) {
      console.error("Error loading data:", err);
      setLoading(false);
    }
  };

  const toggleItem = async (itemId: number, date: Date) => {
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

    try {
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

      // Update local state for recurring items
      setCompletions((prev) => {
        const newCompletions = new Map(prev);
        const dateCompletions = new Set(prev.get(dateStr) || new Set());

        if (data.completed) {
          dateCompletions.add(itemId);
        } else {
          dateCompletions.delete(itemId);
        }

        newCompletions.set(dateStr, dateCompletions);
        return newCompletions;
      });

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
        if (formRecurring) itemData.scheduleType = "daily";
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

  const getWeekDays = () => {
    // weekStart is Sunday, generate Sun-Sat
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const isScheduledForDay = (item: Item, date: Date) => {
    const dayIndex = date.getDay() === 0 ? 6 : date.getDay() - 1; // 0 = Monday

    if (item.itemType === "habit") {
      if (item.scheduleType === "daily") return true;
      if (item.scheduleType === "weekly" && item.scheduleDays) {
        const scheduledDays = item.scheduleDays.split(",").map((d) => parseInt(d.trim()));
        return scheduledDays.includes(dayIndex);
      }
      return false;
    }

    // Tasks and reminders without a due date appear on today
    if (item.itemType === "task" || item.itemType === "reminder") {
      if (!item.dueDate) {
        // Show on today only
        const today = new Date();
        return date.toDateString() === today.toDateString();
      }
      // Parse the date string without timezone conversion to avoid off-by-one errors
      // The dueDate comes as ISO string like "2025-11-16T00:00:00.000Z" or date string "2025-11-16"
      const dueDateStr = typeof item.dueDate === 'string' ? item.dueDate : item.dueDate.toISOString();
      const datePart = dueDateStr.split('T')[0]; // Extract "2025-11-16"
      const [year, month, day] = datePart.split('-').map(Number);
      const dueDate = new Date(year, month - 1, day); // Create local date without timezone shift
      return dueDate.toDateString() === date.toDateString();
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

  const weekDays = getWeekDays();
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const today = new Date().toDateString();

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
        <div className="max-w-7xl mx-auto p-8">
          <Header />

          {/* Week Navigation */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <button
                onClick={goToPreviousWeek}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Prev Week
              </button>

              <div className="text-center">
                <h2 className="text-xl font-bold text-gray-800">{formatWeekRange()}</h2>
                {!isCurrentWeek() && (
                  <button
                    onClick={goToCurrentWeek}
                    className="mt-2 px-3 py-1 bg-purple-600 text-white rounded-full text-sm font-medium hover:bg-purple-700 transition-colors"
                  >
                    Back to Current Week
                  </button>
                )}
              </div>

              <button
                onClick={goToNextWeek}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium flex items-center gap-2"
              >
                Next Week
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Filter Section */}
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
              <span className="text-3xl">📅</span>
              Week View
            </h2>

            {/* Filter Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowFilterMenu(!showFilterMenu)}
                className="px-4 py-2 bg-white text-gray-700 rounded-full hover:bg-gray-50 transition-colors font-semibold flex items-center gap-2 shadow"
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
          ) : (
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              {/* Calendar Grid - Responsive with horizontal scroll on smaller screens */}
              <div className="w-full overflow-x-auto overflow-y-auto max-h-[calc(100vh-280px)]">
                <div className="grid grid-cols-7 gap-px bg-gray-200 min-w-[896px] md:min-w-0">
                  {/* Day Headers */}
                  {weekDays.map((day, index) => {
                    const isToday = day.toDateString() === today;
                    return (
                      <div
                        key={index}
                        className={`p-4 text-center font-semibold ${
                          isToday
                            ? "bg-purple-600 text-white"
                            : "bg-gray-50 text-gray-700"
                        }`}
                      >
                        <div className="text-sm">{dayNames[index]}</div>
                        <div className="text-2xl mt-1">{day.getDate()}</div>
                        <div className="text-xs mt-1">
                          {day.toLocaleDateString("en-US", { month: "short" })}
                        </div>
                      </div>
                    );
                  })}

                  {/* Day Cells with Items */}
                  {weekDays.map((day, dayIndex) => {
                    const isToday = day.toDateString() === today;
                    const dateStr = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;

                    // Get items for this day
                    const dayItems = items.filter((item) =>
                      isScheduledForDay(item, day) && filterTypes.has(item.itemType)
                    );
                    const sortedDayItems = sortItemsChronologically(dayItems);

                    return (
                      <div
                        key={dayIndex}
                        className={`p-3 min-h-[200px] ${
                          isToday ? "bg-purple-50" : "bg-white"
                        }`}
                      >
                        <div className="space-y-2">
                          {sortedDayItems.map((item) => {
                            // Check completion status based on item type:
                            // - Recurring items (with scheduleType): check completions map for this date
                            // - Non-recurring items: check isCompleted field
                            const isRecurring = item.scheduleType && item.scheduleType !== "";
                            const isCompleted = isRecurring
                              ? (completions.get(dateStr)?.has(item.id) || false)
                              : (item.isCompleted || false);
                            const itemTime = getItemTime(item);

                            return (
                              <div
                                key={item.id}
                                className={`text-sm border rounded-lg p-2 ${
                                  isCompleted
                                    ? "border-green-300 bg-green-50"
                                    : "border-gray-200 bg-white hover:border-purple-300"
                                }`}
                              >
                                <div className="flex items-start gap-2 mb-2">
                                  <span className="text-sm flex-shrink-0">{getItemTypeIcon(item.itemType)}</span>
                                  {item.priority && (
                                    <span
                                      className={`w-2 h-2 rounded-full flex-shrink-0 mt-1 ${
                                        item.priority === "high"
                                          ? "bg-red-500"
                                          : item.priority === "medium"
                                          ? "bg-yellow-500"
                                          : "bg-green-500"
                                      }`}
                                      title={`${item.priority} priority`}
                                    />
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <div
                                      className={`font-medium text-xs break-words ${
                                        isCompleted ? "text-gray-500 line-through" : "text-gray-900"
                                      }`}
                                    >
                                      {item.name}
                                    </div>
                                    {item.isParent && item.subItems && item.subItems.length > 0 && (
                                      <div className="text-xs text-blue-600 mt-0.5">
                                        {item.subItems.length} sub-{item.itemType === "habit" ? "habits" : item.itemType === "task" ? "tasks" : "items"}
                                      </div>
                                    )}
                                    {(item.effort || item.duration || item.focus) && (
                                      <div className="text-xs text-gray-400 mt-0.5">
                                        (
                                        {[
                                          item.effort && item.effort.charAt(0).toUpperCase() + item.effort.slice(1),
                                          item.duration && item.duration.charAt(0).toUpperCase() + item.duration.slice(1),
                                          item.focus && item.focus.charAt(0).toUpperCase() + item.focus.slice(1),
                                        ]
                                          .filter(Boolean)
                                          .join(", ")}
                                        )
                                      </div>
                                    )}
                                    {itemTime && (
                                      <div className="text-xs text-gray-500 mt-1">
                                        {itemTime.substring(0, 5)}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1">
                                  {item.isParent && item.subItems && item.subItems.length > 0 && (
                                    <button
                                      onClick={() => toggleExpanded(item.id)}
                                      className="w-5 h-5 flex items-center justify-center text-gray-500 hover:text-purple-600 transition-colors"
                                      title={expandedItems.has(item.id) ? "Collapse" : "Expand"}
                                    >
                                      <svg
                                        className={`w-3 h-3 transition-transform ${
                                          expandedItems.has(item.id) ? "rotate-90" : ""
                                        }`}
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M9 5l7 7-7 7"
                                        />
                                      </svg>
                                    </button>
                                  )}
                                  <button
                                    onClick={() => toggleItem(item.id, day)}
                                    className={`w-6 h-6 rounded-full border-2 transition-all flex items-center justify-center flex-shrink-0 ${
                                      isCompleted
                                        ? "border-green-500 bg-green-500 hover:bg-green-600"
                                        : "border-gray-300 hover:border-green-500 hover:bg-green-50"
                                    }`}
                                  >
                                    <svg
                                      className={`w-3 h-3 ${isCompleted ? "text-white" : "text-gray-400"}`}
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
                                  <button
                                    onClick={() => openEditModal(item)}
                                    className="px-2 py-1 text-xs border border-gray-300 hover:border-blue-500 hover:bg-blue-50 rounded transition-colors flex-shrink-0"
                                    title="Edit"
                                  >
                                    Edit
                                  </button>
                                </div>

                                {/* Sub-items display */}
                                {item.isParent &&
                                  item.subItems &&
                                  item.subItems.length > 0 &&
                                  expandedItems.has(item.id) && (
                                    <div className="mt-2 ml-2 space-y-1 border-l-2 border-purple-200 pl-2">
                                      {item.subItems.map((subItem) => {
                                        const subItemCompleted =
                                          isRecurring
                                            ? subItem.id
                                              ? completions.get(dateStr)?.has(subItem.id) || false
                                              : false
                                            : subItem.isCompleted || false;

                                        return (
                                          <div
                                            key={subItem.id}
                                            className={`flex items-center gap-1 text-xs ${
                                              subItemCompleted ? "text-gray-400" : "text-gray-700"
                                            }`}
                                          >
                                            {subItem.id && (
                                              <button
                                                onClick={() => toggleItem(subItem.id!, day)}
                                                className={`w-4 h-4 rounded-full border transition-all flex items-center justify-center flex-shrink-0 ${
                                                  subItemCompleted
                                                    ? "border-green-500 bg-green-500"
                                                    : "border-gray-300 hover:border-green-500"
                                                }`}
                                              >
                                                {subItemCompleted && (
                                                  <svg
                                                    className="w-2 h-2 text-white"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                  >
                                                    <path
                                                      strokeLinecap="round"
                                                      strokeLinejoin="round"
                                                      strokeWidth={3}
                                                      d="M5 13l4 4L19 7"
                                                    />
                                                  </svg>
                                                )}
                                              </button>
                                            )}
                                            <span
                                              className={
                                                subItemCompleted ? "line-through" : ""
                                              }
                                            >
                                              {subItem.name}
                                            </span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
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
                        // Date validation - only warn if sub-task date is AFTER parent date
                        const parentDueDate = formDay ? new Date(formDay) : null;
                        const subItemDate = subItem.dueDate ? new Date(subItem.dueDate) : null;
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
                                  className={`w-full px-2 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white text-sm ${
                                    isAfterParent ? "border-red-500 text-red-500" : "border-gray-300 text-gray-900"
                                  }`}
                                />
                                {isAfterParent && (
                                  <p className="text-xs text-red-500 mt-1">After parent due date</p>
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

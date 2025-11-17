"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import Header from "@/components/Header";

interface Task {
  id: number;
  name: string;
  isCompleted?: boolean;
  dueDate?: string;
  priority?: string;
  effort?: string;
}

interface ListItem {
  id: number;
  text: string;
  isChecked: boolean;
  taskId?: number;
  task?: Task;
}

interface List {
  id: number;
  name: string;
  listType: "simple" | "smart";
  filterCriteria?: string;
  color?: string;
  items: ListItem[];
  filteredTasks?: Task[];
}

interface Toast {
  id: number;
  message: string;
  type: "success" | "error";
}

export default function ListDetailPage() {
  const params = useParams();
  const router = useRouter();
  const listId = parseInt(params.id as string);

  const [list, setList] = useState<List | null>(null);
  const [loading, setLoading] = useState(true);
  const [newItemText, setNewItemText] = useState("");
  const [newItemDate, setNewItemDate] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [editingName, setEditingName] = useState(false);
  const [listName, setListName] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const showToast = (message: string, type: "success" | "error") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  };

  const loadList = async () => {
    try {
      const res = await fetch(`/api/lists/${listId}`);
      if (!res.ok) throw new Error("Failed to load list");
      const data = await res.json();
      setList(data);
      setListName(data.name);
    } catch (error) {
      console.error("Error loading list:", error);
      showToast("Failed to load list", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (listId) loadList();
  }, [listId]);

  const addItem = async () => {
    if (!newItemText.trim() || !list) return;

    try {
      const res = await fetch(`/api/lists/${listId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: newItemText,
          dueDate: newItemDate || undefined,
        }),
      });

      if (!res.ok) throw new Error("Failed to add item");

      setNewItemText("");
      setNewItemDate("");
      setShowDatePicker(false);
      await loadList();
      showToast("Item added", "success");
    } catch (error) {
      console.error("Error adding item:", error);
      showToast("Failed to add item", "error");
    }
  };

  const toggleItem = async (itemId: number, currentChecked: boolean) => {
    try {
      const res = await fetch(`/api/lists/${listId}/items`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, isChecked: !currentChecked }),
      });

      if (!res.ok) throw new Error("Failed to update item");
      await loadList();
    } catch (error) {
      console.error("Error toggling item:", error);
      showToast("Failed to update item", "error");
    }
  };

  const deleteItem = async (itemId: number) => {
    try {
      const res = await fetch(`/api/lists/${listId}/items?itemId=${itemId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete item");
      await loadList();
      showToast("Item deleted", "success");
    } catch (error) {
      console.error("Error deleting item:", error);
      showToast("Failed to delete item", "error");
    }
  };

  const updateListName = async () => {
    if (!listName.trim() || listName === list?.name) {
      setEditingName(false);
      return;
    }

    try {
      const res = await fetch(`/api/lists/${listId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: listName }),
      });

      if (!res.ok) throw new Error("Failed to update list");
      await loadList();
      setEditingName(false);
      showToast("List updated", "success");
    } catch (error) {
      console.error("Error updating list:", error);
      showToast("Failed to update list", "error");
    }
  };

  const deleteList = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/lists/${listId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete list");
      router.push("/lists");
      showToast("List deleted", "success");
    } catch (error) {
      console.error("Error deleting list:", error);
      showToast("Failed to delete list", "error");
    } finally {
      setDeleting(false);
    }
  };

  const toggleSmartTask = async (taskId: number, isCompleted: boolean) => {
    try {
      const today = new Date();
      const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

      const res = await fetch(`/api/items/${taskId}/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: dateStr }),
      });

      if (!res.ok) throw new Error("Failed to toggle task");
      await loadList();
    } catch (error) {
      console.error("Error toggling task:", error);
      showToast("Failed to toggle task", "error");
    }
  };

  const getFilterDescription = () => {
    if (!list?.filterCriteria) return "";
    const criteria = JSON.parse(list.filterCriteria);
    const parts = [];
    if (criteria.priority) parts.push(`Priority = ${criteria.priority}`);
    if (criteria.effort) parts.push(`Effort = ${criteria.effort}`);
    if (criteria.duration) parts.push(`Duration = ${criteria.duration}`);
    if (criteria.focus) parts.push(`Focus = ${criteria.focus}`);
    return parts.join(", ");
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!list) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
          <div className="max-w-5xl mx-auto p-8">
            <Header />
            <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
              <h2 className="text-xl font-semibold text-gray-900">List not found</h2>
              <button
                onClick={() => router.push("/lists")}
                className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg"
              >
                Back to Lists
              </button>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
        <div className="max-w-5xl mx-auto p-8">
          <Header />

          <div className="bg-white rounded-2xl shadow-lg p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => router.push("/lists")}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <div
                  className="w-4 h-full rounded"
                  style={{ backgroundColor: list.color || "#8B5CF6", width: "4px", height: "32px" }}
                />
                {editingName ? (
                  <input
                    type="text"
                    value={listName}
                    onChange={(e) => setListName(e.target.value)}
                    onBlur={updateListName}
                    onKeyDown={(e) => e.key === "Enter" && updateListName()}
                    className="text-2xl font-bold text-gray-900 bg-transparent border-b-2 border-purple-500 focus:outline-none"
                    autoFocus
                  />
                ) : (
                  <h2
                    onClick={() => setEditingName(true)}
                    className="text-2xl font-bold text-gray-900 cursor-pointer hover:text-purple-600"
                  >
                    {list.name}
                  </h2>
                )}
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  list.listType === "smart" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"
                }`}>
                  {list.listType === "smart" ? "Smart" : "Simple"}
                </span>
              </div>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Delete list"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>

            {list.listType === "smart" && (
              <div className="bg-blue-50 rounded-lg p-3 mb-6">
                <p className="text-sm text-blue-700">
                  <span className="font-medium">Showing tasks where:</span> {getFilterDescription()}
                </p>
              </div>
            )}

            {/* Add Item (Simple Lists Only) */}
            {list.listType === "simple" && (
              <div className="mb-6">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newItemText}
                    onChange={(e) => setNewItemText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !showDatePicker && addItem()}
                    placeholder="Add new item..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white text-gray-900"
                  />
                  <button
                    onClick={() => setShowDatePicker(!showDatePicker)}
                    className={`p-2 border rounded-lg transition-colors ${
                      showDatePicker ? "border-purple-500 bg-purple-50" : "border-gray-300 hover:bg-gray-50"
                    }`}
                    title="Add date (creates task)"
                  >
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </button>
                  <button
                    onClick={addItem}
                    disabled={!newItemText.trim()}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:opacity-50"
                  >
                    Add
                  </button>
                </div>
                {showDatePicker && (
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="date"
                      value={newItemDate}
                      onChange={(e) => setNewItemDate(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                    />
                    <span className="text-sm text-gray-500">Adding date will create a task</span>
                  </div>
                )}
              </div>
            )}

            {/* Items List */}
            <div className="space-y-2">
              {list.listType === "simple" ? (
                list.items.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No items yet. Add your first item above.</p>
                ) : (
                  list.items.map((item) => (
                    <div
                      key={item.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border ${
                        item.isChecked ? "bg-green-50 border-green-200" : "bg-white border-gray-200"
                      }`}
                    >
                      <button
                        onClick={() => toggleItem(item.id, item.isChecked)}
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                          item.isChecked
                            ? "border-green-500 bg-green-500"
                            : "border-gray-300 hover:border-green-500"
                        }`}
                      >
                        {item.isChecked && (
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                      <span className={`flex-1 ${item.isChecked ? "line-through text-gray-500" : "text-gray-900"}`}>
                        {item.text}
                      </span>
                      {item.task && (
                        <span className="text-xs text-gray-500">
                          {new Date(item.task.dueDate!).toLocaleDateString()}
                        </span>
                      )}
                      <button
                        onClick={() => deleteItem(item.id)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))
                )
              ) : list.filteredTasks?.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No tasks match your filter criteria.</p>
              ) : (
                list.filteredTasks?.map((task) => (
                  <div
                    key={task.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border ${
                      task.isCompleted ? "bg-green-50 border-green-200" : "bg-white border-gray-200"
                    }`}
                  >
                    <button
                      onClick={() => toggleSmartTask(task.id, task.isCompleted || false)}
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        task.isCompleted
                          ? "border-green-500 bg-green-500"
                          : "border-gray-300 hover:border-green-500"
                      }`}
                    >
                      {task.isCompleted && (
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                    <span className={`flex-1 ${task.isCompleted ? "line-through text-gray-500" : "text-gray-900"}`}>
                      {task.name}
                    </span>
                    {task.priority && (
                      <span className={`w-2 h-2 rounded-full ${
                        task.priority === "high" ? "bg-red-500" : task.priority === "medium" ? "bg-yellow-500" : "bg-green-500"
                      }`} />
                    )}
                    {task.dueDate && (
                      <span className="text-xs text-gray-500">
                        {new Date(task.dueDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Delete Confirmation */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 max-w-sm w-full mx-4">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Delete List?</h2>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete this list? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={deleteList}
                  disabled={deleting}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg disabled:opacity-50"
                >
                  {deleting ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Toasts */}
        <div className="fixed bottom-8 left-8 space-y-2 z-50">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 min-w-[300px] ${
                toast.type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"
              }`}
            >
              <span className="flex-1 font-medium">{toast.message}</span>
            </div>
          ))}
        </div>
      </div>
    </ProtectedRoute>
  );
}

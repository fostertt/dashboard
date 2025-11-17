"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import Header from "@/components/Header";

interface ListItem {
  id: number;
  text: string;
  isChecked: boolean;
  taskId?: number;
}

interface List {
  id: number;
  name: string;
  listType: "simple" | "smart";
  filterCriteria?: string;
  color?: string;
  items: ListItem[];
  filteredTasks?: any[];
}

interface Toast {
  id: number;
  message: string;
  type: "success" | "error";
}

const COLORS = ["#8B5CF6", "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#EC4899"];

export default function ListsPage() {
  const router = useRouter();
  const [lists, setLists] = useState<List[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Form state
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState<"simple" | "smart">("simple");
  const [formColor, setFormColor] = useState(COLORS[0]);
  const [formPriority, setFormPriority] = useState("");
  const [formEffort, setFormEffort] = useState("");
  const [formDuration, setFormDuration] = useState("");
  const [formFocus, setFormFocus] = useState("");
  const [saving, setSaving] = useState(false);

  const showToast = (message: string, type: "success" | "error") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  };

  const loadLists = async () => {
    try {
      const res = await fetch("/api/lists");
      if (!res.ok) throw new Error("Failed to load lists");
      const data = await res.json();
      setLists(data);
    } catch (error) {
      console.error("Error loading lists:", error);
      showToast("Failed to load lists", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLists();
  }, []);

  const openModal = () => {
    setFormName("");
    setFormType("simple");
    setFormColor(COLORS[0]);
    setFormPriority("");
    setFormEffort("");
    setFormDuration("");
    setFormFocus("");
    setShowModal(true);
  };

  const createList = async () => {
    if (!formName.trim()) return;
    setSaving(true);

    try {
      const listData: any = {
        name: formName,
        listType: formType,
        color: formColor,
      };

      if (formType === "smart") {
        const criteria: any = {};
        if (formPriority) criteria.priority = formPriority;
        if (formEffort) criteria.effort = formEffort;
        if (formDuration) criteria.duration = formDuration;
        if (formFocus) criteria.focus = formFocus;
        listData.filterCriteria = criteria;
      }

      const res = await fetch("/api/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(listData),
      });

      if (!res.ok) throw new Error("Failed to create list");

      await loadLists();
      setShowModal(false);
      showToast("List created successfully!", "success");
    } catch (error) {
      console.error("Error creating list:", error);
      showToast("Failed to create list", "error");
    } finally {
      setSaving(false);
    }
  };

  const getListStats = (list: List) => {
    if (list.listType === "smart") {
      const count = list.filteredTasks?.length || 0;
      return `${count} task${count !== 1 ? "s" : ""}`;
    }
    const total = list.items.length;
    const checked = list.items.filter((i) => i.isChecked).length;
    return `${checked}/${total} items`;
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
        <div className="max-w-5xl mx-auto p-8">
          <Header />

          <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <span className="text-3xl">📋</span>
                <h2 className="text-2xl font-bold text-gray-800">Lists</h2>
              </div>
              <button
                onClick={openModal}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New List
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
              </div>
            ) : lists.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-24 h-24 bg-gradient-to-br from-purple-100 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-12 h-12 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No lists yet</h3>
                <p className="text-gray-600 mb-6">Create your first list to get organized.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {lists.map((list) => (
                  <div
                    key={list.id}
                    onClick={() => router.push(`/lists/${list.id}`)}
                    className="border-2 border-gray-100 rounded-xl p-5 hover:shadow-md hover:border-purple-300 transition-all cursor-pointer bg-white"
                    style={{ borderLeftColor: list.color || COLORS[0], borderLeftWidth: "4px" }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{list.name}</h3>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        list.listType === "smart"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-gray-100 text-gray-700"
                      }`}>
                        {list.listType === "smart" ? "Smart" : "Simple"}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{getListStats(list)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Create List Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Create New List</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g., Grocery List"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white text-gray-900"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={formType === "simple"}
                        onChange={() => setFormType("simple")}
                        className="w-4 h-4 text-purple-600"
                      />
                      <span className="text-sm text-gray-700">Simple List</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={formType === "smart"}
                        onChange={() => setFormType("smart")}
                        className="w-4 h-4 text-purple-600"
                      />
                      <span className="text-sm text-gray-700">Smart List</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
                  <div className="flex gap-2">
                    {COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => setFormColor(color)}
                        className={`w-8 h-8 rounded-full border-2 ${
                          formColor === color ? "border-gray-900" : "border-transparent"
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                {formType === "smart" && (
                  <div className="border-t pt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Filter Criteria (at least one required)
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <select
                        value={formPriority}
                        onChange={(e) => setFormPriority(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 text-sm"
                      >
                        <option value="">Any Priority</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>
                      <select
                        value={formEffort}
                        onChange={(e) => setFormEffort(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 text-sm"
                      >
                        <option value="">Any Effort</option>
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                      </select>
                      <select
                        value={formDuration}
                        onChange={(e) => setFormDuration(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 text-sm"
                      >
                        <option value="">Any Duration</option>
                        <option value="quick">Quick</option>
                        <option value="medium">Medium</option>
                        <option value="long">Long</option>
                      </select>
                      <select
                        value={formFocus}
                        onChange={(e) => setFormFocus(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 text-sm"
                      >
                        <option value="">Any Focus</option>
                        <option value="deep">Deep</option>
                        <option value="light">Light</option>
                        <option value="background">Background</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowModal(false)}
                  disabled={saving}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={createList}
                  disabled={!formName.trim() || saving || (formType === "smart" && !formPriority && !formEffort && !formDuration && !formFocus)}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:opacity-50"
                >
                  {saving ? "Creating..." : "Create"}
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

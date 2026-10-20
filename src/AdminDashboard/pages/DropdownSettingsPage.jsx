// src/AdminDashboard/pages/DropdownSettingsPage.jsx
import { useState } from "react";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase/firebase";
import useDropdownOptions from "../../hooks/useDropdownOptions";
import {
  DEFAULT_PROGRAMS,
  DEFAULT_LOST_FOUND_CATEGORIES,
  DEFAULT_SESSION_TITLES,
} from "../../constants/dropdownDefaults";
 

export const DROPDOWN_CATEGORIES = [
  {
    key: "programs",
    label: "Programs",
    hint: "Used in the Disciplinary form",
    defaults: DEFAULT_PROGRAMS,
  },
  {
    key: "lostFoundCategories",
    label: "Lost & Found Categories",
    hint: 'Used in Lost & Found reports. "Others" is always added automatically.',
    defaults: DEFAULT_LOST_FOUND_CATEGORIES,
    reserved: ["Others"],
  },
  {
    key: "sessionTitles",
    label: "Attendance Session Titles",
    hint: "Used when creating or editing an attendance session",
    defaults: DEFAULT_SESSION_TITLES,
  },
];
 
export default function DropdownSettingsPage({ darkMode }) {
  const [activeKey, setActiveKey] = useState(DROPDOWN_CATEGORIES[0].key);
  const category = DROPDOWN_CATEGORIES.find((c) => c.key === activeKey);
  const { options, loading } = useDropdownOptions(activeKey, category.defaults);
 
  const [newValue, setNewValue] = useState("");
  const [editingIndex, setEditingIndex] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
 
  const card = darkMode
    ? "bg-gray-900 border border-gray-800 text-white"
    : "bg-white border border-gray-100 text-gray-800";
  const input = darkMode
    ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500"
    : "bg-white border-gray-200 text-gray-800 placeholder-gray-400";
  const subtle = darkMode ? "text-gray-400" : "text-gray-500";
  const ghostBtn = darkMode
    ? "hover:bg-gray-800 text-gray-300"
    : "hover:bg-gray-100 text-gray-600";
 
  async function save(list) {
    setSaving(true);
    setError("");
    try {
      await setDoc(
        doc(db, "dropdown_options", activeKey),
        { options: list, updatedAt: serverTimestamp() },
        { merge: true }
      );
      return true;
    } catch (e) {
      console.error(e);
      setError("Could not save changes. Check your connection or Firestore rules.");
      return false;
    } finally {
      setSaving(false);
    }
  }
 
  const exists = (value, ignoreIndex = -1) =>
    options.some(
      (o, i) => i !== ignoreIndex && o.toLowerCase() === value.toLowerCase()
    );
 
  const isReserved = (value) =>
    (category.reserved || []).some((r) => r.toLowerCase() === value.toLowerCase());
 
  async function handleAdd(e) {
    e.preventDefault();
    const value = newValue.trim();
    if (!value) return;
    if (isReserved(value))
      return setError(`"${value}" is added automatically and cannot be managed here.`);
    if (exists(value)) return setError(`"${value}" already exists.`);
    if (await save([...options, value])) setNewValue("");
  }
 
  async function handleRename(index) {
    const value = editValue.trim();
    if (!value) return;
    if (isReserved(value))
      return setError(`"${value}" is added automatically and cannot be managed here.`);
    if (exists(value, index)) return setError(`"${value}" already exists.`);
    const next = options.map((o, i) => (i === index ? value : o));
    if (await save(next)) setEditingIndex(null);
  }
 
  async function handleDelete(index) {
    const value = options[index];
    if (!window.confirm(`Delete "${value}"? Existing records that used it will not be changed.`)) return;
    await save(options.filter((_, i) => i !== index));
  }
 
  async function handleMove(index, dir) {
    const target = index + dir;
    if (target < 0 || target >= options.length) return;
    const next = [...options];
    [next[index], next[target]] = [next[target], next[index]];
    await save(next);
  }
 
  async function handleReset() {
    if (!window.confirm("Reset this list to its default values?")) return;
    await save(category.defaults);
  }
 
  function switchCategory(key) {
    setActiveKey(key);
    setEditingIndex(null);
    setNewValue("");
    setError("");
  }
 
  return (
    <div className="max-w-5xl mx-auto grid gap-4 md:grid-cols-[240px_1fr]">
      {/* Category list */}
      <div className={`rounded-2xl p-3 shadow-sm h-fit ${card}`}>
        <p className={`text-xs font-semibold uppercase tracking-wide px-2 pb-2 ${subtle}`}>
          Dropdown Lists
        </p>
        <div className="space-y-1">
          {DROPDOWN_CATEGORIES.map((c) => (
            <button
              key={c.key}
              onClick={() => switchCategory(c.key)}
              className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition ${
                activeKey === c.key
                  ? "bg-pink-500 text-white shadow-md shadow-pink-400/30"
                  : ghostBtn
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>
 
      {/* Editor */}
      <div className={`rounded-2xl p-4 sm:p-6 shadow-sm ${card}`}>
        <div className="flex flex-wrap items-start justify-between gap-2 mb-4">
          <div>
            <h3 className="text-lg font-bold">{category.label}</h3>
            <p className={`text-xs ${subtle}`}>{category.hint}</p>
          </div>
          <button
            onClick={handleReset}
            disabled={saving}
            className={`text-xs px-3 py-2 rounded-lg transition ${ghostBtn}`}
          >
            Reset to default
          </button>
        </div>
 
        <form onSubmit={handleAdd} className="flex gap-2 mb-4">
          <input
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            placeholder="Add a new option..."
            className={`flex-1 min-w-0 rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-pink-400 ${input}`}
          />
          <button
            type="submit"
            disabled={saving || !newValue.trim()}
            className="bg-pink-600 hover:bg-pink-500 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-sm font-medium shadow-md transition"
          >
            Add
          </button>
        </form>
 
        {error && (
          <p className="mb-3 text-sm text-red-500" role="alert">
            {error}
          </p>
        )}
 
        {loading ? (
          <p className={`text-sm ${subtle}`}>Loading...</p>
        ) : options.length === 0 ? (
          <p className={`text-sm ${subtle}`}>This list is empty.</p>
        ) : (
          <ul className="space-y-2">
            {options.map((opt, i) => (
              <li
                key={`${opt}-${i}`}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${
                  darkMode ? "border-gray-800 bg-gray-800/50" : "border-gray-100 bg-gray-50"
                }`}
              >
                {editingIndex === i ? (
                  <>
                    <input
                      autoFocus
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleRename(i);
                        if (e.key === "Escape") setEditingIndex(null);
                      }}
                      className={`flex-1 min-w-0 rounded-lg border px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-pink-400 ${input}`}
                    />
                    <button
                      onClick={() => handleRename(i)}
                      disabled={saving}
                      className="text-xs px-3 py-1 rounded-lg bg-pink-600 text-white hover:bg-pink-500"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingIndex(null)}
                      className={`text-xs px-3 py-1 rounded-lg ${ghostBtn}`}
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 min-w-0 truncate text-sm">{opt}</span>
                    <button
                      onClick={() => handleMove(i, -1)}
                      disabled={saving || i === 0}
                      aria-label="Move up"
                      className={`px-2 py-1 rounded-lg disabled:opacity-30 ${ghostBtn}`}
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => handleMove(i, 1)}
                      disabled={saving || i === options.length - 1}
                      aria-label="Move down"
                      className={`px-2 py-1 rounded-lg disabled:opacity-30 ${ghostBtn}`}
                    >
                      ↓
                    </button>
                    <button
                      onClick={() => {
                        setEditingIndex(i);
                        setEditValue(opt);
                        setError("");
                      }}
                      className={`text-xs px-3 py-1 rounded-lg ${ghostBtn}`}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(i)}
                      disabled={saving}
                      className="text-xs px-3 py-1 rounded-lg text-red-500 hover:bg-red-500/10"
                    >
                      Delete
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
 
        <p className={`mt-4 text-xs ${subtle}`}>
          Renaming or deleting an option does not update existing records;
          only new entries use the updated list.
        </p>
      </div>
    </div>
  );
}
 
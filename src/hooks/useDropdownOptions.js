// src/hooks/useDropdownOptions.js
import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/firebase";

/**
 * Subscribes (live) to the options of a single dropdown stored in Firestore.
 * - Collection: dropdown_options, Doc ID: <key>, Field: options (array of strings)
 * - If the document does not exist yet (or a read error occurs), `fallback`
 *   is returned, so forms keep working even with an empty database.
 *
 * Usage:
 *   const { options } = useDropdownOptions("programs", DEFAULT_PROGRAMS);
 *   <select>{options.map((o) => <option key={o} value={o}>{o}</option>)}</select>
 */
export default function useDropdownOptions(key, fallback = []) {
  const [options, setOptions] = useState(fallback);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, "dropdown_options", key),
      (snap) => {
        const data = snap.exists() ? snap.data().options : null;
        setOptions(Array.isArray(data) && data.length ? data : fallback);
        setLoading(false);
      },
      () => {
        setOptions(fallback);
        setLoading(false);
      }
    );
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { options, loading };
}
import React, { useState, useEffect, useRef } from 'react';
import { refApi } from '../api';
import { Plus, Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function DynamicReferenceSelect({
  label,
  referenceType,
  value,
  onChange,
  onBlur,
  placeholder = "Select option...",
  preloadedOptions = null,
  parentId = null,
  className
}) {
  const [options, setOptions] = useState(preloadedOptions || []);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!preloadedOptions) {
      loadOptions();
    } else {
      setOptions(preloadedOptions);
    }
  }, [referenceType, preloadedOptions]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        if (onBlur) onBlur();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onBlur]);

  const loadOptions = () => {
    setLoading(true);
    refApi.getAll(referenceType).then(data => {
      setOptions(data);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  };

  const handleCreate = async () => {
    if (!search.trim()) return;
    try {
      setLoading(true);
      const newRef = await refApi.create({
        reference_data_type: referenceType,
        label: search.trim(),
        key: `${referenceType.toLowerCase()}_${Date.now()}`,
        parent_reference_id: parentId
      });
      setOptions([...options, newRef]);
      onChange(newRef.id);
      setSearch("");
      setIsOpen(false);
    } catch (err) {
      console.error("Failed to create ref", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredOptions = options.filter(opt => {
    const matchesSearch = opt.label.toLowerCase().includes(search.toLowerCase());
    const matchesParent = parentId ? Number(opt.parent_reference_id) === Number(parentId) : true;
    return matchesSearch && matchesParent;
  });

  const showCreateOption = search.trim() && !options.some(
    opt => opt.label.toLowerCase() === search.trim().toLowerCase()
  );

  const selectedOption = options.find(opt => Number(opt.id) === Number(value));

  return (
    <div className={cn("relative w-full", className)} ref={dropdownRef}>
      {label && (
        <label className="block text-xs font-medium text-[var(--color-foreground)] mb-1.5">{label}</label>
      )}

      {/* Trigger */}
      <div
        className={cn(
          "flex items-center justify-between w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-sm cursor-pointer transition-all hover:border-[var(--color-primary)]/50 focus-within:ring-2 focus-within:ring-[var(--color-ring)] focus-within:border-transparent",
          className ? "border-transparent bg-transparent hover:border-transparent ring-0 rounded-none h-full focus-within:ring-0 focus-within:border-transparent p-0 px-2" : ""
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={cn("truncate", !selectedOption && "text-[var(--color-muted-foreground)]")}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronsUpDown size={15} className="text-[var(--color-muted-foreground)] flex-shrink-0 ml-1" />
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl shadow-lg overflow-hidden flex flex-col">
          {/* Search */}
          <div className="p-2 border-b border-[var(--color-border)] bg-[var(--color-muted)]">
            <input
              type="text"
              className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-card)] px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-[var(--color-ring)] transition-all placeholder:text-[var(--color-muted-foreground)] text-[var(--color-foreground)]"
              placeholder="Search or add new…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              autoFocus
            />
          </div>

          {/* Options */}
          <div className="max-h-48 overflow-y-auto">
            {loading && (
              <div className="py-4 text-center text-xs text-[var(--color-muted-foreground)]">Loading…</div>
            )}

            {!loading && filteredOptions.length === 0 && !showCreateOption && (
              <div className="py-4 text-center text-xs text-[var(--color-muted-foreground)]">No options found.</div>
            )}

            {!loading && filteredOptions.map(opt => (
              <div
                key={opt.id}
                className={cn(
                  "flex items-center justify-between px-3 py-2 text-sm cursor-pointer transition-colors",
                  value === opt.id
                    ? "bg-[var(--color-primary)]/8 text-[var(--color-primary)]"
                    : "text-[var(--color-foreground)] hover:bg-[var(--color-muted)]"
                )}
                onClick={() => { onChange(opt.id); setIsOpen(false); setSearch(""); }}
              >
                <span className="truncate">{opt.label}</span>
                {value === opt.id && <Check size={13} className="text-[var(--color-primary)] flex-shrink-0" />}
              </div>
            ))}

            {showCreateOption && !loading && (
              <div
                className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer text-[var(--color-primary)] hover:bg-[var(--color-primary)]/8 border-t border-[var(--color-border)] font-medium transition-colors"
                onClick={(e) => { e.stopPropagation(); handleCreate(); }}
              >
                <Plus size={13} />
                <span>Add "{search}"</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

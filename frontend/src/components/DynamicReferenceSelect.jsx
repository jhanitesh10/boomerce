import React, { useState, useEffect, useRef } from 'react';
import { refApi } from '../api';
import { Plus, Check, ChevronsUpDown } from 'lucide-react';

export default function DynamicReferenceSelect({ 
  label, 
  referenceType, 
  value, 
  onChange, 
  placeholder = "Select option..." 
}) {
  const [options, setOptions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    loadOptions();
  }, [referenceType]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
        key: `${referenceType.toLowerCase()}_${Date.now()}`
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

  const filteredOptions = options.filter(opt => 
    opt.label.toLowerCase().includes(search.toLowerCase())
  );
  
  const showCreateOption = search.trim() && !options.some(
    opt => opt.label.toLowerCase() === search.trim().toLowerCase()
  );

  const selectedOption = options.find(opt => opt.id === value);

  return (
    <div className="component-dropdown" ref={dropdownRef}>
      <label className="form-label">{label}</label>
      <div 
        className="form-select flex-row-between"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="truncate">
          {selectedOption ? selectedOption.label : <span className="opacity-50">{placeholder}</span>}
        </span>
        <ChevronsUpDown size={16} className="opacity-50" />
      </div>

      {isOpen && (
        <div className="dropdown-menu">
          <div className="dropdown-search-wrapper">
            <input 
              type="text" 
              className="form-input text-sm"
              placeholder="Search or add new..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              autoFocus
            />
          </div>
          
          <div className="dropdown-options">
            {loading && <div className="p-sm text-center opacity-50">Loading...</div>}

            {!loading && filteredOptions.length === 0 && !showCreateOption && (
              <div className="p-sm text-center opacity-50">No options found.</div>
            )}

            {!loading && filteredOptions.map(opt => (
              <div 
                key={opt.id}
                className="dropdown-item flex-row-between"
                onClick={() => {
                  onChange(opt.id);
                  setIsOpen(false);
                  setSearch("");
                }}
              >
                <span className="truncate">{opt.label}</span>
                {value === opt.id && <Check size={14} className="color-success" />}
              </div>
            ))}

            {showCreateOption && !loading && (
              <div 
                className="dropdown-item flex-row-start color-primary create-new"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCreate();
                }}
              >
                <Plus size={14} /> <span>Add new "{search}"</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

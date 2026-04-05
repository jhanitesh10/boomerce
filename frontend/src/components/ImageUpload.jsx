import React, { useState, useRef } from 'react';
import { uploadApi } from '../api';
import { UploadCloud, X, RefreshCw } from 'lucide-react';

export default function ImageUpload({ label, value, onChange }) {
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setLoading(true);
      const res = await uploadApi.uploadImage(file);
      onChange(res.url);
    } catch (err) {
      console.error("Upload failed", err);
      alert("Failed to upload image.");
    } finally {
      setLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemove = () => {
    onChange("");
  };

  return (
    <div className="form-group mb-4">
      <label className="form-label">{label}</label>
      <div className="image-upload-wrapper mt-1">
        {value ? (
          <div className="relative border rounded-lg overflow-hidden group border-[var(--border-color)]">
            <img 
              src={value} 
              alt="Uploaded Preview" 
              className="w-full h-40 object-cover object-center bg-[var(--bg-color)]" 
            />
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity gap-4">
              <button 
                type="button"
                className="btn-icon bg-white text-black rounded-full p-2 hover:bg-gray-200 shadow-lg"
                onClick={() => fileInputRef.current?.click()}
                title="Replace"
              >
                <RefreshCw size={18} />
              </button>
              <button 
                type="button"
                className="btn-icon bg-red-500 text-white rounded-full p-2 hover:bg-red-600 shadow-lg"
                onClick={handleRemove}
                title="Remove"
              >
                <X size={18} />
              </button>
            </div>
            {loading && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center text-white text-sm font-semibold">
                Uploading...
              </div>
            )}
          </div>
        ) : (
          <div 
            className={`border-2 border-dashed border-[var(--border-color)] rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-500 hover:bg-opacity-5 transition-colors ${loading ? 'opacity-50 pointer-events-none' : ''}`}
            onClick={() => fileInputRef.current?.click()}
          >
            <UploadCloud size={32} className="text-gray-400 mb-2" />
            <span className="text-sm text-gray-500 mb-1">{loading ? 'Uploading...' : 'Click to Upload Image'}</span>
            <span className="text-xs text-gray-400">JPG, PNG, WEBP</span>
          </div>
        )}
        <input 
          type="file" 
          accept="image/*" 
          ref={fileInputRef} 
          className="hidden" 
          onChange={handleFileChange} 
        />
      </div>
    </div>
  );
}

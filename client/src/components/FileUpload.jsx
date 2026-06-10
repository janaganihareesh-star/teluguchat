import { useRef, useState } from 'react';
import { FaPaperclip, FaTimes } from 'react-icons/fa';
import api from '../services/api';

const FileUpload = ({ onFileSelected, token }) => {
  const fileInputRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
      setPreview(URL.createObjectURL(selected));
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const { data } = await api.post('/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        }
      });
      onFileSelected(data.url);
      setPreview(null);
      setFile(null);
    } catch (err) {
      console.error(err);
      alert('Upload failed');
    }
    setUploading(false);
  };

  return (
    <div className="relative">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
        accept="image/*,video/mp4" 
      />
      <button 
        type="button" 
        onClick={() => fileInputRef.current.click()} 
        className="p-2 text-slate-500 hover:text-slate-700 transition"
      >
        <FaPaperclip />
      </button>

      {preview && (
        <div className="absolute bottom-full mb-2 bg-white p-3 rounded-2xl shadow-xl left-0 w-48 border border-slate-200 z-50 text-slate-800">
          <button 
            onClick={() => { setPreview(null); setFile(null); }} 
            className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 rounded-full p-1 text-xs text-white"
          >
            <FaTimes />
          </button>
          {file.type.startsWith('video') ? (
            <video src={preview} className="w-full h-auto rounded mb-2" controls />
          ) : (
            <img src={preview} alt="preview" className="w-full h-auto rounded mb-2" />
          )}
          <button 
            onClick={handleUpload} 
            disabled={uploading} 
            className="w-full bg-blue-600 text-white rounded py-1 text-sm font-bold disabled:bg-gray-600"
          >
            {uploading ? 'Uploading...' : 'Send File'}
          </button>
        </div>
      )}
    </div>
  );
};

export default FileUpload;

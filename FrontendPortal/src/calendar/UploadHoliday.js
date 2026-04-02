import React, { useState} from 'react';
import { toast } from 'react-toastify';
import { Upload, X, FileSpreadsheet } from 'lucide-react';

const API_BASE = process.env.REACT_APP_API_BASE_URL;

const UploadHoliday = ({ onClose }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleUpload = async (file) => {
    if (!file) {
      toast.error('Please select a file first');
      return;
    }

    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast.error('Only CSV files are accepted');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API_BASE}/holidays/upload-csv`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('File upload failed');
      }

      // const data = await response.json();
      //console.log('File uploaded successfully:', data);
      toast.success('Holidays uploaded successfully!');
      onClose && onClose();
    } catch (error) {
      //console.error('Error uploading file:', error);
      toast.error(error.message + ' Please try again.');
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.name.toLowerCase().endsWith('.csv')) {
      setFile(droppedFile);
    } else {
      toast.error('Please drop a CSV file');
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-xl w-full max-w-md mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Upload Holidays</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X size={24} />
          </button>
        )}
      </div>

      <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center mb-6 transition-all
          ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'}
          ${error ? 'border-red-300 bg-red-50' : ''}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept=".csv"
          onChange={(e) => setFile(e.target.files[0])}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        
        <div className="space-y-4">
          <div className="flex justify-center">
            {file ? (
              <FileSpreadsheet size={48} className="text-green-500" />
            ) : (
              <Upload size={48} className="text-blue-500" />
            )}
          </div>
          
          <div className="text-sm text-gray-600">
            {file ? (
              <p className="font-medium text-green-600">{file.name}</p>
            ) : (
              <>
                <p className="font-medium">Drop your CSV file here or click to browse</p>
                <p className="text-gray-400 mt-1">Only .CSV files are accepted
                  <span className='text-red-600'>*</span>
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-3">
        <button
          onClick={onClose}
          className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={() => handleUpload(file)}
          disabled={loading || !file}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white transition-colors
            ${loading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'}
          `}
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Uploading...
            </>
          ) : (
            <>
              <Upload size={20} />
              Upload
            </>
          )}
        </button>
      </div>
    </div>
  )
}
export default UploadHoliday;

import React, { useState, useRef, useEffect } from 'react';
import { 
  PlusCircle, 
  Trash2, 
  Move, 
  BarChart3, 
  PieChart, 
  Grid3x3, 
  FileText, 
  TrendingUp,
  Download,
  Eye,
  ChevronDown,
  Calendar,
  Building2,
  Clock,
  Users,
  DollarSign,
  Brain,
  UserCheck,
  Edit3,
  Save,
  Plus,
  Minus,
  Image as ImageIcon,
  Upload,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Crop,
  X
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

// FIXED: Safer Chart.js import approach
let Chart, Bar, Line, Pie, Doughnut;
let chartJsAvailable = false;

// Use dynamic imports only in browser environment
if (typeof window !== 'undefined') {
  try {
    const ChartJS = require('chart.js/auto');
    const ReactChartJS = require('react-chartjs-2');
    
    if (ChartJS && ReactChartJS) {
      Chart = ChartJS.Chart || ChartJS;
      Bar = ReactChartJS.Bar;
      Line = ReactChartJS.Line;
      Pie = ReactChartJS.Pie;
      Doughnut = ReactChartJS.Doughnut;
      
      // Register Chart.js components
      if (ChartJS.registerables) {
        Chart.register(...ChartJS.registerables);
        chartJsAvailable = true;
      } else if (ChartJS.CategoryScale) {
        Chart.register(
          ChartJS.CategoryScale,
          ChartJS.LinearScale,
          ChartJS.BarElement,
          ChartJS.LineElement,
          ChartJS.ArcElement,
          ChartJS.PointElement,
          ChartJS.Title,
          ChartJS.Tooltip,
          ChartJS.Legend
        );
        chartJsAvailable = true;
      }
    }
  } catch (error) {
    // console.warn('Chart.js not available, using fallback charts:', error.message);
    chartJsAvailable = false;
    
    // Set components to null to prevent rendering issues
    Chart = null;
    Bar = null;
    Line = null;
    Pie = null;
    Doughnut = null;
  }
}

// PDF-specific styles
const pdfStyles = `
  .pdf-enhanced {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
    line-height: 1.6 !important;
    color: #000 !important;
    width: 794px !important;
    max-width: 794px !important;
    margin: 0 auto !important;
    background: white !important;
    padding: 40px !important;
    box-sizing: border-box !important;
  }
  
  .pdf-enhanced h1 {
    font-size: 32px !important;
    font-weight: 700 !important;
    margin: 20px 0 !important;
    text-align: center !important;
    color: #000 !important;
  }
  
  .pdf-enhanced h2 {
    font-size: 28px !important;
    font-weight: 600 !important;
    margin: 18px 0 !important;
    color: #000 !important;
  }
  
  .pdf-enhanced h3 {
    font-size: 24px !important;
    font-weight: 600 !important;
    margin: 16px 0 !important;
    color: #000 !important;
  }
  
  .pdf-enhanced h4 {
    font-size: 20px !important;
    font-weight: 600 !important;
    margin: 14px 0 !important;
    color: #000 !important;
  }
  
  .pdf-enhanced p, .pdf-enhanced span, .pdf-enhanced div {
    font-size: 14px !important;
    line-height: 1.6 !important;
    color: #000 !important;
  }
  
  .pdf-enhanced .lucide, .pdf-enhanced svg {
    width: 24px !important;
    height: 24px !important;
    stroke-width: 2 !important;
  }
  
  .pdf-enhanced table {
    width: 100% !important;
    border-collapse: collapse !important;
    margin: 20px 0 !important;
    font-size: 12px !important;
  }
  
  .pdf-enhanced td, .pdf-enhanced th {
    padding: 12px 8px !important;
    border: 1px solid #dee2e6 !important;
    font-size: 12px !important;
  }
  
  .pdf-enhanced th {
    background-color: #f8f9fa !important;
    font-weight: 600 !important;
  }
  
  .pdf-enhanced img {
    max-width: 100% !important;
    height: auto !important;
    margin: 20px auto !important;
    display: block !important;
  }
  
  .pdf-enhanced .chart-container {
    min-height: 400px !important;
    margin: 20px 0 !important;
    page-break-inside: avoid !important;
  }
  
  .pdf-enhanced canvas {
    width: 100% !important;
    height: auto !important;
    max-width: 100% !important;
  }
`;

// Fallback Chart Component
const FallbackChart = ({ data, height = 400 }) => {
  const maxValue = Math.max(...data.datasets[0].data);
  
  return (
    <div className="border border-gray-200 rounded-lg bg-gray-50 p-4 chart-container" style={{ height: `${height}px` }}>
      <div className="h-full flex items-end justify-around">
        {data.labels.map((label, index) => {
          const value = data.datasets[0].data[index];
          const barHeight = (value / maxValue) * (height - 120);
          const color = data.datasets[0].backgroundColor[index] || '#3B82F6';
          
          return (
            <div key={index} className="flex flex-col items-center">
              <div className="text-xs text-gray-600 mb-2 font-medium">{value}</div>
              <div 
                className="w-12 rounded-t transition-all duration-500"
                style={{ 
                  height: `${barHeight}px`,
                  backgroundColor: color
                }}
              ></div>
              <div className="text-xs text-gray-700 mt-2 text-center font-medium">{label}</div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 text-center">
        <div className="text-sm font-medium text-gray-800">{data.datasets[0].label}</div>
      </div>
    </div>
  );
};

// Fallback Pie Chart Component
const FallbackPieChart = ({ data, height = 300 }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let currentAngle = -90; // Start from top

  return (
    <div className="flex items-center justify-center chart-container" style={{ height: `${height}px` }}>
      <div className="relative">
        <svg width="200" height="200" className="transform">
          {data.map((item, index) => {
            const angle = (item.value / total) * 360;
            const startAngle = currentAngle;
            const endAngle = currentAngle + angle;
            
            const x1 = 100 + 80 * Math.cos((startAngle * Math.PI) / 180);
            const y1 = 100 + 80 * Math.sin((startAngle * Math.PI) / 180);
            const x2 = 100 + 80 * Math.cos((endAngle * Math.PI) / 180);
            const y2 = 100 + 80 * Math.sin((endAngle * Math.PI) / 180);
            
            const largeArc = angle > 180 ? 1 : 0;
            
            const pathData = [
              `M 100 100`,
              `L ${x1} ${y1}`,
              `A 80 80 0 ${largeArc} 1 ${x2} ${y2}`,
              'Z'
            ].join(' ');
            
            currentAngle += angle;
            
            return (
              <path
                key={index}
                d={pathData}
                fill={item.color}
                stroke="#ffffff"
                strokeWidth="2"
                className="transition-all duration-300 hover:opacity-80"
              />
            );
          })}
        </svg>
      </div>
      <div className="ml-8">
        {data.map((item, index) => (
          <div key={index} className="flex items-center mb-2">
            <div 
              className="w-4 h-4 rounded mr-2"
              style={{ backgroundColor: item.color }}
            ></div>
            <span className="text-sm text-gray-700 font-medium">{item.name}: {item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Enhanced Image Section Component with Editing
const ImageSection = ({ section, updateSection, isPreview }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [imageEditor, setImageEditor] = useState({
    scale: 1,
    rotation: 0,
    brightness: 100,
    contrast: 100,
    crop: { x: 0, y: 0, width: 100, height: 100 }
  });
  const fileInputRef = useRef();

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        updateSection(section.id, 'data', {
          ...section.data,
          imageUrl: e.target.result,
          imageName: file.name,
          originalImage: e.target.result
        });
        setImageEditor({
          scale: 1,
          rotation: 0,
          brightness: 100,
          contrast: 100,
          crop: { x: 0, y: 0, width: 100, height: 100 }
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const applyImageEdits = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // Calculate dimensions based on crop and scale
      const cropWidth = (img.width * imageEditor.crop.width) / 100;
      const cropHeight = (img.height * imageEditor.crop.height) / 100;
      const cropX = (img.width * imageEditor.crop.x) / 100;
      const cropY = (img.height * imageEditor.crop.y) / 100;
      
      canvas.width = cropWidth * imageEditor.scale;
      canvas.height = cropHeight * imageEditor.scale;
      
      // Apply transformations
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((imageEditor.rotation * Math.PI) / 180);
      ctx.filter = `brightness(${imageEditor.brightness}%) contrast(${imageEditor.contrast}%)`;
      
      // Draw the image
      ctx.drawImage(
        img,
        cropX, cropY, cropWidth, cropHeight,
        -canvas.width / 2, -canvas.height / 2,
        canvas.width, canvas.height
      );
      
      const editedImageUrl = canvas.toDataURL('image/png', 0.9);
      updateSection(section.id, 'data', {
        ...section.data,
        imageUrl: editedImageUrl
      });
      
      setIsEditing(false);
    };
    
    img.src = section.data.originalImage || section.data.imageUrl;
  };

  const resetImage = () => {
    if (section.data.originalImage) {
      updateSection(section.id, 'data', {
        ...section.data,
        imageUrl: section.data.originalImage
      });
      setImageEditor({
        scale: 1,
        rotation: 0,
        brightness: 100,
        contrast: 100,
        crop: { x: 0, y: 0, width: 100, height: 100 }
      });
    }
  };

  return (
    <div>
      {isPreview && <h3 className="text-2xl font-semibold mb-6 text-gray-900 border-b pb-2">{section.title}</h3>}
      
      <div className="bg-white rounded-xl border shadow-sm p-6">
        <div className="flex justify-between items-center mb-4">
          {isPreview ? (
            <h4 className="text-lg font-semibold text-gray-800">Image</h4>
          ) : (
            <input
              type="text"
              value={section.data.caption || 'Image Caption'}
              onChange={(e) => updateSection(section.id, 'data', {...section.data, caption: e.target.value})}
              className="text-lg font-semibold bg-transparent border-none outline-none text-gray-800 focus:bg-gray-50 px-2 py-1 rounded"
              placeholder="Image Caption"
            />
          )}
          
          {!isPreview && (
            <div className="flex gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition-colors flex items-center gap-1"
              >
                <Upload size={16} />
                Upload
              </button>
              
              {section.data.imageUrl && (
                <>
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600 transition-colors flex items-center gap-1"
                  >
                    <Edit3 size={16} />
                    Edit
                  </button>
                  
                  <button
                    onClick={resetImage}
                    className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600 transition-colors flex items-center gap-1"
                  >
                    <RotateCw size={16} />
                    Reset
                  </button>
                </>
              )}
            </div>
          )}
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
        </div>

        {/* Image Display */}
        <div className="mb-4">
          {section.data.imageUrl ? (
            <div className="relative">
              <img
                src={section.data.imageUrl}
                alt={section.data.caption || 'Uploaded image'}
                className="max-w-full h-auto rounded-lg shadow-sm mx-auto"
                style={{
                  maxHeight: section.data.maxHeight || '400px',
                  width: section.data.width || 'auto'
                }}
              />
              {isPreview && section.data.caption && (
                <p className="text-sm text-gray-600 text-center mt-2 italic">
                  {section.data.caption}
                </p>
              )}
            </div>
          ) : (
            <div className="border-2 border-dashed border-gray-300 rounded-lg h-64 flex items-center justify-center">
              <div className="text-center">
                <ImageIcon size={48} className="mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500 mb-2">No image uploaded</p>
                {!isPreview && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors flex items-center gap-2 mx-auto"
                  >
                    <Upload size={16} />
                    Upload Image
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Image Editor */}
        {!isPreview && isEditing && section.data.imageUrl && (
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <h5 className="text-md font-semibold mb-4 flex items-center gap-2">
              <Edit3 size={18} />
              Image Editor
            </h5>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              {/* Scale */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Scale: {imageEditor.scale.toFixed(1)}x
                </label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setImageEditor({...imageEditor, scale: Math.max(0.1, imageEditor.scale - 0.1)})}
                    className="p-1 bg-gray-200 rounded hover:bg-gray-300"
                  >
                    <ZoomOut size={16} />
                  </button>
                  <input
                    type="range"
                    min="0.1"
                    max="3"
                    step="0.1"
                    value={imageEditor.scale}
                    onChange={(e) => setImageEditor({...imageEditor, scale: parseFloat(e.target.value)})}
                    className="flex-1"
                  />
                  <button
                    onClick={() => setImageEditor({...imageEditor, scale: Math.min(3, imageEditor.scale + 0.1)})}
                    className="p-1 bg-gray-200 rounded hover:bg-gray-300"
                  >
                    <ZoomIn size={16} />
                  </button>
                </div>
              </div>

              {/* Rotation */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rotation: {imageEditor.rotation}°
                </label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setImageEditor({...imageEditor, rotation: (imageEditor.rotation - 90 + 360) % 360})}
                    className="p-1 bg-gray-200 rounded hover:bg-gray-300"
                  >
                    <RotateCw size={16} className="transform rotate-180" />
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    step="15"
                    value={imageEditor.rotation}
                    onChange={(e) => setImageEditor({...imageEditor, rotation: parseInt(e.target.value)})}
                    className="flex-1"
                  />
                  <button
                    onClick={() => setImageEditor({...imageEditor, rotation: (imageEditor.rotation + 90) % 360})}
                    className="p-1 bg-gray-200 rounded hover:bg-gray-300"
                  >
                    <RotateCw size={16} />
                  </button>
                </div>
              </div>

              {/* Brightness */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Brightness: {imageEditor.brightness}%
                </label>
                <input
                  type="range"
                  min="50"
                  max="150"
                  value={imageEditor.brightness}
                  onChange={(e) => setImageEditor({...imageEditor, brightness: parseInt(e.target.value)})}
                  className="w-full"
                />
              </div>

              {/* Contrast */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contrast: {imageEditor.contrast}%
                </label>
                <input
                  type="range"
                  min="50"
                  max="150"
                  value={imageEditor.contrast}
                  onChange={(e) => setImageEditor({...imageEditor, contrast: parseInt(e.target.value)})}
                  className="w-full"
                />
              </div>
            </div>

            {/* Crop Controls */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Crop size={16} className="inline mr-1" />
                Crop Area
              </label>
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="text-xs text-gray-600">X Position</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={imageEditor.crop.x}
                    onChange={(e) => setImageEditor({
                      ...imageEditor,
                      crop: {...imageEditor.crop, x: parseInt(e.target.value) || 0}
                    })}
                    className="w-full px-2 py-1 text-xs border rounded"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600">Y Position</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={imageEditor.crop.y}
                    onChange={(e) => setImageEditor({
                      ...imageEditor,
                      crop: {...imageEditor.crop, y: parseInt(e.target.value) || 0}
                    })}
                    className="w-full px-2 py-1 text-xs border rounded"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600">Width %</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={imageEditor.crop.width}
                    onChange={(e) => setImageEditor({
                      ...imageEditor,
                      crop: {...imageEditor.crop, width: parseInt(e.target.value) || 100}
                    })}
                    className="w-full px-2 py-1 text-xs border rounded"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600">Height %</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={imageEditor.crop.height}
                    onChange={(e) => setImageEditor({
                      ...imageEditor,
                      crop: {...imageEditor.crop, height: parseInt(e.target.value) || 100}
                    })}
                    className="w-full px-2 py-1 text-xs border rounded"
                  />
                </div>
              </div>
            </div>

            {/* Display Size Controls */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Display Size</label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-600">Max Height (px)</label>
                  <input
                    type="number"
                    min="100"
                    max="800"
                    value={parseInt(section.data.maxHeight) || 400}
                    onChange={(e) => updateSection(section.id, 'data', {
                      ...section.data,
                      maxHeight: e.target.value + 'px'
                    })}
                    className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600">Width</label>
                  <select
                    value={section.data.width || 'auto'}
                    onChange={(e) => updateSection(section.id, 'data', {
                      ...section.data,
                      width: e.target.value
                    })}
                    className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="auto">Auto</option>
                    <option value="25%">25%</option>
                    <option value="50%">50%</option>
                    <option value="75%">75%</option>
                    <option value="100%">100%</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Editor Actions */}
            <div className="flex justify-between">
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors flex items-center gap-2"
              >
                <X size={16} />
                Cancel
              </button>
              
              <div className="flex gap-2">
                <button
                  onClick={resetImage}
                  className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors"
                >
                  Reset to Original
                </button>
                
                <button
                  onClick={applyImageEdits}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors flex items-center gap-2"
                >
                  <Save size={16} />
                  Apply Changes
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Enhanced Summary Section Component
const SummarySection = ({ section, updateSection, isPreview, editMode, toggleEditMode }) => (
  <div>
    {isPreview && <h3 className="text-2xl font-semibold mb-6 text-gray-900 border-b pb-2">{section.title}</h3>}
    <div className="grid md:grid-cols-2 gap-8">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold text-gray-800">Overview</h4>
          {!isPreview && (
            <button
              onClick={() => toggleEditMode(section.id, 'content')}
              className="text-blue-500 hover:text-blue-700 transition-colors p-1 rounded"
            >
              {editMode[`${section.id}-content`] ? <Save size={20} /> : <Edit3 size={20} />}
            </button>
          )}
        </div>
        {isPreview || !editMode[`${section.id}-content`] ? (
          <p className="text-gray-700 leading-relaxed text-justify">{section.data.content}</p>
        ) : (
          <textarea
            value={section.data.content}
            onChange={(e) => updateSection(section.id, 'data', {...section.data, content: e.target.value})}
            className="w-full h-32 p-4 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter summary content..."
          />
        )}
      </div>
      <div>
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold text-gray-800">Key Highlights</h4>
          {!isPreview && (
            <button
              onClick={() => {
                const newBullets = [...section.data.bullets, 'New highlight'];
                updateSection(section.id, 'data', {...section.data, bullets: newBullets});
              }}
              className="text-green-500 hover:text-green-700 transition-colors p-1 rounded"
            >
              <Plus size={20} />
            </button>
          )}
        </div>
        <ul className="space-y-3">
          {section.data.bullets.map((bullet, index) => (
            <li key={index} className="flex items-start gap-3">
              <div className="w-3 h-3 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
              {isPreview ? (
                <span className="text-gray-700">{bullet}</span>
              ) : (
                <div className="flex-1 flex items-center gap-2">
                  <input
                    type="text"
                    value={bullet}
                    onChange={(e) => {
                      const newBullets = [...section.data.bullets];
                      newBullets[index] = e.target.value;
                      updateSection(section.id, 'data', {...section.data, bullets: newBullets});
                    }}
                    className="flex-1 border border-gray-300 outline-none text-gray-700 px-3 py-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {section.data.bullets.length > 1 && (
                    <button
                      onClick={() => {
                        const newBullets = section.data.bullets.filter((_, i) => i !== index);
                        updateSection(section.id, 'data', {...section.data, bullets: newBullets});
                      }}
                      className="text-red-500 hover:text-red-700 transition-colors p-1 rounded"
                    >
                      <Minus size={18} />
                    </button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  </div>
);

// FIXED: Enhanced Chart Section Component with Better Error Handling
const ChartSection = ({ section, updateSection, isPreview, editMode, toggleEditMode }) => {
  const getChartOptions = () => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        display: section.config.showLegend
      },
      title: {
        display: true,
        text: section.data.datasets[0].label
      }
    },
    scales: section.data.chartType !== 'pie' && section.data.chartType !== 'doughnut' ? {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        }
      },
      x: {
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        }
      }
    } : {}
  });

  const chartData = {
    labels: section.data.labels,
    datasets: section.data.datasets
  };

  const renderChart = () => {
    // Always check if components are available before rendering
    if (!chartJsAvailable || !Bar || !Line || !Pie || !Doughnut) {
      return <FallbackChart data={chartData} type={section.data.chartType} height={section.config.height} />;
    }

    try {
      switch (section.data.chartType) {
        case 'bar':
          return <Bar data={chartData} options={getChartOptions()} />;
        case 'line':
          return <Line data={chartData} options={getChartOptions()} />;
        case 'pie':
          return <Pie data={chartData} options={getChartOptions()} />;
        case 'doughnut':
          return <Doughnut data={chartData} options={getChartOptions()} />;
        default:
          return <FallbackChart data={chartData} type={section.data.chartType} height={section.config.height} />;
      }
    } catch (error) {
      // console.error('Chart rendering error:', error);
      return <FallbackChart data={chartData} type={section.data.chartType} height={section.config.height} />;
    }
  };

  return (
    <div>
      {isPreview && <h3 className="text-2xl font-semibold mb-6 text-gray-900 border-b pb-2">{section.title}</h3>}
      <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-8 border">
        <div className="bg-white rounded-xl p-4 mb-6 chart-container" style={{ height: `${section.config.height}px` }}>
          {renderChart()}
        </div>
        {!isPreview && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Chart Type</label>
                <select 
                  value={section.data.chartType}
                  onChange={(e) => updateSection(section.id, 'data', {...section.data, chartType: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="bar">Bar Chart</option>
                  <option value="line">Line Chart</option>
                  <option value="pie">Pie Chart</option>
                  <option value="doughnut">Doughnut Chart</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Data Label</label>
                <input
                  type="text"
                  value={section.data.datasets[0].label}
                  onChange={(e) => {
                    const newDatasets = [...section.data.datasets];
                    newDatasets[0].label = e.target.value;
                    updateSection(section.id, 'data', {...section.data, datasets: newDatasets});
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Data label"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Height (px)</label>
                <input
                  type="number"
                  value={section.config.height}
                  onChange={(e) => updateSection(section.id, 'config', {...section.config, height: parseInt(e.target.value)})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="200"
                  max="800"
                />
              </div>
            </div>
            
            {/* Data editing */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Labels (comma-separated)</label>
                <input
                  type="text"
                  value={section.data.labels.join(', ')}
                  onChange={(e) => {
                    const newLabels = e.target.value.split(', ').map(label => label.trim());
                    updateSection(section.id, 'data', {...section.data, labels: newLabels});
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Label1, Label2, Label3"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Data (comma-separated)</label>
                <input
                  type="text"
                  value={section.data.datasets[0].data.join(', ')}
                  onChange={(e) => {
                    const newData = e.target.value.split(', ').map(val => parseFloat(val.trim()) || 0);
                    const newDatasets = [...section.data.datasets];
                    newDatasets[0].data = newData;
                    updateSection(section.id, 'data', {...section.data, datasets: newDatasets});
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="10, 20, 30, 40"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={section.config.showLegend}
                  onChange={(e) => updateSection(section.id, 'config', {...section.config, showLegend: e.target.checked})}
                  className="rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Show Legend</span>
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Enhanced Data Grid Section Component with Full Editing
const DataGridSection = ({ section, updateSection, isPreview, editMode, toggleEditMode, addTableRow, removeTableRow, addTableColumn, removeTableColumn }) => (
  <div>
    {isPreview && <h3 className="text-2xl font-semibold mb-6 text-gray-900 border-b pb-2">{section.title}</h3>}
    {!isPreview && (
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-lg font-semibold text-gray-800">Data Management</h4>
        <div className="flex gap-2">
          <button
            onClick={() => addTableRow(section.id)}
            className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600 transition-colors flex items-center gap-1"
          >
            <Plus size={16} />
            Add Row
          </button>
          <button
            onClick={() => addTableColumn(section.id)}
            className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition-colors flex items-center gap-1"
          >
            <Plus size={16} />
            Add Column
          </button>
        </div>
      </div>
    )}
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="w-full border-collapse bg-white">
        <thead>
          <tr className="bg-gradient-to-r from-gray-50 to-gray-100">
            {section.data.headers.map((header, index) => (
              <th key={index} className="border-b border-gray-300 px-6 py-4 text-left font-semibold text-gray-900 relative">
                {isPreview ? header : (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={header}
                      onChange={(e) => {
                        const newHeaders = [...section.data.headers];
                        newHeaders[index] = e.target.value;
                        updateSection(section.id, 'data', {...section.data, headers: newHeaders});
                      }}
                      className="w-full bg-transparent border-none outline-none font-semibold text-gray-900"
                    />
                    {section.data.headers.length > 1 && (
                      <button
                        onClick={() => removeTableColumn(section.id, index)}
                        className="text-red-500 hover:text-red-700 transition-colors"
                      >
                        <Minus size={16} />
                      </button>
                    )}
                  </div>
                )}
              </th>
            ))}
            {!isPreview && <th className="w-16"></th>}
          </tr>
        </thead>
        <tbody>
          {section.data.rows.map((row, rowIndex) => (
            <tr key={rowIndex} className={`${rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors`}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="border-b border-gray-200 px-6 py-4">
                  {isPreview ? (
                    <span className="text-gray-700">{cell}</span>
                  ) : (
                    <input
                      type="text"
                      value={cell}
                      onChange={(e) => {
                        const newRows = [...section.data.rows];
                        newRows[rowIndex][cellIndex] = e.target.value;
                        updateSection(section.id, 'data', {...section.data, rows: newRows});
                      }}
                      className="w-full bg-transparent border-none outline-none text-gray-700 focus:bg-white px-2 py-1 rounded"
                    />
                  )}
                </td>
              ))}
              {!isPreview && (
                <td className="border-b border-gray-200 px-2 py-4">
                  {section.data.rows.length > 1 && (
                    <button
                      onClick={() => removeTableRow(section.id, rowIndex)}
                      className="text-red-500 hover:text-red-700 transition-colors p-1 rounded"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

// Enhanced KPI Section Component
const KPISection = ({ section, updateSection, isPreview, editMode, toggleEditMode }) => (
  <div>
    {isPreview && <h3 className="text-2xl font-semibold mb-6 text-gray-900 border-b pb-2">{section.title}</h3>}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {section.data.metrics.map((metric, index) => (
        <div key={index} className="bg-gradient-to-br from-white to-gray-50 rounded-xl p-6 border shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-3">
            {isPreview ? (
              <h4 className="text-sm font-medium text-gray-600 uppercase tracking-wide">{metric.label}</h4>
            ) : (
              <input
                type="text"
                value={metric.label}
                onChange={(e) => {
                  const newMetrics = [...section.data.metrics];
                  newMetrics[index].label = e.target.value;
                  updateSection(section.id, 'data', {...section.data, metrics: newMetrics});
                }}
                className="text-sm font-medium text-gray-600 bg-transparent border-none outline-none w-full uppercase tracking-wide focus:bg-white px-1 rounded"
              />
            )}
            <div className={`text-xs px-2 py-1 rounded-full font-medium ${
              metric.trend === 'up' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {isPreview ? metric.change : (
                <input
                  type="text"
                  value={metric.change}
                  onChange={(e) => {
                    const newMetrics = [...section.data.metrics];
                    newMetrics[index].change = e.target.value;
                    updateSection(section.id, 'data', {...section.data, metrics: newMetrics});
                  }}
                  className="bg-transparent border-none outline-none w-12 text-center"
                />
              )}
            </div>
          </div>
          {isPreview ? (
            <div className="text-3xl font-bold text-gray-900 mb-2">{metric.value}</div>
          ) : (
            <input
              type="text"
              value={metric.value}
              onChange={(e) => {
                const newMetrics = [...section.data.metrics];
                newMetrics[index].value = e.target.value;
                updateSection(section.id, 'data', {...section.data, metrics: newMetrics});
              }}
              className="text-3xl font-bold text-gray-900 bg-transparent border-none outline-none w-full mb-2 focus:bg-white px-1 rounded"
            />
          )}
          <div className={`h-1 rounded-full ${
            metric.trend === 'up' ? 'bg-green-200' : 'bg-red-200'
          }`}>
            <div className={`h-full rounded-full transition-all duration-500 ${
              metric.trend === 'up' ? 'bg-green-500 w-3/4' : 'bg-red-500 w-1/2'
            }`}></div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Enhanced Detail Box Section Component
const DetailBoxSection = ({ section, updateSection, isPreview, editMode, toggleEditMode }) => (
  <div>
    {isPreview && <h3 className="text-2xl font-semibold mb-6 text-gray-900 border-b pb-2">{section.title}</h3>}
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-8 border-l-4 border-blue-500">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold text-gray-800">Content</h4>
          {!isPreview && (
            <button
              onClick={() => toggleEditMode(section.id, 'content')}
              className="text-blue-500 hover:text-blue-700 transition-colors p-1 rounded"
            >
              {editMode[`${section.id}-content`] ? <Save size={20} /> : <Edit3 size={20} />}
            </button>
          )}
        </div>
        {isPreview || !editMode[`${section.id}-content`] ? (
          <p className="text-gray-700 leading-relaxed text-lg">{section.data.content}</p>
        ) : (
          <textarea
            value={section.data.content}
            onChange={(e) => updateSection(section.id, 'data', {...section.data, content: e.target.value})}
            className="w-full h-32 p-4 bg-white border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter detailed content..."
          />
        )}
      </div>
      <div className="grid md:grid-cols-3 gap-6">
        {section.data.highlights.map((highlight, index) => (
          <div key={index} className="bg-white rounded-xl p-6 shadow-sm border border-blue-100">
            <div className="w-10 h-10 bg-blue-500 rounded-lg mb-4 flex items-center justify-center">
              <div className="w-4 h-4 bg-white rounded-full"></div>
            </div>
            {isPreview ? (
              <p className="text-sm font-medium text-gray-800 leading-relaxed">{highlight}</p>
            ) : (
              <input
                type="text"
                value={highlight}
                onChange={(e) => {
                  const newHighlights = [...section.data.highlights];
                  newHighlights[index] = e.target.value;
                  updateSection(section.id, 'data', {...section.data, highlights: newHighlights});
                }}
                className="w-full text-sm font-medium text-gray-800 bg-transparent border-none outline-none focus:bg-gray-50 px-2 py-1 rounded"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  </div>
);

// Enhanced Chart Box Section Component with Working Chart
const ChartBoxSection = ({ section, updateSection, isPreview, editMode, toggleEditMode }) => {
  const pieData = chartJsAvailable ? {
    labels: section.data.data.map(item => item.name),
    datasets: [{
      data: section.data.data.map(item => item.value),
      backgroundColor: section.data.data.map(item => item.color),
      borderWidth: 2,
      borderColor: '#ffffff'
    }]
  } : null;

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom'
      }
    }
  };

  return (
    <div>
      {isPreview && <h3 className="text-2xl font-semibold mb-6 text-gray-900 border-b pb-2">{section.title}</h3>}
      <div className="bg-white rounded-xl border shadow-sm p-8">
        <div className="flex justify-between items-center mb-6">
          {isPreview ? (
            <h4 className="text-xl font-semibold text-gray-900">{section.data.title}</h4>
          ) : (
            <input
              type="text"
              value={section.data.title}
              onChange={(e) => updateSection(section.id, 'data', {...section.data, title: e.target.value})}
              className="text-xl font-semibold bg-transparent border-none outline-none text-gray-900 focus:bg-gray-50 px-2 py-1 rounded"
            />
          )}
        </div>
        <div className="bg-gray-50 rounded-xl p-4 chart-container" style={{ height: '300px' }}>
          {chartJsAvailable && Pie ? (
            <Pie data={pieData} options={pieOptions} />
          ) : (
            <FallbackPieChart data={section.data.data} height={300} />
          )}
        </div>
        {!isPreview && (
          <div className="mt-6 space-y-4">
            {section.data.data.map((item, index) => (
              <div key={index} className="grid grid-cols-4 gap-2 items-center">
                <input
                  type="text"
                  value={item.name}
                  onChange={(e) => {
                    const newData = [...section.data.data];
                    newData[index].name = e.target.value;
                    updateSection(section.id, 'data', {...section.data, data: newData});
                  }}
                  className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  placeholder="Name"
                />
                <input
                  type="number"
                  value={item.value}
                  onChange={(e) => {
                    const newData = [...section.data.data];
                    newData[index].value = parseInt(e.target.value) || 0;
                    updateSection(section.id, 'data', {...section.data, data: newData});
                  }}
                  className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  placeholder="Value"
                />
                <input
                  type="color"
                  value={item.color}
                  onChange={(e) => {
                    const newData = [...section.data.data];
                    newData[index].color = e.target.value;
                    updateSection(section.id, 'data', {...section.data, data: newData});
                  }}
                  className="w-full h-10 border border-gray-300 rounded cursor-pointer"
                />
                <button
                  onClick={() => {
                    const newData = section.data.data.filter((_, i) => i !== index);
                    if (newData.length > 0) {
                      updateSection(section.id, 'data', {...section.data, data: newData});
                    }
                  }}
                  className="text-red-500 hover:text-red-700 transition-colors p-2 rounded"
                  disabled={section.data.data.length <= 1}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
            <button
              onClick={() => {
                const newData = [...section.data.data, { name: 'New Item', value: 10, color: '#6B7280' }];
                updateSection(section.id, 'data', {...section.data, data: newData});
              }}
              className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-300 hover:text-blue-500 transition-colors flex items-center justify-center gap-2"
            >
              <Plus size={18} />
              Add Data Point
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Enhanced Table Section Component
const TableSection = ({ section, updateSection, isPreview, editMode, toggleEditMode, addTableRow, removeTableRow, addTableColumn, removeTableColumn }) => (
  <div>
    {isPreview && <h3 className="text-2xl font-semibold mb-6 text-gray-900 border-b pb-2">{section.title}</h3>}
    {!isPreview && (
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-lg font-semibold text-gray-800">Table Management</h4>
        <div className="flex gap-2">
          <button
            onClick={() => addTableRow(section.id)}
            className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600 transition-colors flex items-center gap-1"
          >
            <Plus size={16} />
            Add Row
          </button>
          <button
            onClick={() => addTableColumn(section.id)}
            className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition-colors flex items-center gap-1"
          >
            <Plus size={16} />
            Add Column
          </button>
        </div>
      </div>
    )}
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
      <table className="w-full">
        <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
          <tr>
            {section.data.headers.map((header, index) => (
              <th key={index} className="px-8 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                {isPreview ? header : (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={header}
                      onChange={(e) => {
                        const newHeaders = [...section.data.headers];
                        newHeaders[index] = e.target.value;
                        updateSection(section.id, 'data', {...section.data, headers: newHeaders});
                      }}
                      className="w-full bg-transparent border-none outline-none text-sm font-semibold text-gray-700 uppercase tracking-wider"
                    />
                    {section.data.headers.length > 1 && (
                      <button
                        onClick={() => removeTableColumn(section.id, index)}
                        className="text-red-500 hover:text-red-700 transition-colors"
                      >
                        <Minus size={16} />
                      </button>
                    )}
                  </div>
                )}
              </th>
            ))}
            {!isPreview && <th className="w-16"></th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {section.data.rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-gray-50 transition-colors">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-8 py-4 whitespace-nowrap text-sm text-gray-900">
                  {isPreview ? (
                    <span className="font-medium">{cell}</span>
                  ) : (
                    <input
                      type="text"
                      value={cell}
                      onChange={(e) => {
                        const newRows = [...section.data.rows];
                        newRows[rowIndex][cellIndex] = e.target.value;
                        updateSection(section.id, 'data', {...section.data, rows: newRows});
                      }}
                      className="w-full bg-transparent border-none outline-none text-sm text-gray-900 font-medium focus:bg-white px-2 py-1 rounded"
                    />
                  )}
                </td>
              ))}
              {!isPreview && (
                <td className="px-2 py-4">
                  {section.data.rows.length > 1 && (
                    <button
                      onClick={() => removeTableRow(section.id, rowIndex)}
                      className="text-red-500 hover:text-red-700 transition-colors p-1 rounded"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

// MAIN COMPONENT
const Template = () => {
  const [sections, setSections] = useState([]);
  const [isPreview, setIsPreview] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [editMode, setEditMode] = useState({});
  const previewRef = useRef();
  
  const [reportMetadata, setReportMetadata] = useState({
    title: 'ADD TITLE FOR REPORT ',
    description: 'ADD DESCRIPTION',
    period: 'ADD MONTH',
    reportType: 'monthly',
    department: 'HR',
    generatedBy: 'HR Admin'
  });

  const [dropdownStates, setDropdownStates] = useState({
    department: false,
    month: false,
    reportType: false
  });

  // Inject PDF styles when component mounts
  useEffect(() => {
    const styleSheet = document.createElement("style");
    styleSheet.innerText = pdfStyles;
    document.head.appendChild(styleSheet);
    
    return () => {
      if (document.head.contains(styleSheet)) {
        document.head.removeChild(styleSheet);
      }
    };
  }, []);

  // Department options with icons
  const departmentOptions = [
    { value: 'HR', label: 'Human Resources', icon: Users, color: 'text-blue-600' },
    { value: 'employee', label: 'Employee Management', icon: UserCheck, color: 'text-green-600' },
    { value: 'timesheet', label: 'Timesheet', icon: Clock, color: 'text-purple-600' },
    { value: 'ai-tracker', label: 'AI Tracker', icon: Brain, color: 'text-orange-600' },
    { value: 'leave', label: 'Leave Management', icon: Calendar, color: 'text-cyan-600' },
    { value: 'expense', label: 'Expense Management', icon: DollarSign, color: 'text-pink-600' }
  ];

  // Month options
  const monthOptions = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Year options
  const yearOptions = ['2024', '2025', '2026'];

  // Report type options
  const reportTypeOptions = [
    { value: 'monthly', label: 'Monthly Report', period: 'month' },
    { value: 'yearly', label: 'Yearly Report', period: 'year' }
  ];

  // Component types available for HR to add
  const componentTypes = [
    { type: 'summary', icon: FileText, label: 'Summary Section', color: 'bg-blue-500' },
    { type: 'chart', icon: BarChart3, label: 'Interactive Chart', color: 'bg-green-500' },
    { type: 'dataGrid', icon: Grid3x3, label: 'Data Grid', color: 'bg-purple-500' },
    { type: 'kpi', icon: TrendingUp, label: 'KPI Cards', color: 'bg-orange-500' },
    { type: 'detailBox', icon: FileText, label: 'Detail Box', color: 'bg-cyan-500' },
    { type: 'chartBox', icon: PieChart, label: 'Chart Box', color: 'bg-pink-500' },
    { type: 'table', icon: Grid3x3, label: 'Editable Table', color: 'bg-indigo-500' },
    { type: 'image', icon: ImageIcon, label: 'Image Section', color: 'bg-red-500' }
  ];

  const toggleDropdown = (dropdown, event) => {
    if (event) {
      event.stopPropagation();
    }
    setDropdownStates(prev => ({
      ...prev,
      [dropdown]: !prev[dropdown]
    }));
  };

  const closeAllDropdowns = () => {
    setDropdownStates({
      department: false,
      month: false,
      reportType: false
    });
  };

  const selectOption = (field, value) => {
    setReportMetadata(prev => ({
      ...prev,
      [field]: value
    }));
    closeAllDropdowns();
  };

  const toggleEditMode = (sectionId, field) => {
    setEditMode(prev => ({
      ...prev,
      [`${sectionId}-${field}`]: !prev[`${sectionId}-${field}`]
    }));
  };

  const addSection = (type) => {
    const newSection = {
      id: Date.now(),
      type,
      title: `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
      data: getDefaultData(type),
      config: getDefaultConfig(type)
    };
    setSections([...sections, newSection]);
  };

  const getDefaultData = (type) => {
    switch (type) {
      case 'summary':
        return {
          content: `${reportMetadata.reportType === 'monthly' ? 'Monthly' : 'Yearly'} ADD SUMMARY ${reportMetadata.department}.`,
          bullets: [
            `${reportMetadata.department} ADD HIGHLIGHTS`,
            'ADD HIGHLIGHTS',
            'ADD HIGHLIGHTS'
          ]
        };
      case 'chart':
        return {
          chartType: 'bar',
          labels: reportMetadata.reportType === 'monthly' 
            ? ['LABEL 1', 'LABEL 2', 'LABEL 3', 'LABEL 4']
            : ['Q1', 'Q2', 'Q3', 'Q4'],
          datasets: [{
            label: `${reportMetadata.department} Performance`,
            data: reportMetadata.reportType === 'monthly' ? [45, 52, 48, 61] : [180, 220, 195, 245],
            backgroundColor: ['rgba(59, 130, 246, 0.8)', 'rgba(16, 185, 129, 0.8)', 'rgba(245, 158, 11, 0.8)', 'rgba(139, 92, 246, 0.8)'],
            borderColor: ['rgb(59, 130, 246)', 'rgb(16, 185, 129)', 'rgb(245, 158, 11)', 'rgb(139, 92, 246)'],
            borderWidth: 2
          }]
        };
      case 'dataGrid':
        return {
          headers: ['ID', 'Name', 'Department', 'Status', 'Performance'],
          rows: [
            ['E1', 'ENAME', reportMetadata.department, 'Active', '0/5'],
            ['E2', 'ENAME', reportMetadata.department, 'Active', '0/5'],
            ['E3', 'ENAME', reportMetadata.department, 'Active', '0/5']
          ]
        };
      case 'kpi':
        return {
          metrics: [
            { label: `${reportMetadata.department} ADD LABEL`, value: '45', change: '+5%', trend: 'up' },
            { label: 'ADD LABEL', value: '94.2%', change: '+2.1%', trend: 'up' },
            { label: 'ADD LABEL', value: '4.6/5', change: '+0.3', trend: 'up' },
            { label: `${reportMetadata.reportType === 'monthly' ? 'Monthly' : 'Yearly'} ADD LABEL`, value: '87%', change: '+12%', trend: 'up' }
          ]
        };
      case 'detailBox':
        return {
          content: `ADD DETAILS ${reportMetadata.reportType} ${reportMetadata.department}.`,
          highlights: [
            `${reportMetadata.department} ADD HIGHLIGHTS`,
            'ADD HIGHLIGHTS',
            'ADD HIGHLIGHTS'
          ]
        };
      case 'chartBox':
        return {
          chartType: 'pie',
          title: `${reportMetadata.department} Distribution`,
          data: [
            { name: 'ADD DATA', value: 45, color: '#3B82F6' },
            { name: 'ADD DATA', value: 25, color: '#10B981' },
            { name: 'ADD DATA', value: 30, color: '#F59E0B' }
          ]
        };
      case 'table':
        return {
          headers: ['Metric', `Current ${reportMetadata.reportType === 'monthly' ? 'Month' : 'Year'}`, `Previous ${reportMetadata.reportType === 'monthly' ? 'Month' : 'Year'}`, 'Change'],
          rows: [
            ['ADD METRICS', '4.5', '4.2', '+0.3'],
            ['ADD METRICS', '94%', '89%', '+5%'],
            ['ADD METRICS', '87', '82', '+5'],
            ['ADD METRICS', '92%', '85%', '+7%']
          ]
        };
      case 'image':
        return {
          imageUrl: null,
          originalImage: null,
          imageName: null,
          caption: 'Image Caption',
          maxHeight: '400px',
          width: 'auto'
        };
      default:
        return {};
    }
  };

  const getDefaultConfig = (type) => {
    switch (type) {
      case 'chart':
        return { 
          height: 400, 
          showLegend: true, 
          responsive: true,
          maintainAspectRatio: false
        };
      case 'dataGrid':
        return { pageSize: 10, sortable: true, filterable: true };
      case 'kpi':
        return { columns: 4, showTrends: true };
      case 'table':
        return { striped: true, bordered: true, hover: true };
      case 'image':
        return { 
          resizable: true, 
          editable: true,
          showCaption: true 
        };
      default:
        return {};
    }
  };

  const updateSection = (id, field, value) => {
    setSections(sections.map(section => 
      section.id === id ? { ...section, [field]: value } : section
    ));
  };

  const deleteSection = (id) => {
    setSections(sections.filter(section => section.id !== id));
  };

  const addTableRow = (sectionId) => {
    const section = sections.find(s => s.id === sectionId);
    if (section && section.data.headers) {
      const newRow = new Array(section.data.headers.length).fill('New Cell');
      updateSection(sectionId, 'data', {
        ...section.data,
        rows: [...section.data.rows, newRow]
      });
    }
  };

  const removeTableRow = (sectionId, rowIndex) => {
    const section = sections.find(s => s.id === sectionId);
    if (section && section.data.rows.length > 1) {
      const newRows = section.data.rows.filter((_, index) => index !== rowIndex);
      updateSection(sectionId, 'data', {
        ...section.data,
        rows: newRows
      });
    }
  };

  const addTableColumn = (sectionId) => {
    const section = sections.find(s => s.id === sectionId);
    if (section) {
      const newHeaders = [...section.data.headers, 'New Column'];
      const newRows = section.data.rows.map(row => [...row, 'New Cell']);
      updateSection(sectionId, 'data', {
        headers: newHeaders,
        rows: newRows
      });
    }
  };

  const removeTableColumn = (sectionId, columnIndex) => {
    const section = sections.find(s => s.id === sectionId);
    if (section && section.data.headers.length > 1) {
      const newHeaders = section.data.headers.filter((_, index) => index !== columnIndex);
      const newRows = section.data.rows.map(row => 
        row.filter((_, index) => index !== columnIndex)
      );
      updateSection(sectionId, 'data', {
        headers: newHeaders,
        rows: newRows
      });
    }
  };

// ENHANCED PDF GENERATION WITH PROPER SIZING AND LAYOUT
const generatePDF = async () => {
  if (!previewRef.current) return;
  
  setIsGeneratingPDF(true);
  try {
    const element = previewRef.current;
    
    // Create a temporary container for PDF-optimized content
    const pdfContainer = document.createElement('div');
    pdfContainer.style.cssText = `
      position: absolute;
      top: -10000px;
      left: -10000px;
      width: 794px;
      background: white;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      line-height: 1.6;
      color: #000;
      padding: 40px;
      box-sizing: border-box;
    `;
    
    // Clone the content
    const clonedElement = element.cloneNode(true);
    
    // Enhance all elements for PDF
    const allElements = clonedElement.querySelectorAll('*');
    allElements.forEach((el) => {
      // Remove any hidden elements or edit controls
      if (el.style.display === 'none' || 
          el.classList.contains('hidden') ||
          el.tagName === 'BUTTON' ||
          el.type === 'button' ||
          el.classList.contains('hover:') ||
          el.querySelector('button')) {
        el.remove();
        return;
      }
      
      // Enhance text sizes
      if (el.tagName === 'H1') {
        el.style.cssText += 'font-size: 32px !important; font-weight: 700 !important; margin: 20px 0 !important; text-align: center !important;';
      } else if (el.tagName === 'H2') {
        el.style.cssText += 'font-size: 28px !important; font-weight: 600 !important; margin: 18px 0 !important;';
      } else if (el.tagName === 'H3') {
        el.style.cssText += 'font-size: 24px !important; font-weight: 600 !important; margin: 16px 0 !important;';
      } else if (el.tagName === 'H4') {
        el.style.cssText += 'font-size: 20px !important; font-weight: 600 !important; margin: 14px 0 !important;';
      } else if (el.tagName === 'P' || el.tagName === 'SPAN' || el.tagName === 'DIV') {
        el.style.cssText += 'font-size: 14px !important; line-height: 1.6 !important;';
      }
      
      // Enhance icons
      if (el.tagName === 'svg') {
        const currentWidth = parseInt(el.getAttribute('width')) || 16;
        const newSize = Math.max(24, currentWidth * 2);
        el.setAttribute('width', newSize);
        el.setAttribute('height', newSize);
        el.style.cssText += `width: ${newSize}px !important; height: ${newSize}px !important;`;
      }
      
      // Enhance charts
      if (el.classList.contains('chart-container') || el.querySelector('canvas')) {
        el.style.cssText += 'min-height: 400px !important; margin: 20px 0 !important; page-break-inside: avoid !important;';
      }
      
      // Enhance tables
      if (el.tagName === 'TABLE') {
        el.style.cssText += 'width: 100% !important; border-collapse: collapse !important; margin: 20px 0 !important; font-size: 12px !important;';
      } else if (el.tagName === 'TH') {
        el.style.cssText += 'padding: 12px 8px !important; background-color: #f8f9fa !important; border: 1px solid #dee2e6 !important; font-weight: 600 !important; font-size: 12px !important;';
      } else if (el.tagName === 'TD') {
        el.style.cssText += 'padding: 10px 8px !important; border: 1px solid #dee2e6 !important; font-size: 12px !important;';
      }
      
      // Enhance images
      if (el.tagName === 'IMG') {
        el.style.cssText += 'max-width: 100% !important; height: auto !important; margin: 20px auto !important; display: block !important;';
      }
      
      // Remove interactive elements
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') {
        const value = el.value || el.textContent || el.placeholder || '';
        const span = document.createElement('span');
        span.textContent = value;
        span.style.cssText = el.style.cssText + 'border: none !important; background: transparent !important;';
        el.parentNode?.replaceChild(span, el);
      }
    });
    
    // Add proper spacing and structure
    clonedElement.style.cssText += `
      width: 100% !important;
      max-width: none !important;
      margin: 0 !important;
      padding: 0 !important;
      background: white !important;
    `;
    
    pdfContainer.appendChild(clonedElement);
    document.body.appendChild(pdfContainer);
    
    // Wait for content to render
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Generate canvas with high quality settings
    const canvas = await html2canvas(pdfContainer, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      width: 794,
      height: pdfContainer.scrollHeight,
      scrollX: 0,
      scrollY: 0,
      logging: false,
      letterRendering: true,
      removeContainer: true
    });
    
    // Remove temporary container
    document.body.removeChild(pdfContainer);
    
    const imgData = canvas.toDataURL('image/jpeg', 0.98);
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    const pdfWidth = 210; // A4 width in mm
    const pdfHeight = 297; // A4 height in mm
    const margin = 15; // margins
    const contentWidth = pdfWidth - (margin * 2);
    const contentHeight = pdfHeight - (margin * 2);
    
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    
    // Calculate scaling to fit content properly
    const ratio = contentWidth / (canvasWidth * 0.264583); // Convert pixels to mm
    const scaledHeight = (canvasHeight * 0.264583) * ratio;
    
    if (scaledHeight <= contentHeight) {
      // Single page
      const yPosition = margin + (contentHeight - scaledHeight) / 2; // Center vertically
      pdf.addImage(imgData, 'JPEG', margin, yPosition, contentWidth, scaledHeight);
    } else {
      // Multiple pages
      const pageHeight = contentHeight;
      const pagesNeeded = Math.ceil(scaledHeight / pageHeight);
      
      for (let i = 0; i < pagesNeeded; i++) {
        if (i > 0) {
          pdf.addPage();
        }
        
        const sourceY = (i * pageHeight) / ratio / 0.264583;
        const sourceHeight = Math.min(pageHeight / ratio / 0.264583, canvasHeight - sourceY);
        
        if (sourceHeight > 0) {
          const pageCanvas = document.createElement('canvas');
          const pageCtx = pageCanvas.getContext('2d');
          pageCanvas.width = canvasWidth;
          pageCanvas.height = sourceHeight;
          
          pageCtx.drawImage(
            canvas,
            0, sourceY,
            canvasWidth, sourceHeight,
            0, 0,
            canvasWidth, sourceHeight
          );
          
          const pageImgData = pageCanvas.toDataURL('image/jpeg', 0.98);
          const actualHeight = Math.min(pageHeight, scaledHeight - (i * pageHeight));
          
          pdf.addImage(pageImgData, 'JPEG', margin, margin, contentWidth, actualHeight);
        }
      }
    }
    
    // Add metadata
    pdf.setProperties({
      title: reportMetadata.title,
      subject: reportMetadata.description,
      author: reportMetadata.generatedBy,
      keywords: `${reportMetadata.department}, ${reportMetadata.period}, HR Report`,
      creator: 'HR Report Builder'
    });
    
    // Generate filename with timestamp
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const filename = `${reportMetadata.title.replace(/\s+/g, '_')}_${reportMetadata.period.replace(/\s+/g, '_')}_${timestamp}.pdf`;

    pdf.save(filename);
    
  } catch (error) {
    // console.error('Error generating PDF:', error);
    alert('Error generating PDF. Please try again.');
  } finally {
    setIsGeneratingPDF(false);
  }
};

  const getCurrentDepartment = () => {
    return departmentOptions.find(dept => dept.value === reportMetadata.department) || departmentOptions[0];
  };

  const renderSectionContent = (section) => {
    switch (section.type) {
      case 'summary':
        return <SummarySection section={section} updateSection={updateSection} isPreview={isPreview} editMode={editMode} toggleEditMode={toggleEditMode} />;
      case 'chart':
        return <ChartSection section={section} updateSection={updateSection} isPreview={isPreview} editMode={editMode} toggleEditMode={toggleEditMode} />;
      case 'dataGrid':
        return <DataGridSection section={section} updateSection={updateSection} isPreview={isPreview} editMode={editMode} toggleEditMode={toggleEditMode} addTableRow={addTableRow} removeTableRow={removeTableRow} addTableColumn={addTableColumn} removeTableColumn={removeTableColumn} />;
      case 'kpi':
        return <KPISection section={section} updateSection={updateSection} isPreview={isPreview} editMode={editMode} toggleEditMode={toggleEditMode} />;
      case 'detailBox':
        return <DetailBoxSection section={section} updateSection={updateSection} isPreview={isPreview} editMode={editMode} toggleEditMode={toggleEditMode} />;
      case 'chartBox':
        return <ChartBoxSection section={section} updateSection={updateSection} isPreview={isPreview} editMode={editMode} toggleEditMode={toggleEditMode} />;
      case 'table':
        return <TableSection section={section} updateSection={updateSection} isPreview={isPreview} editMode={editMode} toggleEditMode={toggleEditMode} addTableRow={addTableRow} removeTableRow={removeTableRow} addTableColumn={addTableColumn} removeTableColumn={removeTableColumn} />;
      case 'image':
        return <ImageSection section={section} updateSection={updateSection} isPreview={isPreview} editMode={editMode} toggleEditMode={toggleEditMode} />;
      default:
        return <div>Unknown section type</div>;
    }
  };

  // Get the current department data
  const currentDepartment = getCurrentDepartment();
  const DepartmentIcon = currentDepartment.icon;

  return (
    <div className="min-h-screen bg-gray-50 p-6" onClick={closeAllDropdowns}>
      <div className="max-w-7xl mx-auto">
       

        {/* Header Configuration */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-start mb-6">
            <div className="flex-1">
              <input
                type="text"
                value={reportMetadata.title}
                onChange={(e) => setReportMetadata({...reportMetadata, title: e.target.value})}
                className="text-3xl font-bold text-gray-900 bg-transparent border-none outline-none w-full mb-2 focus:bg-gray-50 px-2 py-1 rounded"
                placeholder="Report Title"
              />
              <textarea
                value={reportMetadata.description}
                onChange={(e) => setReportMetadata({...reportMetadata, description: e.target.value})}
                className="text-lg text-gray-600 bg-gray-50 px-3 py-2 rounded border w-full resize-none focus:ring-2 focus:ring-blue-500"
                placeholder="Report Description"
                rows="2"
              />
            </div>
            <div className="flex gap-2 ml-6">
              <button
                onClick={() => setIsPreview(!isPreview)}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                  isPreview ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <Eye size={20} />
                {isPreview ? 'Edit' : 'Preview'}
              </button>
              <button
                onClick={generatePDF}
                disabled={isGeneratingPDF}
                className={`px-4 py-2 bg-green-600 text-white rounded-lg flex items-center gap-2 hover:bg-green-700 transition-colors ${
                  isGeneratingPDF ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <Download size={20} />
                {isGeneratingPDF ? 'Generating...' : 'Export PDF'}
              </button>
            </div>
          </div>

          {/* Configuration Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Department Dropdown */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <button
                onClick={(e) => toggleDropdown('department', e)}
                className="w-full flex items-center justify-between px-4 py-2 bg-white border border-gray-300 rounded-lg hover:border-gray-400 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <DepartmentIcon size={20} className={currentDepartment.color} />
                  <span className="text-gray-900">{currentDepartment.label}</span>
                </div>
                <ChevronDown size={20} className={`text-gray-500 transition-transform ${
                  dropdownStates.department ? 'rotate-180' : ''
                }`} />
              </button>
              {dropdownStates.department && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
                  {departmentOptions.map((option) => {
                    const OptionIcon = option.icon;
                    return (
                      <button
                        key={option.value}
                        onClick={(e) => {
                          e.stopPropagation();
                          selectOption('department', option.value);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                      >
                        <OptionIcon size={20} className={option.color} />
                        <span className="text-gray-900">{option.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Report Type Dropdown */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">Report Type</label>
              <button
                onClick={(e) => toggleDropdown('reportType', e)}
                className="w-full flex items-center justify-between px-4 py-2 bg-white border border-gray-300 rounded-lg hover:border-gray-400 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Calendar size={20} className="text-indigo-600" />
                  <span className="text-gray-900">
                    {reportTypeOptions.find(rt => rt.value === reportMetadata.reportType)?.label}
                  </span>
                </div>
                <ChevronDown size={20} className={`text-gray-500 transition-transform ${
                  dropdownStates.reportType ? 'rotate-180' : ''
                }`} />
              </button>
              {dropdownStates.reportType && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
                  {reportTypeOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={(e) => {
                        e.stopPropagation();
                        selectOption('reportType', option.value);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                    >
                      <Calendar size={20} className="text-indigo-600" />
                      <span className="text-gray-900">{option.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Period Selection */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {reportMetadata.reportType === 'monthly' ? 'Month' : 'Year'}
              </label>
              <button
                onClick={(e) => toggleDropdown('month', e)}
                className="w-full flex items-center justify-between px-4 py-2 bg-white border border-gray-300 rounded-lg hover:border-gray-400 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Clock size={20} className="text-purple-600" />
                  <span className="text-gray-900">{reportMetadata.period}</span>
                </div>
                <ChevronDown size={20} className={`text-gray-500 transition-transform ${
                  dropdownStates.month ? 'rotate-180' : ''
                }`} />
              </button>
              {dropdownStates.month && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {(reportMetadata.reportType === 'monthly' ? monthOptions : yearOptions).map((option) => (
                    <button
                      key={option}
                      onClick={(e) => {
                        e.stopPropagation();
                        selectOption('period', option + (reportMetadata.reportType === 'monthly' ? ' 2025' : ''));
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                    >
                      <Clock size={20} className="text-purple-600" />
                      <span className="text-gray-900">{option}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Generated By */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Generated By</label>
              <input
                type="text"
                value={reportMetadata.generatedBy}
                onChange={(e) => setReportMetadata({...reportMetadata, generatedBy: e.target.value})}
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Generated By"
              />
            </div>
          </div>

          <div className="mt-4 text-sm text-gray-500 flex items-center gap-2">
            <Building2 size={20} />
            Report generated on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
          </div>
        </div>

        {/* Component Palette */}
        {!isPreview && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <PlusCircle size={24} />
              Add Components
            </h3>
            <div className="flex flex-wrap gap-3">
              {componentTypes.map((component) => {
                const Icon = component.icon;
                return (
                  <button
                    key={component.type}
                    onClick={() => addSection(component.type)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white transition-all hover:scale-105 hover:shadow-lg ${component.color}`}
                  >
                    <Icon size={20} />
                    {component.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Report Content */}
        <div 
          ref={previewRef} 
          className={`${isPreview ? 'bg-white pdf-enhanced' : ''}`}
          style={{ 
            minWidth: isPreview ? '210mm' : 'auto',
            maxWidth: isPreview ? '210mm' : 'none',
            margin: isPreview ? '0 auto' : '0'
          }}
        >
          {isPreview && (
            <div className="bg-white p-8 mb-6 rounded-lg shadow-sm">
              <div className="text-center mb-8 border-b pb-6">
                <h1 className="text-4xl font-bold text-gray-900 mb-2">{reportMetadata.title}</h1>
                <p className="text-lg text-gray-600 mb-4">{reportMetadata.description}</p>
                <div className="flex justify-center items-center gap-6 text-sm text-gray-500">
                  <div className="flex items-center gap-2">
                    <DepartmentIcon size={20} className={currentDepartment.color} />
                    <span>{currentDepartment.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar size={20} className="text-indigo-600" />
                    <span>{reportMetadata.period}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building2 size={20} className="text-gray-500" />
                    <span>Generated by {reportMetadata.generatedBy}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Report Sections */}
          <div className="space-y-6">
            {sections.map((section) => (
              <div key={section.id} className={`${isPreview ? 'bg-white' : 'bg-white rounded-lg shadow-sm'} overflow-hidden`}>
                {!isPreview && (
                  <div className="bg-gray-50 px-6 py-3 border-b flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <Move className="text-gray-400 cursor-move hover:text-gray-600" size={20} />
                      <input
                        type="text"
                        value={section.title}
                        onChange={(e) => updateSection(section.id, 'title', e.target.value)}
                        className="font-medium text-gray-900 bg-transparent border-none outline-none focus:bg-white px-2 py-1 rounded"
                      />
                    </div>
                    <button
                      onClick={() => deleteSection(section.id)}
                      className="text-red-500 hover:text-red-700 transition-colors p-1 rounded hover:bg-red-50"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                )}
                <div className={`${isPreview ? 'p-8' : 'p-6'}`}>
                  {renderSectionContent(section)}
                </div>
              </div>
            ))}

            {sections.length === 0 && !isPreview && (
              <div className="text-center py-12 text-gray-500 bg-white rounded-lg shadow-sm">
                <FileText size={48} className="mx-auto mb-4 opacity-50" />
                <h3 className="text-xl font-medium mb-2">No sections added yet</h3>
                <p>Click on the components above to start building your report</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Template;

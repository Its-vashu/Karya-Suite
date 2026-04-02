import React, {useState} from 'react'
import { Briefcase, X, Calendar, User, Code, FileText } from 'lucide-react';
import { toast } from 'react-toastify';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_BASE_URL;

const AddProject = ({ onClose }) => {
    const [loading, setLoading] = useState(true);

    const [formData, setFormData] = useState({
        project_name: '',
        description: '',
        start_date: '',
        end_date: '',
        client_name: '',
        project_code: '',
        status: 'Active'
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        // console.log('Submitting form data:', formData);

        if (!formData.project_name || !formData.description || !formData.start_date || !formData.end_date || !formData.client_name || !formData.project_code) {
          toast.error('Please fill all required fields');
          return;
        }
        setLoading(true);
    
        try {
          const response = await fetch(`${API_BASE}/project`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              project_name: formData.project_name,
              description: formData.description,
              start_date: formData.start_date,
              end_date: formData.end_date,
              client_name: formData.client_name,
              project_code: formData.project_code,
                status: formData.status
            }),
          });
    
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to create project. Please try again.');
          }
    
          const data = await response.json();
        //   console.log('Project created successfully:', data);
          toast.success('Project created successfully!');
          onClose && onClose();
        } catch (error) {
        //   console.error('Error creating Project:', error);
          toast.error(error.message || 'Failed to create project');
          
          // Log the form data for debugging
        //   console.log('Form data that failed:', {
        //     project_name: formData.project_name,
        //     description: formData.description,
        //     start_date: formData.start_date,
        //     end_date: formData.end_date,
        //     client_name: formData.client_name,
        //     project_code: formData.project_code
        //   });
        } finally {
          setLoading(false);
        }
      };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
                {/* Header */}
                <div className="flex justify-between items-center p-3 border-b">
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        Add New Project
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X className="h-6 w-6 text-gray-500" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="px-4 py-2 space-y-2">
                    <div className="">
                        <div>
                            <label className="block text-gray-700 text-sm font-bold mb-1">
                                Project Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                label="Project Name"
                                type="text"
                                placeholder="Enter project name"
                                value={formData.project_name}
                                onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
                                className='border p-2 rounded-lg w-full'
                                required
                            />
                        </div>
                       

                        <div className="relative w-full mb-2">
                            <label className="block text-gray-700 text-sm font-bold mb-2">
                                Project Description <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <div className="absolute top-3 left-3 pointer-events-none">
                                    <FileText className="h-5 w-5 text-gray-400" />
                                </div>
                                <textarea
                                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    placeholder="Enter project description"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    rows="3"
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-gray-700 text-sm font-bold mb-1">
                                    Start Date <span className="text-red-500">*</span>
                                </label>
                                <input
                                    label="Start Date"
                                    type="date"
                                    value={formData.start_date}
                                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                    className='border p-2 rounded-lg w-full'
                                    required
                                />
                            </div>
                            <div>
                                 <label className="block text-gray-700 text-sm font-bold mb-1">
                                    Deadline Date <span className="text-red-500">*</span>
                                </label>
                                <input
                                    label="End Date"
                                    type="date"
                                    value={formData.end_date}
                                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                    className='border p-2 rounded-lg w-full'
                                    required
                                />
                            </div>  
                        </div>
                        <div className="grid grid-cols-2 gap-4 mt-1 pb-2">
                            <div>
                                <label className="block text-gray-700 text-sm font-bold mb-1">
                                    Client Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    label="Client Name"
                                    type="text"
                                    placeholder="Enter client name"
                                    value={formData.client_name}
                                    onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                                    className='border p-2 rounded-lg w-full'
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-gray-700 text-sm font-bold mb-1">
                                    Project Code <span className="text-red-500">*</span>
                                </label>
                                <input
                                    label="Project Code"
                                    type="text"
                                    placeholder="Enter project code"
                                    value={formData.project_code}
                                    onChange={(e) => setFormData({ ...formData, project_code: e.target.value })}
                                    className='border p-2 rounded-lg w-full'
                                    required
                                />
                            </div>
                        </div>
                        

                        
                    </div>

                    {/* Footer with buttons */}
                    <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
                        >
                            <Briefcase className="h-5 w-5" />
                            Add Project
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default AddProject;

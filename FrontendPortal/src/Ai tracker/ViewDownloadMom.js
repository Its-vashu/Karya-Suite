import React, { useRef } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

export const ViewDownloadMom = ({ details, onClose }) => {
  const printRef = useRef();
  
  if (!details) return null;

  //console.log('Details received in ViewDownloadMom:', details);

  // Helper function to parse comma-separated strings
  const parseAttendees = (attendeeData) => {
    //console.log('🔍 parseAttendees input:', attendeeData, 'Type:', typeof attendeeData);
    
    if (!attendeeData) return [];
    
    if (Array.isArray(attendeeData)) {
      return attendeeData.filter(item => item && item.toString().trim() !== '');
    }
    
    if (typeof attendeeData === 'string') {
      return attendeeData.split(',').map(name => name.trim()).filter(name => name !== '');
    }
    
    try {
      const stringified = String(attendeeData);
      if (stringified === '[object Object]') {
        return [];
      }
      return stringified.split(',').map(name => name.trim()).filter(name => name !== '');
    } catch (error) {
      //console.warn('Could not parse attendees:', attendeeData);
      alert('Could not parse attendees');
      return [];
    }
  };

  // Helper function to parse remarks
  const parseRemarks = (remarks) => {
    if (!remarks) return [];
    
    if (Array.isArray(remarks)) {
      return remarks;
    }
    
    if (typeof remarks === 'string') {
      try {
        const parsed = JSON.parse(remarks);
        return Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        return [];
      }
    }
    
    return [];
  };

  // Helper function to format remark display
  const formatRemark = (remark) => {
    if (typeof remark === 'string') {
      return {
        text: remark,
        by: 'Unknown',
        remark_date: new Date().toISOString()
      };
    }
    
    return {
      text: remark.text || 'No text',
      by: remark.by || 'Unknown',
      remark_date: remark.remark_date || remark.updated_date || new Date().toISOString()
    };
  };

  // Get all remarks count
  const getRemarksCount = (remarkData) => {
    const remarks = parseRemarks(remarkData);
    return remarks ? remarks.length : 0;
  };

  // Get latest remark from array
  const getLatestRemark = (remarkData) => {
    const remarks = parseRemarks(remarkData);
    if (!remarks || remarks.length === 0) return null;
    
    // Return the last remark (most recent)
    return remarks[remarks.length - 1];
  };

  // Get remark style based on status
  const getRemarkStyle = (status) => {
    switch (status) {
      case 'Completed':
        return {
          bg: 'bg-green-50 border-green-200',
          text: 'text-green-700',
          content: 'text-green-800',
          icon: '✅',
          label: 'Completion Remark'
        };
      case 'In Progress':
        return {
          bg: 'bg-blue-50 border-blue-200',
          text: 'text-blue-700',
          content: 'text-blue-800',
          icon: '🔄',
          label: 'Progress Remark'
        };
      case 'Pending':
        return {
          bg: 'bg-yellow-50 border-yellow-200',
          text: 'text-yellow-700',
          content: 'text-yellow-800',
          icon: '⏳',
          label: 'Pending Remark'
        };
      case 'Cancelled':
        return {
          bg: 'bg-red-50 border-red-200',
          text: 'text-red-700',
          content: 'text-red-800',
          icon: '❌',
          label: 'Cancelled Remark'
        };
      default:
        return {
          bg: 'bg-gray-50 border-gray-200',
          text: 'text-gray-700',
          content: 'text-gray-800',
          icon: '📝',
          label: 'Remark'
        };
    }
  };

  // PDF Download function
  const handleDownload = () => {
    try {
      //console.log('Downloading MOM:', details.id);
      
      const printWindow = window.open('', '_blank');
      
      // Helper functions for generating sections
      function generateInformationSection() {
        const informationData = details.information;
        let informationArray = [];
        
        if (Array.isArray(informationData)) {
          informationArray = informationData;
        } else if (informationData && typeof informationData === 'object') {
          if (informationData.information) {
            informationArray = [{ content: informationData.information, ...informationData }];
          } else {
            informationArray = [informationData];
          }
        }

        if (informationArray.length === 0) return '';

        return `
          <div class="section">
            <h3 class="section-title">ℹ️ Information (${informationArray.length})</h3>
            ${informationArray.map((info, index) => `
              <div class="content-item">
                <strong>• </strong>${info.information || info.content || info.text || info.description || 
                  (typeof info === 'string' ? info : JSON.stringify(info))}
                ${info.created_at ? `<div style="font-size: 11px; color: #666; margin-top: 8px;">📅 Created: ${new Date(info.created_at).toLocaleString()}</div>` : ''}
              </div>
            `).join('')}
          </div>
        `;
      }

      function generateDecisionsSection() {
        const decisionsData = details.decisions;
        let decisionsArray = [];
        
        if (Array.isArray(decisionsData)) {
          decisionsArray = decisionsData;
        } else if (decisionsData && typeof decisionsData === 'object') {
          if (decisionsData.decision) {
            decisionsArray = [{ content: decisionsData.decision, ...decisionsData }];
          } else {
            decisionsArray = [decisionsData];
          }
        }

        if (decisionsArray.length === 0) return '';

        return `
          <div class="section">
            <h3 class="section-title">✅ Key Decisions (${decisionsArray.length})</h3>
            ${decisionsArray.map((decision, index) => `
              <div class="content-item decision-item">
                <strong>${index + 1}. </strong>${decision.decision || decision.content || decision.text || decision.description || 
                  (typeof decision === 'string' ? decision : JSON.stringify(decision))}
                ${decision.created_at ? `<div style="font-size: 11px; color: #666; margin-top: 8px;">📅 Decided: ${new Date(decision.created_at).toLocaleString()}</div>` : ''}
              </div>
            `).join('')}
          </div>
        `;
      }

      function generateActionItemsSection() {
        const actionItemsData = details.actionItems || details.action_items;
        let actionItemsArray = [];
        
        if (Array.isArray(actionItemsData)) {
          actionItemsArray = actionItemsData;
        } else if (actionItemsData && typeof actionItemsData === 'object') {
          actionItemsArray = [actionItemsData];
        }

        if (actionItemsArray.length === 0) return '';

        return `
          <div class="section">
            <h3 class="section-title">🎯 Action Items (${actionItemsArray.length})</h3>
            ${actionItemsArray.map((item, index) => {
              // 🆕 Parse remarks for PDF
              const remarks = parseRemarks(item.remark);
              //console.log(`📝 PDF - Processing remarks for item ${item.id}:`, remarks);
              
              return `
                <div class="content-item action-item">
                  <div style="margin-bottom: 15px;">
                    <strong style="font-size: 14px; color: #2c3e50;">
                      ${item.action_item || item.description || item.text || item.content || 
                        (typeof item === 'string' ? item : JSON.stringify(item))}
                    </strong>
                    ${item.status ? `<span class="status-badge status-${item.status.toLowerCase().replace(' ', '-').replace('_', '-')}" style="margin-left: 10px;">${item.status}</span>` : ''}
                  </div>
                  
                  <div class="action-meta" style="margin-bottom: 15px;">
                    ${(item.assigned_to || item.assignedTo) ? `👤 <strong>Assigned to:</strong> ${item.assigned_to || item.assignedTo}` : ''}
                    ${(item.re_assigned_to || item.reAssignedTo) ? ` | 🔄 <strong>Re-assigned to:</strong> ${item.re_assigned_to || item.reAssignedTo}` : ''}
                    ${(item.due_date || item.dueDate) ? ` | 📅 <strong>Due:</strong> ${new Date(item.due_date || item.dueDate).toLocaleDateString()}` : ''}
                    ${item.meeting_date ? ` | 🗓️ <strong>Meeting:</strong> ${new Date(item.meeting_date).toLocaleDateString()}` : ''}
                    ${item.project ? ` | 📁 <strong>Project:</strong> ${item.project}` : ''}
                  </div>
                  
                  ${/* 🆕 Remarks Section for PDF */ ''}
                  ${remarks.length > 0 ? `
                    <div style="background-color: #f8f9fa; padding: 15px; margin: 15px 0; border-left: 4px solid #17a2b8; border-radius: 6px;">
                      <div style="margin-bottom: 10px;">
                        <strong style="color: #0c5460; font-size: 13px;">💬 REMARKS (${remarks.length})</strong>
                      </div>
                      ${remarks.map((remark, remarkIndex) => {
                        const formattedRemark = formatRemark(remark);
                        return `
                          <div style="background-color: #ffffff; padding: 12px; margin: 8px 0; border-radius: 4px; border: 1px solid #dee2e6;">
                            <div style="margin-bottom: 8px;">
                              <p style="color: #2c3e50; font-size: 13px; line-height: 1.5; margin: 0;">
                                <strong>${remarkIndex + 1}.</strong> ${formattedRemark.text}
                              </p>
                            </div>
                            <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 8px; border-top: 1px solid #f1f3f5;">
                              <span style="color: #6c757d; font-size: 11px;">
                                👤 <strong>By:</strong> ${formattedRemark.by}
                              </span>
                              <span style="color: #6c757d; font-size: 11px;">
                                📅 <strong>Date:</strong> ${new Date(formattedRemark.remark_date).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        `;
                      }).join('')}
                    </div>
                  ` : `
                    <div style="background-color: #f8f9fa; padding: 10px; margin: 10px 0; border-left: 4px solid #6c757d; border-radius: 4px;">
                      <p style="color: #6c757d; font-size: 12px; font-style: italic; margin: 0;">
                        💬 No remarks added
                      </p>
                    </div>
                  `}
                  
                  <div style="font-size: 11px; color: #666; margin-top: 15px; padding-top: 12px; border-top: 1px solid #eee;">
                    ${item.created_at ? `📅 <strong>Created:</strong> ${new Date(item.created_at).toLocaleDateString()}` : ''}
                    ${item.updated_at ? ` | 🔄 <strong>Updated:</strong> ${new Date(item.updated_at).toLocaleDateString()}` : ''}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `;
      }

      // Generate complete HTML content
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>MOM_${details.id}_${details.meeting_date}</title>
          <style>
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              margin: 0;
              padding: 20px;
              line-height: 1.6;
              color: #2c3e50;
              background-color: #ffffff;
              font-size: 12px;
            }
            
            .container {
              max-width: 1000px;
              margin: 0 auto;
              background: white;
              padding: 20px;
              border-radius: 8px;
            }
            
            .header {
              text-align: center;
              border-bottom: 2px solid #3498db;
              padding: 20px 0;
              margin-bottom: 25px;
              background: #f8f9fa;
              border-radius: 6px;
            }
            
            .header h1 {
              color: #2c3e50;
              font-size: 24px;
              margin-bottom: 8px;
              font-weight: 600;
            }
            
            .header h2 {
              color: #3498db;
              font-size: 16px;
              font-weight: 500;
            }
            
            .section {
              margin-bottom: 20px;
              /* 🔧 Fix: Remove page-break-inside: avoid from sections */
              page-break-inside: auto;
              break-inside: auto;
            }
            
            .section-title {
              font-size: 16px;
              font-weight: 600;
              color: #2c3e50;
              border-bottom: 1px solid #e9ecef;
              padding-bottom: 8px;
              margin-bottom: 15px;
              display: flex;
              align-items: center;
              gap: 6px;
              /* 🔧 Keep titles with content */
              page-break-after: avoid;
              break-after: avoid;
            }
            
            .info-grid {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
              gap: 12px;
              padding: 15px;
              background: #f8f9fa;
              border-radius: 6px;
              border: 1px solid #e9ecef;
              margin-bottom: 15px;
            }
            
            .info-item {
              display: flex;
              align-items: flex-start;
              gap: 8px;
              padding: 6px 0;
              font-size: 15px; /* Updated to 15px */
              color: #1f2937; /* gray-900 */
            }
            
            .info-label {
              font-weight: 600;
              color: #1f2937; /* gray-900 */
              min-width: 120px;
              flex-shrink: 0;
            }
            
            .info-value {
              color: #1f2937; /* gray-900 */
              flex: 1;
            }
            
            .attendee-section {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 15px;
              margin-bottom: 15px;
            }
            
            .attendee-column {
              background: #f8f9fa;
              padding: 12px;
              border-radius: 6px;
              border: 1px solid #e9ecef;
            }
            
            .attendee-column h4 {
              margin-bottom: 10px;
              font-size: 13px;
              font-weight: 600;
              padding-bottom: 6px;
              border-bottom: 1px solid #dee2e6;
            }
            
            .attendee-column.present h4 {
              color: #28a745;
            }
            
            .attendee-column.absent h4 {
              color: #dc3545;
            }
            
            .attendee-list {
              list-style: none;
              padding: 0;
              margin: 0;
            }
            
            .attendee-list li {
              padding: 3px 0;
              color: #1f2937; /* gray-900 */
              font-size: 15px; /* Updated to 15px */
              border-bottom: 1px dotted #dee2e6;
            }
            
            .attendee-list li:last-child {
              border-bottom: none;
            }
            
            .content-item {
              background-color: #ffffff;
              padding: 12px;
              margin-bottom: 10px;
              border-left: 4px solid #3498db;
              border-radius: 6px;
              border: 1px solid #e9ecef;
              /* 🔧 Fix: Allow content to break across pages if needed */
              page-break-inside: auto;
              break-inside: auto;
              /* 🔧 But avoid breaking right after title */
              orphans: 2;
              widows: 2;
            }
            
            .decision-item {
              border-left-color: #28a745;
            }
            
            .action-item {
              border-left-color: #fd7e14;
              /* 🔧 Compact action items */
              padding: 10px;
              margin-bottom: 8px;
            }
            
            .action-meta {
              margin-top: 8px;
              padding-top: 8px;
              border-top: 1px solid #e9ecef;
              font-size: 15px;
              color: #1f2937; /* gray-800 */
              line-height: 1.4;
            }
            
            /* 🔧 Remarks Section - More compact */
            .remarks-section {
              background-color: #f8f9fa;
              padding: 12px;
              margin: 12px 0;
              border-left: 4px solid #17a2b8;
              border-radius: 6px;
              font-size: 12px;
              /* Allow remarks to break across pages */
              page-break-inside: auto;
              break-inside: auto;
            }
            
            .remarks-header {
              color: #0c5460;
              font-size: 13px;
              font-weight: 700;
              margin-bottom: 10px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            
            .remark-item {
              background-color: #ffffff;
              padding: 12px;
              margin: 8px 0;
              border-radius: 6px;
              border: 1px solid #dee2e6;
              font-size: 12px;
              /* Allow individual remarks to break */
              page-break-inside: auto;
              break-inside: auto;
            }
            
            .remark-text {
              color: #1a202c !important; /* Much darker color - gray-900 */
              font-size: 13px !important; /* Increased from 10px to 13px */
              line-height: 1.5;
              margin: 0 0 8px 0;
              font-weight: 500; /* Added medium weight */
            }
            
            .remark-meta {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding-top: 6px;
              border-top: 1px solid #f1f3f5;
              font-size: 11px !important; /* Increased from 8px to 11px */
              color: #2d3748 !important; /* Darker color - gray-800 */
              font-weight: 500;
            }
            
            .no-remarks {
              background-color: #f8f9fa;
              padding: 8px;
              margin: 8px 0;
              border-left: 3px solid #6c757d;
              border-radius: 3px;
              color: #6c757d;
              font-size: 10px;
              font-style: italic;
            }
            
            .status-badge {
              display: inline-block;
              padding: 2px 8px;
              border-radius: 12px;
              font-size: 9px;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 0.3px;
              margin-left: 8px;
            }
            
            .status-completed { 
              background-color: #d4edda; 
              color: #155724; 
            }
            
            .status-in-progress,
            .status-progress { 
              background-color: #cce7ff; 
              color: #004085; 
            }
            
            .status-pending { 
              background-color: #fff3cd; 
              color: #856404; 
            }
            
            .status-cancelled { 
              background-color: #f8d7da; 
              color: #721c24; 
            }
            
            .footer {
              margin-top: 30px;
              padding: 15px;
              background: #f8f9fa;
              border-radius: 6px;
              text-align: center;
              font-size: 10px;
              color: #6c757d;
              border: 1px solid #e9ecef;
              /* Keep footer together */
              page-break-inside: avoid;
              break-inside: avoid;
            }
            
            /* 🔧 Enhanced Print Styles */
            @media print {
              body { 
                padding: 10px; 
                background: white; 
                font-size: 15px !important; /* Updated to 15px */
                line-height: 1.4;
                color: #1f2937 !important; /* gray-900 */
              }
              
              .container { 
                box-shadow: none; 
                padding: 0;
                max-width: none;
              }
              
              .header { 
                background: none; 
                border-bottom: 2px solid #333;
                margin-bottom: 20px;
              }
              
              .info-grid { 
                background: none; 
                border: 1px solid #ccc;
                page-break-inside: avoid;
              }
              
              .attendee-column { 
                background: none; 
                border: 1px solid #ccc;
              }
              
              .content-item { 
                box-shadow: none; 
                border: 1px solid #ccc;
                page-break-inside: auto;
                /* 🔧 Prevent orphaned titles */
                orphans: 3;
                widows: 3;
              }
              
              .footer { 
                background: none; 
                border: 1px solid #ccc; 
              }
              
              .remarks-section {
                background-color: #f9f9f9 !important;
                border-left: 3px solid #666 !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              
              .remark-item {
                background-color: #ffffff !important;
                border: 1px solid #999 !important;
              }
              
              .action-meta {
                background-color: transparent !important;
                border-top: 1px solid #ccc !important;
              }
              
              /* 🔧 Force page breaks where needed */
              .section:not(:first-child) {
                margin-top: 15px;
              }
              
              /* 🔧 Prevent awkward breaks */
              .section-title {
                page-break-after: avoid;
                break-after: avoid;
              }
              
              .action-item h4 {
                page-break-after: avoid;
                break-after: avoid;
              }
              
              /* 🔧 Compact spacing for print */
              .section {
                margin-bottom: 15px;
              }
              
              .content-item {
                margin-bottom: 8px;
                padding: 8px;
              }
              
              .action-meta {
                margin-top: 6px;
                padding-top: 6px;
              }
            }
            
            /* 🔧 Specific fixes for action items layout */
            .action-item-header {
              page-break-after: avoid;
              break-after: avoid;
              margin-bottom: 8px;
            }
            
            .action-item-content {
              page-break-inside: auto;
              break-inside: auto;
            }
            
            .action-details-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 8px;
              margin: 8px 0;
              font-size: 10px;
            }
            
            .action-detail-item {
              padding: 4px 0;
              border-bottom: 1px dotted #ddd;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📋 Minutes of Meeting (MOM)</h1>
              <h2>MOM ID: #${details.id}</h2>
            </div>
            
            <div class="section">
              <h3 class="section-title">📋 General Information</h3>
              <div class="info-grid">
                <div class="info-item">
                  <span class="info-label">📅 Date:</span>
                  <span class="info-value">${new Date(details.meeting_date).toLocaleDateString()}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">⏰ Time:</span>
                  <span class="info-value">${details.start_time} - ${details.end_time}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">🎯 Project:</span>
                  <span class="info-value">${details.project}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">📞 Meeting Type:</span>
                  <span class="info-value">${details.meeting_type}</span>
                </div>
                <div class="info-item" style="grid-column: 1 / -1;">
                  <span class="info-label">📍 Venue/Platform:</span>
                  <span class="info-value">${details.location || details.location_link || 'Not specified'}</span>
                </div>
                ${details.other_attendees ? `
                <div class="info-item" style="grid-column: 1 / -1;">
                  <span class="info-label">📧 Other Attendees:</span>
                  <span class="info-value">${details.other_attendees}</span>
                </div>
                ` : ''}
              </div>
            </div>

            <div class="section">
              <h3 class="section-title">👥 Attendees</h3>
              <div class="attendee-section">
                <div class="attendee-column present">
                  <h4>✅ Present (${parseAttendees(details.attendees).length})</h4>
                  <ul class="attendee-list">
                    ${parseAttendees(details.attendees).map(attendee => 
                      `<li>• ${attendee}</li>`
                    ).join('')}
                    ${parseAttendees(details.attendees).length === 0 ? '<li>No attendees listed</li>' : ''}
                  </ul>
                </div>
                <div class="attendee-column absent">
                  <h4>❌ Absent (${parseAttendees(details.absent || details.absentees).length})</h4>
                  <ul class="attendee-list">
                    ${parseAttendees(details.absent || details.absentees).map(absentee => 
                      `<li>• ${absentee}</li>`
                    ).join('')}
                    ${parseAttendees(details.absent || details.absentees).length === 0 ? '<li>No absentees listed</li>' : ''}
                  </ul>
                </div>
              </div>
            </div>

            ${generateInformationSection()}
            ${generateDecisionsSection()}
            ${generateActionItemsSection()}
            
            <div class="footer">
              <p><strong>MOM ID:</strong> #${details.id} | <strong>Generated on:</strong> ${new Date().toLocaleDateString()}</p>
              <p>This document was automatically generated from the MOM system.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      // Write content and trigger print
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      
      printWindow.onload = function() {
        setTimeout(() => {
          printWindow.print();
          setTimeout(() => printWindow.close(), 1000);
        }, 500);
      };

    } catch (error) {
      //console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-0 right-0 h-full w-full md:w-2/3 lg:w-1/2 bg-white shadow-xl float-right overflow-y-auto">
        <div className="p-6">
          {/* Header with Actions */}
          <div className="flex justify-between items-start mb-6 print:hidden">
            <h2 className="text-2xl font-bold text-gray-900">
              📋 MOM Details #{details.id}
            </h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleDownload}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm flex items-center transition-colors"
                title="Download as PDF"
              >
                📥 Download PDF
              </button>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 p-2"
                title="Close"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Printable Content */}
          <div ref={printRef} className="print-content">
            {/* Print Header */}
            <div className="hidden print:block text-center mb-8 border-b-2 border-gray-300 pb-4">
              <h1 className="text-3xl font-bold text-gray-900">Minutes of Meeting</h1>
              <h2 className="text-xl text-gray-700 mt-2">MOM ID: #{details.id}</h2>
              <p className="text-sm text-gray-600 mt-1">
                Generated on: {new Date().toLocaleDateString()}
              </p>
            </div>

            {/* Content Sections */}
            <div className="space-y-8">
              {/* General Information */}
              <section className="break-inside-avoid">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">
                  📋 General Information
                </h3>
                <div className="bg-gray-50 print:bg-white rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <p>
                      <span className="font-medium text-gray-900">📅 Date: </span> 
                      <span className="text-gray-900">{new Date(details.meeting_date).toLocaleDateString()}</span>
                    </p>
                    <p>
                      <span className="font-medium text-gray-900">⏰ Time: </span> 
                      <span className="text-gray-900">{details.start_time} - {details.end_time}</span>
                    </p>
                    <p>
                      <span className="font-medium text-gray-900">🎯 Project: </span> 
                      <span className="text-gray-900">{details.project}</span>
                    </p>
                    <p>
                      <span className="font-medium text-gray-900">📞 Meeting Type: </span> 
                      <span className="text-gray-900">{details.meeting_type}</span>
                    </p>
                    <p className="md:col-span-2">
                      <span className="font-medium text-gray-900">📍 Venue/Platform: </span>
                      <span className="text-gray-900">{details.location || details.location_link || 'Not specified'}</span>
                    </p>
                    {details.other_attendees && (
                      <p className="md:col-span-2">
                        <span className="font-medium text-gray-900">📧 Other Attendees: </span>
                        <span className="text-gray-900">{details.other_attendees}</span>
                      </p>
                    )}
                  </div>
                </div>
              </section>

              {/* Attendees */}
              <section className="break-inside-avoid">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">
                  👥 Attendees
                </h3>
                <div className="bg-gray-50 print:bg-white rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium mb-2 text-green-700 flex items-center">
                        ✅ Present ({parseAttendees(details.attendees).length})
                      </h4>
                      <ul className="space-y-1">
                        {parseAttendees(details.attendees).length > 0 ? 
                          parseAttendees(details.attendees).map((attendee, index) => (
                            <li key={index} className="flex items-center text-black py-1">
                              <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                              {attendee}
                            </li>
                          )) : 
                          <li className="text-gray-500 italic">No attendees listed</li>
                        }
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2 text-red-700 flex items-center">
                        ❌ Absent ({parseAttendees(details.absent || details.absentees).length})
                      </h4>
                      <ul className="space-y-1">
                        {parseAttendees(details.absent || details.absentees).length > 0 ? 
                          parseAttendees(details.absent || details.absentees).map((absentee, index) => (
                            <li key={index} className="flex items-center text-black py-1">
                              <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                              {absentee}
                            </li>
                          )) : 
                          <li className="text-gray-500 italic">No absentees listed</li>
                        }
                      </ul>
                    </div>
                  </div>
                </div>
              </section>

              {/* Dynamic Content Sections */}
              {/* Information */}
              {details.information && (
                <section className="break-inside-avoid">
                  <h3 className="text-lg font-semibold text-black mb-2 border-b pb-2">
                    ℹ️ Information
                  </h3>
                  <div className="space-y-2">
                    {Array.isArray(details.information) ? details.information.map((info, index) => (
                      <div key={index} className="bg-blue-50 print:bg-gray-50 p-3 rounded-lg border-l-4 border-blue-400">
                        <p className="text-gray-800">{info.information || info}</p>
                      </div>
                    )) : (
                      <div className="bg-blue-50 print:bg-gray-100 p-4 rounded-lg border-l-4 border-blue-400">
                        <p className="text-gray-800">{details.information}</p>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* Decisions */}
              {details.decisions && (
                <section className="break-inside-avoid">
                  <h3 className="text-lg font-semibold text-black mb-4 border-b pb-1">
                    ✅ Decisions
                  </h3>
                  <div className="space-y-3">
                    {Array.isArray(details.decisions) ? details.decisions.map((decision, index) => (
                      <div key={index} className="bg-green-50 print:bg-gray-50 p-4 rounded-lg border-l-4 border-green-400">
                        <p className="text-gray-800">{decision.decision || decision}</p>
                      </div>
                    )) : (
                      <div className="bg-green-50 print:bg-gray-50 p-4 rounded-lg border-l-4 border-green-400">
                        <p className="text-gray-800">{details.decisions}</p>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* Action Items */}
              {(details.actionItems || details.action_items) && (
                <section className="break-inside-avoid">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">
                    🎯 Action Items
                  </h3>
                  <div className="space-y-4">
                    {(details.actionItems || details.action_items).map((item, index) => {
                      const remarks = parseRemarks(item.remark);
                      //console.log(`📝 Displaying remarks for item ${item.id}:`, remarks);
                      
                      return (
                        <div key={item.id || index} className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-800 mb-2">
                                {item.action_item}
                              </h4>
                              
                              {/* Action Item Details */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[15px] text-gray-900">
                                <div className="space-y-1">
                                  <p><strong>👤 Assigned to:</strong> {item.assigned_to}</p>
                                  {/* 🆕 Show project */}
                                  {item.project && (
                                    <p><strong>📁 Project:</strong> {item.project}</p>
                                  )}{/* 🆕 Show meeting date */}
                                  {item.meeting_date && (
                                    <p><strong>🗓️ Meeting Date:</strong> {new Date(item.meeting_date).toLocaleDateString()}</p>
                                  )}
                                  <p><strong>📅 Due Date:</strong> {new Date(item.due_date).toLocaleDateString()}</p>
                                  
                                </div>
                                <div className="space-y-1">
                                  <p><strong>📊 Status:</strong> 
                                    <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                                      item.status === 'Completed' ? 'bg-green-100 text-green-800' :
                                      item.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                                      item.status === 'Cancelled' ? 'bg-red-100 text-red-800' :
                                      'bg-yellow-100 text-yellow-800'
                                    }`}>
                                      {item.status}
                                    </span>
                                  </p>
                                  
                                  {item.re_assigned_to && (
                                    <p><strong>🔄 Re-assigned to:</strong> {item.re_assigned_to}</p>
                                  )}
                                  {item.updated_at && (
                                    <p><strong>🔄 Updated:</strong> {new Date(item.updated_at).toLocaleDateString()}</p>
                                  )}
                                </div>
                              </div>
                              
                              {/* 🆕 Remarks Section */}
                              {remarks.length > 0 && (
                                <div className="mt-4 p-3 bg-white border border-orange-300 rounded-md">
                                  <h5 className="font-medium text-gray-900 mb-2 flex items-center">
                                    💬 Remarks ({remarks.length})
                                  </h5>
                                  <div className="space-y-2 max-h-32 overflow-y-auto">
                                    {remarks.map((remark, remarkIndex) => {
                                      const formattedRemark = formatRemark(remark);
                                      return (
                                        <div key={remarkIndex} className="bg-gray-50 p-2 rounded border-l-3 border-blue-400">
                                          <p className="text-sm text-black mb-1">{formattedRemark.text}</p>
                                          <div className="flex justify-between items-center text-[15px] text-black">
                                            <span>👤 By: {formattedRemark.by}</span>
                                            <span>📅 {new Date(formattedRemark.remark_date).toLocaleDateString()}</span>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                              
                              {/* Show if no remarks */}
                              {remarks.length === 0 && (
                                <div className="mt-4 p-2 bg-gray-50 border border-gray-200 rounded-md">
                                  <p className="text-sm text-gray-500 italic">No remarks added</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Empty State */}
              {!details.information && !details.decisions && !details.actionItems && !details.action_items && (
                <section>
                  <div className="text-center py-12 bg-gray-50 print:bg-white rounded-lg">
                    <div className="text-gray-400 text-6xl mb-4">📄</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Additional Details</h3>
                    <p className="text-gray-500">No information, decisions, or action items have been added to this MOM yet.</p>
                  </div>
                </section>
              )}
            </div>

            {/* Footer */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="flex justify-between items-center text-sm text-gray-500">
                <p>MOM ID: #{details.id}</p>
                <p>Generated on: {new Date().toLocaleDateString()}</p>
              </div>
              <div className="text-center mt-2">
                <p className="text-xs text-gray-400">
                  This document was automatically generated from the MOM system.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Print Styles */}
        {/* Print Styles */}
        <style jsx>{`
          @media print {
            body {
              font-size: 15px !important; /* Updated to 15px */
              line-height: 1.4;
              color: #1f2937 !important; /* gray-900 */
            }
            
            .print\\:hidden {
              display: none;
            }
            
            .print\\:block {
              display: block;
            }
            
            .print\\:bg-white {
              background-color: white;
            }
            
            .print\\:bg-gray-50 {
              background-color: #f9f9f9;
            }
            
            /* Force text colors for print */
            p, span, li, div {
              color: #1f2937 !important; /* gray-900 */
              font-size: 15px !important;
            }
            
            .break-inside-avoid {
              break-inside: avoid;
              page-break-inside: avoid;
            }
            
            .print-content {
              max-width: none;
              margin: 0;
              padding: 0;
            }
          }
        `}</style>
      </div>
    </div>
  );
};
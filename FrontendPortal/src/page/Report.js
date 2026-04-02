import React, { useState, useEffect } from 'react';
import axios from 'axios';

// AI-Powered Natural Language to SQL Component
const AIQueryAssistant = ({ databaseSchema, onQueryGenerated, isVisible, onClose }) => {
  const [naturalLanguageQuery, setNaturalLanguageQuery] = useState('');
  const [generatedSQL, setGeneratedSQL] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiProvider, setAiProvider] = useState('local');
  const [queryContext, setQueryContext] = useState('');

  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

  const generateSQLWithBackend = async (prompt, provider = 'local') => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/ai/generate-sql`, {
        query: prompt,
        provider: provider,
        context: queryContext || "HR Management System Query",
        database_schema: databaseSchema
      });

      return response.data.sql_query;
    } catch (error) {
      console.error('Backend API Error:', error);
      
      if (error.response) {
        const status = error.response.status;
        const message = error.response.data.detail || 'Unknown error';
        
        if (status === 503) {
          throw new Error(`${provider.toUpperCase()} service unavailable. ${message}`);
        } else if (status === 500) {
          throw new Error(`AI service error: ${message}`);
        } else {
          throw new Error(`Error (${status}): ${message}`);
        }
      } else if (error.request) {
        throw new Error('Cannot connect to AI service. Please check if the backend server is running.');
      } else {
        throw new Error(`Request error: ${error.message}`);
      }
    }
  };

  const handleGenerateSQL = async () => {
    if (!naturalLanguageQuery.trim()) {
      alert('Please enter a natural language query');
      return;
    }

    setIsGenerating(true);
    setGeneratedSQL('');

    try {
      const sqlQuery = await generateSQLWithBackend(naturalLanguageQuery, aiProvider);
      const cleanedSQL = sqlQuery.replace(/``````\n?/g, '').trim();
      setGeneratedSQL(cleanedSQL);
    } catch (error) {
      alert(`Error generating SQL: ${error.message}`);
      console.error('SQL Generation Error:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const useGeneratedQuery = () => {
    if (generatedSQL && onQueryGenerated) {
      onQueryGenerated(generatedSQL);
      onClose();
    }
  };

  const queryExamples = [
    "Show me all active employees with their departments and roles",
    "Get the total expense claims by status for this month", 
    "List employees who received appreciation awards this year",
    "Find all assets assigned to employees in IT department",
    "Show monthly expense trends for the last 6 months",
    "Get employee count by role and department",
    "List all pending asset claims with employee details",
    "Show top 5 employees with highest total expenses",
    "Get all meetings scheduled for this month",
    "Show policy acknowledgments by department",
    "List all background check forms pending approval",
    "Get timesheet data for last month by project",
    "Show all holidays for current year",
    "List queries submitted by employees this week",
    "Get software licenses expiring in next 30 days"
  ];

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold mb-2">🤖 AI Query Assistant</h2>
              <p className="text-blue-100">Convert natural language to SQL queries using AI</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors duration-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[80vh]">
          {/* AI Provider Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Choose AI Provider
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="local"
                  checked={aiProvider === 'local'}
                  onChange={(e) => setAiProvider(e.target.value)}
                  className="mr-2"
                />
                <span className="text-sm">Local Generator</span>
                <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                  Always Available
                </span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="ollama"
                  checked={aiProvider === 'ollama'}
                  onChange={(e) => setAiProvider(e.target.value)}
                  className="mr-2"
                />
                <span className="text-sm">Ollama (Local AI)</span>
                <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                  Private
                </span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="openai"
                  checked={aiProvider === 'openai'}
                  onChange={(e) => setAiProvider(e.target.value)}
                  className="mr-2"
                />
                <span className="text-sm">OpenAI GPT</span>
                <span className="ml-2 px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">
                  Cloud
                </span>
              </label>
            </div>
          </div>

          {/* Natural Language Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Describe what you want to query in plain English
            </label>
            <textarea
              value={naturalLanguageQuery}
              onChange={(e) => setNaturalLanguageQuery(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows="4"
              placeholder="e.g., Show me all employees in the IT department with their salary information and recent login dates"
            />
          </div>

          {/* Query Context */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Context (Optional)
            </label>
            <input
              type="text"
              value={queryContext}
              onChange={(e) => setQueryContext(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., For monthly HR report, Performance analysis, etc."
            />
          </div>

          {/* Query Examples */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quick Examples (Click to use)
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {queryExamples.map((example, index) => (
                <button
                  key={index}
                  onClick={() => setNaturalLanguageQuery(example)}
                  className="text-left p-3 bg-gray-50 hover:bg-blue-50 border border-gray-200 rounded-lg text-sm transition-colors duration-200"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>

          {/* Generate Button */}
          <div className="mb-6">
            <button
              onClick={handleGenerateSQL}
              disabled={isGenerating || !naturalLanguageQuery.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center space-x-2"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Generating SQL...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span>Generate SQL Query</span>
                </>
              )}
            </button>
          </div>

          {/* Generated SQL Output */}
          {generatedSQL && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Generated SQL Query
              </label>
              <div className="relative">
                <textarea
                  value={generatedSQL}
                  onChange={(e) => setGeneratedSQL(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm bg-gray-50"
                  rows="8"
                />
                <button
                  onClick={() => navigator.clipboard.writeText(generatedSQL)}
                  className="absolute top-2 right-2 p-2 bg-white border border-gray-300 rounded hover:bg-gray-50"
                  title="Copy to clipboard"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors duration-200"
            >
              Cancel
            </button>
            {generatedSQL && (
              <button
                onClick={useGeneratedQuery}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Use This Query</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Enhanced SQL Query Builder with Complete Database Schema
const SQLQueryBuilder = ({ query, index, updateCustomQuery, removeQuery, queriesLength }) => {
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [showBuilder, setShowBuilder] = useState(false);
  
  // Complete Database Schema with All Your Models
  const databaseSchema = {
    users: {
      columns: ["id", "username", "email", "password", "is_verified", "role", "last_login"],
      relationships: [
        {table: "user_details", foreign_key: "user_id", references: "id"},
        {table: "expense_claims", foreign_key: "user_id", references: "id"},
        {table: "appreciations", foreign_key: "employee_id", references: "id"},
        {table: "assets", foreign_key: "assigned_to", references: "id"},
        {table: "queries", foreign_key: "user_id", references: "id"},
        {table: "timesheet", foreign_key: "user_id", references: "id"},
        {table: "mom", foreign_key: "created_by", references: "id"},
        {table: "hr_reports", foreign_key: "user_id", references: "id"}
      ]
    },
    user_details: {
      columns: ["user_id", "full_name", "nickname", "bio", "personal_email", "created_at", "date_of_joining", 
               "working_region_id", "home_region_id", "manager_name", "current_Department", "current_role", 
               "profile_pic", "Project_name", "project_description", "project_Start_date", "project_End_date"],
      relationships: [
        {table: "users", foreign_key: "user_id", references: "id"},
        {table: "regions", foreign_key: "working_region_id", references: "id"},
        {table: "regions", foreign_key: "home_region_id", references: "id"}
      ]
    },
    assets: {
      columns: ["id", "asset_code", "asset_name", "category", "brand", "model", "serial_number",
               "purchase_date", "purchase_price", "warranty_period", "description", "status",
               "location", "assigned_to", "approval_status", "provided_to_employee",
               "approved_by", "approved_at", "rejection_reason", "created_at", "updated_at"],
      relationships: [
        {table: "users", foreign_key: "assigned_to", references: "id"},
        {table: "users", foreign_key: "approved_by", references: "id"}
      ]
    },
    asset_status_history: {
      columns: ["id", "asset_id", "previous_status", "new_status", "previous_approval_status",
               "new_approval_status", "changed_by", "changed_at", "remarks", "action_type"],
      relationships: [
        {table: "assets", foreign_key: "asset_id", references: "id"},
        {table: "users", foreign_key: "changed_by", references: "id"}
      ]
    },
    asset_claims: {
      columns: ["id", "asset_id", "employee_id", "reason", "priority", "status",
               "claimed_at", "processed_at", "processed_by", "hr_remarks", "expected_return_date", "actual_return_date"],
      relationships: [
        {table: "assets", foreign_key: "asset_id", references: "id"},
        {table: "users", foreign_key: "employee_id", references: "id"},
        {table: "users", foreign_key: "processed_by", references: "id"}
      ]
    },
    expense_categories: {
      columns: ["id", "category_name", "description", "is_active", "created_at", "updated_at"],
      relationships: []
    },
    expense_claims: {
      columns: ["id", "user_id", "approver_id", "title", "description", "claim_date",
               "total_amount", "approved_amount", "currency", "status", "rejection_reason",
               "submission_date", "approval_date", "created_at", "updated_at"],
      relationships: [
        {table: "users", foreign_key: "user_id", references: "id"},
        {table: "users", foreign_key: "approver_id", references: "id"}
      ]
    },
    expense_items: {
      columns: ["id", "claim_id", "category_id", "item_description", "expense_date",
               "amount", "approved_amount", "currency", "vendor_name", "payment_method",
               "receipt_number", "business_purpose", "is_billable", "client_name",
               "project_code", "created_at", "updated_at"],
      relationships: [
        {table: "expense_claims", foreign_key: "claim_id", references: "id"},
        {table: "expense_categories", foreign_key: "category_id", references: "id"}
      ]
    },
    expense_approvals: {
      columns: ["id", "claim_id", "approver_id", "action", "remarks", "approved_amount", "approval_date"],
      relationships: [
        {table: "expense_claims", foreign_key: "claim_id", references: "id"},
        {table: "users", foreign_key: "approver_id", references: "id"}
      ]
    },
    expense_documents: {
      columns: ["id", "claim_id", "expense_item_id", "document_type", "file_name", "file_path", 
               "file_size", "mime_type", "uploaded_by", "uploaded_at", "notes"],
      relationships: [
        {table: "expense_claims", foreign_key: "claim_id", references: "id"},
        {table: "expense_items", foreign_key: "expense_item_id", references: "id"},
        {table: "users", foreign_key: "uploaded_by", references: "id"}
      ]
    },
    expense_reimbursements: {
      columns: ["id", "claim_id", "reimbursement_amount", "payment_method", "payment_reference", 
               "status", "processed_by", "processed_date", "payment_date", "notes"],
      relationships: [
        {table: "expense_claims", foreign_key: "claim_id", references: "id"},
        {table: "users", foreign_key: "processed_by", references: "id"}
      ]
    },
    appreciations: {
      columns: ["id", "employee_id", "given_by_id", "award_type", "badge_level", 
               "appreciation_message", "month", "year", "is_active", "created_at", "updated_at"],
      relationships: [
        {table: "users", foreign_key: "employee_id", references: "id"},
        {table: "users", foreign_key: "given_by_id", references: "id"}
      ]
    },
    appreciation_likes: {
      columns: ["id", "appreciation_id", "user_id", "created_at"],
      relationships: [
        {table: "appreciations", foreign_key: "appreciation_id", references: "id"},
        {table: "users", foreign_key: "user_id", references: "id"}
      ]
    },
    appreciation_comments: {
      columns: ["id", "appreciation_id", "user_id", "text", "created_at"],
      relationships: [
        {table: "appreciations", foreign_key: "appreciation_id", references: "id"},
        {table: "users", foreign_key: "user_id", references: "id"}
      ]
    },
    queries: {
      columns: ["id", "user_id", "subject", "message", "category", "priority", "status",
               "user_email", "user_name", "response", "responded_by", "responded_at",
               "created_at", "updated_at"],
      relationships: [
        {table: "users", foreign_key: "user_id", references: "id"}
      ]
    },
    query_responses: {
      columns: ["id", "query_id", "response_message", "responded_by", "created_at"],
      relationships: [
        {table: "queries", foreign_key: "query_id", references: "id"}
      ]
    },
    hr_reports: {
      columns: ["id", "title", "description", "query_category", "query_type", "sql_query",
               "result_data", "affected_rows", "execution_time", "user_id", "is_approved",
               "approved_by", "created_at", "updated_at", "status"],
      relationships: [
        {table: "users", foreign_key: "user_id", references: "id"},
        {table: "users", foreign_key: "approved_by", references: "id"}
      ]
    },
    policies: {
      columns: ["id", "name", "department", "description", "policy_category", "effective_date",
               "applicable_roles", "pdf_filename", "pdf_path", "created_at", "updated_at"],
      relationships: []
    },
    holidays: {
      columns: ["id", "date", "name", "description", "is_active", "country_code",
               "calendar_id", "created_at", "updated_at"],
      relationships: []
    },
    timesheet: {
      columns: ["id", "user_id", "sheet_date", "project_name", "task_name", "task_description", 
               "time_hour", "status"],
      relationships: [
        {table: "users", foreign_key: "user_id", references: "id"}
      ]
    },
    leave_applications: {
      columns: ["id", "user_id", "employee_name", "employee_id", "leave_type", "start_date", 
               "end_date", "reason", "status", "applied_date", "approved_by", "approved_date", "comments"],
      relationships: [
        {table: "users", foreign_key: "user_id", references: "id"}
      ]
    },
    background_check_forms: {
      columns: ["id", "candidate_name", "father_name", "mother_name", "date_of_birth", "marital_status",
               "email_id", "contact_number", "alternate_contact_number", "aadhaar_card_number", "pan_number",
               "uan_number", "current_complete_address", "current_landmark", "current_city", "current_state",
               "current_pin_code", "current_police_station", "current_duration_from", "current_duration_to",
               "permanent_complete_address", "permanent_landmark", "permanent_city", "permanent_state",
               "permanent_pin_code", "permanent_police_station", "permanent_duration_from", "permanent_duration_to",
               "organization_name", "organization_address", "designation", "employee_code", "date_of_joining",
               "last_working_day", "salary", "reason_for_leaving", "manager_name", "manager_contact_number",
               "manager_email_id", "education_details", "hr_details", "reference_details", "verification_checks",
               "candidate_name_auth", "signature", "auth_date", "acknowledgment", "status", "remarks",
               "created_at", "updated_at", "processed_at"],
      relationships: []
    },
    mom: {
      columns: ["id", "meeting_date", "start_time", "end_time", "attendees", "absent", "outer_attendees",
               "project", "meeting_type", "location_link", "status", "created_at", "created_by"],
      relationships: [
        {table: "users", foreign_key: "created_by", references: "id"}
      ]
    },
    mom_information: {
      columns: ["id", "mom_id", "information"],
      relationships: [
        {table: "mom", foreign_key: "mom_id", references: "id"}
      ]
    },
    mom_decision: {
      columns: ["id", "mom_id", "decision"],
      relationships: [
        {table: "mom", foreign_key: "mom_id", references: "id"}
      ]
    },
    mom_action_item: {
      columns: ["id", "mom_id", "project", "action_item", "assigned_to", "due_date", "status",
               "remark", "updated_at", "re_assigned_to", "meeting_date"],
      relationships: [
        {table: "mom", foreign_key: "mom_id", references: "id"}
      ]
    },
    thoughts: {
      columns: ["id", "thoughts", "author", "created_at", "created_by"],
      relationships: []
    },
    regions: {
      columns: ["id", "name", "country_code"],
      relationships: []
    },
    software_licenses: {
      columns: ["id", "user_id", "software_name", "vendor_name", "license_type", "purchase_date",
               "expiry_date", "cost", "is_recurring", "recurring_cycle", "status", "notes",
               "created_at", "updated_at"],
      relationships: [
        {table: "users", foreign_key: "user_id", references: "id"}
      ]
    },
    audit_logs: {
      columns: ["id", "action", "user_id", "user_name", "entity_type", "entity_id", "details",
               "timestamp", "ip_address", "user_agent"],
      relationships: [
        {table: "users", foreign_key: "user_id", references: "id"}
      ]
    }
  };

  // JOIN Types
  const joinTypes = [
    { value: "INNER JOIN", label: "INNER JOIN (matching records only)" },
    { value: "LEFT JOIN", label: "LEFT JOIN (all from left table)" },
    { value: "RIGHT JOIN", label: "RIGHT JOIN (all from right table)" },
    { value: "FULL OUTER JOIN", label: "FULL OUTER JOIN (all records)" }
  ];

  // WHERE Operators
  const whereOperators = [
    { value: "=", label: "= (equals)", requiresValue: true },
    { value: "!=", label: "!= (not equals)", requiresValue: true },
    { value: ">", label: "> (greater than)", requiresValue: true },
    { value: "<", label: "< (less than)", requiresValue: true },
    { value: ">=", label: ">= (greater than or equal)", requiresValue: true },
    { value: "<=", label: "<= (less than or equal)", requiresValue: true },
    { value: "LIKE", label: "LIKE (pattern match)", requiresValue: true },
    { value: "NOT LIKE", label: "NOT LIKE (not pattern match)", requiresValue: true },
    { value: "IN", label: "IN (in list)", requiresValue: true },
    { value: "NOT IN", label: "NOT IN (not in list)", requiresValue: true },
    { value: "IS NULL", label: "IS NULL (is null)", requiresValue: false },
    { value: "IS NOT NULL", label: "IS NOT NULL (is not null)", requiresValue: false },
    { value: "BETWEEN", label: "BETWEEN (between values)", requiresValue: true },
    { value: "NOT BETWEEN", label: "NOT BETWEEN (not between)", requiresValue: true }
  ];

  // State Management for SQL Builder
  const [selectedTable, setSelectedTable] = useState('');
  const [selectFields, setSelectFields] = useState(['*']);
  const [joins, setJoins] = useState([]);
  const [whereConditions, setWhereConditions] = useState([{ column: '', operator: '=', value: '' }]);
  const [customCondition, setCustomCondition] = useState('');
  const [orderBy, setOrderBy] = useState([]);

  // Handle AI-generated query
  const handleAIGeneratedQuery = (generatedSQL) => {
    updateCustomQuery(index, 'sql_query', generatedSQL);
    setShowAIAssistant(false);
  };

  // Generate all available columns for SELECT dropdown
  const getSelectableColumns = () => {
    if (!selectedTable) return ['*'];
    const columns = [`${selectedTable}.*`];
    databaseSchema[selectedTable]?.columns.forEach(c => columns.push(`${selectedTable}.${c}`));
    // Include columns from joined tables
    joins.forEach(j => {
      const tables = [j.fromTable, j.toTable].filter(Boolean);
      tables.forEach(t => {
        if (databaseSchema[t]) {
          databaseSchema[t].columns.forEach(c => columns.push(`${t}.${c}`));
        }
      });
    });
    return Array.from(new Set(columns));
  };

  // Get possible joins for selected table
  const getPossibleJoins = (tableName) => {
    const possibleJoins = [];

    if (databaseSchema[tableName]) {
      databaseSchema[tableName].relationships.forEach(rel => {
        possibleJoins.push({
          fromTable: tableName,
          toTable: rel.table,
          condition: `${tableName}.${rel.foreign_key} = ${rel.table}.${rel.references}`,
          display: `${rel.table} ON ${tableName}.${rel.foreign_key} = ${rel.table}.${rel.references}`
        });
      });
    }

    Object.keys(databaseSchema).forEach(table => {
      databaseSchema[table].relationships.forEach(rel => {
        if (rel.table === tableName) {
          possibleJoins.push({
            fromTable: table,
            toTable: tableName,
            condition: `${table}.${rel.foreign_key} = ${tableName}.${rel.references}`,
            display: `${table} ON ${table}.${rel.foreign_key} = ${tableName}.${rel.references}`
          });
        }
      });
    });

    return possibleJoins;
  };

  // Get all tables involved in the query
  const getInvolvedTables = () => {
    const tables = selectedTable ? [selectedTable] : [];
    joins.forEach(join => {
      if (join.toTable && !tables.includes(join.toTable)) tables.push(join.toTable);
      if (join.fromTable && !tables.includes(join.fromTable)) tables.push(join.fromTable);
    });
    return tables;
  };

  // Get columns for involved tables for WHERE/ORDER picks
  const getColumnsForInvolvedTables = () => {
    const columns = [];
    getInvolvedTables().forEach(table => {
      if (databaseSchema[table]) {
        databaseSchema[table].columns.forEach(column => {
          columns.push(`${table}.${column}`);
        });
      }
    });
    return columns;
  };

  // Build complete SQL query
  const buildQuery = () => {
    let sqlQuery = '';

    // SELECT clause
    const selectable = getSelectableColumns();
    const sanitizedSelect = selectFields.filter(f => f === '*' || f.endsWith('.*') || selectable.includes(f));
    const selectClause = sanitizedSelect.length > 0 && !sanitizedSelect.includes('*')
      ? sanitizedSelect.join(', ')
      : '*';
    sqlQuery += `SELECT ${selectClause}`;

    // FROM clause
    if (selectedTable) {
      sqlQuery += `\nFROM ${selectedTable}`;
    }

    // JOIN clauses
    if (joins.length > 0) {
      joins.forEach(join => {
        if (join.type && join.display) {
          sqlQuery += `\n${join.type} ${join.display}`;
        }
      });
    }

    // WHERE clause
    const validConditions = whereConditions.filter(cond =>
      cond.column && cond.operator && (cond.value || !cond.operator.includes('NULL'))
    );

    if (validConditions.length > 0 || customCondition) {
      sqlQuery += '\nWHERE ';
      const conditionStrings = validConditions.map(cond => {
        if (cond.operator === 'IS NULL' || cond.operator === 'IS NOT NULL') {
          return `${cond.column} ${cond.operator}`;
        }
        if (cond.operator === 'IN' || cond.operator === 'NOT IN') {
          const values = cond.value.replace(/^\(|\)$/g, '').split(',').map(v => `'${v.trim()}'`).join(', ');
          return `${cond.column} ${cond.operator} (${values})`;
        }
        if (cond.operator === 'BETWEEN' || cond.operator === 'NOT BETWEEN') {
          const values = cond.value.split(',');
          return `${cond.column} ${cond.operator} '${values[0]?.trim()}' AND '${values[1]?.trim()}'`;
        }
        return `${cond.column} ${cond.operator} '${cond.value}'`;
      });

      if (customCondition) {
        conditionStrings.push(customCondition);
      }

      sqlQuery += conditionStrings.join(' AND ');
    }

    // ORDER BY clause
    if (orderBy.length > 0) {
      sqlQuery += `\nORDER BY ${orderBy.join(', ')}`;
    }

    updateCustomQuery(index, 'sql_query', sqlQuery);
  };

  // Update query when selections change
  useEffect(() => {
    if (showBuilder && selectedTable) {
      buildQuery();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTable, selectFields, joins, whereConditions, customCondition, orderBy]);

  // Add new join
  const addJoin = () => {
    setJoins([...joins, { type: 'INNER JOIN', fromTable: '', toTable: '', condition: '', display: '' }]);
  };

  // Update join
  const updateJoin = (joinIndex, field, value) => {
    const newJoins = [...joins];
    if (field === 'selectedJoin') {
      const [display, condition] = value.split('|||');
      newJoins[joinIndex].display = display;
      newJoins[joinIndex].condition = condition;
      const tables = condition.match(/(\w+)\./g)?.map(t => t.replace('.', '')) || [];
      if (tables.length >= 2) {
        newJoins[joinIndex].fromTable = tables[0];
        newJoins[joinIndex].toTable = tables[1];
      }
    } else {
      newJoins[joinIndex][field] = value;
    }
    setJoins(newJoins);
  };

  // Remove join
  const removeJoin = (joinIndex) => {
    setJoins(joins.filter((_, i) => i !== joinIndex));
  };

  return (
    <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
      <div className="flex justify-between items-center mb-4">
        <h4 className="font-semibold text-gray-900 flex items-center">
          <span className="bg-blue-100 text-blue-800 text-sm font-medium px-2 py-1 rounded-full mr-3">
            {index + 1}
          </span>
          Query Section
        </h4>
        <div className="flex space-x-2">
          {/* AI Assistant Button */}
          <button
            onClick={() => setShowAIAssistant(true)}
            className="bg-purple-100 hover:bg-purple-200 text-purple-700 px-3 py-1 text-sm rounded-lg font-medium transition-colors duration-200 flex items-center space-x-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span>AI Assistant</span>
          </button>
          
          <button
            onClick={() => setShowBuilder(!showBuilder)}
            className={`px-3 py-1 text-sm rounded-lg font-medium transition-colors duration-200 ${
              showBuilder
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
            }`}
          >
            {showBuilder ? 'Hide Builder' : 'Visual Builder'}
          </button>
          
          {queriesLength > 1 && (
            <button
              onClick={() => removeQuery(index)}
              className="text-red-600 hover:text-red-800 p-2 rounded-lg hover:bg-red-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* AI Assistant Modal */}
      <AIQueryAssistant
        databaseSchema={databaseSchema}
        onQueryGenerated={handleAIGeneratedQuery}
        isVisible={showAIAssistant}
        onClose={() => setShowAIAssistant(false)}
      />

      {/* Query Title and Description */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Section Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={query.title || ''}
            onChange={(e) => updateCustomQuery(index, 'title', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            placeholder="e.g., Employee Count by Department"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
          <input
            type="text"
            value={query.description || ''}
            onChange={(e) => updateCustomQuery(index, 'description', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            placeholder="Describe what this query analyzes..."
          />
        </div>
      </div>

      {/* Visual SQL Builder */}
      {showBuilder && (
        <div className="space-y-6 mb-6 p-4 bg-white rounded-lg border max-h-96 overflow-y-auto">
          <h5 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
            Visual Query Builder
          </h5>

          {/* MySQL Query Section */}
          <div className="p-3 rounded-md bg-blue-50 border border-blue-100">
            <p className="text-sm text-blue-900 mb-2">Select from {Object.keys(databaseSchema).length} available tables in your HR database.</p>

            {/* FROM Section (Mandatory) */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <span className="text-red-500">*</span> FROM - Select Main Table
              </label>
              <select
                value={selectedTable}
                onChange={(e) => {
                  setSelectedTable(e.target.value);
                  if (e.target.value) {
                    setSelectFields([`${e.target.value}.*`]);
                  } else {
                    setSelectFields(['*']);
                  }
                  setJoins([]);
                  setWhereConditions([{ column: '', operator: '=', value: '' }]);
                  setOrderBy([]);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Select Main Table --</option>
                {Object.keys(databaseSchema).map(table => (
                  <option key={table} value={table}>{table}</option>
                ))}
              </select>
            </div>

            {/* SELECT Section */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <span className="text-red-500">*</span> SELECT - Choose Columns
              </label>
              <select
                multiple
                value={selectFields}
                onChange={(e) => {
                  const values = Array.from(e.target.selectedOptions, option => option.value);
                  setSelectFields(values.length > 0 ? values : (selectedTable ? [`${selectedTable}.*`] : ['*']));
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                size="8"
              >
                {!selectedTable ? (
                  <option value="*">* (All Columns)</option>
                ) : (
                  <>
                    <option value={`${selectedTable}.*`}>{selectedTable}.* (All Columns)</option>
                    {getSelectableColumns().filter(c => c !== `${selectedTable}.*`).map(column => (
                      <option key={column} value={column}>{column}</option>
                    ))}
                  </>
                )}
              </select>
              <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple columns</p>
            </div>
          </div>

          {/* JOIN Section */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">
                JOIN - Add Table Relationships
              </label>
              <button
                onClick={addJoin}
                disabled={!selectedTable}
                className={`px-3 py-1 ${!selectedTable ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'} text-white text-sm rounded-lg`}
              >
                + Add JOIN
              </button>
            </div>

            {joins.map((join, joinIndex) => (
              <div key={joinIndex} className="flex gap-2 mb-2 p-3 bg-gray-50 rounded border">
                <select
                  value={join.type}
                  onChange={(e) => updateJoin(joinIndex, 'type', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {joinTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>

                <select
                  value={`${join.display}|||${join.condition}`}
                  onChange={(e) => {
                    updateJoin(joinIndex, 'selectedJoin', e.target.value);
                    const nextSelectable = getSelectableColumns();
                    setSelectFields(prev =>
                      prev.filter(f => f === '*' || f.endsWith('.*') || nextSelectable.includes(f))
                    );
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Select Table to Join --</option>
                  {selectedTable && getPossibleJoins(selectedTable).map((possibleJoin, i) => (
                    <option key={`root-${i}`} value={`${possibleJoin.display}|||${possibleJoin.condition}`}>
                      {possibleJoin.display}
                    </option>
                  ))}
                  {joins.slice(0, joinIndex).map(prevJoin =>
                    getPossibleJoins(prevJoin.toTable).map((possibleJoin, i) => (
                      <option key={`${prevJoin.toTable}-${i}`} value={`${possibleJoin.display}|||${possibleJoin.condition}`}>
                        {possibleJoin.display}
                      </option>
                    ))
                  )}
                </select>

                <button
                  onClick={() => removeJoin(joinIndex)}
                  className="px-3 py-2 text-red-600 hover:text-red-800 border border-red-300 rounded-lg hover:bg-red-50"
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          {/* WHERE Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              WHERE - Add Conditions (Optional)
            </label>

            {whereConditions.map((condition, condIndex) => (
              <div key={condIndex} className="flex gap-2 mb-2">
                <select
                  value={condition.column}
                  onChange={(e) => {
                    const newConditions = [...whereConditions];
                    newConditions[condIndex].column = e.target.value;
                    setWhereConditions(newConditions);
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Select Column --</option>
                  {getColumnsForInvolvedTables().map(column => (
                    <option key={column} value={column}>{column}</option>
                  ))}
                </select>

                <select
                  value={condition.operator}
                  onChange={(e) => {
                    const newConditions = [...whereConditions];
                    newConditions[condIndex].operator = e.target.value;
                    setWhereConditions(newConditions);
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {whereOperators.map(op => (
                    <option key={op.value} value={op.value}>{op.label}</option>
                  ))}
                </select>

                {condition.operator && !condition.operator.includes('NULL') && (
                  <input
                    type="text"
                    value={condition.value}
                    onChange={(e) => {
                      const newConditions = [...whereConditions];
                      newConditions[condIndex].value = e.target.value;
                      setWhereConditions(newConditions);
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={condition.operator.includes('BETWEEN') ? "value1,value2" :
                               condition.operator.includes('IN') ? "value1,value2,value3" : "Enter value..."}
                  />
                )}

                <button
                  onClick={() => {
                    if (whereConditions.length > 1) {
                      setWhereConditions(whereConditions.filter((_, i) => i !== condIndex));
                    }
                  }}
                  className="px-3 py-2 text-red-600 hover:text-red-800 border border-red-300 rounded-lg hover:bg-red-50"
                >
                  ×
                </button>
              </div>
            ))}

            <button
              onClick={() => setWhereConditions([...whereConditions, { column: '', operator: '=', value: '' }])}
              className="mb-4 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm"
            >
              + Add Condition
            </button>

            {/* Custom WHERE Condition */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">
                Or Write Custom Condition:
              </label>
              <textarea
                value={customCondition}
                onChange={(e) => setCustomCondition(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows="2"
                placeholder="e.g., status = 'active' AND created_at > '2023-01-01'"
              />
            </div>
          </div>

          {/* ORDER BY Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ORDER BY - Sort Results (Optional)
            </label>
            <select
              multiple
              value={orderBy}
              onChange={(e) => {
                const values = Array.from(e.target.selectedOptions, option => option.value);
                setOrderBy(values);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              size="6"
            >
              {getColumnsForInvolvedTables().map(column => (
                <React.Fragment key={column}>
                  <option value={`${column} ASC`}>{column} (Ascending)</option>
                  <option value={`${column} DESC`}>{column} (Descending)</option>
                </React.Fragment>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* SQL Query Input */}
      <div>
        <label className=" text-sm font-medium text-gray-700 mb-2 flex items-center">
          SQL Query <span className="text-red-500">*</span>
          <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
             Try AI Assistant
          </span>
        </label>
        <textarea
          value={query.sql_query || ''}
          onChange={(e) => updateCustomQuery(index, 'sql_query', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
          rows="6"
          placeholder="SELECT * FROM users WHERE 1=1 -- Or click 'AI Assistant' to generate from natural language"
        />
        <p className="text-xs text-gray-500 mt-1">
          Write your SQL query manually, use Visual Builder, or try the AI Assistant for natural language conversion
        </p>
      </div>
    </div>
  );
};

const ReportGenerator = () => {
  // State Management
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Custom Report Form State
  const [customReport, setCustomReport] = useState({
    title: '',
    description: '',
    queries: [{ title: '', description: '', sql_query: '', execution_order: 1 }]
  });

  // Configuration
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
  const REPORTS_PER_PAGE = 10;

  // Enhanced Report Templates with Your Database
  const reportTemplates = [
    {
      id: 'employee-overview',
      name: 'Complete Employee Overview',
      description: 'Comprehensive analysis of all employees with details, roles, and activity status',
      icon: '👥',
      category: 'HR Analytics',
      template: {
        title: 'Complete Employee Overview Report',
        description: 'Comprehensive analysis of employee data including personal details, roles, and system activity',
        queries: [
          {
            title: 'Employee Basic Information',
            description: 'List all employees with their basic information and roles',
            sql_query: 'SELECT u.id, u.username, u.email, u.role, u.is_verified, u.last_login, ud.full_name, ud.current_Department, ud.current_role, ud.manager_name FROM users u LEFT JOIN user_details ud ON u.id = ud.user_id ORDER BY u.username',
            execution_order: 1
          },
          {
            title: 'Department-wise Employee Count',
            description: 'Count of employees by department',
            sql_query: 'SELECT COALESCE(ud.current_Department, "Not Assigned") as department, COUNT(*) as employee_count FROM users u LEFT JOIN user_details ud ON u.id = ud.user_id GROUP BY ud.current_Department ORDER BY employee_count DESC',
            execution_order: 2
          },
          {
            title: 'User Activity Status',
            description: 'Analysis of user verification and login activity',
            sql_query: 'SELECT CASE WHEN is_verified = 1 THEN "Verified" ELSE "Not Verified" END as verification_status, CASE WHEN last_login IS NOT NULL THEN "Has Logged In" ELSE "Never Logged In" END as login_status, COUNT(*) as count FROM users GROUP BY is_verified, CASE WHEN last_login IS NOT NULL THEN 1 ELSE 0 END ORDER BY count DESC',
            execution_order: 3
          }
        ]
      }
    },
    {
      id: 'expense-comprehensive',
      name: 'Complete Expense Analysis',
      description: 'Detailed expense management report covering claims, approvals, reimbursements, and trends',
      icon: '💰',
      category: 'Financial',
      template: {
        title: 'Complete Expense Analysis Report',
        description: 'Comprehensive analysis of expense management including claims, categories, approvals, and financial trends',
        queries: [
          {
            title: 'Expense Claims Summary',
            description: 'Overview of all expense claims with amounts and status',
            sql_query: 'SELECT status, COUNT(*) as claim_count, COALESCE(SUM(total_amount), 0) as total_amount, COALESCE(AVG(total_amount), 0) as avg_amount, COALESCE(SUM(approved_amount), 0) as approved_total FROM expense_claims GROUP BY status ORDER BY claim_count DESC',
            execution_order: 1
          },
          {
            title: 'Top Expense Categories',
            description: 'Most used expense categories with spending analysis',
            sql_query: 'SELECT ec.category_name, COUNT(ei.id) as usage_count, COALESCE(SUM(ei.amount), 0) as total_spent, COALESCE(AVG(ei.amount), 0) as avg_amount FROM expense_categories ec LEFT JOIN expense_items ei ON ec.id = ei.category_id WHERE ec.is_active = 1 GROUP BY ec.id, ec.category_name ORDER BY total_spent DESC LIMIT 10',
            execution_order: 2
          },
          {
            title: 'Employee Expense Rankings',
            description: 'Top employees by total expense claims',
            sql_query: 'SELECT u.username, u.email, COALESCE(ud.full_name, u.username) as display_name, COUNT(ec.id) as total_claims, COALESCE(SUM(ec.total_amount), 0) as total_expenses FROM users u LEFT JOIN user_details ud ON u.id = ud.user_id LEFT JOIN expense_claims ec ON u.id = ec.user_id GROUP BY u.id HAVING total_claims > 0 ORDER BY total_expenses DESC LIMIT 15',
            execution_order: 3
          },
          {
            title: 'Monthly Expense Trends',
            description: 'Monthly breakdown of expense claims and amounts',
            sql_query: 'SELECT DATE_FORMAT(created_at, "%Y-%m") as month_year, COUNT(*) as claims_count, COALESCE(SUM(total_amount), 0) as monthly_total FROM expense_claims WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH) GROUP BY DATE_FORMAT(created_at, "%Y-%m") ORDER BY month_year DESC',
            execution_order: 4
          }
        ]
      }
    },
    {
      id: 'asset-management',
      name: 'Asset Management Overview',
      description: 'Complete analysis of assets, assignments, claims, and maintenance',
      icon: '💻',
      category: 'Asset Management',
      template: {
        title: 'Asset Management Overview Report',
        description: 'Comprehensive analysis of company assets including inventory, assignments, claims, and status tracking',
        queries: [
          {
            title: 'Asset Inventory Summary',
            description: 'Overview of all assets by category and status',
            sql_query: 'SELECT category, status, COUNT(*) as asset_count, COALESCE(AVG(purchase_price), 0) as avg_price, COALESCE(SUM(purchase_price), 0) as total_value FROM assets GROUP BY category, status ORDER BY category, asset_count DESC',
            execution_order: 1
          },
          {
            title: 'Asset Assignments',
            description: 'Currently assigned assets with employee details',
            sql_query: 'SELECT a.asset_code, a.asset_name, a.category, u.username as assigned_to, COALESCE(ud.full_name, u.username) as employee_name, a.status, a.approval_status FROM assets a LEFT JOIN users u ON a.assigned_to = u.id LEFT JOIN user_details ud ON u.id = ud.user_id WHERE a.assigned_to IS NOT NULL ORDER BY a.category, a.asset_name',
            execution_order: 2
          },
          {
            title: 'Asset Claims Analysis',
            description: 'Analysis of asset claims by status and employee',
            sql_query: 'SELECT ac.status, COUNT(*) as claim_count, a.category, u.username as employee FROM asset_claims ac LEFT JOIN assets a ON ac.asset_id = a.id LEFT JOIN users u ON ac.employee_id = u.id GROUP BY ac.status, a.category ORDER BY claim_count DESC',
            execution_order: 3
          },
          {
            title: 'Assets Needing Attention',
            description: 'Assets with pending approvals or maintenance issues',
            sql_query: 'SELECT asset_code, asset_name, category, status, approval_status, CASE WHEN approval_status = "pending" THEN "Needs Approval" WHEN status = "maintenance" THEN "Under Maintenance" ELSE "Review Required" END as attention_type FROM assets WHERE approval_status = "pending" OR status IN ("maintenance", "retired") ORDER BY category, asset_name',
            execution_order: 4
          }
        ]
      }
    },
    {
      id: 'attendance-timesheet',
      name: 'Attendance & Timesheet Analysis',
      description: 'Analysis of employee timesheets, project allocations, and working patterns',
      icon: '⏰',
      category: 'Time Management',
      template: {
        title: 'Attendance & Timesheet Analysis Report',
        description: 'Comprehensive analysis of employee timesheets, project time allocation, and productivity metrics',
        queries: [
          {
            title: 'Project Time Allocation',
            description: 'Time spent on different projects by employees',
            sql_query: 'SELECT t.project_name, COUNT(DISTINCT t.user_id) as employees_assigned, COALESCE(SUM(t.time_hour), 0) as total_hours, COALESCE(AVG(t.time_hour), 0) as avg_hours_per_entry FROM timesheet t GROUP BY t.project_name ORDER BY total_hours DESC',
            execution_order: 1
          },
          {
            title: 'Employee Productivity Summary',
            description: 'Individual employee timesheet summary',
            sql_query: 'SELECT u.username, COALESCE(ud.full_name, u.username) as display_name, COUNT(t.id) as entries_count, COALESCE(SUM(t.time_hour), 0) as total_hours, COALESCE(AVG(t.time_hour), 0) as avg_hours_per_day FROM users u LEFT JOIN user_details ud ON u.id = ud.user_id LEFT JOIN timesheet t ON u.id = t.user_id GROUP BY u.id HAVING entries_count > 0 ORDER BY total_hours DESC LIMIT 20',
            execution_order: 2
          },
          {
            title: 'Timesheet Status Overview',
            description: 'Status distribution of timesheet entries',
            sql_query: 'SELECT COALESCE(status, "No Status") as status, COUNT(*) as entry_count, COALESCE(SUM(time_hour), 0) as total_hours FROM timesheet GROUP BY status ORDER BY entry_count DESC',
            execution_order: 3
          },
          {
            title: 'Recent Timesheet Activity',
            description: 'Latest timesheet entries from the past 30 days',
            sql_query: 'SELECT t.sheet_date, u.username, t.project_name, t.task_name, t.time_hour, t.status FROM timesheet t LEFT JOIN users u ON t.user_id = u.id WHERE t.sheet_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) ORDER BY t.sheet_date DESC, u.username LIMIT 50',
            execution_order: 4
          }
        ]
      }
    },
    {
      id: 'appreciation-engagement',
      name: 'Employee Appreciation & Engagement',
      description: 'Analysis of employee recognitions, awards, and engagement metrics',
      icon: '🏆',
      category: 'Employee Engagement',
      template: {
        title: 'Employee Appreciation & Engagement Report',
        description: 'Comprehensive analysis of employee recognitions, appreciation awards, and engagement activities',
        queries: [
          {
            title: 'Appreciation Awards Summary',
            description: 'Overview of all appreciation awards by type and recipient',
            sql_query: 'SELECT a.award_type, COUNT(*) as award_count, COUNT(DISTINCT a.employee_id) as unique_recipients FROM appreciations a WHERE a.is_active = 1 GROUP BY a.award_type ORDER BY award_count DESC',
            execution_order: 1
          },
          {
            title: 'Top Appreciated Employees',
            description: 'Employees with the most appreciation awards',
            sql_query: 'SELECT u.username, COALESCE(ud.full_name, u.username) as display_name, COUNT(a.id) as total_awards, GROUP_CONCAT(DISTINCT a.award_type) as award_types FROM users u LEFT JOIN user_details ud ON u.id = ud.user_id LEFT JOIN appreciations a ON u.id = a.employee_id WHERE a.is_active = 1 GROUP BY u.id HAVING total_awards > 0 ORDER BY total_awards DESC LIMIT 15',
            execution_order: 2
          },
          {
            title: 'Monthly Appreciation Trends',
            description: 'Appreciation awards distributed by month and year',
            sql_query: 'SELECT a.year, a.month, COUNT(*) as awards_given, COUNT(DISTINCT a.employee_id) as employees_recognized FROM appreciations a WHERE a.is_active = 1 GROUP BY a.year, a.month ORDER BY a.year DESC, a.month DESC LIMIT 24',
            execution_order: 3
          },
          {
            title: 'Appreciation Engagement',
            description: 'Analysis of likes and comments on appreciation posts',
            sql_query: 'SELECT a.award_type, COUNT(DISTINCT al.id) as total_likes, COUNT(DISTINCT ac.id) as total_comments, ROUND(AVG(likes_per_post.like_count), 2) as avg_likes_per_award FROM appreciations a LEFT JOIN appreciation_likes al ON a.id = al.appreciation_id LEFT JOIN appreciation_comments ac ON a.id = ac.appreciation_id LEFT JOIN (SELECT appreciation_id, COUNT(*) as like_count FROM appreciation_likes GROUP BY appreciation_id) likes_per_post ON a.id = likes_per_post.appreciation_id WHERE a.is_active = 1 GROUP BY a.award_type ORDER BY total_likes DESC',
            execution_order: 4
          }
        ]
      }
    },
    {
      id: 'system-activity',
      name: 'System Activity & Usage Analytics',
      description: 'Analysis of system usage, queries, meetings, and overall platform engagement',
      icon: '📊',
      category: 'System Analytics',
      template: {
        title: 'System Activity & Usage Analytics Report',
        description: 'Comprehensive analysis of system usage patterns, user queries, meetings, and platform engagement metrics',
        queries: [
          {
            title: 'User Query Analysis',
            description: 'Analysis of user queries and support requests',
            sql_query: 'SELECT q.category, q.status, COUNT(*) as query_count, ROUND(AVG(CASE WHEN q.responded_at IS NOT NULL AND q.created_at IS NOT NULL THEN TIMESTAMPDIFF(HOUR, q.created_at, q.responded_at) END), 2) as avg_response_time_hours FROM queries q GROUP BY q.category, q.status ORDER BY query_count DESC',
            execution_order: 1
          },
          {
            title: 'Meeting Statistics',
            description: 'Overview of meetings organized and participation',
            sql_query: 'SELECT m.meeting_type, m.status, COUNT(*) as meeting_count, ROUND(AVG(JSON_LENGTH(m.attendees)), 2) as avg_attendees FROM mom m GROUP BY m.meeting_type, m.status ORDER BY meeting_count DESC',
            execution_order: 2
          },
          {
            title: 'System Reports Generation',
            description: 'Analysis of HR reports created and their status',
            sql_query: 'SELECT hr.query_category, hr.status, COUNT(*) as report_count, ROUND(AVG(hr.affected_rows), 2) as avg_affected_rows FROM hr_reports hr GROUP BY hr.query_category, hr.status ORDER BY report_count DESC',
            execution_order: 3
          },
          {
            title: 'Recent System Activity',
            description: 'Latest activities across different modules',
            sql_query: 'SELECT "Expense Claim" as activity_type, DATE(created_at) as activity_date, COUNT(*) as count FROM expense_claims WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) GROUP BY DATE(created_at) UNION ALL SELECT "Asset Claim" as activity_type, DATE(claimed_at) as activity_date, COUNT(*) as count FROM asset_claims WHERE claimed_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) GROUP BY DATE(claimed_at) UNION ALL SELECT "Query Submitted" as activity_type, DATE(created_at) as activity_date, COUNT(*) as count FROM queries WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) GROUP BY DATE(created_at) ORDER BY activity_date DESC, activity_type',
            execution_order: 4
          }
        ]
      }
    }
  ];

  // All your existing utility functions remain the same
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'HR Analytics': return '👥';
      case 'Financial': return '💰';
      case 'Asset Management': return '💻';
      case 'Time Management': return '⏰';
      case 'Employee Engagement': return '🏆';
      case 'System Analytics': return '📊';
      case 'Compliance': return '📋';
      default: return '📄';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const truncateText = (text, maxLength = 100) => {
    return text && text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  // API Functions
  const fetchReports = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/api/reports/`);
      setReports(response.data);
    } catch (error) {
      console.error('Error fetching reports:', error);
      alert('Error fetching reports. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  // CORRECTED: Fixed fetchReportDetails to handle query_executions structure
  const fetchReportDetails = async (reportId) => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/api/reports/${reportId}`);
      
      // FIXED: Transform backend response to match frontend expectations
      const backendData = response.data;
      
      console.log('=== BACKEND RESPONSE DEBUG ===');
      console.log('Full response:', backendData);
      console.log('Query executions:', backendData.query_executions);
      
      // Check if backend returns query_executions structure (your current format)
      if (backendData.query_executions && Array.isArray(backendData.query_executions)) {
        // Backend returns the correct structure with query_executions
        setReportData(backendData);
      } else if (backendData.queries && Array.isArray(backendData.queries)) {
        // Backend returns queries array structure
        setReportData(backendData);
      } else {
        // FALLBACK: Backend returns old structure - transform it
        const transformedData = {
          ...backendData,
          query_executions: [{
            id: 1,
            title: backendData.query_category || backendData.title || 'Query Results',
            description: backendData.query_type || 'Executed query results',
            sql_query: backendData.sql_query || '',
            status: backendData.status === 'completed' ? 'completed' : 'failed',
            columns: backendData.columns || [],
            data: backendData.result_data || [],
            affected_rows: backendData.affected_rows || 0,
            execution_time: backendData.execution_time || '0ms',
            error_message: backendData.error_message || null
          }]
        };
        setReportData(transformedData);
      }
      
      setSelectedReport(reportId);
      
    } catch (error) {
      console.error('Error fetching report details:', error);
      alert('Error fetching report details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const createReport = async (reportPayload) => {
    try {
      setCreating(true);
      const response = await axios.post(`${API_BASE_URL}/api/reports/create`, reportPayload);
      alert('Report created successfully! PDF will be generated automatically.');
      setShowCreateForm(false);
      resetCustomReport();
      await fetchReports();
      await fetchReportDetails(response.data.id);
    } catch (error) {
      console.error('Error creating report:', error);
      const errorMessage = error.response?.data?.detail || 'Error creating report. Please check your queries and try again.';
      alert(errorMessage);
    } finally {
      setCreating(false);
    }
  };

  // PDF Functions (keeping all your existing PDF logic)
  const generatePDF = async (reportId, title) => {
    try {
      setLoading(true);
      
      const token = localStorage.getItem('token');
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      };
      
      console.log(`Starting PDF generation for report ${reportId}`);
      
      const response = await axios.post(
        `${API_BASE_URL}/api/reports/${reportId}/generate-pdf`,
        {},
        { 
          headers,
          timeout: 60000
        }
      );
      
      console.log('PDF Generation Response:', response.status, response.data);
      
      if (response.status === 200 || response.status === 201) {
        const successMessage = response.data?.message || 'PDF generation started successfully! Please wait a moment and then try downloading.';
        alert(successMessage);
        
        setTimeout(async () => {
          await fetchReportDetails(reportId);
        }, 2000);
        
        return true;
      } else {
        throw new Error(`Unexpected response status: ${response.status}`);
      }
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      
      let errorMessage = 'Error generating PDF. Please try again.';
      
      if (error.code === 'ECONNABORTED') {
        errorMessage = 'PDF generation is taking longer than expected. Please check back in a few minutes.';
      } else if (error.response) {
        const status = error.response.status;
        const data = error.response.data;
        
        switch (status) {
          case 400:
            errorMessage = data?.detail || 'Invalid request. Please check the report data.';
            break;
          case 401:
            errorMessage = 'Authentication required. Please log in again.';
            break;
          case 404:
            errorMessage = 'Report not found. Please refresh the page and try again.';
            break;
          case 422:
            errorMessage = data?.detail || 'Report data validation failed. Please check the report content.';
            break;
          case 500:
            errorMessage = 'Server error occurred while generating PDF. Please try again later.';
            break;
          default:
            errorMessage = data?.detail || data?.message || `Server error (${status}). Please try again.`;
        }
      } else if (error.request) {
        errorMessage = 'Unable to connect to server. Please check your internet connection.';
      }
      
      alert(errorMessage);
      return false;
      
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = async (reportId, title) => {
    try {
      setLoading(true);
      
      const token = localStorage.getItem('token');
      const headers = {
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      };
      
      console.log(`Starting PDF download for report ${reportId}`);
      
      const response = await axios.get(
        `${API_BASE_URL}/api/reports/${reportId}/download-pdf`,
        {
          responseType: 'blob',
          headers,
          timeout: 30000
        }
      );

      console.log('PDF Download Response:', response.status, 'Content-Type:', response.headers['content-type']);

      const contentType = response.headers['content-type'] || response.headers['Content-Type'];
      const isValidPDF = contentType && (
        contentType.includes('application/pdf') || 
        contentType.includes('application/octet-stream')
      );
      
      if (response.data instanceof Blob && response.data.size > 0 && (isValidPDF || response.data.size > 1000)) {
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        const filename = `${title.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_')}_report_${timestamp}.pdf`;
        
        link.href = url;
        link.setAttribute('download', filename);
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        
        setTimeout(() => {
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        }, 100);
        
        console.log(`PDF downloaded successfully as: ${filename}`);
        alert(`PDF downloaded successfully as: ${filename}`);
        
        return true;
        
      } else {
        console.error('Invalid PDF response:', {
          size: response.data.size,
          type: typeof response.data,
          contentType: contentType
        });
        
        if (response.data instanceof Blob && response.data.size < 1000) {
          try {
            const errorText = await response.data.text();
            console.log('Error response text:', errorText);
            
            let errorObj;
            try {
              errorObj = JSON.parse(errorText);
              throw new Error(errorObj.detail || errorObj.message || 'PDF not available');
            } catch (parseError) {
              throw new Error(errorText || 'PDF not available');
            }
          } catch (textError) {
            throw new Error('PDF file not ready or corrupted. Please try generating it again.');
          }
        } else {
          throw new Error('Invalid PDF response received from server');
        }
      }
      
    } catch (error) {
      console.error('Error downloading PDF:', error);
      
      let errorMessage = 'Error downloading PDF. Please ensure the report has been generated successfully.';
      
      if (error.code === 'ECONNABORTED') {
        errorMessage = 'Download timeout. Please try again.';
      } else if (error.response) {
        const status = error.response.status;
        
        if (error.response.data instanceof Blob) {
          try {
            const errorText = await error.response.data.text();
            console.log('Blob error response:', errorText);
            
            try {
              const errorObj = JSON.parse(errorText);
              errorMessage = errorObj.detail || errorObj.message || errorMessage;
            } catch {
              errorMessage = errorText || errorMessage;
            }
          } catch (blobError) {
            console.error('Error parsing blob error:', blobError);
          }
        } else if (error.response.data?.detail) {
          errorMessage = error.response.data.detail;
        }
        
        switch (status) {
          case 401:
            errorMessage = 'Authentication required. Please log in again.';
            break;
          case 404:
            errorMessage = 'PDF file not found. Please generate the PDF first.';
            break;
          case 422:
            errorMessage = 'PDF generation failed. Please try generating it again.';
            break;
          case 500:
            errorMessage = 'Server error occurred while downloading PDF. Please try again.';
            break;
        }
      } else if (error.request) {
        errorMessage = 'Unable to connect to server. Please check your internet connection.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      alert(errorMessage);
      return false;
      
    } finally {
      setLoading(false);
    }
  };

  // Form Management Functions
  const resetCustomReport = () => {
    setCustomReport({
      title: '',
      description: '',
      queries: [{ title: '', description: '', sql_query: '', execution_order: 1 }]
    });
  };

  const updateCustomQuery = (index, field, value) => {
    const updatedQueries = [...customReport.queries];
    updatedQueries[index] = { ...updatedQueries[index], [field]: value };

    if (field !== 'execution_order') {
      updatedQueries[index].execution_order = index + 1;
    }

    setCustomReport({ ...customReport, queries: updatedQueries });
  };

  const addQuery = () => {
    setCustomReport({
      ...customReport,
      queries: [
        ...customReport.queries,
        {
          title: '',
          description: '',
          sql_query: '',
          execution_order: customReport.queries.length + 1
        }
      ]
    });
  };

  const removeQuery = (index) => {
    if (customReport.queries.length > 1) {
      const updatedQueries = customReport.queries.filter((_, i) => i !== index);
      updatedQueries.forEach((q, i) => { q.execution_order = i + 1; });
      setCustomReport({ ...customReport, queries: updatedQueries });
    }
  };

  const loadTemplate = (template) => {
    setCustomReport({ ...template });
    setShowTemplates(false);
  };

  // Filter and Search Functions
  const filteredReports = reports.filter(report => {
    const matchesSearch = report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         report.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || report.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const paginatedReports = filteredReports.slice(
    (currentPage - 1) * REPORTS_PER_PAGE,
    currentPage * REPORTS_PER_PAGE
  );

  const totalPages = Math.ceil(filteredReports.length / REPORTS_PER_PAGE);

  // Component Lifecycle
  useEffect(() => {
    fetchReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header Section */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8 border border-gray-100">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-4 lg:space-y-0">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h1 className="text-4xl font-bold text-gray-900">🤖 AI-Enhanced HR Report Generator</h1>
              </div>
              <p className="text-gray-600 text-lg">Generate comprehensive business reports with AI-powered natural language to SQL conversion</p>
              <div className="flex items-center space-x-6 mt-4 text-sm text-gray-500">
                <span className="flex items-center space-x-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  <span>🤖 AI Query Assistant</span>
                </span>
                <span className="flex items-center space-x-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z"/>
                  </svg>
                  <span>Visual SQL Builder</span>
                </span>
                <span className="flex items-center space-x-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd"/>
                  </svg>
                  <span>Pre-built Templates</span>
                </span>
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowTemplates(true)}
                className="bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 border border-indigo-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <span>Templates</span>
              </button>
              <button
                onClick={() => setShowCreateForm(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Create Report</span>
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          {/* Reports List Sidebar */}
          <div className="xl:col-span-1">
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 sticky top-6">
              {/* Search and Filter Controls */}
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Generated Reports
                </h2>
                
                {/* Search Input */}
                <div className="relative mb-4">
                  <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search reports..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>

                {/* Status Filter */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Status</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="all">All Status</option>
                    <option value="completed">Completed</option>
                    <option value="failed">Failed</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>
              </div>

              {/* Reports List */}
              <div className="p-6">
                {loading && !selectedReport ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading reports...</p>
                  </div>
                ) : filteredReports.length === 0 ? (
                  <div className="text-center py-12">
                    <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-gray-600 font-medium">No reports found</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {searchTerm || filterStatus !== 'all' ? 'Try adjusting your filters' : 'Create your first report to get started'}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3 mb-6">
                      {paginatedReports.map(report => (
                        <div
                          key={report.id}
                          onClick={() => fetchReportDetails(report.id)}
                          className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-md ${
                            selectedReport === report.id
                              ? 'border-blue-500 bg-blue-50 shadow-md'
                              : 'border-gray-200 hover:border-gray-300 bg-white'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="font-medium text-gray-900 text-sm leading-tight">
                              {truncateText(report.title, 50)}
                            </h3>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(report.status)}`}>
                              {report.status}
                            </span>
                          </div>
                          
                          <p className="text-xs text-gray-600 mb-3">
                            {truncateText(report.description, 80)}
                          </p>
                          
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>{formatDate(report.created_at)}</span>
                            <div className="flex items-center space-x-2">
                              {report.pdf_path && (
                                <span className="text-green-600 font-medium">PDF Ready</span>
                              )}
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex justify-between items-center">
                        <button
                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                          disabled={currentPage === 1}
                          className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 text-gray-700 rounded-lg transition-colors duration-200"
                        >
                          Previous
                        </button>
                        <span className="text-sm text-gray-600">
                          {currentPage} of {totalPages}
                        </span>
                        <button
                          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                          disabled={currentPage === totalPages}
                          className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 text-gray-700 rounded-lg transition-colors duration-200"
                        >
                          Next
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="xl:col-span-3">
            {/* Report Details View */}
            {selectedReport && reportData ? (
              <div className="bg-white rounded-xl shadow-lg border border-gray-100">
                {/* Report Header */}
                <div className="p-8 border-b border-gray-200">
                  <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-4 lg:space-y-0">
                    <div className="flex-1">
                      <h2 className="text-3xl font-bold text-gray-900 mb-2">{reportData.title}</h2>
                      <p className="text-gray-600 mb-4">{reportData.description}</p>
                      <div className="flex items-center space-x-6 text-sm text-gray-500">
                        <span className="flex items-center space-x-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span>Created: {formatDate(reportData.created_at)}</span>
                        </span>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(reportData.status)}`}>
                          {reportData.status.toUpperCase()}
                        </span>
                        <span className="flex items-center space-x-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                          <span>{reportData.query_executions?.length || 0} sections</span>
                        </span>
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex space-x-3">
                      <button
                        onClick={() => generatePDF(reportData.id, reportData.title)}
                        disabled={loading}
                        className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2"
                      >
                        {loading ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            <span>Generating...</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span>Generate PDF</span>
                          </>
                        )}
                      </button>
                      
                      {reportData.pdf_path && (
                        <button
                          onClick={() => downloadPDF(reportData.id, reportData.title)}
                          disabled={loading}
                          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                          </svg>
                          <span>Download PDF</span>
                        </button>
                      )}
                      
                      <button
                        onClick={() => fetchReportDetails(reportData.id)}
                        disabled={loading}
                        className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <span>Refresh</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* CORRECTED Report Content Display */}
                <div className="p-8">
                  <div className="space-y-8">
                    {/* Show diagnostic info in development */}
                    {process.env.NODE_ENV === 'development' && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 className="font-medium text-blue-800 mb-2">🔍 Debug Info</h4>
                        <div className="text-sm text-blue-700 space-y-1">
                          <div>Report Data: {reportData ? 'Exists' : 'Missing'}</div>
                          <div>Query Executions: {reportData?.query_executions?.length || 0}</div>
                          <div>Status: {reportData?.status}</div>
                        </div>
                      </div>
                    )}

                    {/* FIXED: Display query executions using your backend structure */}
                    {reportData?.query_executions && reportData.query_executions.length > 0 ? (
                      reportData.query_executions.map((query, index) => (
                        <div key={query.id || index} className="border border-gray-200 rounded-xl overflow-hidden">
                          {/* Query Header */}
                          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <h3 className="text-xl font-semibold text-gray-900 mb-2 flex items-center">
                                  <span className="bg-blue-100 text-blue-800 text-sm font-medium px-2 py-1 rounded-full mr-3">
                                    {index + 1}
                                  </span>
                                  {query.title || `Query ${index + 1}`}
                                </h3>
                                {query.description && (
                                  <p className="text-gray-600">{query.description}</p>
                                )}
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                  query.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }`}>
                                  {query.status}
                                </span>
                                <button
                                  onClick={() => query.sql_query && navigator.clipboard.writeText(query.sql_query)}
                                  className="text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-white transition-colors duration-200"
                                  title="Copy SQL Query"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Query Content */}
                          <div className="p-6">
                            {/* SQL Query Display */}
                            {query.sql_query && (
                              <div className="mb-6">
                                <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                                  </svg>
                                  Executed Query:
                                </h4>
                                <div className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto">
                                  <pre className="text-sm font-mono whitespace-pre-wrap">{query.sql_query}</pre>
                                </div>
                              </div>
                            )}
                            
                            {query.status === 'completed' ? (
                              <>
                                {/* FIXED: Results Table using your backend structure */}
                                {query.columns?.length > 0 && query.data?.length > 0 ? (
                                  <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200 rounded-lg overflow-hidden shadow-sm">
                                      <thead className="bg-gray-50">
                                        <tr>
                                          {query.columns.map((column, colIndex) => (
                                            <th 
                                              key={colIndex} 
                                              className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200"
                                            >
                                              {column.replace(/_/g, ' ')}
                                            </th>
                                          ))}
                                        </tr>
                                      </thead>
                                      <tbody className="bg-white divide-y divide-gray-200">
                                        {query.data.slice(0, 50).map((row, rowIndex) => (
                                          <tr key={rowIndex} className={`${
                                            rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                                          } hover:bg-blue-50 transition-colors duration-150`}>
                                            {/* FIXED: Handle row data properly */}
                                            {Array.isArray(row) ? (
                                              // Row is an array of values
                                              row.map((cell, cellIndex) => (
                                                <td key={cellIndex} className="px-6 py-4 text-sm text-gray-900 border-b border-gray-100">
                                                  <div className="max-w-xs truncate" title={cell !== null ? String(cell) : 'N/A'}>
                                                    {cell !== null && cell !== undefined ? String(cell) : 'N/A'}
                                                  </div>
                                                </td>
                                              ))
                                            ) : (
                                              // Row is an object with column keys
                                              query.columns.map((column, cellIndex) => (
                                                <td key={cellIndex} className="px-6 py-4 text-sm text-gray-900 border-b border-gray-100">
                                                  <div className="max-w-xs truncate" title={row[column] !== null ? String(row[column]) : 'N/A'}>
                                                    {row[column] !== null && row[column] !== undefined ? String(row[column]) : 'N/A'}
                                                  </div>
                                                </td>
                                              ))
                                            )}
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                    {query.data.length > 50 && (
                                      <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
                                        <p className="text-sm text-gray-600 text-center">
                                          Showing 50 of {query.data.length} total records
                                          <span className="ml-2 text-blue-600 cursor-pointer hover:text-blue-800">
                                            • View full results in PDF
                                          </span>
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="text-center py-12 bg-gray-50 rounded-lg">
                                    <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 009.586 13H7" />
                                    </svg>
                                    <p className="text-gray-500 font-medium">No data returned</p>
                                    <p className="text-sm text-gray-400 mt-1">This query executed successfully but returned no results</p>
                                  </div>
                                )}

                                {/* Query Metadata */}
                                <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-100 text-sm">
                                  <div className="flex space-x-6 text-gray-500">
                                    <span className="flex items-center space-x-1">
                                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/>
                                      </svg>
                                      <span>Execution: {query.execution_time}</span>
                                    </span>
                                    <span className="flex items-center space-x-1">
                                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"/>
                                      </svg>
                                      <span>Records: {query.affected_rows?.toLocaleString() || query.data?.length?.toLocaleString() || 0}</span>
                                    </span>
                                    <span className="flex items-center space-x-1">
                                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                                      </svg>
                                      <span>Columns: {query.columns?.length || 0}</span>
                                    </span>
                                  </div>
                                </div>
                              </>
                            ) : (
                              // Query failed
                              <div className="text-center py-12">
                                <svg className="w-12 h-12 text-red-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <p className="text-red-600 font-medium">Query Execution Failed</p>
                                <p className="text-sm text-gray-500 mt-2">{query.error_message || 'An error occurred during execution'}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      // No query executions found
                      <div className="text-center py-16">
                        <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No Query Results Available</h3>
                        <p className="text-gray-600 mb-4">
                          This report doesn't contain any executed queries or the query data is still being processed.
                        </p>
                        <div className="space-y-2 text-sm text-gray-500">
                          <p>• Make sure the report has been fully generated</p>
                          <p>• Try refreshing the report data</p>
                          <p>• Check if the queries were executed successfully</p>
                        </div>
                        <button
                          onClick={() => fetchReportDetails(reportData.id)}
                          className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200"
                        >
                          Refresh Report Data
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              // Welcome Screen when no report is selected
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 flex items-center justify-center min-h-[600px]">
                <div className="text-center max-w-md mx-auto p-8">
                  <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">Welcome to AI Report Generator</h3>
                  <p className="text-gray-600 mb-6">
                    Select a report from the sidebar to view its details and data, or create a new report to get started.
                  </p>
                  <div className="space-y-3">
                    <button
                      onClick={() => setShowCreateForm(true)}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center space-x-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      <span>Create New Report</span>
                    </button>
                    <button
                      onClick={() => setShowTemplates(true)}
                      className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center space-x-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      <span>Browse Templates</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Templates Modal */}
        {showTemplates && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
              <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-bold mb-2">📋 Report Templates</h2>
                    <p className="text-indigo-100">Choose from pre-built report templates to get started quickly</p>
                  </div>
                  <button
                    onClick={() => setShowTemplates(false)}
                    className="text-white hover:text-gray-200 transition-colors duration-200"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="p-6 overflow-y-auto max-h-[80vh]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {reportTemplates.map((template) => (
                    <div key={template.id} className="border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow duration-200">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <span className="text-3xl">{template.icon}</span>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">{template.name}</h3>
                            <span className="text-sm text-indigo-600 font-medium">{template.category}</span>
                          </div>
                        </div>
                        <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">
                          {template.template.queries.length} sections
                        </span>
                      </div>
                      
                      <p className="text-gray-600 text-sm mb-4">{template.description}</p>
                      
                      <div className="space-y-2 mb-4">
                        {template.template.queries.slice(0, 3).map((query, index) => (
                          <div key={index} className="text-xs text-gray-500 flex items-center space-x-2">
                            <span className="w-4 h-4 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">
                              {index + 1}
                            </span>
                            <span>{query.title}</span>
                          </div>
                        ))}
                        {template.template.queries.length > 3 && (
                          <div className="text-xs text-gray-400 ml-6">
                            +{template.template.queries.length - 3} more sections...
                          </div>
                        )}
                      </div>
                      
                      <button
                        onClick={() => loadTemplate(template.template)}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200"
                      >
                        Use This Template
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Create Report Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-7xl w-full max-h-[95vh] overflow-hidden">
              <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-bold mb-2">🔧 Create Custom Report</h2>
                    <p className="text-blue-100">Build comprehensive reports with multiple query sections and AI assistance</p>
                  </div>
                  <button
                    onClick={() => {
                      setShowCreateForm(false);
                      resetCustomReport();
                    }}
                    className="text-white hover:text-gray-200 transition-colors duration-200"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className="flex h-[85vh]">
                {/* Form Section */}
                <div className="flex-1 p-6 overflow-y-auto">
                  {/* Report Basic Information */}
                  <div className="mb-8">
                    <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                      <svg className="w-6 h-6 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Report Information
                    </h3>
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Report Title <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={customReport.title}
                          onChange={(e) => setCustomReport({ ...customReport, title: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="e.g., Monthly HR Analytics Report"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                        <textarea
                          value={customReport.description}
                          onChange={(e) => setCustomReport({ ...customReport, description: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          rows="3"
                          placeholder="Describe the purpose and scope of this report..."
                        />
                      </div>
                    </div>
                  </div>

                  {/* Query Sections */}
                  <div className="mb-8">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                        <svg className="w-6 h-6 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        Query Sections ({customReport.queries.length})
                      </h3>
                      <button
                        onClick={addQuery}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span>Add Section</span>
                      </button>
                    </div>

                    <div className="space-y-6">
                      {customReport.queries.map((query, index) => (
                        <SQLQueryBuilder
                          key={index}
                          query={query}
                          index={index}
                          updateCustomQuery={updateCustomQuery}
                          removeQuery={removeQuery}
                          queriesLength={customReport.queries.length}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Preview/Actions Sidebar */}
                <div className="w-80 bg-gray-50 border-l border-gray-200 p-6 overflow-y-auto">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    Report Preview
                  </h3>
                  
                  {/* Report Summary */}
                  <div className="bg-white rounded-lg p-4 mb-6 border border-gray-200">
                    <h4 className="font-medium text-gray-900 mb-2">
                      {customReport.title || 'Untitled Report'}
                    </h4>
                    <p className="text-sm text-gray-600 mb-3">
                      {customReport.description || 'No description provided'}
                    </p>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{customReport.queries.length} sections</span>
                      <span>
                        {customReport.queries.filter(q => q.sql_query.trim()).length} with queries
                      </span>
                    </div>
                  </div>

                  {/* Query Sections Preview */}
                  <div className="space-y-3 mb-6">
                    {customReport.queries.map((query, index) => (
                      <div key={index} className="bg-white rounded-lg p-3 border border-gray-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-medium">
                            #{index + 1}
                          </span>
                          <span className={`w-2 h-2 rounded-full ${
                            query.sql_query.trim() ? 'bg-green-400' : 'bg-gray-300'
                          }`}></span>
                        </div>
                        <h5 className="font-medium text-sm text-gray-900 mb-1">
                          {query.title || `Section ${index + 1}`}
                        </h5>
                        <p className="text-xs text-gray-600">
                          {query.description || 'No description'}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Validation Summary */}
                  <div className="bg-white rounded-lg p-4 mb-6 border border-gray-200">
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                      <svg className="w-4 h-4 mr-1 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Validation
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className={`flex items-center space-x-2 ${customReport.title.trim() ? 'text-green-600' : 'text-red-600'}`}>
                        <span className={`w-2 h-2 rounded-full ${customReport.title.trim() ? 'bg-green-400' : 'bg-red-400'}`}></span>
                        <span>Report title</span>
                      </div>
                      <div className={`flex items-center space-x-2 ${customReport.queries.length > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        <span className={`w-2 h-2 rounded-full ${customReport.queries.length > 0 ? 'bg-green-400' : 'bg-red-400'}`}></span>
                        <span>Has query sections</span>
                      </div>
                      <div className={`flex items-center space-x-2 ${customReport.queries.some(q => q.sql_query.trim()) ? 'text-green-600' : 'text-red-600'}`}>
                        <span className={`w-2 h-2 rounded-full ${customReport.queries.some(q => q.sql_query.trim()) ? 'bg-green-400' : 'bg-red-400'}`}></span>
                        <span>Has valid queries</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-3">
                    <button
                      onClick={() => {
                        const validQueries = customReport.queries.filter(q => q.sql_query.trim());
                        if (!customReport.title.trim()) {
                          alert('Please provide a report title');
                          return;
                        }
                        if (validQueries.length === 0) {
                          alert('Please add at least one query section with a valid SQL query');
                          return;
                        }
                        createReport(customReport);
                      }}
                      disabled={creating || !customReport.title.trim() || !customReport.queries.some(q => q.sql_query.trim())}
                      className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center space-x-2"
                    >
                      {creating ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                          <span>Creating Report...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span>Create Report</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => setShowTemplates(true)}
                      className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center space-x-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      <span>Use Template</span>
                    </button>

                    <button
                      onClick={() => {
                        setShowCreateForm(false);
                        resetCustomReport();
                      }}
                      className="w-full bg-white hover:bg-gray-50 text-gray-700 px-6 py-3 rounded-lg font-medium transition-all duration-200 border border-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportGenerator;

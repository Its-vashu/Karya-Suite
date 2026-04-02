import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { UserProvider } from './context/UserContext';
import { ToastContainer } from 'react-toastify';          
import 'react-toastify/dist/ReactToastify.css';

// layout components           
import Navbar from './components/Navbar';
import {Footer} from './components/Footer';

// Protected Route
import ProtectedRoute from './auth/ProtectedRoute';
import RootRedirect from './auth/RootRedirect';
import './App.css'; 

// Auth related components
import Login from './components/Login';
import Forgotpassword from './page/Forgotpassword';
import ResetPassword from './page/ResetPassword';

// Role-specific home pages
import EmployeeHome from './employee/EmployeeHome';
import AdminHome from './admin/AdminHome';
import HrHome from './hr/HrHome';


// Feature components
import CalendarPage from './calendar/CalendarPage';
import Timesheet from './Timesheet/Timesheet'; 
import MomPage from './Ai tracker/MomPage';
import LeaveManagement from './leavemanagement/LeaveManagement';
import PolicyManagement from './hr/PolicyManagement';
import Expense from './expense management/Expense';
import ExpenseManagement from './expense management/ExpenseManagement';

import PoliciesViewContainer from './employee/PoliciesViewContainer';

  // User Management
import Profile from './components/profile';
import Settings from './page/Settings';
import Help from './page/Help';
import { SelfViewAppreciation } from './appreciation/SelfViewAppreciation';

  // Application features
import Blog from './page/Blog';
import BlogPost from './components/BlogPost';
import About from './page/About';

  // Only HR and Admin
import BackgroundCheckForm from './hr/BackgroundCheckForm';
import LeaveRequestsPage from './hr/LeaveRequestsPage';
import ProjectUserDetails from './Project/ProjectUserDetails';
import AssetManagement from './asset management/AssetManagement';
import ReportManagement from './page/Report';

  // All of Employee, HR and Admin
import ViewAllAppreciation from './appreciation/ViewAllAppreciation';
import MaintenancePage from './page/Maintenance';



function App() {
  return (
    <UserProvider>
    <Router>
      <Navbar />
      <ToastContainer position="top-center" autoClose={2000} />

      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<Forgotpassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route path="/reset-password-form" element={<ResetPassword />} />
        <Route path="/about" element={<About />} />

        {/* Employee Home */}
        <Route path="/EmployeeHome" element={
          <ProtectedRoute allowedRoles={['employee']}>
            <EmployeeHome role="employee" />
          </ProtectedRoute>
        } />

        {/* HR Home */}
        <Route path="/HrHome" element={
          <ProtectedRoute allowedRoles={['hr']}>
            <HrHome role="hr" />
          </ProtectedRoute>
        } />

        <Route path="/AdminHome" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminHome role="admin" />
          </ProtectedRoute>
        } />

        <Route path="/calendar" element={
          <ProtectedRoute allowedRoles={['employee','hr','admin']}>
            <CalendarPage />
          </ProtectedRoute>
        } />

        <Route path="/timesheet" element={
          <ProtectedRoute allowedRoles={['employee','hr','admin']}>
            <Timesheet />
          </ProtectedRoute>
        } />

        <Route path="/profile" element={
          <ProtectedRoute allowedRoles={['employee','hr','admin']}>
            <Profile />
          </ProtectedRoute>
        } />

        <Route path="/settings" element={
          <ProtectedRoute allowedRoles={['employee','hr','admin']}>
            <Settings />
          </ProtectedRoute>
        } />

        <Route path="/help" element={
          <ProtectedRoute allowedRoles={['employee','hr','admin']}>
            <Help />
          </ProtectedRoute>
        } />

        <Route path="/leaveManagement" element={
          <ProtectedRoute allowedRoles={['employee','hr','admin']}>
            <LeaveManagement />
          </ProtectedRoute>
        } />

        <Route path="/blog" element={
          <ProtectedRoute allowedRoles={['employee','hr','admin']}>
            <Blog />
          </ProtectedRoute>
        } />

        <Route path="/blog/:id" element={
          <ProtectedRoute allowedRoles={['employee','hr','admin']}>
            <BlogPost />
          </ProtectedRoute>
        } />

        <Route path="/dashboard/mompage" element={
          <ProtectedRoute allowedRoles={['employee','hr','admin']}>
            <MomPage />
          </ProtectedRoute>
        } />

        <Route path="/policymanagement" element={
          <ProtectedRoute allowedRoles={['hr','admin']}>
            <PolicyManagement />
          </ProtectedRoute>
        } />

        <Route path="/BackgroundCheckForm" element={
          <ProtectedRoute allowedRoles={['hr','admin']}>
            <BackgroundCheckForm />
          </ProtectedRoute>
        } />

        <Route path="/leave-requests" element={
          <ProtectedRoute allowedRoles={['employee','hr','admin']}>
            <LeaveRequestsPage />
          </ProtectedRoute>
        } />

        <Route path="/policies-view" element={
          <ProtectedRoute allowedRoles={['employee']}>
            <PoliciesViewContainer />
          </ProtectedRoute>
        } />
        
        <Route path="/expense" element={
          <ProtectedRoute allowedRoles={['employee']}>
            <Expense />
          </ProtectedRoute>
        } />
        
        
        <Route path="/expense-management" element={
          <ProtectedRoute allowedRoles={['hr']}>
            <ExpenseManagement />
          </ProtectedRoute>  
        } />
      
      
        <Route path="/project-user-details" element={
          <ProtectedRoute allowedRoles={['hr']}>
            <ProjectUserDetails />
          </ProtectedRoute>
        } />
        
        
        <Route path="/assetmanagement" element={
          <ProtectedRoute allowedRoles={['hr','admin']}>
            <MaintenancePage/>
              {/* <AssetManagement /> */}
          </ProtectedRoute>
        } />
        
        
        <Route path="/self-appreciation" element={
          <ProtectedRoute allowedRoles={['employee','hr',]}>
            <SelfViewAppreciation />
          </ProtectedRoute>
        } />
        
      
        
        <Route path="/viewallappreciation" element={
          <ProtectedRoute allowedRoles={['employee','hr','admin']}>
            <ViewAllAppreciation />
          </ProtectedRoute>
        } />
        
        
        <Route path="/report-management" element={
          <ProtectedRoute allowedRoles={['hr','admin']}>
            <ReportManagement />
          </ProtectedRoute>
        } />
        

        {/* <Route path="/attendence"  element={<EmployeeAttendence />} /> */}


        <Route path="*" element={ <MaintenancePage /> }/>
      </Routes>
      
      
      {/* Footer */}
      <Footer /> 
    </Router>
    </UserProvider>
  );
}

export default App;

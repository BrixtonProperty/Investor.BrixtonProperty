import { createBrowserRouter } from 'react-router-dom'
import RequireAuth from './RequireAuth'
import RequireRole from './RequireRole'
import RootRedirect from './RootRedirect'
import AppShell from '../components/Layout/AppShell'

import LoginPage from '../features/auth/LoginPage'
import AcceptInvitePage from '../features/auth/AcceptInvitePage'
import MfaEnrollPage from '../features/auth/MfaEnrollPage'
import MfaChallengePage from '../features/auth/MfaChallengePage'

import DashboardPage from '../features/dashboard/DashboardPage'
import InvestmentsPage from '../features/investments/InvestmentsPage'
import PropertyDetailPage from '../features/investments/PropertyDetailPage'
import PhotosPage from '../features/investments/PhotosPage'
import DocumentsPage from '../features/investments/DocumentsPage'
import UpdatesPage from '../features/updates/UpdatesPage'
import ProfilePage from '../features/profile/ProfilePage'
import ContactPage from '../features/contact/ContactPage'

import PropertiesAdminPage from '../features/admin/properties/PropertiesAdminPage'
import PropertyDetailAdminPage from '../features/admin/properties/PropertyDetailAdminPage'
import PhotosAdminPage from '../features/admin/properties/PhotosAdminPage'
import DocumentsAdminPage from '../features/admin/properties/DocumentsAdminPage'
import InvestorsAdminPage from '../features/admin/investors/InvestorsAdminPage'
import InvestorDetailAdminPage from '../features/admin/investors/InvestorDetailAdminPage'
import DocumentCategoriesAdminPage from '../features/admin/documentCategories/DocumentCategoriesAdminPage'
import SiteSettingsAdminPage from '../features/admin/settings/SiteSettingsAdminPage'

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <RequireAuth />,
    children: [
      { path: '/accept-invite', element: <AcceptInvitePage /> },
      { path: '/mfa-enroll', element: <MfaEnrollPage /> },
      { path: '/mfa-challenge', element: <MfaChallengePage /> },
      { path: '/', element: <RootRedirect /> },
      {
        element: <RequireRole role="investor" />,
        children: [
          {
            element: <AppShell />,
            children: [
              { path: '/dashboard', element: <DashboardPage /> },
              { path: '/investments', element: <InvestmentsPage /> },
              { path: '/investments/:id', element: <PropertyDetailPage /> },
              { path: '/investments/:id/photos', element: <PhotosPage /> },
              { path: '/investments/:id/documents', element: <DocumentsPage /> },
              { path: '/updates', element: <UpdatesPage /> },
              { path: '/profile', element: <ProfilePage /> },
              { path: '/contact', element: <ContactPage /> },
            ],
          },
        ],
      },
      {
        element: <RequireRole role="admin" />,
        children: [
          {
            element: <AppShell />,
            children: [
              { path: '/admin/properties', element: <PropertiesAdminPage /> },
              { path: '/admin/properties/:id', element: <PropertyDetailAdminPage /> },
              { path: '/admin/properties/:id/photos', element: <PhotosAdminPage /> },
              { path: '/admin/properties/:id/documents', element: <DocumentsAdminPage /> },
              { path: '/admin/investors', element: <InvestorsAdminPage /> },
              { path: '/admin/investors/:id', element: <InvestorDetailAdminPage /> },
              { path: '/admin/document-categories', element: <DocumentCategoriesAdminPage /> },
              { path: '/admin/settings', element: <SiteSettingsAdminPage /> },
            ],
          },
        ],
      },
    ],
  },
])

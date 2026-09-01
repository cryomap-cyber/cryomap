import { Navigate, Route, Routes } from 'react-router-dom';

import { AppLayout } from './components/AppLayout/AppLayout';
import {
  allRoles,
  clientAndAdminRoles,
  managementRoles,
  technicianAndAdminRoles,
} from './permissions/role-permissions';
import { Attachments } from './pages/Attachments/Attachments';
import { Companies } from './pages/Companies/Companies';
import { Dashboard } from './pages/Dashboard/Dashboard';
import { EquipmentTemperatureReadings } from './pages/EquipmentTemperatureReadings/EquipmentTemperatureReadings';
import { Equipments } from './pages/Equipments/Equipments';
import { Login } from './pages/Login/Login';
import { Reports } from './pages/Reports/Reports';
import { Rooms } from './pages/Rooms/Rooms';
import { Sensors } from './pages/Sensors/Sensors';
import { ServiceRecords } from './pages/ServiceRecords/ServiceRecords';
import { Tasks } from './pages/Tasks/Tasks';
import { TemperatureReadings } from './pages/TemperatureReadings/TemperatureReadings';
import { ThermalAlerts } from './pages/ThermalAlerts/ThermalAlerts';
import { Users } from './pages/Users/Users';
import { ProtectedRoute } from './routes/ProtectedRoute';

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route element={<ProtectedRoute allowedRoles={allRoles} />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/rooms" element={<Rooms />} />
            <Route path="/equipments" element={<Equipments />} />
            <Route
              path="/temperature-readings"
              element={<TemperatureReadings />}
            />
            <Route
              path="/equipment-temperature-readings"
              element={<EquipmentTemperatureReadings />}
            />
            <Route path="/thermal-alerts" element={<ThermalAlerts />} />
            <Route path="/attachments" element={<Attachments />} />
            <Route path="/service-records" element={<ServiceRecords />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={managementRoles} />}>
            <Route path="/companies" element={<Companies />} />
            <Route path="/users" element={<Users />} />
          </Route>

          <Route
            element={
              <ProtectedRoute allowedRoles={[...clientAndAdminRoles]} />
            }
          >
            <Route path="/sensors" element={<Sensors />} />
            <Route path="/reports" element={<Reports />} />
          </Route>

          <Route
            element={
              <ProtectedRoute allowedRoles={[...technicianAndAdminRoles]} />
            }
          >
            <Route path="/tasks" element={<Tasks />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

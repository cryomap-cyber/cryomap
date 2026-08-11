import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/AppLayout/AppLayout';
import { Login } from './pages/Login/Login';
import { Dashboard } from './pages/Dashboard/Dashboard';
import { Companies } from './pages/Companies/Companies';
import { Rooms } from './pages/Rooms/Rooms';
import { Equipments } from './pages/Equipments/Equipments';
import { Sensors } from './pages/Sensors/Sensors';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { Tasks } from './pages/Tasks/Tasks';
import { ServiceRecords } from './pages/ServiceRecords/ServiceRecords';
import { Reports } from './pages/Reports/Reports';
import { TemperatureReadings } from './pages/TemperatureReadings/TemperatureReadings';

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/companies" element={<Companies />} />
          <Route path="/rooms" element={<Rooms />} />
          <Route path="/equipments" element={<Equipments />} />
          <Route path="/sensors" element={<Sensors />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/service-records" element={<ServiceRecords />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/temperature-readings" element={<TemperatureReadings />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

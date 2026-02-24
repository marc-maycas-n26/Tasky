import { ColumnsSection } from './ColumnsSection';
import { StorageSection } from './StorageSection';
import './SettingsPage.css';

export function SettingsPage() {
  return (
    <div className="page-container settings-page">
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Configure your board and data storage.</p>
      </div>

      <ColumnsSection />
      <StorageSection />
    </div>
  );
}

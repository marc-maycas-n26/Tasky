import { useEffect, useRef, useState } from 'react';
import { useStore } from '../../store';
import { ColorPicker } from '../Common/ColorPicker';

interface Props {
  onClose: () => void;
}

export function CreateEpicModal({ onClose }: Props) {
  const addEpic = useStore(s => s.addEpic);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#6554C0');
  const [error, setError] = useState('');

  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  function handleCreate() {
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    addEpic({ title: title.trim(), description: description.trim() || undefined, color });
    onClose();
  }

  return (
    <>
      <div className="overlay" onClick={onClose} />
      <div className="modal" role="dialog" aria-label="Create epic">
        <div className="modal-header">
          <span className="modal-title">Create Epic</span>
          <button className="btn btn-icon btn-ghost" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div className="form-field">
            <label className="form-label">Title *</label>
            <input
              ref={titleRef}
              className="form-input"
              placeholder="Epic title"
              value={title}
              onChange={e => { setTitle(e.target.value); setError(''); }}
              onKeyDown={e => { if (e.key === 'Enter') handleCreate(); }}
            />
            {error && <span className="form-error">{error}</span>}
          </div>

          <div className="form-field">
            <label className="form-label">Description</label>
            <textarea
              className="form-input form-textarea"
              placeholder="Optional description…"
              value={description}
              rows={3}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          <div className="form-field">
            <label className="form-label">Color</label>
            <ColorPicker value={color} onChange={setColor} />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleCreate}>Create epic</button>
        </div>
      </div>
    </>
  );
}

import { useRef } from 'react';
import { useGame } from '../store';
import { browserKV, listSlots, SLOTS } from '../sim/save';

export function SaveMenu({ canSave }: { canSave: boolean }) {
  const { save, load, exportSave, importSave, saveRev } = useGame();
  const fileRef = useRef<HTMLInputElement>(null);
  const kv = browserKV();
  void saveRev; // subscribing to saveRev re-renders this list after saves
  const slots = kv ? listSlots(kv) : [];
  const info = (id: string) => slots.find((s) => s.slot === id);

  const download = () => {
    const blob = new Blob([exportSave()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'politics-sim-save.json';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="panel">
      <h3>Saves</h3>
      {!kv && <p className="muted">Browser storage is unavailable. Use export/import instead.</p>}
      <table>
        <tbody>
          {SLOTS.map((id) => (
            <tr key={id}>
              <td>{id}</td>
              <td className="muted">{info(id)?.label ?? 'empty'}</td>
              <td className="right">
                {canSave && id !== 'autosave' && <button className="small" onClick={() => save(id)}>Save</button>}
                <button className="small" disabled={!info(id)} onClick={() => load(id)}>Load</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="row">
        {canSave && <button className="small secondary" onClick={download}>Export file</button>}
        <button className="small secondary" onClick={() => fileRef.current?.click()}>Import file</button>
        <input ref={fileRef} type="file" accept="application/json" hidden onChange={async (e) => {
          const f = e.target.files?.[0];
          if (f) importSave(await f.text());
          e.target.value = '';
        }} />
      </div>
    </div>
  );
}

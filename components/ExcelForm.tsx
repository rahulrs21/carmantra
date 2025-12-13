'use client'; // Required if using Next.js 13+ app directory

import { useState } from 'react';

export const ExcelForm = () => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const res = await fetch('/api/saveToExcel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone }),
      });

      const data = await res.json();
      setMessage(data.message);

      if (res.ok) {
        setName('');
        setPhone('');
      }
    } catch (err) {
      setMessage('Error saving data');
      try { console.error(err); } catch(e) { /* swallow */ }
    }
  };

  return (
    <div style={{ padding: '50px' }}>
      <h1>Save Form to Excel</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Name:</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div>
          <label>Phone:</label>
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
        </div>
        <button type="submit">Submit</button>
      </form>
      {message && <p>{message}</p>}
    </div>
  );
};

import React from 'react';

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-2xl font-semibold mb-4">Contact Us</h1>
        <p className="text-slate-700">Tell us about your shop and we’ll follow up shortly.</p>
        <form className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <input className="border border-slate-300 bg-white rounded px-3 py-2" placeholder="Name" />
          <input className="border border-slate-300 bg-white rounded px-3 py-2" placeholder="Email" />
          <input className="border border-slate-300 bg-white rounded px-3 py-2 sm:col-span-2" placeholder="Company" />
          <textarea className="border border-slate-300 bg-white rounded px-3 py-2 sm:col-span-2" rows={4} placeholder="How can we help?" />
          <button type="button" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">Submit</button>
        </form>
      </div>
    </div>
  );
}
